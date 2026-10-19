import {deriveDots, summarise} from '../../checklist/derive';
import {todayOf} from '../../checklist/day';
import {emptyChecklist} from '../../checklist/schema';
import {latestHabitRule} from '../../habits';
import {dailyData} from '../../health-daily';
import {runningNights} from '../../sleep/engine';
import {runningSession} from '../../fasting/engine';
import {healthGroupIn} from '../../vault/w-homes';
import {wallClock} from '../../zone-time';
import {addLocalDays} from '../../local-date';
import type {Position} from '../../positions';
import type {EarnSnapshot} from '../../earn/snapshot';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {listNames, shortName} from './calm';

/**
 * Session AF (L4, P8.2): what the Daily Briefing v2 and the Evening Recap read, each from the person's own records on this
 * device, under the same gates as every ZIGi path: Health (meals, nights, fasts, water) only while the Health gate is
 * open, each area only while its switch is on, the person's notes only while "Use my notes" is on. Counts, names and
 * times only; every earning figure is the person's own tracked record with its "as of", or the Earn snapshot's figure
 * with its source and "as of" (lib/earn/snapshot.ts), never a number ZIGi made.
 */
export type ChecklistToday = {date: string; total: number; done: number; open: string[]; healthHidden: number};
/** Today's dots on the person's Checklist path, derived from the records (Health dots only with the gate). */
export function checklistToday(env: ToolEnv): ChecklistToday | null {
  const source = env.checklist;
  if (!source || source.unreadable) return null;
  const healthOpen = !!env.health && env.areas.health !== false;
  const record = healthOpen ? source.record : {...emptyChecklist(), ...source.record, healthItems: []};
  const healthHidden = healthOpen ? 0 : source.record.healthItems.length;
  if (!record.items.length && !record.healthItems.length) return healthHidden ? {date: source.date, total: 0, done: 0, open: [], healthHidden} : null;
  const today = todayOf(source.days, source.date);
  const health = healthOpen ? env.health : null;
  const dots = deriveDots(record, today, source.date, {habits: env.habits, habitsDay: env.habitDay, health, healthDay: env.healthDay, sleep: health ? healthGroupIn(health, 'sleep') ?? null : null,
    meditation: health ? healthGroupIn(health, 'meditation') ?? null : null, meditationRun: null, fasting: healthOpen ? env.fasting : null, platform: env.platform, zone: env.healthZone, now: env.now});
  const summary = summarise(dots, today), counted = dots.filter(d => d.counted);
  return {date: source.date, total: summary.total, done: summary.done, open: counted.filter(d => d.state !== 'done').map(d => shortName(d.label)), healthHidden};
}
const clockIn = (iso: string, zone: string) => { try { return wallClock(Date.parse(iso), zone).clock; } catch { return iso.slice(11, 16); } };
/** Timers running now: a habit's timer (Habits), a night or a fast (Health, gated). */
export function timersRunning(env: ToolEnv): string[] {
  const out: string[] = [];
  if (env.areas.habits) for (const h of env.habits.habits) if (h.timer?.state === 'running' && latestHabitRule(h).state === 'active') out.push(`${shortName(h.title)} timer since ${clockIn(h.timer.startedAt, h.timer.timeZone)}`);
  if (env.health) {
    const night = (() => { const sleep = healthGroupIn(env.health, 'sleep'); return sleep ? runningNights(sleep)[0] : undefined; })();
    if (night) out.push(`a night since ${clockIn(night.start, night.timeZone)}`);
    const fast = env.fasting ? runningSession(env.fasting) : undefined;
    if (fast) { const hours = Math.floor((env.now.getTime() - Date.parse(fast.startedAt)) / 3_600_000); out.push(`a fast (${Math.max(0, hours)} h of ${fast.targetHours})`); }
  }
  return out;
}
/** Meals planned for today in Health's planner (gated): "Lunch: Lentil soup". */
export function mealsPlanned(env: ToolEnv, logged?: boolean): string[] {
  if (!env.health) return [];
  return dailyData(env.health).plans.filter(p => p.date === env.healthDay && (logged === undefined || !!p.loggedAt === logged)).map(p => `${p.meal}: ${shortName(p.name)}`);
}
/** Goals with a planned step this week (or one already due), nearest first. */
export function goalsNeedingStep(env: ToolEnv): string[] {
  if (!env.areas.goals) return [];
  const week = addLocalDays(env.habitDay, 7);
  return summaries(env).filter(g => g.status === 'active' && g.nextContributionDate && g.nextContributionDate <= week).sort((a, b) => a.nextContributionDate!.localeCompare(b.nextContributionDate!)).slice(0, 2)
    .map(g => `${shortName(g.name)}, ${g.nextContributionDate! < env.habitDay ? `planned for ${g.nextContributionDate}` : `next planned date ${g.nextContributionDate}`}`);
}
/** A note the person keeps about their schedule or preferences, quoted as they wrote it (only while "Use my notes" is on). */
export function noteLine(env: ToolEnv): string | null {
  const note = (env.notes ?? []).find(n => n.category === 'schedule' || n.category === 'preferences');
  return note ? `You said: ${shortName(note.text, 120).replace(/[.!?]?$/, '.')}` : null;
}
/** The number of the person's notes the brief quotes ("Used in today's brief"). */
export const notesUsed = (env: ToolEnv): number => noteLine(env) ? 1 : 0;

const TRUNC = (quantity: string, decimals: number) => {
  if (!/^\d+$/.test(quantity)) return null;
  const padded = quantity.padStart(decimals + 1, '0'), whole = padded.slice(0, padded.length - decimals) || '0', fraction = padded.slice(padded.length - decimals, padded.length - decimals + 4).replace(/0+$/, '');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
};
export const asOfText = (iso: string): string => { const t = Date.parse(iso); return Number.isFinite(t) ? `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'an unknown time'; };
const practice = (p: Position) => /test/i.test(p.network);
/**
 * The person's own staking, as Wealth tracks it (the same records `staking_watch` reads): what is staked, the rewards
 * waiting and the next unbonding that ends, per network; practice money is labelled and never converted (ADR-028 H11).
 * Then the native staking APR as the Earn page read it in this visit: the issuance figure and the measured figure
 * side by side (H97), each with its source and "as of". Null when nothing is tracked.
 */
export type EarningSummary = {lines: string[]; asOf: string | null};
export function earningSummary(env: ToolEnv, snapshot: EarnSnapshot | null | undefined): EarningSummary | null {
  if (!env.areas.wealth) return null;
  const staking = env.platform.positions.filter(p => !p.archivedAt && ['NATIVE_STAKING', 'NATIVE_REWARDS', 'NATIVE_UNBONDING', 'LIQUID_STAKING'].includes(p.sourceType));
  if (!staking.length) return null;
  const lines: string[] = [];
  for (const real of [false, true]) {
    const of = staking.filter(p => practice(p) !== real); if (!of.length) continue;
    const sum = (type: string) => { const rows = of.filter(p => p.sourceType === type); if (!rows.length) return null; const asset = rows[0]!.asset, decimals = rows[0]!.decimals; if (rows.some(r => r.asset !== asset || r.decimals !== decimals)) return null; return `${TRUNC(rows.reduce((n, r) => n + BigInt(/^\d+$/.test(r.quantity) ? r.quantity : '0'), 0n).toString(), decimals)} ${asset}`; };
    const staked = sum('NATIVE_STAKING'), rewards = sum('NATIVE_REWARDS'), stz = sum('LIQUID_STAKING');
    const unbonding = of.filter(p => p.sourceType === 'NATIVE_UNBONDING' && p.exitDate).sort((a, b) => a.exitDate!.localeCompare(b.exitDate!))[0];
    const asOf = of.map(p => p.observedAt).sort().at(-1)!;
    const parts = [staked && `${staked} staked`, stz && `${stz} held`, rewards && `rewards waiting ${rewards}`, unbonding && `next unbonding ends ${unbonding.exitDate!.slice(0, 10)}`].filter(Boolean);
    if (parts.length) lines.push(`${real ? 'Staking' : 'Practice staking (no real value)'}: ${parts.join(' · ')} (your tracked records, as of ${asOfText(asOf)}).`);
  }
  const figure = (id: string) => snapshot?.figures.find(f => f.id === id);
  const before = figure('native-apr-before-commission'), measured = figure('native-apr-measured'), issuanceAt = figure('native-apr-issuance-at-measured');
  if (measured && issuanceAt) lines.push(`Native staking APR: issuance figure ${issuanceAt.value} and measured figure ${measured.value} at the same commission${snapshot?.disagree ? '; the two figures disagree' : ''} (${issuanceAt.source}, as of ${asOfText(issuanceAt.asOf)}; measured: ${measured.source}, as of ${asOfText(measured.asOf)}).`);
  else if (before) lines.push(`Native staking APR before any validator commission: ${before.value} (${before.source}, as of ${asOfText(before.asOf)}).`);
  else lines.push('Native staking APR: not read yet in this visit; it is on the Earn page with its source.');
  return lines.length ? {lines, asOf: staking.map(p => p.observedAt).sort().at(-1) ?? null} : null;
}
/** The habits checked in today and those still open, and the streaks today kept going (two days or more). */
export function habitsToday(env: ToolEnv, done: (habitId: string) => boolean, streak: (habitId: string) => number): {done: string[]; open: string[]; streaks: string[]} {
  if (!env.areas.habits) return {done: [], open: [], streaks: []};
  const active = env.habits.habits.filter(h => latestHabitRule(h).state === 'active');
  const doneList = active.filter(h => done(h.id)), open = active.filter(h => !done(h.id));
  return {done: doneList.map(h => shortName(h.title)), open: open.map(h => shortName(h.title)), streaks: doneList.filter(h => streak(h.id) >= 2).sort((a, b) => streak(b.id) - streak(a.id)).slice(0, 2).map(h => `${shortName(h.title)} ${streak(h.id)} days`)};
}
export const named = (names: readonly string[]) => listNames(names);
