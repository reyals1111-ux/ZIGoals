import {latestHabitRule, type Habit} from '../habits';
import {habitOutcomesBetween} from '../habit-outcomes';
import {goalProgress, type Platform, type PrivateGoal} from '../positions';
import {addLocalDays} from '../local-date';

/**
 * Session AW (X4, LEDGER #446; Strides' year report): "Your year" (or all time) in the Life review — each habit's
 * check-ins done of those due and its longest run, each goal's progress at the start and at the end of the period, all
 * grouped by life area. Counts only, from the person's own records; "not recorded" where nothing was, never a zero and
 * never a grade. Derived: nothing is stored (the Life review's period stays week | month in its record).
 */
export type YearScope = {kind: 'year'; year: number} | {kind: 'all'};
export type YearWindow = {kind: 'year' | 'all'; start: string; end: string; key: string};
export type RunUnit = 'days' | 'weeks' | 'months' | 'years';
export type HabitYearRow = {id: string; title: string; done: number; due: number; longest: number; unit: RunUnit; area: string | null};
/** A percent of the goal's target (0–100), "new" when the goal began inside the period, null when nothing was recorded. */
export type GoalPoint = number | 'new' | null;
export type GoalYearRow = {id: string; name: string; href: string; type: PrivateGoal['type']; start: GoalPoint; end: GoalPoint; area: string | null; status: PrivateGoal['status']};
export type AreaGroup = {id: string | null; label: string; habits: HabitYearRow[]; goals: GoalYearRow[]; done: number; due: number};
export type YearReport = {window: YearWindow; habits: HabitYearRow[]; goals: GoalYearRow[]; areas: AreaGroup[]; totals: {done: number; due: number}};

const dayOf = (iso: string) => iso.slice(0, 10);
/** The first day anything was recorded: a habit's start or a goal's creation; null with neither. */
export function earliestRecord(habits: readonly Pick<Habit, 'startDate'>[], goals: readonly Pick<PrivateGoal, 'createdAt'>[]): string | null {
  const days = [...habits.map(h => h.startDate), ...goals.map(g => dayOf(g.createdAt))].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return days[0] ?? null;
}
/** The years that hold a record, newest first; this year always. */
export function recordYears(earliest: string | null, today: string): number[] {
  const now = Number(today.slice(0, 4)), first = earliest ? Math.max(Math.min(Number(earliest.slice(0, 4)), now), now - 50) : now, out: number[] = [];
  for (let y = now; y >= first; y--) out.push(y);
  return out;
}
/** A year (1 January to 31 December, or to today for this year) or all time (the first record to today). */
export function yearWindow(scope: YearScope, today: string, earliest: string | null): YearWindow {
  if (scope.kind === 'all') { const start = earliest && earliest < today ? earliest : today; return {kind: 'all', start, end: today, key: 'all'}; }
  const year = Math.min(scope.year, Number(today.slice(0, 4))), end = year === Number(today.slice(0, 4)) ? today : `${year}-12-31`;
  return {kind: 'year', start: `${year}-01-01`, end, key: `year:${year}`};
}

/** One habit in the window: check-ins done of due (a skipped day counts for neither) and its longest run of done ones. */
export function habitYear(habit: Habit, window: YearWindow, today: string): Omit<HabitYearRow, 'area'> | null {
  if (habit.startDate > window.end) return null;
  const outcomes = habitOutcomesBetween(habit, window.start, window.end, today);
  if (!outcomes.length) return null;
  // The run is counted in the unit the habit is counted in now (days, or weeks for "3 times a week").
  const unit = (outcomes.at(-1)!.unit) as RunUnit;
  let done = 0, due = 0, run = 0, longest = 0;
  for (const o of outcomes) {
    if (o.status === 'skipped') continue;
    due++;
    if (o.status === 'complete') done++;
    if (o.unit !== unit) continue;
    // A skipped day neither adds nor breaks a run; an open one (today, not done yet) leaves it as it is.
    if (o.status === 'complete') { run++; longest = Math.max(longest, run); } else if (o.status === 'failed') run = 0;
  }
  return {id: habit.id, title: habit.title, done, due, longest, unit};
}

/** A goal's percent of its target from a counted value, 0–100 (whole percent, rounded down). */
const percent = (current: bigint, target: bigint): number => target > 0n ? Number((current >= target ? target : current) * 100n / target) : 0;
/**
 * A goal at the start and the end of the window: its last counted snapshot before the window began (or "new" when it
 * was made inside it) and its last snapshot by the end (today's own progress when the window ends today).
 */
export function goalYear(platform: Platform, goal: PrivateGoal, window: YearWindow, today: string, now = Date.now()): Omit<GoalYearRow, 'area' | 'href'> | null {
  const made = dayOf(goal.createdAt);
  if (made > window.end) return null;
  const snaps = platform.goalHistory.filter(h => h.goalId === goal.id && h.kind === 'valuation').flatMap(h => h.kind === 'valuation' ? [h] : []).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const point = (until: string): number | null => { const h = [...snaps].reverse().find(x => dayOf(x.capturedAt) <= until); return h ? percent(BigInt(h.current), BigInt(h.target)) : null; };
  const start: GoalPoint = made >= window.start ? 'new' : point(addLocalDays(window.start, -1));
  let end: GoalPoint = null;
  if (window.end >= today && goal.status !== 'closed') {
    try { const p = goalProgress(platform, goal.id, now); end = p.requiresReview && goal.type !== 'PROJECT' ? point(window.end) : percent(BigInt(p.current), BigInt(p.target)); } catch { end = point(window.end); }
  } else end = point(window.end);
  return {id: goal.id, name: goal.name, type: goal.type, start, end, status: goal.status};
}

export function yearReport(input: {
  window: YearWindow; habits: readonly Habit[]; platform: Platform; today: string; now?: number;
  /** habit id → area id, and `private:<goal id>` → area id (the goal extras and the habit extras). */
  habitAreas: Readonly<Record<string, string>>; goalAreas: Readonly<Record<string, string | undefined>>;
  /** The person's life areas in their order (the seven built in, then their own). */
  areas: readonly {id: string; label: string}[];
}): YearReport {
  const {window, today, platform, areas} = input, known = new Set(areas.map(a => a.id));
  const areaOf = (id: string | undefined) => id && known.has(id) ? id : null;
  const habits = input.habits.filter(h => latestHabitRule(h).state !== 'archived' || h.entries.some(e => e.date >= window.start && e.date <= window.end))
    .map(h => { const row = habitYear(h, window, today); return row ? {...row, area: areaOf(input.habitAreas[h.id])} : null; })
    .filter((r): r is HabitYearRow => r !== null);
  const goals = platform.goals.map(g => { const row = goalYear(platform, g, window, today, input.now); return row ? {...row, href: `/app/goals/tracked/${g.id}`, area: areaOf(input.goalAreas[`private:${g.id}`])} : null; })
    .filter((r): r is GoalYearRow => r !== null);
  const groups: AreaGroup[] = [...areas.map(a => ({id: a.id as string | null, label: a.label})), {id: null, label: 'No area yet'}].map(a => {
    const hs = habits.filter(h => h.area === a.id), gs = goals.filter(g => g.area === a.id);
    return {...a, habits: hs, goals: gs, done: hs.reduce((n, h) => n + h.done, 0), due: hs.reduce((n, h) => n + h.due, 0)};
  }).filter(g => g.habits.length || g.goals.length);
  return {window, habits, goals, areas: groups, totals: {done: habits.reduce((n, h) => n + h.done, 0), due: habits.reduce((n, h) => n + h.due, 0)}};
}
