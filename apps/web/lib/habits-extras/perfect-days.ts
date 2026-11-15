import {addLocalDays, localWeekday} from '../local-date';
import {habitDay, habitRuleOn, type Habit, type HabitDayStatus} from '../habits';

/**
 * Session AO (C-DVG-19, AL-COMPETITOR-GAP-087): "Perfect days", a day on which every habit due that day was done, read
 * from Habits' own records only. Nothing is stored and nothing is written by reading it.
 *
 * Which habit counts on a day is the Checklist's habit rule (lib/checklist/derive.ts `habitDot`), read here, not redefined:
 * a paused, archived, not-scheduled, skipped (a rest day, a streak freeze), planned-skip or not-yet-started habit is a rest
 * and does not count; an "X times per period" habit is done on a day it was checked in; any other habit is done when its
 * day is complete (lib/habits.ts `habitDay`). A day with no counted habit is "nothing due": never a miss, never a break.
 */
export type HabitOnDay = {id: string; title: string; state: 'done' | 'open' | 'rest'; status: HabitDayStatus; count: number; target: number; recorded: boolean};
export type PerfectDayKind = 'perfect' | 'partly' | 'no-record' | 'nothing-due' | 'ahead';
export type PerfectDay = {date: string; kind: PerfectDayKind; done: number; due: number; isToday: boolean};

const REST: ReadonlySet<HabitDayStatus> = new Set(['paused', 'archived', 'not-scheduled', 'planned-skip', 'skipped', 'not-started', 'future']);

/** One habit on one day, as the Checklist counts its dot. */
export function habitOnDay(habit: Habit, date: string, today: string): HabitOnDay {
  const day = habitDay(habit, date, today), entry = habit.entries.find(e => e.date === date);
  const base = {id: habit.id, title: habit.title, status: day.status, count: day.count, target: day.target, recorded: !!entry};
  if (REST.has(day.status)) return {...base, state: 'rest'};
  const rule = habitRuleOn(habit, date);
  if (rule?.schedule.kind === 'frequency' && entry?.disposition === 'logged' && entry.count > 0) return {...base, state: 'done'};
  return {...base, state: day.status === 'complete' ? 'done' : 'open'};
}

/** Every habit on a day (habits not started yet that day are left out: they did not exist then). */
export function habitsOnDay(habits: readonly Habit[], date: string, today: string): HabitOnDay[] {
  return habits.filter(h => date >= h.startDate).map(h => habitOnDay(h, date, today));
}

/** A day's result: perfect (every due habit done), partly (k of m), no record (due, nothing logged), nothing due, or ahead. */
export function perfectDay(habits: readonly Habit[], date: string, today: string): PerfectDay {
  const isToday = date === today;
  if (date > today) return {date, kind: 'ahead', done: 0, due: 0, isToday};
  const counted = habitsOnDay(habits, date, today).filter(h => h.state !== 'rest'), done = counted.filter(h => h.state === 'done').length, due = counted.length;
  const kind: PerfectDayKind = !due ? 'nothing-due' : done === due ? 'perfect' : done > 0 || counted.some(h => h.recorded) ? 'partly' : 'no-record';
  return {date, kind, done, due, isToday};
}

/** The first day any habit started (null without habits): the history starts there. */
export const firstHabitDay = (habits: readonly Habit[]): string | null => habits.reduce<string | null>((first, h) => !first || h.startDate < first ? h.startDate : first, null);

/**
 * The current run of perfect days: today counts once it is perfect and an unfinished today never breaks it (the day is
 * not over); a past day with nothing due is skipped, neither counted nor a break, as the Checklist's rest days are.
 */
export function perfectRun(habits: readonly Habit[], today: string): number {
  const first = firstHabitDay(habits); if (!first) return 0;
  let run = perfectDay(habits, today, today).kind === 'perfect' ? 1 : 0;
  for (let d = addLocalDays(today, -1), guard = 0; d >= first && guard < 4000; d = addLocalDays(d, -1), guard++) {
    const kind = perfectDay(habits, d, today).kind;
    if (kind === 'nothing-due') continue;
    if (kind !== 'perfect') break;
    run++;
  }
  return run;
}

export type PerfectMonth = {month: string; weeks: (PerfectDay | null)[][]; perfect: number; dueDays: number};
/** A month (YYYY-MM) as weeks of seven, Monday first; days outside the month are null. */
export function perfectMonth(habits: readonly Habit[], month: string, today: string): PerfectMonth {
  const first = `${month}-01`, start = addLocalDays(first, -((localWeekday(first) + 6) % 7)), weeks: (PerfectDay | null)[][] = [];
  let perfect = 0, dueDays = 0;
  for (let w = 0; w < 6; w++) {
    const week = Array.from({length: 7}, (_, i) => {
      const date = addLocalDays(start, w * 7 + i);
      if (!date.startsWith(month)) return null;
      const day = perfectDay(habits, date, today);
      if (day.kind === 'perfect') perfect++;
      if (day.due > 0) dueDays++;
      return day;
    });
    if (week.every(d => d === null)) break;
    weeks.push(week);
  }
  return {month, weeks, perfect, dueDays};
}

/** The month before or after (YYYY-MM). */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number], index = y * 12 + (m - 1) + by;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** A day in words: the short mark shown in its square and the full sentence a screen reader and the day's detail read. */
export function perfectDayWords(day: PerfectDay): {mark: string; text: string} {
  const so = day.isToday ? ' so far' : '';
  switch (day.kind) {
    case 'perfect': return {mark: 'All', text: `Perfect day: all ${day.due} due ${day.due === 1 ? 'habit' : 'habits'} done`};
    case 'partly': return {mark: `${day.done}/${day.due}`, text: `${day.done} of ${day.due} due ${day.due === 1 ? 'habit' : 'habits'} done${so}`};
    case 'no-record': return {mark: 'None', text: day.isToday ? `Nothing logged yet: ${day.due} due` : `No record: ${day.due} due, nothing logged`};
    case 'nothing-due': return {mark: 'Off', text: 'Nothing due'};
    default: return {mark: '', text: 'Ahead'};
  }
}

/** One habit's line in a day's detail. */
export function habitOnDayWords(h: HabitOnDay, isToday: boolean): string {
  if (h.state === 'done') return 'Done';
  if (h.state === 'open') return h.status === 'partial' ? `Partly done (${h.count} of ${h.target})` : h.status === 'failed' ? (h.recorded ? 'Marked missed' : 'Missed: nothing logged') : isToday ? 'Not done yet' : 'Not done';
  return h.status === 'skipped' ? 'Skipped: a rest day' : h.status === 'planned-skip' ? 'A planned rest day' : h.status === 'paused' ? 'Paused' : h.status === 'archived' ? 'Archived' : h.status === 'not-started' ? 'Not started yet' : 'Not due that day';
}
