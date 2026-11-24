import type {Period} from '../../../ai/local-answers/exact/period';
import {tally, type DayPoint, type DayState} from '../../../ai/local-answers/exact/series';
import {daysBetween, weekStart} from '../../../ai/tools/range';
import {addLocalDays} from '../../../local-date';
import {taskState} from '../../../tasks/engine';
import type {Task, Tasks} from '../../../tasks/schema';
import {formatClock, formatDate, formatMonth, formatWeekday} from '../../../visual-format';
import type {CalCell, CalState, CalendarView} from './calendar';
import {isFinished} from '../../../tasks/finished';

/**
 * Session AS (ADR-042 Part 2): tasks as a time axis, a month, ranked bars and a dial. One overdue rule everywhere: the
 * Tasks page's own (lib/tasks/engine.ts `taskState` with the wall clock: a task is overdue after its day, and a timed
 * task due today once its time has passed). A finished task's day is the day it was finished in the app's zone
 * (`doneDay`, lib/tasks/device.ts `deviceDay`). Only titles, days and counts are read; a task's notes never are.
 */
export type DoneDay = (iso: string) => string;
/** A task's title without the Showcase's label ("Example · Book the dentist" → "Book the dentist"). */
export const taskTitle = (title: string): string => title.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?.*$/i, '').replace(/^Example · /, '').trim() || title.trim();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export type TaskLoad = {open: number; overdue: number; today: number; ahead: number; someday: number};
/** Open tasks split by the Tasks page's states: overdue, due today, ahead (any later day) and without a day. */
export function taskLoad(record: Tasks, today: string, clock?: string): TaskLoad {
  const load: TaskLoad = {open: 0, overdue: 0, today: 0, ahead: 0, someday: 0};
  for (const t of record.tasks) {
    if (t.doneAt) continue;
    const s = taskState(t, today, clock);
    load.open++; load[s === 'soon' || s === 'later' ? 'ahead' : s]++;
  }
  return load;
}

export type OverdueRow = {key: string; label: string; /** Whole days since its day (0: due today, its time has passed). */ days: number; due: string; time: string | null; text: string};
export type OverdueView = {rows: OverdueRow[]; open: number; max: number};
/** Overdue tasks, the oldest first. */
export function taskOverdue(record: Tasks, today: string, clock?: string): OverdueView {
  const open = record.tasks.filter(t => !t.doneAt);
  const rows = open.filter(t => taskState(t, today, clock) === 'overdue').map((t): OverdueRow => {
    const days = daysBetween(t.due!, today);
    return {key: t.id, label: taskTitle(t.title), days, due: t.due!, time: t.time ?? null, text: days > 0 ? `${plural(days, 'day')} · due ${formatDate(t.due!, {year: false})}` : `due today at ${formatClock(t.time!)}`};
  }).sort((a, b) => b.days - a.days || (a.time ?? '').localeCompare(b.time ?? '') || a.label.localeCompare(b.label));
  return {rows, open: open.length, max: Math.max(1, ...rows.map(r => r.days))};
}

export type TimelineMark = {key: string; /** 0–1 along the axis. */ at: number; /** Its place in its day's stack (0: on the axis). */ lane: number; kind: 'overdue' | 'today' | 'ahead' | 'done'; title: string; words: string};
export type TaskTimeline = {
  from: string; to: string;
  /** Where today stands on the axis (0–1), and the axis' labels. */
  todayAt: number; ticks: {at: number; label: string}[];
  marks: TimelineMark[]; done: TimelineMark[];
  counts: TaskLoad & {/** Due after the axis ends. */ later: number; /** Done in the period. */ done: number; /** Overdue from before the axis starts (drawn at its left end). */ earlier: number};
  oldest: OverdueRow | null;
};
export const TIMELINE_BACK = 21, TIMELINE_AHEAD = 7, TIMELINE_LANES = 5;
export function taskTimeline(record: Tasks, period: Period, today: string, clock: string | undefined, doneDay: DoneDay): TaskTimeline {
  const load = taskLoad(record, today, clock), overdue = taskOverdue(record, today, clock), floor = addLocalDays(today, -TIMELINE_BACK), to = addLocalDays(today, TIMELINE_AHEAD);
  const finished = record.tasks.filter(isFinished /* review B5L-1: a cancelled task is not a finish */).map(t => ({t, day: doneDay(t.doneAt!)})).filter(x => x.day >= period.from && x.day <= period.to);
  const first = [today, ...overdue.rows.map(r => r.due), ...finished.map(x => x.day)].sort()[0]!, from = first < floor ? floor : first;
  const span = Math.max(1, daysBetween(from, to)), at = (day: string) => Math.max(0, Math.min(1, daysBetween(from, day) / span));
  const stack = new Map<string, number>(), lane = (day: string) => { const n = stack.get(day) ?? 0; stack.set(day, n + 1); return Math.min(n, TIMELINE_LANES - 1); };
  const marks: TimelineMark[] = [];
  let later = 0;
  const open = record.tasks.filter(t => !t.doneAt && t.due).sort((a, b) => a.due!.localeCompare(b.due!) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.title.localeCompare(b.title));
  for (const t of open) {
    const s = taskState(t, today, clock), due = t.due!;
    if (due > to) { later++; continue; }
    const kind = s === 'overdue' ? 'overdue' : s === 'today' ? 'today' : 'ahead', day = due < from ? from : due, when = `${formatDate(due, {weekday: true, year: false})}${t.time ? ` ${formatClock(t.time)}` : ''}`;
    marks.push({key: t.id, at: at(day), lane: lane(day), kind, title: taskTitle(t.title), words: `${taskTitle(t.title)}: ${kind === 'overdue' ? 'overdue, due' : 'due'} ${when}`});
  }
  const done = finished.filter(x => x.day >= from).sort((a, b) => a.day.localeCompare(b.day)).map(({t, day}): TimelineMark => ({key: t.id, at: at(day), lane: 0, kind: 'done', title: taskTitle(t.title), words: `${taskTitle(t.title)}: done ${formatDate(day, {weekday: true, year: false})}`}));
  // The first day is named only where its label has room beside "Today".
  const ticks = [...(at(today) >= 0.22 ? [{at: 0, label: formatDate(from, {year: false})}] : []), {at: at(today), label: 'Today'}, {at: 1, label: formatDate(to, {year: false})}];
  return {from, to, todayAt: at(today), ticks, marks, done, oldest: overdue.rows[0] ?? null,
    counts: {...load, ahead: load.ahead - later, later, done: finished.length, earlier: overdue.rows.filter(r => r.due < from).length}};
}

export type TasksMonth = {
  /** The month as the calendar family draws it: an overdue day is `missed` (lit), a day with an open task `part` (half lit), a day with only finished tasks `done`. */
  view: CalendarView;
  /** The month's days with an open task due (overdue ones apart) and with a finished task, oldest first. */
  dueDays: string[]; overdueDays: string[]; doneDays: string[];
  /** Days with a task due or done; tasks due in the month still open, and tasks finished in it. */
  taskDays: number; due: number; done: number;
};
const pad = (n: number) => String(n).padStart(2, '0');
export function tasksMonth(record: Tasks, period: Period, today: string, clock: string | undefined, doneDay: DoneDay): TasksMonth {
  const year = Number(period.to.slice(0, 4)), m = Number(period.to.slice(5, 7)) - 1, prefix = period.to.slice(0, 8);
  const first = `${prefix}01`, last = `${prefix}${pad(new Date(Date.UTC(year, m + 1, 0)).getUTCDate())}`, start = weekStart(first), end = addLocalDays(weekStart(last), 6);
  const due = new Map<string, Task[]>(), late = new Map<string, Task[]>(), finished = new Map<string, Task[]>();
  const add = (map: Map<string, Task[]>, day: string, t: Task) => { if (day >= first && day <= last) map.set(day, [...(map.get(day) ?? []), t]); };
  for (const t of record.tasks) {
    if (t.doneAt) { if (isFinished(t)) add(finished, doneDay(t.doneAt), t); /* review B5L-1: a cancelled task is neither done nor due */ }
    else if (t.due) add(taskState(t, today, clock) === 'overdue' ? late : due, t.due, t);
  }
  const stateOf = (date: string): CalState => late.has(date) ? 'missed' : due.has(date) ? 'part' : finished.has(date) ? 'done' : date > today ? 'ahead' : 'rest';
  const cell = (date: string): CalCell => {
    const inMonth = date >= first && date <= last, state = inMonth ? stateOf(date) : 'rest';
    const bits = [late.has(date) ? `${late.get(date)!.length} overdue` : '', due.has(date) ? `${due.get(date)!.length} due` : '', finished.has(date) ? `${finished.get(date)!.length} done` : ''].filter(Boolean);
    return {date, day: Number(date.slice(8, 10)), state, today: date === today, inPeriod: inMonth, value: null, words: `${formatDate(date, {weekday: true, year: false})}: ${bits.length ? bits.join(', ') : 'no task'}`};
  };
  const weeks: CalCell[][] = [];
  for (let d = start; d <= end; d = addLocalDays(d, 7)) weeks.push(Array.from({length: 7}, (_, i) => cell(addLocalDays(d, i))));
  const days = weeks.flat().filter(c => c.inPeriod), points: DayPoint[] = days.map(c => ({date: c.date, state: (c.state === 'ahead' ? 'rest' : c.state) as DayState, value: null}));
  const keys = (map: Map<string, Task[]>) => [...map.keys()].sort(), count = (map: Map<string, Task[]>) => [...map.values()].reduce((n, list) => n + list.length, 0);
  return {
    view: {period, title: formatMonth(`${period.to}T12:00:00Z`, {timeZone: 'UTC'}), weekdays: Array.from({length: 7}, (_, i) => formatWeekday(addLocalDays(start, i)).slice(0, 1)), weeks, tally: tally(points),
      lit: days.filter(c => (c.state === 'missed' || c.state === 'part') && !c.today).map(c => c.date), longestRun: 0},
    dueDays: keys(due), overdueDays: keys(late), doneDays: keys(finished), taskDays: new Set([...due.keys(), ...late.keys(), ...finished.keys()]).size, due: count(due) + count(late), done: count(finished),
  };
}
