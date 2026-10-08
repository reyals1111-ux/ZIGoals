import * as z from 'zod';
import {habitDay, habitRuleOn, habitStats, latestHabitRule, measurementUnit, scheduleLabel, type Habit, type HabitRule} from '../../habits';
import type {ToolEnv} from './env';
import {capRows, num, ok, plural, provenance, refuse, text} from './format';
import {eachDay, parseRange, type DayRange} from './range';
import {matchByName} from './subjects';
import {NO_ARGS, type ToolDefinition, type ToolRefusal} from './types';

/**
 * Habit tools (Session V Part 2): the person's own habit journal, read with the journal's day (`habitCalendarDay`) and
 * the engine's own day results (`habitDay`, `habitStats`), so ZIGi counts exactly what Habits shows. Values a Health link
 * filled in automatically are Health values: with the Health gate closed they are held back and said to be held back.
 * Units follow each day's own rule (a habit can change from minutes to hours); minutes are added only for habits measured
 * in time, otherwise the answer is "unknown: not measured in time", never a guess.
 */
const MINUTE_UNITS = new Set(['min', 'mins', 'minute', 'minutes', 'm', 'minuut', 'minuten', 'minuto', 'minutos']);
const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours', 'uur', 'uren', 'heure', 'heures', 'stunde', 'stunden']);
/** Minutes for a logged value under its day's rule, or null when the habit is not measured in time. */
export function minutesOf(rule: HabitRule, value: number): number | null {
  const m = rule.measurement;
  if (m.kind === 'duration') return m.unit === 'hours' ? value * 60 : value;
  if (m.kind === 'count' || m.kind === 'quantity' || m.kind === 'custom') {
    const unit = m.unit.trim().toLowerCase();
    if (MINUTE_UNITS.has(unit)) return value;
    if (HOUR_UNITS.has(unit)) return value * 60;
  }
  return null;
}
export const isTimed = (rule: HabitRule) => minutesOf(rule, 1) !== null;
const unitOf = (rule: HabitRule) => measurementUnit(rule) || (rule.measurement.kind === 'boolean' ? 'done' : '');
const visibleHabits = (env: ToolEnv, archived = false) => env.habits.habits.filter(h => archived || latestHabitRule(h).state !== 'archived');
/** A habit from a handle of this reply or from the person's words; two equally good matches come back as choices. */
export function findHabit(env: ToolEnv, ref: string, tool: string): {ok: true; habit: Habit; handle: string} | ToolRefusal {
  const label = text(ref, 40);
  if (/^h\d{1,3}$/i.test(ref.trim())) {
    const handle = env.handles.find(ref, 'habit'), habit = handle ? env.habits.habits.find(h => h.id === handle.id) : undefined;
    return habit && handle ? {ok: true, habit, handle: handle.handle} : refuse(tool, label, 'not-found', `No habit ${ref.trim()} in this conversation; name the habit instead.`);
  }
  const match = matchByName(visibleHabits(env, true), ref, h => h.title, h => h.id);
  if (match.kind === 'none') return refuse(tool, label, 'not-found', `No habit matches "${label}".`);
  if (match.kind === 'many') return refuse(tool, label, 'ambiguous', `Two or more habits match "${label}". Which one?`, match.choices.map(c => ({label: text(c.label, 60), handle: env.handles.add('habit', c.id, c.label)})));
  return {ok: true, habit: match.item, handle: env.handles.add('habit', match.item.id, match.item.title)};
}
const heldBack = (env: ToolEnv, entry: Habit['entries'][number]) => entry.source === 'health' && !env.health;
function resolveRange(env: ToolEnv, raw: string | undefined, fallback: string, tool: string, label: string): DayRange | ToolRefusal {
  const range = parseRange(raw?.trim() || fallback, env.habitDay);
  return range.ok ? {from: range.from, to: range.to, label: range.label} : refuse(tool, label, 'range', range.message);
}
const isRefusal = (value: DayRange | ToolRefusal): value is ToolRefusal => 'ok' in value;
const rangeArg = z.string().trim().max(80).optional();
const habitArg = z.string().trim().min(1).max(120);
const RANGE_PROP = {type: 'string', description: 'A period such as "today", "yesterday", "this week", "last month", "the last 14 days", "since 2026-09-01", "2026-09-01..2026-09-15" or "September 2026". Default: this month.'} as const;
const HABIT_PROP = {type: 'string', description: 'The habit: a handle from this conversation (h1) or its name as the person said it.'} as const;

export const listHabits: ToolDefinition<{include_archived?: boolean}> = {
  name: 'list_habits', title: 'Habits', area: 'habits',
  description: 'Lists the person\'s habits with a handle each: type, measure, schedule, target, state, today\'s status and current streak.',
  parameters: {type: 'object', properties: {include_archived: {type: 'boolean', description: 'Also list archived habits (default false).'}}},
  args: z.object({include_archived: z.boolean().optional()}),
  label: () => 'Your habits',
  run(args, env) {
    const habits = visibleHabits(env, args.include_archived === true);
    const rows = habits.map(habit => {
      const rule = latestHabitRule(habit), day = habitDay(habit, env.habitDay, env.habitDay), stats = habitStats(habit, env.habitDay);
      const entry = habit.entries.find(e => e.date === env.habitDay);
      return {handle: env.handles.add('habit', habit.id, habit.title), title: text(habit.title), type: rule.type, measure: unitOf(rule), schedule: scheduleLabel(rule.schedule), target: `${rule.target}${measurementUnit(rule) ? ` ${measurementUnit(rule)}` : ''} per ${rule.targetPeriod}`, state: rule.state, today: day.status, todayValue: entry && heldBack(env, entry) ? 'from Health, not shared' : day.count || 0, streak: `${stats.currentStreak} ${stats.streakUnit}`, timeOfDay: habit.timeOfDay};
    });
    const capped = capRows(rows, env, false);
    return ok('list_habits', 'Your habits', provenance(env, 'Habits journal', null, null, null), {habits: capped.rows, count: rows.length, today: env.habitDay}, capped.truncated);
  },
};

export type HabitStats = {
  habit: string; handle: string; metric: (typeof METRICS)[number]; range: DayRange; unit: string;
  value: number | null; valueText: string; checkIns: number;
  days: {inRange: number; scheduled: number; complete: number; partial: number; skipped: number; withoutCheckIn: number};
  averagePerCheckIn: number | null; averagePerDay: number | null;
  best: {date: string; value: number} | null; lowest: {date: string; value: number} | null;
  last: {date: string; value: number | null} | null;
  streak: {current: number; best: number; unit: string};
  completionRate: number | null; heldBack: number; notes: string[];
};
const METRICS = ['count', 'minutes', 'quantity', 'streak', 'rate'] as const;
/** The figures behind every habit question, over one range (pure; local answers use it directly). */
export function computeHabitStats(env: ToolEnv, habit: Habit, handle: string, range: DayRange, metric: HabitStats['metric']): HabitStats {
  const from = range.from < habit.startDate ? habit.startDate : range.from;
  const days = from <= range.to ? eachDay(from, range.to) : [];
  const results = days.map(date => ({date, ...habitDay(habit, date, env.habitDay)}));
  const scheduled = results.filter(r => r.scheduled);
  const entries = habit.entries.filter(e => e.date >= range.from && e.date <= range.to && e.disposition === 'logged' && e.count > 0);
  const hidden = entries.filter(e => heldBack(env, e)), visible = entries.filter(e => !heldBack(env, e));
  const rule = latestHabitRule(habit), stats = habitStats(habit, env.habitDay), notes: string[] = [];
  const amounts = visible.map(e => {
    const dayRule = habitRuleOn(habit, e.date) ?? rule;
    return {date: e.date, value: metric === 'minutes' ? minutesOf(dayRule, e.count) : e.count, unit: metric === 'minutes' ? 'minutes' : unitOf(dayRule)};
  });
  const known = amounts.filter((a): a is {date: string; value: number; unit: string} => a.value !== null);
  const units = [...new Set(known.map(a => a.unit))];
  let value: number | null = null, valueText = 'unknown', unit = metric === 'minutes' ? 'minutes' : unitOf(rule);
  const complete = scheduled.filter(r => r.status === 'complete').length, skipped = scheduled.filter(r => r.status === 'skipped' || r.status === 'planned-skip').length;
  const counted = scheduled.length - skipped, completionRate = counted > 0 ? Math.round(complete / counted * 100) : null;
  if (metric === 'streak') { value = stats.currentStreak; unit = stats.streakUnit; valueText = `${stats.currentStreak} ${stats.streakUnit} now, best ${stats.bestStreak} ${stats.streakUnit}`; }
  else if (metric === 'rate') { value = completionRate; unit = '%'; valueText = completionRate === null ? 'unknown: nothing was scheduled' : `${completionRate}% (${complete} of ${counted} scheduled days done${skipped ? `, ${plural(skipped, 'skipped day')} not counted` : ''})`; }
  else if (metric === 'count' && rule.measurement.kind === 'boolean') { value = visible.length; unit = 'check-ins'; valueText = plural(visible.length, 'check-in'); }
  else if (metric === 'minutes' && !amounts.length) { value = 0; valueText = '0 minutes'; if (!isTimed(rule)) { value = null; valueText = 'unknown: this habit is not measured in time'; } }
  else if (metric === 'minutes' && !known.length) { value = null; valueText = 'unknown: this habit is not measured in time'; }
  else if (units.length > 1) { value = null; valueText = `mixed units (${units.join(', ')}): ${units.map(u => `${num(known.filter(a => a.unit === u).reduce((s, a) => s + a.value, 0), 2)} ${u}`).join(' + ')}`; notes.push('The habit changed its unit in this period; the totals are shown per unit.'); }
  else { value = known.reduce((s, a) => s + a.value, 0); unit = units[0] ?? unit; valueText = `${num(value, 2)} ${unit}`; }
  if (metric === 'minutes' && known.length && known.length < amounts.length) notes.push(`${plural(amounts.length - known.length, 'check-in')} not measured in time ${amounts.length - known.length === 1 ? 'is' : 'are'} not counted.`);
  if (hidden.length) notes.push(`${plural(hidden.length, 'check-in')} filled in from Health ${hidden.length === 1 ? 'is' : 'are'} not counted: Health isn't shared with ZIGi.`);
  const sorted = [...known].sort((a, b) => b.value - a.value || a.date.localeCompare(b.date));
  const last = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    habit: text(habit.title), handle, metric, range, unit, value, valueText, checkIns: visible.length,
    days: {inRange: days.length, scheduled: scheduled.length, complete, partial: scheduled.filter(r => r.status === 'partial').length, skipped, withoutCheckIn: scheduled.filter(r => r.status === 'failed').length},
    averagePerCheckIn: known.length && units.length === 1 ? known.reduce((s, a) => s + a.value, 0) / known.length : null,
    averagePerDay: known.length && units.length === 1 && days.length ? known.reduce((s, a) => s + a.value, 0) / days.length : null,
    best: sorted[0] ? {date: sorted[0].date, value: sorted[0].value} : null, lowest: sorted.length ? {date: sorted[sorted.length - 1]!.date, value: sorted[sorted.length - 1]!.value} : null,
    last: last ? {date: last.date, value: heldBack(env, last) ? null : last.count} : null,
    streak: {current: stats.currentStreak, best: stats.bestStreak, unit: stats.streakUnit}, completionRate, heldBack: hidden.length, notes,
  };
}
export const habitStatsTool: ToolDefinition<{habit: string; range?: string; metric?: (typeof METRICS)[number]}> = {
  name: 'habit_stats', title: 'Habit stats', area: 'habits',
  description: 'Figures for one habit over a period: count of check-ins, minutes (habits measured in time), quantity, streak (current and best) or completion rate, plus best and lowest day, averages and days without a check-in.',
  parameters: {type: 'object', properties: {habit: HABIT_PROP, range: RANGE_PROP, metric: {type: 'string', enum: METRICS, description: 'What to compute (default count).'}}, required: ['habit']},
  args: z.object({habit: habitArg, range: rangeArg, metric: z.enum(METRICS).optional()}),
  label: (args, env) => `${text(findTitle(env, args.habit), 40)} · ${args.range?.trim() || 'this month'}`,
  run(args, env) {
    const found = findHabit(env, args.habit, 'habit_stats'); if (!found.ok) return found;
    const label = `${text(found.habit.title, 40)} · ${args.range?.trim() || 'this month'}`;
    const range = resolveRange(env, args.range, 'this month', 'habit_stats', label); if (isRefusal(range)) return range;
    const stats = computeHabitStats(env, found.habit, found.handle, range, args.metric ?? 'count');
    return ok('habit_stats', label, provenance(env, 'Habits journal', stats.habit, range, env.habitZone), {...stats, averagePerCheckIn: num(stats.averagePerCheckIn, 2), averagePerDay: num(stats.averagePerDay, 2)});
  },
};
function findTitle(env: ToolEnv, ref: string): string {
  const handle = /^h\d{1,3}$/i.test(ref.trim()) ? env.handles.find(ref, 'habit') : null;
  return handle?.label ?? ref;
}
export const habitCheckins: ToolDefinition<{habit: string; range?: string}> = {
  name: 'habit_checkins', title: 'Check-ins', area: 'habits',
  description: 'The day-by-day check-ins of one habit over a period: date, status, logged value with its unit, and the note.',
  parameters: {type: 'object', properties: {habit: HABIT_PROP, range: RANGE_PROP}, required: ['habit']},
  args: z.object({habit: habitArg, range: rangeArg}),
  label: (args, env) => `${text(findTitle(env, args.habit), 40)} check-ins · ${args.range?.trim() || 'this month'}`,
  run(args, env) {
    const found = findHabit(env, args.habit, 'habit_checkins'); if (!found.ok) return found;
    const label = `${text(found.habit.title, 40)} check-ins · ${args.range?.trim() || 'this month'}`;
    const range = resolveRange(env, args.range, 'this month', 'habit_checkins', label); if (isRefusal(range)) return range;
    const rule = latestHabitRule(found.habit);
    const rows = found.habit.entries.filter(e => e.date >= range.from && e.date <= range.to).sort((a, b) => a.date.localeCompare(b.date)).map(e => {
      const dayRule = habitRuleOn(found.habit, e.date) ?? rule;
      return {date: e.date, status: habitDay(found.habit, e.date, env.habitDay).status, value: heldBack(env, e) ? 'from Health, not shared' : e.disposition === 'logged' ? e.count : null, unit: unitOf(dayRule), note: e.note ? text(e.note) : undefined};
    });
    const capped = capRows(rows, env);
    return ok('habit_checkins', label, provenance(env, 'Habits journal', text(found.habit.title), range, env.habitZone), {habit: text(found.habit.title), handle: found.handle, checkIns: capped.rows}, capped.truncated);
  },
};
export const habitsDue: ToolDefinition<Record<string, never>> = {
  name: 'habits_due', title: 'Open today', area: 'habits',
  description: 'The habits still open today (scheduled and not yet complete), with what is logged so far.',
  parameters: {type: 'object', properties: {}},
  args: NO_ARGS,
  label: () => 'Habits open today',
  run(_args, env) {
    const rows = visibleHabits(env).flatMap(habit => {
      const day = habitDay(habit, env.habitDay, env.habitDay);
      if (day.status !== 'due' && day.status !== 'partial') return [];
      const rule = latestHabitRule(habit), entry = habit.entries.find(e => e.date === env.habitDay);
      return [{handle: env.handles.add('habit', habit.id, habit.title), title: text(habit.title), status: day.status, logged: entry && heldBack(env, entry) ? 'from Health, not shared' : day.count, target: `${rule.target}${measurementUnit(rule) ? ` ${measurementUnit(rule)}` : ''}`, timeOfDay: habit.timeOfDay}];
    });
    return ok('habits_due', 'Habits open today', provenance(env, 'Habits journal', null, {from: env.habitDay, to: env.habitDay, label: 'today'}, env.habitZone), {open: rows, count: rows.length});
  },
};
export const HABIT_TOOLS = [listHabits, habitStatsTool, habitCheckins, habitsDue] as const;
