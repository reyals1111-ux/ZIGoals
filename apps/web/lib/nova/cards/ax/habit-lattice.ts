import {habitName, habitPoints, habitRows} from '../../../ai/local-answers/exact/habits';
import {resolvePeriod, type Period} from '../../../ai/local-answers/exact/period';
import {tally, type DayState} from '../../../ai/local-answers/exact/series';
import {weekStart} from '../../../ai/tools/range';
import type {Habit} from '../../../habits';
import {addLocalDays, localWeekday} from '../../../local-date';
import {formatDate, formatMonth, formatWeekday} from '../../../visual-format';

/**
 * Session AS (ADR-042 Part 2, family: lattices and heat): habits as rows of days. Every cell is the exact layer's own
 * point (lib/ai/local-answers/exact/habits.ts `habitPoints`, the Habits page's outcome): done, missed (a due day not
 * done), skipped (marked so; never counted as missed), part, open (today, still to do), rest (not due).
 * - `habitsLattice`: the habits that were due in a period × its days (the newest 31 at most);
 * - `habitWeekdays`: the habits × the seven weekdays, each cell the days not done on that weekday;
 * - `habitYear`: one habit's last 53 weeks as a heat grid, a column a week.
 */
export type LatCell = DayState | 'ahead';
export type LatticeRow = {id: string; name: string; cells: LatCell[]; done: number; missed: number; skipped: number; decided: number; open: boolean; note: string};
export type LatticeView = {
  period: Period;
  columns: {date: string; day: number; today: boolean; words: string}[];
  rows: LatticeRow[];
  /** Over the whole period (not only the columns shown): check-ins done of those due (without skipped days and today's open ones). */
  totals: {done: number; decided: number; missed: number; skipped: number; open: number};
  /** Days of the period left of the first column (a period longer than 31 days). */
  earlier: number;
};
export const LATTICE_COLUMNS = 31;
export function habitsLattice(habits: readonly Habit[], period: Period, today: string): LatticeView {
  const days = period.days.slice(-LATTICE_COLUMNS), rows = habitRows(habits, period, today);
  const byId = new Map(habits.map(h => [h.id, h] as const));
  const out = rows.map(r => {
    const decided = r.T.due - r.T.open - r.T.skipped;
    return {id: r.id, name: r.name, cells: habitPoints(byId.get(r.id)!, days, today).map(p => p.state as LatCell), done: r.T.done, missed: r.T.missed, skipped: r.T.skipped, decided, open: r.T.open > 0, note: `${r.T.done}/${decided}`};
  });
  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((n, r) => n + pick(r), 0);
  return {
    period, rows: out, earlier: period.days.length - days.length,
    columns: days.map(date => ({date, day: Number(date.slice(8, 10)), today: date === today, words: formatDate(date, {weekday: true, year: false})})),
    totals: {done: sum(r => r.T.done), decided: sum(r => r.T.due - r.T.open - r.T.skipped), missed: sum(r => r.T.missed), skipped: sum(r => r.T.skipped), open: sum(r => r.T.open)},
  };
}

export type WeekdayRow = {id: string; name: string; /** Monday first: the days not done on each weekday. */ cells: {missed: number; skipped: number; total: number}[]; total: number};
export type WeekdaysView = {
  period: Period;
  /** Monday first: the weekday's short name, its plural in words, and the days not done on it across every habit. */
  columns: {weekday: number; label: string; name: string; total: number; missed: number; skipped: number}[];
  rows: WeekdayRow[];
  /** Every day not done in the period; `worst`: the column with the most (null when nothing was missed or skipped). */
  all: number; worst: number | null; max: number;
};
const WEEKDAY_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
/** Monday first, as weekday numbers (0 = Sunday). */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
export function habitWeekdays(habits: readonly Habit[], today: string, token?: string): WeekdaysView {
  const period = (token ? resolvePeriod(token, today) : null) ?? resolvePeriod('last-90-days', today)!, monday = weekStart(today);
  const rows: WeekdayRow[] = [];
  for (const h of habits) {
    const cells = ORDER.map(() => ({missed: 0, skipped: 0, total: 0}));
    let due = 0;
    for (const p of habitPoints(h, period.days, today)) {
      if (p.state !== 'rest') due++;
      if (p.state !== 'missed' && p.state !== 'skipped') continue;
      const cell = cells[ORDER.indexOf(localWeekday(p.date))]!;
      cell[p.state]++; cell.total++;
    }
    if (due) rows.push({id: h.id, name: habitName(h), cells, total: cells.reduce((n, c) => n + c.total, 0)});
  }
  const columns = ORDER.map((weekday, i) => ({weekday, label: formatWeekday(addLocalDays(monday, i)).slice(0, 2), name: WEEKDAY_PLURAL[weekday]!,
    total: rows.reduce((n, r) => n + r.cells[i]!.total, 0), missed: rows.reduce((n, r) => n + r.cells[i]!.missed, 0), skipped: rows.reduce((n, r) => n + r.cells[i]!.skipped, 0)}));
  const all = columns.reduce((n, c) => n + c.total, 0);
  // The exact layer's own tie rule (habits.ts: the first weekday with the most, counted from Sunday).
  const bySunday = Array.from({length: 7}, (_, w) => columns.find(c => c.weekday === w)!.total), worstDay = bySunday.indexOf(Math.max(...bySunday));
  return {period, columns, rows: rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)), all, worst: all ? ORDER.indexOf(worstDay) : null, max: Math.max(1, ...rows.flatMap(r => r.cells.map(c => c.total)))};
}

export type YearCell = {date: string; state: LatCell; today: boolean; words: string};
export type YearView = {
  id: string; name: string; from: string; to: string;
  /** 53 columns, oldest first; each a week from Monday. `month`: the month's short name over the week its first day falls in. */
  weeks: {key: string; month: string | null; cells: YearCell[]}[];
  done: number; missed: number; skipped: number; part: number; decided: number; open: boolean;
  dates: {missed: string[]; skipped: string[]};
};
export const YEAR_WEEKS = 53;
const STATE_WORDS: Record<LatCell, string> = {done: 'done', part: 'partly done', missed: 'missed', skipped: 'skipped', open: 'still open', rest: 'not due', none: 'nothing logged', ahead: 'still to come'};
export function habitYear(habit: Habit, today: string, weeks = YEAR_WEEKS): YearView {
  const from = addLocalDays(weekStart(today), -(weeks - 1) * 7), dates: string[] = [];
  for (let d = from; d <= today; d = addLocalDays(d, 1)) dates.push(d);
  const points = habitPoints(habit, dates, today), by = new Map(points.map(p => [p.date, p.state] as const)), T = tally(points);
  const grid = Array.from({length: weeks}, (_, w) => {
    const key = addLocalDays(from, w * 7), cells = Array.from({length: 7}, (_, i): YearCell => {
      const date = addLocalDays(key, i), state: LatCell = date > today ? 'ahead' : by.get(date) ?? 'rest';
      return {date, state, today: date === today, words: `${formatDate(date, {weekday: true, year: date.slice(0, 4) !== today.slice(0, 4)})}: ${STATE_WORDS[state]}`};
    });
    const first = cells.find(c => c.date.slice(8, 10) === '01');
    return {key, month: first ? formatMonth(`${first.date}T12:00:00Z`, {year: false, timeZone: 'UTC'}) : null, cells};
  });
  const part = T.dates.part.filter(d => d !== today).length;
  return {id: habit.id, name: habitName(habit), from, to: today, weeks: grid, done: T.done, missed: T.missed, skipped: T.skipped, part, decided: T.due - T.open - T.skipped, open: T.open > 0, dates: {missed: T.dates.missed, skipped: T.dates.skipped}};
}
