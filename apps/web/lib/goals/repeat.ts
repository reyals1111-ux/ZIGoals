import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays, localDate, localWeekday} from '../local-date';
import {allocate, platformSchema, rescaleUnits, type Platform, type PrivateGoal} from '../positions';
import {isOwnUnitGoal, ownUnitPosition} from './goal-units';

/**
 * Session AW (X4, LEDGER #447; Strides' repeating goals; TIER 3 (stored formats): a new record, additive): a goal that
 * starts again each week, month or year — "Read 2 books a month". Each period begins at nothing and the earlier periods
 * are kept as a row of results ("Oct 2 of 2 · Nov 1 of 2"). Only a count goal of the person's own unit (books, pages:
 * `denom` "manual:…", lib/goals/goal-units.ts) and a project can repeat; a savings goal, a rewards goal and a count of a
 * coin or a share never do (money and holdings do not start again).
 *
 * Where it is kept: a goal's record is the strict `privateGoalSchema` in the finance record (`zigoals:platform:v1`,
 * lib/positions.ts), which older builds refuse to read with an unknown field, so the repeat lives in its own loose,
 * versioned device record, keyed by the goal's id. The finance record only ever gets normal writes it already knows:
 * - a count goal: at a new period its count toward the goal is set to what was added in that period (usually nothing),
 *   with `allocate` on the goal's own tracked source; what was added stays in the history, so each period's result is
 *   read again from the contributions (never stored twice);
 * - a project: at a new period its milestones are unticked, and how many were done is kept here (`results`), as the
 *   milestones themselves carry no date.
 * A locked or closed goal is left alone. No wallet, chain, contract or signing record is read or written.
 */
export const GOAL_REPEAT_KEY = 'zigoals:goal-repeat:v1';
export type RepeatEvery = 'week' | 'month' | 'year';
export const REPEAT_EVERY: readonly RepeatEvery[] = ['week', 'month', 'year'];
export const MAX_REPEAT_GOALS = 200;
export const MAX_RESULTS = 260;
const periodKey = z.string().regex(/^(week:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2}|year:\d{4})$/);
const resultSchema = z.looseObject({period: periodKey, done: z.number().int().min(0).max(100_000), of: z.number().int().min(0).max(100_000)});
export const repeatEntrySchema = z.looseObject({
  every: z.enum(['week', 'month', 'year']),
  /** The first day of the period the repeat began in. */
  since: z.iso.date(),
  /** The period the goal's live count belongs to: once a new period begins, the count starts again. */
  period: periodKey,
  /** A project's finished periods (milestones done of all); a count goal's are read from its contributions. */
  results: z.array(resultSchema).max(MAX_RESULTS).optional(),
  setAt: z.iso.datetime(),
});
export type RepeatEntry = z.infer<typeof repeatEntrySchema>;
export const goalRepeatSchema = z.looseObject({
  version: z.literal(1),
  goals: z.record(z.string().regex(/^\d+$/).max(80), repeatEntrySchema).refine(g => Object.keys(g).length <= MAX_REPEAT_GOALS, `Up to ${MAX_REPEAT_GOALS} goals.`),
});
export type GoalRepeat = z.infer<typeof goalRepeatSchema>;
export const emptyGoalRepeat = (): GoalRepeat => ({version: 1, goals: {}});
export const GOAL_REPEAT: DeviceRecordSpec<GoalRepeat> = {key: GOAL_REPEAT_KEY, schema: goalRepeatSchema, empty: emptyGoalRepeat};

/** Monday of the week, the 1st of the month or 1 January: the first day of `day`'s period. */
export function periodStart(every: RepeatEvery, day: string): string {
  if (every === 'week') return addLocalDays(day, -((localWeekday(day) + 6) % 7));
  return every === 'month' ? `${day.slice(0, 7)}-01` : `${day.slice(0, 4)}-01-01`;
}
/** The last day of the period that starts on `start`. */
export function periodEnd(every: RepeatEvery, start: string): string {
  if (every === 'week') return addLocalDays(start, 6);
  if (every === 'year') return `${start.slice(0, 4)}-12-31`;
  const y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
  return addLocalDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1);
}
export function keyOf(every: RepeatEvery, day: string): string {
  const start = periodStart(every, day);
  return every === 'week' ? `week:${start}` : every === 'month' ? `month:${start.slice(0, 7)}` : `year:${start.slice(0, 4)}`;
}
/** The first day of a period key. */
export function startOfKey(key: string): string {
  const [kind, value] = key.split(':') as [string, string];
  return kind === 'week' ? value : kind === 'month' ? `${value}-01` : `${value}-01-01`;
}
const everyOfKey = (key: string): RepeatEvery => key.split(':')[0] as RepeatEvery;
/** The periods from `fromKey` up to, not including, `untilKey`, oldest first (at most MAX_RESULTS). */
export function periodsBetween(fromKey: string, untilKey: string): string[] {
  const every = everyOfKey(fromKey), out: string[] = [];
  for (let start = startOfKey(fromKey); out.length < MAX_RESULTS; start = addLocalDays(periodEnd(every, start), 1)) {
    const key = keyOf(every, start);
    if (key >= untilKey) break;
    out.push(key);
  }
  return out;
}

/** True when this goal can start again each period: a count of the person's own unit, or a project. */
export function canRepeat(goal: Pick<PrivateGoal, 'type' | 'denom'>): boolean {
  return goal.type === 'PROJECT' || isOwnUnitGoal(goal);
}

/** Turns the repeat on (or changes how often): this period keeps what is counted now; the next one starts at nothing. */
export function setRepeat(record: GoalRepeat, goal: Pick<PrivateGoal, 'id' | 'type' | 'denom'>, every: RepeatEvery, today: string, at: string): GoalRepeat {
  if (!canRepeat(goal)) throw Error('Only a count of your own unit, or a project, can start again each period.');
  const old = record.goals[goal.id];
  const entry: RepeatEntry = {every, since: periodStart(every, today), period: keyOf(every, today), setAt: at};
  // A project's earlier results stay only while the period length stays (a row of months, never months and weeks mixed).
  if (old?.every === every && old.results?.length) entry.results = old.results;
  if (old?.every === every) entry.since = old.since;
  const goals = {...record.goals, [goal.id]: entry};
  if (Object.keys(goals).length > MAX_REPEAT_GOALS) throw Error(`Up to ${MAX_REPEAT_GOALS} goals can start again.`);
  return goalRepeatSchema.parse({...record, goals});
}
/** Turns it off: the goal keeps counting from now on as an ordinary goal; nothing in the finance record changes. */
export function clearRepeat(record: GoalRepeat, goalId: string): GoalRepeat {
  const goals = {...record.goals}; delete goals[goalId];
  return goalRepeatSchema.parse({...record, goals});
}

/** What was added to a count goal from `from` to `to` (local days, inclusive), in the goal's units (minor units). */
export function addedBetween(s: Pick<Platform, 'contributions'>, goal: Pick<PrivateGoal, 'id' | 'decimals'>, from: string, to: string): bigint {
  let total = 0n;
  for (const e of s.contributions) {
    if (e.goalId !== goal.id || e.goalScope !== 'private') continue;
    const day = localDate(new Date(e.occurredAt));
    if (day < from || day > to) continue;
    const q = BigInt(rescaleUnits(e.quantity, e.decimals, goal.decimals));
    total += e.direction === 'IN' ? q : -q;
  }
  return total > 0n ? total : 0n;
}
/** Minor units as a plain number, to two decimals at most (2.5 pages), never rounded up. */
const whole = (minor: bigint, decimals: number) => decimals >= 2 ? Number(minor / 10n ** BigInt(decimals - 2)) / 100 : Number(minor) / 10 ** decimals;

export type RepeatRow = {period: string; done: number; of: number; reached: boolean; current: boolean};
/**
 * The goal's row of results, oldest first, the period now last: a count goal's from its contributions (what was added in
 * each period, the target as it is now), a project's from the results kept here. A project's period with nothing kept
 * (the app was not opened then) is left out, never shown as 0.
 */
export function repeatRows(s: Pick<Platform, 'contributions'>, goal: Pick<PrivateGoal, 'id' | 'type' | 'decimals' | 'target' | 'milestones' | 'denom'>, entry: RepeatEntry, today: string): RepeatRow[] {
  const now = keyOf(entry.every, today), first = keyOf(entry.every, entry.since);
  if (goal.type === 'PROJECT') {
    const kept = (entry.results ?? []).filter(r => r.period < now).map(r => ({...r, reached: r.of > 0 && r.done >= r.of, current: false}));
    const done = goal.milestones.filter(m => m.done).length, of = goal.milestones.length;
    return [...kept, {period: now, done, of, reached: of > 0 && done >= of, current: true}];
  }
  const target = whole(BigInt(goal.target), goal.decimals);
  return [...periodsBetween(first, now), now].map(key => {
    const start = startOfKey(key), end = periodEnd(entry.every, start);
    const done = whole(addedBetween(s, goal, start, end), goal.decimals);
    return {period: key, done, of: target, reached: target > 0 && done >= target, current: key === now};
  });
}

export type Turned = {platform: Platform; record: GoalRepeat; turned: string[]};
/**
 * At a new period, each repeating goal starts again. Pure: the finance record and the repeat record that should follow,
 * and the goals that turned. A goal that is gone, closed or locked, or can no longer repeat, is left as it is.
 * - a count goal: its count toward the goal becomes what was added since this period began (on its own tracked source,
 *   capped at what that source holds), so the ring shows this period;
 * - a project: how many milestones were done is kept for the period that ended, then they are unticked.
 */
export function turnRepeats(platform: Platform, record: GoalRepeat, today: string): Turned {
  let next = platform;
  const goals = {...record.goals}, turned: string[] = [];
  for (const [id, entry] of Object.entries(record.goals)) {
    const now = keyOf(entry.every, today);
    if (entry.period >= now) continue;
    const goal = next.goals.find(g => g.id === id);
    if (!goal || goal.status === 'closed' || goal.locked || !canRepeat(goal)) continue;
    if (goal.type === 'PROJECT') {
      const results = [...(entry.results ?? []).filter(r => r.period !== entry.period), {period: entry.period, done: goal.milestones.filter(m => m.done).length, of: goal.milestones.length}].slice(-MAX_RESULTS);
      if (goal.milestones.some(m => m.done)) next = platformSchema.parse({...next, goals: next.goals.map(g => g.id === id ? {...g, milestones: g.milestones.map(m => ({...m, done: false}))} : g)});
      goals[id] = {...entry, period: now, results};
    } else {
      const source = ownUnitPosition(next, goal);
      if (source) {
        const since = addedBetween(next, goal, startOfKey(now), today), held = BigInt(source.quantity), target = BigInt(goal.target);
        let count = since < held ? since : held;
        if (count > target) count = target;
        const others = next.allocations.filter(a => a.positionId === source.id && a.goalId !== id).reduce((n, a) => n + BigInt(a.quantity), 0n);
        if (count + others > held) count = held > others ? held - others : 0n;
        next = allocate(next, id, source.id, rescaleUnits(count.toString(), goal.decimals, source.decimals));
      }
      goals[id] = {...entry, period: now};
    }
    turned.push(id);
  }
  return turned.length ? {platform: next, record: goalRepeatSchema.parse({...record, goals}), turned} : {platform, record, turned};
}
