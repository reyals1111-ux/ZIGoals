import {habitDay, habitStats, latestHabitRule} from '../../habits';
import {reviewState, reviewWindow} from '../../weekly-review/engine';
import {SPECIALISTS} from '../context/specialists';
import type {PageArea} from '../settings';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {runTool} from '../tools/registry';
import {shortName} from './calm';
import {zigiInsights} from './insights';

/**
 * ZIGi's suggestion chips (Session V Part 9), made on this device from the person's own records: a streak, what is still
 * open today, how far a goal is, unknown protein today, holdings without a price, the weekly review when it is due.
 * Three at most from the records, rotated by day (the same day always shows the same ones), each dismissible for the
 * day; T's starter chips fill the rest, so a new device still has three or four. Each area only when it may be read
 * for this purpose (the environment already holds no Health when the gate is closed). Nothing here is sent: a chip is
 * a question the person can tap.
 */
export type ChipAction = 'ask' | 'review' | 'insights';
export type Chip = {id: string; text: string; action: ChipAction};
export type ChipView = 'wealth' | 'portfolio' | 'staking' | 'markets' | null;
export const MAX_CHIPS = 4, MAX_DATA_CHIPS = 3;
/** T's Today chip that opens the guided weekly review on this device instead of asking the AI. */
export const REVIEW_STARTER = SPECIALISTS.today.chips[1]!;
const active = (env: ToolEnv) => env.habits.habits.filter(h => latestHabitRule(h).state === 'active');
function habitChips(env: ToolEnv): Chip[] {
  if (!env.areas.habits) return [];
  const out: Chip[] = [], habits = active(env);
  const best = habits.map(habit => ({habit, stats: habitStats(habit, env.habitDay)})).filter(x => x.stats.currentStreak >= 3).sort((a, b) => b.stats.currentStreak - a.stats.currentStreak || a.habit.title.localeCompare(b.habit.title))[0];
  if (best) out.push({id: `streak:${best.habit.id}`, text: `${shortName(best.habit.title)} streak is ${best.stats.currentStreak} ${best.stats.currentStreak === 1 ? best.stats.streakUnit.replace(/s$/, '') : best.stats.streakUnit} — how do I keep it going?`, action: 'ask'});
  const open = habits.filter(h => { const day = habitDay(h, env.habitDay, env.habitDay); return day.status === 'due' || day.status === 'partial'; });
  if (open.length > 1) out.push({id: 'open-today', text: `${open.length} habits are still open today — which first?`, action: 'ask'});
  else if (open.length === 1) out.push({id: 'open-today', text: `What's left for ${shortName(open[0]!.title)} today?`, action: 'ask'});
  return out;
}
function goalChips(env: ToolEnv): Chip[] {
  if (!env.areas.goals) return [];
  const goal = summaries(env).filter(g => g.status === 'active' && g.progressBound !== 'unavailable').map(g => ({g, pct: Math.floor(Number(g.progressPct))})).filter(x => Number.isFinite(x.pct) && x.pct > 0 && x.pct < 100).sort((a, b) => b.pct - a.pct || a.g.name.localeCompare(b.g.name))[0];
  return goal ? [{id: `goal:${goal.g.key}`, text: `You're ${goal.g.progressBound === 'at-least' ? 'at least ' : ''}${goal.pct}% to ${shortName(goal.g.name)} — what's left?`, action: 'ask'}] : [];
}
function healthChips(env: ToolEnv): Chip[] {
  if (!env.health) return [];
  const unknown = env.health.diary.filter(e => e.date === env.healthDay && e.snapshot.nutrients.proteinMg === null).length;
  return unknown ? [{id: 'protein-unknown', text: `Protein is unknown for ${unknown} ${unknown === 1 ? 'entry' : 'entries'} today — which ones?`, action: 'ask'}] : [];
}
function wealthChips(env: ToolEnv, view: ChipView): Chip[] {
  if (!env.areas.wealth) return [];
  const data = (tool: string) => { const result = runTool(tool, {}, env); return result.ok ? result.data as Record<string, unknown> : null; };
  if (view === 'portfolio') { const p = data('portfolios'); return Number(p?.count ?? 0) > 0 ? [{id: 'portfolios', text: 'How are my portfolios split?', action: 'ask'}] : []; }
  if (view === 'staking') { const s = data('staking_watch'); return Number(s?.count ?? 0) > 0 ? [{id: 'staking', text: 'What am I watching on staking?', action: 'ask'}] : []; }
  if (view === 'markets') return [];
  const totals = data('totals_per_currency'), out: Chip[] = [];
  const unpriced = Number(totals?.withoutPrice ?? 0), currencies = Array.isArray(totals?.totals) ? totals.totals.length : 0;
  if (unpriced > 0) out.push({id: 'unpriced', text: `${unpriced} ${unpriced === 1 ? 'holding has' : 'holdings have'} no price — which ${unpriced === 1 ? 'one' : 'ones'}?`, action: 'ask'});
  if (currencies > 1) out.push({id: 'currencies', text: `My wealth is in ${currencies} currencies — what are the totals?`, action: 'ask'});
  return out;
}
function reviewChip(env: ToolEnv): Chip[] {
  if (!env.weekly || !env.areas.today) return [];
  const window = reviewWindow(env.weekly.weekday, env.habitDay), state = reviewState(env.weekly, window.weekStart);
  return state === 'due' || state === 'draft' ? [{id: `review:${window.weekStart}`, text: 'Go through my week with ZIGi', action: 'review'}] : [];
}
/** A pattern ZIGi can show in the Insights view (the insight engine's own rules; Health ones only with the gate). */
function insightChip(env: ToolEnv): Chip[] {
  return zigiInsights(env, undefined, 1).length ? [{id: 'insights', text: 'What patterns show in my records?', action: 'insights'}] : [];
}
/** Every chip the records suggest for this page, before rotation. */
export function dataChips(area: PageArea, view: ChipView, env: ToolEnv): Chip[] {
  switch (area) {
    case 'today': return [...reviewChip(env), ...habitChips(env), ...goalChips(env), ...healthChips(env), ...insightChip(env)];
    case 'habits': return env.areas.habits ? [...habitChips(env), ...insightChip(env)] : [];
    case 'goals': return [...goalChips(env), ...reviewChip(env)];
    case 'health': return [...healthChips(env), ...(env.health ? insightChip(env) : [])];
    case 'wealth': return wealthChips(env, view);
    case 'help': return [];
  }
}
/** FNV-1a: a small, stable hash so the same day always rotates the same way. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
export const rotate = <T extends {id: string}>(items: readonly T[], day: string): T[] => [...items].sort((a, b) => hash(`${day}|${a.id}`) - hash(`${day}|${b.id}`) || a.id.localeCompare(b.id));
/** The chips to show: up to three from the records (rotated by day, without today's dismissed ones), then T's starters. */
export function chipsFor({area, view = null, env, day, dismissed = new Set()}: {area: PageArea; view?: ChipView; env: ToolEnv | null; day: string; dismissed?: ReadonlySet<string>}): Chip[] {
  const data = env ? rotate(dataChips(area, view, env).filter(c => !dismissed.has(c.id)), day).slice(0, MAX_DATA_CHIPS) : [];
  const starters: Chip[] = SPECIALISTS[area].chips.map(text => ({id: `starter:${text}`, text, action: text === REVIEW_STARTER && area === 'today' ? 'review' : 'ask'}));
  return [...data, ...starters.filter(s => !data.some(d => d.text === s.text || (d.action === 'review' && s.action === 'review')))].slice(0, MAX_CHIPS);
}
