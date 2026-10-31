import {journalSchema, MAX_ENTRIES as MAX_JOURNAL, MAX_TEXT, type Journal, type JournalEntry} from '../../journal/schema';
import {MAX_MOOD_DAYS, moodsSchema, type MoodDay, type Moods} from '../../moods/schema';
import {csvTable, safeLine, safeNote} from '../../workouts/import-lifts';
import {instantAt} from '../../zone-time';
import {realDay} from './common';
import {stableHash} from './ids';

/**
 * Session AK (A15): Daylio's "Export Entries → CSV" (FORMATS.md section a, confidence Medium, secondary sources):
 * `full_date, date, weekday, time, mood, activities, note_title, note` (activities separated by `|`; older versions have
 * `year, date, weekday, time, mood, activities, note`). Each entry's note becomes a Journal entry (its activities as
 * tags); each day's mood goes to the mood record (1–5), the day's last entry deciding when there are several.
 *
 * Mood words are the person's own in Daylio (custom moods), so only Daylio's five defaults are matched by name (rad 5,
 * good 4, meh 3, bad 2, awful 1); any other word is listed for the person to place on the 1–5 scale, or leave out.
 * A day already holding a mood in ZIGoals keeps the person's own. Daylio has no energy rating, so none is written.
 */
export const DAYLIO_LABEL = 'Daylio';
export const isDaylioHeader = (line: string) => /\bmood\b/i.test(line) && /\bactivities\b/i.test(line) && /\b(full_date|date)\b/i.test(line);
export const DAYLIO_DEFAULT_MOODS: Readonly<Record<string, number>> = {rad: 5, good: 4, meh: 3, bad: 2, awful: 1};
export type DaylioEntry = {date: string; clock: string; mood: string; activities: string[]; title: string; note: string};
export type DaylioPlan = {entries: DaylioEntry[]; moods: {label: string; count: number; mapped: number | null}[]; warnings: string[]};
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "8:30 pm", "20:30" or "8:30" as "HH:MM"; noon when unreadable (a mood's day does not depend on it). */
export function daylioClock(text: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i.exec(text.trim());
  if (!m) return '12:00';
  let h = Number(m[1]); const mi = Number(m[2]), half = m[3]?.toLowerCase().replace(/\./g, '');
  if (half) { if (h < 1 || h > 12) return '12:00'; h = (h % 12) + (half === 'pm' ? 12 : 0); }
  return h > 23 || mi > 59 ? '12:00' : `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}
/** A day from `full_date` (ISO), or from `year` plus "October 1" / "1 October". */
function dayOf(full: string, year: string, date: string): string | null {
  if (realDay(full.trim())) return full.trim();
  const y = Number(year.trim());
  if (!Number.isInteger(y) || y < 1900) return null;
  const m = /^([A-Za-z]+)\s+(\d{1,2})$/.exec(date.trim()) ?? null, n = m ? null : /^(\d{1,2})\s+([A-Za-z]+)$/.exec(date.trim());
  const monthWord = (m?.[1] ?? n?.[2] ?? '').toLowerCase(), d = Number(m?.[2] ?? n?.[1]);
  const month = MONTHS.findIndex(name => name.startsWith(monthWord) && monthWord.length >= 3);
  if (month < 0) return null;
  const day = `${y}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return realDay(day) ? day : null;
}
const cleanNote = (text: string) => safeNote(text.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:b|i|u|em|strong|p|div|span)>/gi, ''), MAX_TEXT);

export async function readDaylio(text: string, {today}: {today: string}): Promise<DaylioPlan> {
  const {header, rows} = await csvTable(text, 'Daylio');
  const at = (name: string) => header.get(name);
  if (at('mood') === undefined || (at('full_date') === undefined && (at('year') === undefined || at('date') === undefined))) throw Error('This is not a Daylio export (its columns are different). In Daylio: More → Export Entries → CSV.');
  const entries: DaylioEntry[] = [], warnings: string[] = [];
  let unreadable = 0, future = 0;
  for (const row of rows) {
    const get = (name: string) => (row[at(name) ?? -1] ?? '').trim();
    const date = dayOf(get('full_date'), get('year'), get('date'));
    if (!date) { unreadable++; continue; }
    if (date > today) { future++; continue; }
    const activities = [...new Set(get('activities').split('|').map(a => safeLine(a, 24)).filter(Boolean))].slice(0, 8);
    entries.push({date, clock: daylioClock(get('time')), mood: safeLine(get('mood'), 40), activities, title: safeLine(get('note_title'), 200), note: cleanNote(get('note'))});
  }
  if (!entries.length) throw Error('This Daylio export has no entries ZIGoals can read.');
  const counts = new Map<string, number>();
  for (const e of entries) if (e.mood) counts.set(e.mood, (counts.get(e.mood) ?? 0) + 1);
  const moods = [...counts].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({label, count, mapped: DAYLIO_DEFAULT_MOODS[label.toLowerCase()] ?? null}));
  if (unreadable) warnings.push(`${unreadable.toLocaleString('en')} ${unreadable === 1 ? 'entry has' : 'entries have'} no readable date and ${unreadable === 1 ? 'was' : 'were'} skipped.`);
  if (future) warnings.push(`${future.toLocaleString('en')} ${future === 1 ? 'entry is' : 'entries are'} dated after today and ${future === 1 ? 'was' : 'were'} skipped.`);
  const own = moods.filter(m => m.mapped === null);
  if (own.length) warnings.push(`${own.length === 1 ? 'One mood word is' : `${own.length} mood words are`} your own (${own.slice(0, 4).map(m => `“${m.label}”`).join(', ')}${own.length > 4 ? '…' : ''}). Place ${own.length === 1 ? 'it' : 'each'} on the 1–5 scale, or ${own.length === 1 ? 'its' : 'their'} days keep no mood.`);
  return {entries, moods, warnings};
}

export type DaylioRecords = {moods: Record<string, MoodDay>; journal: JournalEntry[]; severalADay: number; noMood: number};
/**
 * The mood days and journal entries for a plan. `moodMap` places the person's own mood words on the 1–5 scale (a word
 * left out, or null, keeps no mood). `zone` turns an entry's local time into the journal's time stamp.
 */
export function daylioRecords(plan: DaylioPlan, {moodMap = {}, zone, now}: {moodMap?: Record<string, number | null>; zone: string; now: Date}): DaylioRecords {
  const at = now.toISOString(), moods: Record<string, MoodDay> = {}, latest = new Map<string, string>(), perDay = new Map<string, number>(), journal: JournalEntry[] = [];
  let noMood = 0;
  const seen = new Map<string, number>();
  for (const e of plan.entries) {
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
    const raw = moodMap[e.mood] !== undefined ? moodMap[e.mood] : DAYLIO_DEFAULT_MOODS[e.mood.toLowerCase()] ?? null;
    const mood = typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null;
    if (mood === null) noMood++;
    else if (!latest.has(e.date) || e.clock >= latest.get(e.date)!) { latest.set(e.date, e.clock); moods[e.date] = {mood, at}; }
    const text = [e.title, e.note].filter(Boolean).join('\n\n').slice(0, MAX_TEXT).trim();
    if (!text) continue;
    const key = `${e.date}|${e.clock}|${text}`, n = seen.get(key) ?? 0; seen.set(key, n + 1);
    const created = new Date(instantAt(e.date, e.clock, zone)).toISOString();
    journal.push({id: `journal-daylio-${stableHash(`${key}|${n}`)}`, date: e.date, text, createdAt: created, ...(e.activities.length ? {tags: e.activities} : {}), importedFrom: 'daylio'} as JournalEntry);
  }
  return {moods, journal, severalADay: [...perDay.values()].filter(n => n > 1).length, noMood};
}
/** Adds mood days that have none yet (the person's own stay); the newest days win when the record would pass its cap. */
export function mergeDaylioMoods(record: Moods, add: Record<string, MoodDay>): {next: Moods; added: number; kept: number; dropped: number} {
  const days = {...record.days};
  let added = 0, kept = 0;
  for (const [date, day] of Object.entries(add)) { if (days[date]) { kept++; continue; } days[date] = day; added++; }
  const keys = Object.keys(days).sort(), drop = keys.slice(0, Math.max(0, keys.length - MAX_MOOD_DAYS));
  for (const k of drop) delete days[k];
  return {next: moodsSchema.parse({...record, days}), added: added - drop.filter(k => add[k] && !record.days[k]).length, kept, dropped: drop.length};
}
/** Adds journal entries not imported before (by id); refuses an import that would pass the journal's 5,000 entries. */
export function mergeDaylioJournal(record: Journal, add: readonly JournalEntry[]): {next: Journal; added: number; duplicates: number} {
  const have = new Set(record.entries.map(e => e.id)), fresh = add.filter(e => !have.has(e.id));
  if (record.entries.length + fresh.length > MAX_JOURNAL) throw Error(`The journal keeps up to ${MAX_JOURNAL.toLocaleString('en')} entries; you have ${record.entries.length.toLocaleString('en')} and this export adds ${fresh.length.toLocaleString('en')}. Nothing was imported.`);
  return {next: journalSchema.parse({...record, entries: [...record.entries, ...fresh]}), added: fresh.length, duplicates: add.length - fresh.length};
}
