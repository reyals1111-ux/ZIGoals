import {habitDataSchema, type Habit} from '../../habits';
import {csvTable, safeLine, safeNote} from '../../workouts/import-lifts';
import {isoOf, localDay, realDay} from './common';
import {uuidFrom} from './loop';
import {SqliteFile, SQLITE_NOT_A_DATABASE, isSqlite} from './sqlite-read';

/**
 * Session AV lane 2 (habits; LEDGER #194, Loop's imports from other habit apps): HabitBull's CSV export and Tickmate's
 * database backup, read to the layouts Loop Habit Tracker's own open-source importers read (uhabits v2.3.1,
 * `HabitBullCSVImporter.kt` and `TickmateDBImporter.kt`; Tickmate is open source too). Nothing else about either file is
 * assumed.
 *
 * - HabitBull: a CSV whose header starts `HabitName,HabitDescription,HabitCategory`, then CalendarDate (2026-11-03 or
 *   11/03/2026), Value and CommentText. A value of 1 is a done day, 0 a day not done (no check-in), more than 1 an amount
 *   (the habit then counts times, as Loop makes it numerical). The comment is the day's note; the category is kept.
 * - Tickmate: an SQLite file with the tables `tracks` (_id, name, description) and `ticks` (_track_id, year, month, day;
 *   the month counted from 0, as Java's calendar does), recognised as Loop does by `tracks` and `track2groups`. Each day
 *   with a tick is a done day.
 *
 * Both apps keep no schedule in these files, so every habit comes in as every day (Loop does the same). The plan has the
 * shape of Loop's (`HabitsPlan`) and is applied with `previewHabits` after the person has seen the preview.
 */
export const HABITBULL_LABEL = 'HabitBull', TICKMATE_LABEL = 'Tickmate';
export const OTHER_MAX_BYTES = 30 * 1024 * 1024, OTHER_MAX_HABITS = 200, OTHER_MAX_DAYS = 50_000;
export type OtherHabitsPlan = {format: 'habitbull' | 'tickmate'; label: string; habits: Habit[]; summarised: string[]; warnings: string[]};
type Day = {count: number; note: string};

function habitFrom(source: string, label: string, key: string, title: string, {description = '', category = label, days, numeric, today, at}: {description?: string; category?: string; days: Map<string, Day>; numeric: boolean; today: string; at: string}): Habit | null {
  const dates = [...days.keys()].filter(d => d <= today).sort(), startDate = dates[0] ?? today;
  const entries: Habit['entries'] = dates.map(date => { const d = days.get(date)!; return {date, count: numeric ? d.count : 1, disposition: 'logged' as const, note: d.note, updatedAt: at}; });
  const rule = {from: startDate, schedule: {kind: 'daily' as const}, type: 'build' as const, measurement: numeric ? {kind: 'count' as const, unit: 'times'} : {kind: 'boolean' as const}, target: 1, targetPeriod: 'day' as const, endCondition: {kind: 'none' as const}, state: 'active' as const};
  const habit: Habit = {id: uuidFrom(`${source}|${key}`), title, category: safeLine(category, 50) || label, description: safeNote(description, 500), notes: '', timeOfDay: 'anytime', endCondition: {kind: 'none'}, startDate, createdAt: at, updatedAt: at, rules: [rule], entries};
  return habitDataSchema.safeParse({schemaVersion: 2, kind: 'zigoals-habits', habits: [habit]}).success ? habit : null;
}
const NO_SCHEDULE = (label: string) => `${label} keeps no schedule in this file, so each habit comes in as every day. Change a habit’s repeat in Habits after the import if it is not daily.`;

/** "2026-11-03" or "11/03/2026" (the two layouts Loop's importer reads besides the phone's own short date). */
export function habitBullDay(text: string): string | null {
  const t = text.trim(), iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t), us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const [y, m, d] = iso ? [iso[1], iso[2], iso[3]] : us ? [us[3], us[1], us[2]] : [];
  if (!y) return null;
  const day = `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
  return realDay(day, '2000-01-01', '2199-12-31') ? day : null;
}
export async function readHabitBull(text: string, {now, zone}: {now: number; zone: string}): Promise<OtherHabitsPlan> {
  if (typeof text === 'string' && text.length > OTHER_MAX_BYTES) throw Error('This file is larger than 30 MB, more than a HabitBull export holds.');
  const {header, rows} = await csvTable(text, 'HabitBull');
  const col = (name: string) => header.get(name);
  const [name, description, category, date, value, comment] = ['habitname', 'habitdescription', 'habitcategory', 'calendardate', 'value', 'commenttext'].map(col);
  if (name === undefined || date === undefined || value === undefined) throw Error('This is not HabitBull’s CSV export (its first line starts HabitName,HabitDescription,HabitCategory). In HabitBull, export your data as CSV, then choose that file.');
  const today = localDay(now, zone), at = isoOf(now), byName = new Map<string, {title: string; description: string; category: string; days: Map<string, Day>; numeric: boolean}>();
  let badDates = 0, future = 0, notDone = 0, cells = 0;
  for (const row of rows) {
    const title = safeLine(row[name] ?? '', 100);
    if (!title) continue;
    if (++cells > OTHER_MAX_DAYS) throw Error(`This export holds more than ${OTHER_MAX_DAYS.toLocaleString('en')} days, more than ZIGoals reads at once.`);
    let h = byName.get(title);
    if (!h) {
      if (byName.size >= OTHER_MAX_HABITS) throw Error(`This export has more than ${OTHER_MAX_HABITS} habits, more than ZIGoals reads at once.`);
      h = {title, description: description !== undefined ? row[description] ?? '' : '', category: category !== undefined ? row[category] ?? '' : '', days: new Map(), numeric: false};
      byName.set(title, h);
    }
    const day = habitBullDay(row[date] ?? '');
    if (!day) { badDates++; continue; }
    if (day > today) { future++; continue; }
    // Loop's reading: a value that is not a whole number is 0.
    const raw = (row[value] ?? '').trim(), n = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
    if (n <= 0) { notDone++; continue; }
    if (n > 1) h.numeric = true;
    h.days.set(day, {count: n, note: comment !== undefined ? safeNote(row[comment] ?? '', 2000) : ''});
  }
  const habits = [...byName.values()].map(h => habitFrom('habitbull', HABITBULL_LABEL, h.title, h.title, {description: h.description, category: h.category, days: h.days, numeric: h.numeric, today, at})).filter((h): h is Habit => h !== null);
  if (!habits.length) throw Error('This HabitBull export has no habits ZIGoals can read.');
  const warnings = [NO_SCHEDULE(HABITBULL_LABEL)];
  if (badDates) warnings.push(`${badDates.toLocaleString('en')} ${badDates === 1 ? 'row has' : 'rows have'} a date ZIGoals cannot read (it reads 2026-11-03 and 11/03/2026) and ${badDates === 1 ? 'was' : 'were'} left out.`);
  if (future) warnings.push(`${future.toLocaleString('en')} ${future === 1 ? 'day is' : 'days are'} after today and ${future === 1 ? 'was' : 'were'} left out.`);
  const numeric = habits.filter(h => h.rules[0]!.measurement.kind === 'count').length;
  return {format: 'habitbull', label: HABITBULL_LABEL, habits, warnings,
    summarised: [`Habits with their description and category; each done day with its note${numeric ? `; amounts for ${numeric} ${numeric === 1 ? 'habit that counts' : 'habits that count'} times` : ''}. ${notDone ? `${notDone.toLocaleString('en')} ${notDone === 1 ? 'day' : 'days'} marked not done ${notDone === 1 ? 'stays' : 'stay'} without a check-in.` : ''}`.trim()]};
}

export const DAMAGED_DATABASE = 'This database is damaged, so it cannot be read safely.';
export function readTickmate(bytes: Uint8Array, ctx: {now: number; zone: string}): OtherHabitsPlan {
  // A damaged file can point past its own end; that is said in plain words, never as the browser's error.
  try { return readTickmateFile(bytes, ctx); } catch (error) { throw error instanceof RangeError || error instanceof TypeError ? Error(DAMAGED_DATABASE) : error; }
}
function readTickmateFile(bytes: Uint8Array, {now, zone}: {now: number; zone: string}): OtherHabitsPlan {
  if (bytes.length > OTHER_MAX_BYTES) throw Error('This file is larger than 30 MB, more than a Tickmate backup holds.');
  if (!isSqlite(bytes)) throw Error(`${SQLITE_NOT_A_DATABASE} In Tickmate, export the database from its settings, then choose the file it saves.`);
  const db = new SqliteFile(bytes), tables = new Map(db.tables().map(t => [t.name.toLowerCase(), t]));
  const tracks = tables.get('tracks'), ticks = tables.get('ticks');
  if (!tracks || !ticks || !tables.has('track2groups')) throw Error('This database is not a Tickmate backup (it has no tracks and ticks). In Tickmate, export the database from its settings, then choose that file.');
  const today = localDay(now, zone), at = isoOf(now), byTrack = new Map<number, {title: string; description: string; days: Map<string, Day>}>();
  for (const row of db.select(tracks, OTHER_MAX_HABITS * 5)) {
    const id = row._id, title = typeof row.name === 'string' ? safeLine(row.name, 100) : '';
    if (typeof id !== 'number' || !title) continue;
    if (byTrack.size >= OTHER_MAX_HABITS) throw Error(`This backup has more than ${OTHER_MAX_HABITS} tracks, more than ZIGoals reads at once.`);
    byTrack.set(id, {title, description: typeof row.description === 'string' ? row.description : '', days: new Map()});
  }
  let badDates = 0, future = 0, orphans = 0;
  for (const row of db.select(ticks, OTHER_MAX_DAYS * 4)) {
    const t = typeof row._track_id === 'number' ? byTrack.get(row._track_id) : undefined;
    if (!t) { orphans++; continue; }
    const {year, month, day} = row;
    const date = typeof year === 'number' && typeof month === 'number' && typeof day === 'number' && Number.isInteger(month) ? `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
    if (!realDay(date, '2000-01-01', '2199-12-31')) { badDates++; continue; }
    if (date > today) { future++; continue; }
    t.days.set(date, {count: 1, note: ''});
  }
  const habits = [...byTrack].map(([id, t]) => habitFrom('tickmate', TICKMATE_LABEL, String(id), t.title, {description: t.description, days: t.days, numeric: false, today, at})).filter((h): h is Habit => h !== null);
  if (!habits.length) throw Error('This Tickmate backup has no tracks ZIGoals can read.');
  const warnings = [NO_SCHEDULE(TICKMATE_LABEL)];
  if (badDates) warnings.push(`${badDates.toLocaleString('en')} ${badDates === 1 ? 'tick has' : 'ticks have'} a date ZIGoals cannot read and ${badDates === 1 ? 'was' : 'were'} left out.`);
  if (future) warnings.push(`${future.toLocaleString('en')} ${future === 1 ? 'tick is' : 'ticks are'} after today and ${future === 1 ? 'was' : 'were'} left out.`);
  if (orphans) warnings.push(`${orphans.toLocaleString('en')} ${orphans === 1 ? 'tick belongs' : 'ticks belong'} to no track and ${orphans === 1 ? 'was' : 'were'} left out.`);
  return {format: 'tickmate', label: TICKMATE_LABEL, habits, warnings, summarised: ['Tracks become habits with their description; each ticked day is a done day (several ticks on one day count once).']};
}
