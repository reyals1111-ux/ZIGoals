import {habitDay, habitRuleOn, latestHabitRule, type Habit} from '../habits';
import {addLocalDays, localWeekday} from '../local-date';

/**
 * Session AV lane 2 (habits; LEDGER #53, Finch's Self-Care Areas and Weekly Milestones): each life area's week — the
 * check-ins done of the check-ins due from Monday to Sunday over the habits in that area ("Health: 9 of 12 this week"),
 * the area's weekly milestone (the person's own number, kept as `areaGoals` {areaId: n} in the loose habit extras; TIER 3
 * stored format, additive; else every check-in due) and how many weeks in a row it was reached. Skipped and unscheduled
 * days count for nothing; a whenever habit's check-ins count as done without making any due. Pure.
 */
export type AreaWeekRow = {id: string; label: string; habits: number; done: number; due: number; goal: number; own: boolean; reached: boolean; weeksInRow: number};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const weekStartOf = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));
/** The person's own weekly milestones, {areaId: 1…500}; odd entries are left out. */
export function readAreaGoals(extras: unknown): Record<string, number> {
  const map = isObj(extras) ? extras.areaGoals : undefined, out: Record<string, number> = {};
  if (!isObj(map)) return out;
  for (const [id, n] of Object.entries(map).slice(0, 100)) if (id.length >= 1 && id.length <= 60 && typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 500) out[id] = n;
  return out;
}
/** The extras with an area's weekly milestone set (or cleared with null). Every other field kept. */
export function withAreaGoal<T extends object>(extras: T, areaId: string, goal: number | null): T {
  if (!areaId || areaId.length > 60) throw new Error('This area could not be found.');
  if (goal !== null && !(Number.isInteger(goal) && goal >= 1 && goal <= 500)) throw new Error('Choose a whole number from 1 to 500.');
  const map: Record<string, unknown> = {...(isObj((extras as {areaGoals?: unknown}).areaGoals) ? (extras as {areaGoals: Record<string, unknown>}).areaGoals : {})};
  if (goal === null) delete map[areaId]; else map[areaId] = goal;
  if (Object.keys(map).length > 100) throw new Error('Too many areas remembered on this device.');
  const {areaGoals: _drop, ...rest} = extras as T & {areaGoals?: unknown}; void _drop;
  return (Object.keys(map).length ? {...rest, areaGoals: map} : rest) as T;
}
/** One habit's done and due check-ins in the week that starts on `monday`, counted up to `today` (later days: what is due). */
export function habitWeek(habit: Habit, monday: string, today: string): {done: number; due: number} {
  let done = 0, due = 0;
  const rule = habitRuleOn(habit, monday) ?? habitRuleOn(habit, today);
  if (rule && rule.schedule.kind === 'frequency') {
    if (rule.schedule.period !== 'week' || rule.type !== 'build' || rule.state !== 'active') return {done, due};
    const end = addLocalDays(monday, 6);
    const hits = habit.entries.filter(e => e.date >= monday && e.date <= end && e.date <= today && e.disposition === 'logged' && e.count >= rule.target).length;
    return {done: Math.min(hits, rule.schedule.times), due: rule.schedule.times};
  }
  for (let i = 0; i < 7; i++) {
    const d = addLocalDays(monday, i);
    const s = d <= today ? habitDay(habit, d, today) : habitDay(habit, d, d);
    if (!s.scheduled || s.status === 'skipped' || s.status === 'not-scheduled' || s.status === 'not-started') continue;
    if (d > today && s.status !== 'due') continue;
    due++;
    if (s.status === 'complete') done++;
  }
  return {done, due};
}
/** The areas that hold at least one habit (not archived), in the areas' own order, each with its week from `today`. */
export function areaWeekRows(habits: readonly Habit[], extras: unknown, areas: readonly {id: string; label: string}[], today: string): AreaWeekRow[] {
  const assigned = isObj(extras) && isObj(extras.areas) ? extras.areas as Record<string, unknown> : {};
  const goals = readAreaGoals(extras), monday = weekStartOf(today);
  const byArea = new Map<string, Habit[]>();
  for (const h of habits) { const a = assigned[h.id]; if (typeof a === 'string' && latestHabitRule(h).state !== 'archived') byArea.set(a, [...(byArea.get(a) ?? []), h]); }
  const week = (hs: readonly Habit[], start: string) => hs.reduce((n, h) => { const w = habitWeek(h, start, today); return {done: n.done + w.done, due: n.due + w.due}; }, {done: 0, due: 0});
  return areas.filter(a => byArea.has(a.id)).map(a => {
    const hs = byArea.get(a.id)!, now = week(hs, monday), own = goals[a.id], goal = own ?? now.due;
    let weeksInRow = 0;
    for (let w = 1; w <= 26; w++) {
      const past = week(hs, addLocalDays(monday, -7 * w)), need = own ?? past.due;
      if (need <= 0 || past.done < need) break;
      weeksInRow++;
    }
    const reached = goal > 0 && now.done >= goal;
    return {id: a.id, label: a.label, habits: hs.length, done: now.done, due: now.due, goal, own: own !== undefined, reached, weeksInRow: weeksInRow + (reached ? 1 : 0)};
  });
}
