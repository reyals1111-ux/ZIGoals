import {habitDataSchema, type Habit, type HabitData} from '../../habits';
import type {ImportBatch} from '../batches-schema';
import {checkStop, isoOf, localDay, type ReadContext} from './common';
import {csvRows, headerIndex} from './csv-stream';
import {stableHash} from './ids';
import {baseName, progressCounter, textStream, type ImportFile} from './source';

/**
 * Loop Habit Tracker's "Export as CSV" (Session W Part 7; IMPORT_FORMATS.md "Loop Habit Tracker"), read to Loop's own
 * source code (HabitsCSVExporter, v2.3.1): Habits.csv lists the habits; each habit's folder ("001 Meditate/") holds its
 * Checkmarks.csv. A done day (YES_MANUAL, 2) becomes a check-in, a skip (3) a skipped day; "not done", Loop's automatic
 * "not due" and "unknown" stay as days without an entry, which ZIGoals reads the same way. A measurable habit's values
 * are stored ×1000 by Loop and come back as the amounts the person typed.
 */
export const LOOP_LABEL = 'Loop Habit Tracker';
export type HabitsPlan = {format: 'loop'; label: string; habits: Habit[]; summarised: string[]; warnings: string[]};
export const isLoopHabits = (path: string) => /(^|\/)Habits\.csv$/.test(path);
/** A UUID made from text (RFC 9562 version 8, "custom"): the same habit from the same export has the same id everywhere. */
export function uuidFrom(text: string): string {
  const hex = stableHash(text) + stableHash(`${text}#2`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
async function table(file: ImportFile, counter: {add: (n: number) => void}, signal?: AbortSignal): Promise<{header: Map<string, number>; rows: string[][]}> {
  let header: Map<string, number> | null = null; const rows: string[][] = [];
  for await (const row of csvRows(textStream(file, counter), {delimiter: ','})) { checkStop(signal); if (!header) header = headerIndex(row); else rows.push(row); }
  return {header: header ?? new Map(), rows};
}
type Schedule = Habit['rules'][number]['schedule'];
/** Loop's "numerator times in denominator days" as a ZIGoals schedule, and whether it is exactly the same rule. */
export function loopSchedule(numerator: number, denominator: number, anchor: string): {schedule: Schedule; period: 'day' | 'week' | 'month' | 'year'; exact: boolean} {
  if (denominator === 1) return {schedule: {kind: 'daily'}, period: 'day', exact: numerator === 1};
  if (denominator === 7) return {schedule: numerator >= 7 ? {kind: 'daily'} : {kind: 'frequency', times: Math.max(1, numerator), period: 'week'}, period: 'week', exact: true};
  if (denominator >= 28 && denominator <= 31) return {schedule: {kind: 'frequency', times: Math.min(28, Math.max(1, numerator)), period: 'month'}, period: 'month', exact: numerator <= 28};
  if (denominator === 365 || denominator === 366) return {schedule: {kind: 'frequency', times: Math.min(365, Math.max(1, numerator)), period: 'year'}, period: 'year', exact: true};
  if (numerator === 1 && denominator >= 2 && denominator <= 365) return {schedule: {kind: 'interval', every: denominator, anchor}, period: 'day', exact: false};
  return {schedule: {kind: 'frequency', times: Math.min(7, Math.max(1, Math.round(numerator * 7 / denominator))), period: 'week'}, period: 'week', exact: false};
}

export async function readLoop(files: readonly ImportFile[], ctx: ReadContext): Promise<HabitsPlan> {
  const counter = progressCounter(ctx.onProgress), warnings: string[] = [], summarised: string[] = [];
  const list = files.filter(f => isLoopHabits(f.path)).sort((a, b) => a.path.split('/').length - b.path.split('/').length)[0];
  if (!list) throw Error('This is not a Loop Habit Tracker export: Habits.csv is missing.');
  const root = list.path.slice(0, list.path.length - 'Habits.csv'.length);
  const {header, rows} = await table(list, counter, ctx.signal);
  const missing = ['position', 'name', 'type', 'frequencynumerator', 'frequencydenominator', 'archived?'].filter(c => !header.has(c));
  if (missing.length) throw Error('This Loop export is from a version ZIGoals does not read (Habits.csv has other columns). Update Loop and export again.');
  const today = localDay(ctx.now, ctx.zone), at = isoOf(ctx.now), habits: Habit[] = [], approximate: string[] = [];
  for (const row of rows) {
    const get = (name: string) => (row[header.get(name) ?? -1] ?? '').trim();
    const position = get('position'), name = get('name').slice(0, 100) || `Habit ${position}`, numeric = get('type').toUpperCase() === 'NUMERICAL';
    const folder = files.find(f => f.path.startsWith(root) && new RegExp(`^${position.replace(/[^0-9]/g, '')} [^/]*/Checkmarks\\.csv$`).test(f.path.slice(root.length)));
    const entries: Habit['entries'] = [];
    if (folder) {
      const checks = await table(folder, counter, ctx.signal), date = checks.header.get('date'), value = checks.header.get('value'), notes = checks.header.get('notes');
      if (date === undefined || value === undefined) { warnings.push(`${name}: its Checkmarks.csv has other columns and was not read.`); }
      else for (const c of checks.rows) {
        const d = (c[date] ?? '').trim(), v = Number((c[value] ?? '').trim()), note = notes === undefined ? '' : (c[notes] ?? '').slice(0, 2000);
        if (!/^(20|21)\d{2}-\d{2}-\d{2}$/.test(d) || d > today || !Number.isFinite(v) || entries.some(e => e.date === d)) continue;
        if (numeric) { if (v >= 0 && v / 1000 <= 1_000_000_000) entries.push({date: d, count: Math.round(v) / 1000, disposition: 'logged', note, updatedAt: at}); }
        else if (v === 2) entries.push({date: d, count: 1, disposition: 'logged', note, updatedAt: at});
        else if (v === 3) entries.push({date: d, count: 0, disposition: 'skipped', note, updatedAt: at});
      }
    } else warnings.push(`${name}: no Checkmarks.csv was found in its folder, so it comes without its history.`);
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const startDate = entries[0]?.date ?? today, num = Number(get('frequencynumerator')) || 1, den = Number(get('frequencydenominator')) || 1;
    const {schedule, period, exact} = loopSchedule(num, den, startDate);
    if (!exact) approximate.push(name);
    const unit = get('unit').slice(0, 24) || 'units', target = Number(get('target value')), atMost = get('target type').toUpperCase() === 'AT_MOST';
    const rule = numeric
      ? {schedule: {kind: 'daily'} as Schedule, type: atMost ? 'limit' as const : 'build' as const, measurement: {kind: 'quantity' as const, unit}, target: Number.isFinite(target) && target >= 0 ? (atMost ? target : Math.max(target, 0.001)) : 1, targetPeriod: period}
      : {schedule, type: 'build' as const, measurement: {kind: 'boolean' as const}, target: 1, targetPeriod: 'day' as const};
    const description = [get('question'), get('description')].filter(Boolean).join(' · ').slice(0, 500);
    habits.push({id: uuidFrom(`loop|${position}|${get('name')}`), title: name, category: 'Loop Habit Tracker', description, notes: '', timeOfDay: 'anytime', endCondition: {kind: 'none'}, startDate,
      createdAt: at, updatedAt: at, rules: [{from: startDate, ...rule, endCondition: {kind: 'none'}, state: get('archived?').toLowerCase() === 'true' ? 'archived' : 'active'}], entries});
  }
  counter.flush();
  if (!habits.length) throw Error('Habits.csv lists no habits.');
  summarised.push('Check-ins: a done day, a skipped day, or an amount for a measurable habit. Loop\'s scores and colours are not kept.');
  if (approximate.length) warnings.push(`${approximate.length} ${approximate.length === 1 ? 'habit has' : 'habits have'} a schedule ZIGoals writes differently (${approximate.slice(0, 3).join(', ')}${approximate.length > 3 ? '…' : ''}); check ${approximate.length === 1 ? 'it' : 'them'} in Habits after the import.`);
  return {format: 'loop', label: LOOP_LABEL, habits, summarised, warnings};
}
export type HabitsPreview = {next: HabitData; created: string[]; entries: [string, string][]; duplicates: number; kept: number};
export const HABIT_LIMIT_MESSAGE = (have: number, adding: number) => `ZIGoals keeps up to 200 habits; you have ${have} and this export adds ${adding}. Archive or delete some first. Nothing was imported.`;
/** New habits are added; a habit already imported gets only the days it does not have yet (the person's own entries stay). */
export function previewHabits(data: HabitData, habits: readonly Habit[]): HabitsPreview {
  const byId = new Map(data.habits.map(h => [h.id, h])), created: string[] = [], entries: [string, string][] = [];
  let duplicates = 0, kept = 0;
  const next = data.habits.map(h => h);
  for (const habit of habits) {
    const existing = byId.get(habit.id);
    if (!existing) { next.push(habit); created.push(habit.id); continue; }
    const have = new Set(existing.entries.map(e => e.date)), add = habit.entries.filter(e => e.date >= existing.startDate && !have.has(e.date));
    duplicates += habit.entries.filter(e => have.has(e.date)).length; kept += habit.entries.filter(e => e.date < existing.startDate).length;
    if (add.length) { next[next.indexOf(existing)] = {...existing, entries: [...existing.entries, ...add].sort((a, b) => a.date.localeCompare(b.date))}; for (const e of add) entries.push([habit.id, e.date]); }
  }
  const adding = created.length;
  if (data.habits.length + adding > 200) throw Error(HABIT_LIMIT_MESSAGE(data.habits.length, adding));
  return {next: habitDataSchema.parse({...data, habits: next}), created, entries, duplicates, kept};
}
/** What undoing a habits batch removes now, and which of its habits were changed after the import. */
export function undoHabitsPlan(data: HabitData, batch: ImportBatch): {remove: number; edited: string[]} {
  const refs = batch.refs.habits, since = Date.parse(batch.at), edited: string[] = [];
  if (!refs) return {remove: 0, edited};
  let remove = 0;
  for (const h of data.habits) if (refs.habitIds.includes(h.id)) { remove++; if (Date.parse(h.updatedAt) > since + 1000 || h.entries.some(e => Date.parse(e.updatedAt) > since + 1000)) edited.push(h.title); }
  const wanted = new Set(refs.entries.map(([id, d]) => `${id}|${d}`));
  for (const h of data.habits) if (!refs.habitIds.includes(h.id)) for (const e of h.entries) if (wanted.has(`${h.id}|${e.date}`)) { remove++; if (Date.parse(e.updatedAt) > since + 1000) edited.push(`${h.title} on ${e.date}`); }
  return {remove, edited};
}
export function undoHabits(data: HabitData, batch: ImportBatch): HabitData {
  const refs = batch.refs.habits;
  if (!refs) return data;
  const created = new Set(refs.habitIds), wanted = new Set(refs.entries.map(([id, d]) => `${id}|${d}`));
  const habits = data.habits.filter(h => !created.has(h.id)).map(h => h.entries.some(e => wanted.has(`${h.id}|${e.date}`)) ? {...h, entries: h.entries.filter(e => !wanted.has(`${h.id}|${e.date}`))} : h);
  // A habit stacked after a removed one keeps its place without the link (stacks must point at a habit that exists).
  return habitDataSchema.parse({...data, habits: habits.map(h => h.stackAfterId && created.has(h.stackAfterId) ? (({stackAfterId: _drop, ...rest}) => { void _drop; return rest; })(h) : h)});
}
export const loopFolder = (path: string) => baseName(path.slice(0, path.lastIndexOf('/')));
