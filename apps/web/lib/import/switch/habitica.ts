import {habitDataSchema, type Habit} from '../../habits';
import {safeLine, safeNote} from '../../workouts/import-lifts';
import {isoOf, localDay, realDay} from './common';
import {uuidFrom} from './loop';

/**
 * Session AK (A15): Habitica's data export, `userdata.json` (Settings → Site Data → Export; FORMATS.md section a,
 * confidence High from Habitica's own source: `dataexport.js`, `models/task.js`). Its `tasks.habits` and `tasks.dailys`
 * become ZIGoals habits with their names, notes and, where it maps, their schedule; to-dos and rewards are not habits and
 * are left out. History comes only where the export holds it day by day: a daily's history entry that says `completed:
 * true` is a done day, and a habit's `scoredUp` (or, for a habit only scored down, `scoredDown`) is that day's count.
 * Habitica compresses old history into averages without those fields; such days are left empty, never guessed.
 *
 * The plan has the same shape as Loop's (lib/import/switch/loop.ts `HabitsPlan`) and is applied with `previewHabits`.
 */
export const HABITICA_LABEL = 'Habitica';
export const HABITICA_MAX_BYTES = 30 * 1024 * 1024;
export type HabiticaPlan = {format: 'habitica'; label: string; habits: Habit[]; summarised: string[]; warnings: string[]};
type Schedule = Habit['rules'][number]['schedule'];
type Task = {id?: unknown; _id?: unknown; text?: unknown; notes?: unknown; type?: unknown; frequency?: unknown; everyX?: unknown; startDate?: unknown; createdAt?: unknown;
  repeat?: Record<string, unknown>; daysOfMonth?: unknown; weeksOfMonth?: unknown; up?: unknown; down?: unknown; history?: unknown};
const DAYS: [string, number][] = [['su', 0], ['m', 1], ['t', 2], ['w', 3], ['th', 4], ['f', 5], ['s', 6]];
const int = (v: unknown, lo: number, hi: number): number | null => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null;

/** A daily's schedule in ZIGoals' words, and whether it says exactly what Habitica's does. */
export function habiticaSchedule(t: Task, anchor: string): {schedule: Schedule; exact: boolean} {
  const every = int(t.everyX, 0, 9999) ?? 1;
  switch (t.frequency) {
    case 'weekly': {
      const days = DAYS.filter(([k]) => t.repeat?.[k] === true).map(([, d]) => d);
      if (!days.length) return {schedule: {kind: 'daily'}, exact: false};
      if (days.length === 7) return {schedule: {kind: 'daily'}, exact: every <= 1};
      return {schedule: {kind: 'weekdays', days}, exact: every <= 1};
    }
    case 'monthly': {
      const dates = Array.isArray(t.daysOfMonth) ? [...new Set(t.daysOfMonth.filter((d): d is number => int(d, 1, 31) !== null))] : [];
      if (dates.length) return {schedule: {kind: 'month-dates', days: dates.sort((a, b) => a - b)}, exact: every <= 1};
      return {schedule: {kind: 'frequency', times: 1, period: 'month'}, exact: false};
    }
    case 'yearly': return {schedule: {kind: 'frequency', times: 1, period: 'year'}, exact: every <= 1};
    default:
      if (every <= 1) return {schedule: {kind: 'daily'}, exact: true};
      return {schedule: {kind: 'interval', every: Math.min(365, every), anchor}, exact: every <= 365};
  }
}
const dayFromStamp = (v: unknown, zone: string): string | null => {
  const ms = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN;
  if (!Number.isFinite(ms)) return null;
  const day = localDay(ms, zone);
  return realDay(day, '2000-01-01', '2199-12-31') ? day : null;
};

export function readHabitica(text: string, {now, zone}: {now: number; zone: string}): HabiticaPlan {
  if (typeof text !== 'string' || !text.trim()) throw Error('This file is empty. Choose userdata.json from Habitica’s data export.');
  if (text.length > HABITICA_MAX_BYTES) throw Error('This file is larger than 30 MB, more than a Habitica export holds.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw Error('This file is not JSON. In Habitica: Settings → Site Data → Export, then choose userdata.json.'); }
  const tasks = (data as {tasks?: Record<string, unknown>} | null)?.tasks;
  if (!tasks || typeof tasks !== 'object' || (!Array.isArray(tasks.habits) && !Array.isArray(tasks.dailys))) throw Error('This is not Habitica’s userdata.json (it has no habits or dailies). In Habitica: Settings → Site Data → Export → userdata.json.');
  const today = localDay(now, zone), at = isoOf(now), habits: Habit[] = [], warnings: string[] = [], approximate: string[] = [];
  let compressed = 0, invalid = 0;
  const list = [...(Array.isArray(tasks.dailys) ? tasks.dailys : []).map(t => ['daily', t] as const), ...(Array.isArray(tasks.habits) ? tasks.habits : []).map(t => ['habit', t] as const)];
  if (list.length > 2000) throw Error('This export has more than 2,000 habits and dailies, more than ZIGoals reads at once.');
  for (const [kind, raw] of list) {
    if (!raw || typeof raw !== 'object') { invalid++; continue; }
    const t = raw as Task, title = safeLine(typeof t.text === 'string' ? t.text : '', 100);
    if (!title) { invalid++; continue; }
    const notes = typeof t.notes === 'string' ? safeNote(t.notes, 2000) : '';
    // Day by day history only; Habitica's compressed averages carry neither `completed` nor `scoredUp`.
    const counts = new Map<string, number>();
    const up = t.up !== false, down = t.down === true, quit = kind === 'habit' && down && !up;
    for (const h of Array.isArray(t.history) ? t.history.slice(0, 20_000) : []) {
      const entry = h as {date?: unknown; completed?: unknown; scoredUp?: unknown; scoredDown?: unknown};
      const day = dayFromStamp(entry?.date, zone);
      if (!day || day > today) continue;
      if (kind === 'daily') {
        if (entry.completed === true) counts.set(day, 1);
        else if (entry.completed === undefined) compressed++;
      } else {
        const n = int(quit ? entry.scoredDown : entry.scoredUp, 0, 100_000);
        if (n === null) { compressed++; continue; }
        if (n > 0) counts.set(day, (counts.get(day) ?? 0) + n);
      }
    }
    const firstEntry = [...counts.keys()].sort()[0];
    const declared = dayFromStamp(t.startDate, zone) ?? dayFromStamp(t.createdAt, zone) ?? today;
    const startDate = firstEntry && firstEntry < declared ? firstEntry : declared > today ? today : declared;
    let schedule: Schedule = {kind: 'daily'}, exact = true;
    if (kind === 'daily') ({schedule, exact} = habiticaSchedule(t, startDate));
    else exact = up || down; // a habit has no schedule in Habitica; ZIGoals keeps it daily
    if (!exact) approximate.push(title);
    const rule = kind === 'daily'
      ? {schedule, type: 'build' as const, measurement: {kind: 'boolean' as const}, target: 1, targetPeriod: 'day' as const}
      : quit ? {schedule, type: 'quit' as const, measurement: {kind: 'count' as const, unit: 'times'}, target: 0, targetPeriod: 'day' as const}
        : {schedule, type: 'build' as const, measurement: {kind: 'count' as const, unit: 'times'}, target: 1, targetPeriod: 'day' as const};
    const entries: Habit['entries'] = [...counts].filter(([d]) => d >= startDate).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({date, count: kind === 'daily' ? 1 : count, disposition: 'logged' as const, note: '', updatedAt: at}));
    const key = typeof t.id === 'string' ? t.id : typeof t._id === 'string' ? t._id : `${kind}|${title}`;
    const habit: Habit = {id: uuidFrom(`habitica|${key}`), title, category: HABITICA_LABEL, description: notes.slice(0, 500), notes: notes.length > 500 ? notes : '', timeOfDay: 'anytime',
      endCondition: {kind: 'none'}, startDate, createdAt: at, updatedAt: at, rules: [{from: startDate, ...rule, endCondition: {kind: 'none'}, state: 'active'}], entries};
    if (habits.some(h => h.id === habit.id) || !habitDataSchema.safeParse({schemaVersion: 2, kind: 'zigoals-habits', habits: [habit]}).success) { invalid++; continue; }
    habits.push(habit);
  }
  if (!habits.length) throw Error('This Habitica export has no habits or dailies ZIGoals can read.');
  const skippedKinds = ['todos', 'rewards'].map(k => Array.isArray(tasks[k]) ? (tasks[k] as unknown[]).length : 0).reduce((a, b) => a + b, 0);
  const summarised = ['Habits and dailies: names, notes, schedules, and the days the export records day by day. To-dos, rewards, gold, experience and pets are not habits and are not kept.'];
  if (skippedKinds) warnings.push(`${skippedKinds.toLocaleString('en')} to-dos and rewards are not habits and were left out.`);
  if (compressed) warnings.push('Habitica keeps older history only as averages, so those days come without check-ins; the newer days are complete.');
  if (approximate.length) warnings.push(`${approximate.length} ${approximate.length === 1 ? 'habit has' : 'habits have'} a schedule ZIGoals writes differently (${approximate.slice(0, 3).join(', ')}${approximate.length > 3 ? '…' : ''}); check ${approximate.length === 1 ? 'it' : 'them'} in Habits after the import.`);
  if (invalid) warnings.push(`${invalid.toLocaleString('en')} ${invalid === 1 ? 'task' : 'tasks'} could not be read and ${invalid === 1 ? 'was' : 'were'} left out.`);
  return {format: 'habitica', label: HABITICA_LABEL, habits, summarised, warnings};
}
