import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';

/**
 * Session AK (F5a, item 2): savings challenges as goal templates (lib/templates/goal-library.ts, the "Wealth" area):
 * the 52-week challenge, no-spend days and round-ups by hand. A challenge is a schedule beside one goal. Its progress is
 * worked out from the person's own records only: the contributions they recorded toward that goal (52-week, round-ups)
 * and the days they marked, checked against their own money log (no-spend days, round-ups). Nothing here moves money or
 * records a contribution: the person moves the money themselves and records it as they always do.
 *
 * Money is in exact integer units of the goal (its own decimals), never converted. A day with nothing logged is not a
 * no-spend day unless the person marks it (unknown is not zero).
 *
 * The record: a NEW device-only key `zigoals:savings-challenges:v1`, loose and versioned, every field optional or
 * defaulted, bounded (100 goals, 400 marked days each).
 */
export const SAVINGS_CHALLENGES_KEY = 'zigoals:savings-challenges:v1';
export const CHALLENGE_KINDS = ['52-week', 'no-spend', 'round-up'] as const;
export type ChallengeKind = typeof CHALLENGE_KINDS[number];
/** The goal templates that start each challenge (their ids in the template library). */
export const CHALLENGE_TEMPLATES: Record<ChallengeKind, string> = {'52-week': 'challenge-52-week', 'no-spend': 'challenge-no-spend-days', 'round-up': 'challenge-round-ups'};
export const challengeForTemplate = (templateId: string | undefined | null): ChallengeKind | null => (Object.entries(CHALLENGE_TEMPLATES).find(([, t]) => t === templateId)?.[0] as ChallengeKind | undefined) ?? null;
export const MAX_CHALLENGES = 100, MAX_MARKED_DAYS = 400, WEEKS = 52;
export const ROUND_TO = [1, 5, 10] as const;
const day = z.iso.date();
const amount = z.string().regex(/^\d{1,30}(\.\d{1,18})?$/);
export const challengeSchema = z.looseObject({
  kind: z.enum(CHALLENGE_KINDS),
  startedOn: day,
  /** 52-week: the step in the goal's currency (week n puts aside n steps, or 53 − n when counting down). */
  step: amount.optional(),
  order: z.enum(['up', 'down']).optional(),
  /** Round-ups: each logged expense is rounded up to the next 1, 5 or 10 of its currency. */
  roundTo: z.union([z.literal(1), z.literal(5), z.literal(10)]).optional(),
  /** No-spend days: how many days the person is aiming for, and the days they marked. */
  targetDays: z.number().int().min(1).max(366).optional(),
  noSpendDays: z.array(day).max(MAX_MARKED_DAYS).optional(),
  note: z.string().max(200).optional(),
});
export type Challenge = z.infer<typeof challengeSchema>;
export const savingsChallengesSchema = z.looseObject({
  version: z.literal(1),
  goals: z.record(z.string().regex(/^\d{1,80}$/), challengeSchema).refine(g => Object.keys(g).length <= MAX_CHALLENGES, `Up to ${MAX_CHALLENGES} challenges.`).default({}),
});
export type SavingsChallenges = z.infer<typeof savingsChallengesSchema>;
export const emptySavingsChallenges = (): SavingsChallenges => ({version: 1, goals: {}});
export const SAVINGS_CHALLENGES: DeviceRecordSpec<SavingsChallenges> = {key: SAVINGS_CHALLENGES_KEY, schema: savingsChallengesSchema, empty: emptySavingsChallenges};

export function setChallenge(r: SavingsChallenges, goalId: string, c: Challenge): SavingsChallenges {
  return savingsChallengesSchema.parse({...r, goals: {...r.goals, [goalId]: c}});
}
export function removeChallenge(r: SavingsChallenges, goalId: string): SavingsChallenges {
  const goals = {...r.goals}; delete goals[goalId];
  return {...r, goals};
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
/** The challenge's week on a day: 0 before it starts, 1 to 52 while it runs, 53 after its last week. */
export const challengeWeek = (startedOn: string, today: string) => { const d = daysBetween(startedOn, today); return d < 0 ? 0 : Math.min(WEEKS + 1, Math.floor(d / 7) + 1); };

// ── 52-week ──
/** Week n's amount, in units: n steps counting up, 53 − n counting down. */
export const weekAmount = (n: number, step: bigint, order: 'up' | 'down' = 'up'): bigint => n < 1 || n > WEEKS ? 0n : step * BigInt(order === 'up' ? n : WEEKS + 1 - n);
/** The total of weeks 1 to n. */
export function scheduleTotal(n: number, step: bigint, order: 'up' | 'down' = 'up'): bigint {
  const k = BigInt(Math.max(0, Math.min(WEEKS, n)));
  return step * (order === 'up' ? k * (k + 1n) / 2n : k * 53n - k * (k + 1n) / 2n);
}
/** The whole year: 1,378 steps. */
export const yearTotal = (step: bigint) => scheduleTotal(WEEKS, step);
export type WeekProgress = {week: number; thisWeek: bigint; expected: bigint; recorded: bigint; covered: number; difference: bigint; done: boolean};
/**
 * Where a 52-week challenge stands: this week's amount, what the schedule asks by the end of this week, what was
 * recorded toward the goal since the start, how many weeks that covers in order, and the difference (+ ahead, − behind).
 */
export function fiftyTwoWeek(startedOn: string, today: string, step: bigint, order: 'up' | 'down', recorded: bigint): WeekProgress {
  const week = challengeWeek(startedOn, today), expected = scheduleTotal(Math.min(week, WEEKS), step, order);
  let covered = 0; while (covered < WEEKS && scheduleTotal(covered + 1, step, order) <= recorded) covered++;
  return {week, thisWeek: weekAmount(week, step, order), expected, recorded, covered, difference: recorded - expected, done: covered >= WEEKS};
}

/** A contribution recorded toward a goal, in the goal's own units (positive in, negative out). */
export type GoalAmount = {day: string; units: bigint};
/** What was recorded toward the goal from the start day on (to today), net of anything taken out. */
export const recordedSince = (amounts: readonly GoalAmount[], startedOn: string, today: string) => amounts.reduce((t, a) => a.day >= startedOn && a.day <= today ? t + a.units : t, 0n);

// ── No-spend days ──
export type LoggedDay = {date: string; kind: 'expense' | 'income'};
export type NoSpendProgress = {counted: number; conflicts: string[]; thisWeek: number; run: number; target: number};
/**
 * The days the person marked as no-spend, from the start to today. A marked day that has a logged expense is not counted
 * (listed apart, so the person can look). The run is the marked days in a row ending today or yesterday.
 */
export function noSpend(c: Pick<Challenge, 'startedOn' | 'noSpendDays' | 'targetDays'>, log: readonly LoggedDay[], today: string, weekStart: string): NoSpendProgress {
  const spent = new Set(log.filter(e => e.kind === 'expense').map(e => e.date));
  const marked = [...new Set(c.noSpendDays ?? [])].filter(d => d >= c.startedOn && d <= today).sort();
  const counted = marked.filter(d => !spent.has(d)), set = new Set(counted);
  let run = 0, d = set.has(today) ? today : addLocalDays(today, -1);
  while (set.has(d)) { run++; d = addLocalDays(d, -1); }
  return {counted: counted.length, conflicts: marked.filter(x => spent.has(x)), thisWeek: counted.filter(x => x >= weekStart).length, run, target: c.targetDays ?? 30};
}
export function toggleNoSpendDay(c: Challenge, date: string): Challenge {
  const list = c.noSpendDays ?? [];
  if (list.includes(date)) return {...c, noSpendDays: list.filter(d => d !== date)};
  if (list.length >= MAX_MARKED_DAYS) throw Error(`Up to ${MAX_MARKED_DAYS} marked days.`);
  return {...c, noSpendDays: [...list, date].sort()};
}

// ── Round-ups by hand ──
/** "12.40" → 1240 cents; null when it is not a plain amount with at most two decimals. */
export function amountCents(text: string): bigint | null {
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(text)) return null;
  const [w, f = ''] = text.split('.');
  return BigInt(w!) * 100n + BigInt(f.padEnd(2, '0'));
}
/** The round-up of one amount to the next whole `roundTo` (an exact multiple rounds up nothing). */
export const roundUp = (cents: bigint, roundTo: number): bigint => { const unit = BigInt(roundTo) * 100n, r = cents % unit; return r === 0n ? 0n : unit - r; };
export type RoundUpEntry = {date: string; kind: 'expense' | 'income'; amount: string; currency: string};
export type RoundUpProgress = {total: bigint; thisWeek: bigint; counted: number; otherCurrency: number; weeks: {start: string; cents: bigint}[]};
/** The round-ups of the expenses logged in `currency` from the start to today, in cents; other currencies are counted apart, never converted. */
export function roundUps(entries: readonly RoundUpEntry[], currency: string, roundTo: number, startedOn: string, today: string, weekStartOf: (day: string) => string): RoundUpProgress {
  const weekNow = weekStartOf(today), weeks = new Map<string, bigint>();
  let total = 0n, thisWeek = 0n, counted = 0, otherCurrency = 0;
  for (const e of entries) {
    if (e.kind !== 'expense' || e.date < startedOn || e.date > today) continue;
    if (e.currency !== currency) { otherCurrency++; continue; }
    const c = amountCents(e.amount); if (c === null) continue;
    const r = roundUp(c, roundTo); counted++; total += r;
    const w = weekStartOf(e.date); weeks.set(w, (weeks.get(w) ?? 0n) + r);
    if (w === weekNow) thisWeek += r;
  }
  return {total, thisWeek, counted, otherCurrency, weeks: [...weeks].sort(([a], [b]) => a.localeCompare(b)).map(([start, cents]) => ({start, cents}))};
}
