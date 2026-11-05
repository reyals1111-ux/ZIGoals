import {parseCsv} from './csv/parse';
import {normalizeHeader} from './csv/mapping';
import {instantAt, wallClock} from './zone-time';
import {MAX_NIGHT_MINUTES, type Sleep} from './sleep/schema';
import {napOrNight, type NightInput} from './sleep/engine';

/**
 * Session AL third pass (GAP-071 Sleep Cycle, GAP-072 Oura layout; C-MO-42, C-MO-43): nights from a sleep CSV, read on
 * this device and previewed before anything is saved. Recognised by the header row, never the file name:
 * - Sleep Cycle's CSV export (`Start;End;…;Time in bed (seconds);Time asleep (seconds);Time before sleep (seconds)`, or
 *   the older `Start;End;Sleep quality;Time in bed`). Sleep Cycle does not publish these columns: the layout is the one
 *   people share from their exports, so the preview says to check it. Its times have no zone: they are read in yours.
 * - Oura's sleep rows as its API v2 names them (`bedtime_start`, `bedtime_end`, `total_sleep_duration`, `latency`, `type`),
 *   in any file name (Settings → Switch to ZIGoals reads the full Oura ZIP; this reads a single exported or hand-made CSV).
 *   Times carry their offset; `rest` and `deleted` periods are left out.
 * - Any file with `start` and `end` columns (or "went to bed" / "woke up"), and optionally minutes asleep.
 * Every night still goes through the sleep log's own rules when saved (no overlaps, nothing in the future, at most 24 h).
 */
export type SleepCsvLayout = 'sleep-cycle' | 'oura' | 'start-end';
export type SleepCsvNight = NightInput & {line: number};
export type SleepCsvPlan = {layout: SleepCsvLayout | null; nights: SleepCsvNight[]; issues: {line: number; reason: string}[]; kept: number; note: string};
const LAYOUT_NOTES: Record<SleepCsvLayout, string> = {
  'sleep-cycle': 'This looks like Sleep Cycle’s CSV export. Sleep Cycle does not publish its columns, so check the nights below; its times are read in your time zone, and its sleep quality (a percentage) is kept in each night’s note, not turned into stars.',
  oura: 'This looks like Oura’s sleep rows (the names Oura’s API uses). Times keep their own offset; rest periods and deleted rows are left out.',
  'start-end': 'Read from the start and end columns. Check the nights below.',
};
const pick = (header: readonly string[], ...names: string[]) => { const wanted = names.map(normalizeHeader); const i = header.findIndex(h => wanted.includes(normalizeHeader(h))); return i < 0 ? undefined : i; };

/** "2026-11-03 23:10:05", "2026-11-03T23:10", with an optional offset ("+01:00", "Z"). */
function readStamp(text: string, zone: string): number | null {
  const m = text.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
  if (!m) return null;
  const [, date, h, mi, sec, offset] = m;
  const clock = `${h!.padStart(2, '0')}:${mi}`;
  if (Number(h) > 23 || Number(mi) > 59) return null;
  if (offset) { const ms = Date.parse(`${date}T${clock}:${sec ?? '00'}${offset.length === 5 ? `${offset.slice(0, 3)}:${offset.slice(3)}` : offset.toUpperCase()}`); return Number.isFinite(ms) ? ms : null; }
  const day = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(day)) return null;
  return instantAt(date!, clock, zone) + Number(sec ?? 0) * 1000;
}
/** Seconds ("27120"), "h:mm" ("7:32") or minutes when the column says so. */
function readDuration(text: string, unit: 'seconds' | 'minutes' | 'clock'): number | null {
  const t = text.trim();
  if (!t) return null;
  if (unit === 'clock' || /^\d{1,2}:\d{2}$/.test(t)) { const m = t.match(/^(\d{1,2}):(\d{2})$/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  if (!/^\d+(?:\.\d+)?$/.test(t)) return null;
  return unit === 'seconds' ? Number(t) / 60 : Number(t);
}

export function readSleepCsv(text: string, {zone, nowMs, existing}: {zone: string; nowMs: number; existing: Sleep}): SleepCsvPlan {
  const plan: SleepCsvPlan = {layout: null, nights: [], issues: [], kept: 0, note: ''};
  let parsed;
  try { parsed = parseCsv(text.replace(/^﻿/, '')); } catch (cause) { plan.issues.push({line: 1, reason: cause instanceof Error ? cause.message : 'This file could not be read.'}); return plan; }
  const h = parsed.header;
  const oura = pick(h, 'bedtime_start') !== undefined && pick(h, 'bedtime_end') !== undefined;
  const cycle = !oura && pick(h, 'Start') !== undefined && pick(h, 'End') !== undefined && (pick(h, 'Time in bed (seconds)', 'Time in bed') !== undefined || pick(h, 'Sleep quality', 'Sleep Quality') !== undefined);
  const start = oura ? pick(h, 'bedtime_start') : pick(h, 'Start', 'start time', 'bedtime', 'went to bed', 'sleep start', 'in bed');
  const end = oura ? pick(h, 'bedtime_end') : pick(h, 'End', 'end time', 'wake time', 'woke up', 'sleep end', 'out of bed');
  if (start === undefined || end === undefined) {
    plan.issues.push({line: 1, reason: 'This file has no start and end columns ZIGoals can read. It reads Sleep Cycle’s export, Oura’s sleep rows (bedtime_start, bedtime_end), or any file with start and end columns (like 2026-11-03 23:10).'});
    return plan;
  }
  plan.layout = oura ? 'oura' : cycle ? 'sleep-cycle' : 'start-end';
  plan.note = LAYOUT_NOTES[plan.layout];
  const asleepCol = oura ? pick(h, 'total_sleep_duration') : pick(h, 'Time asleep (seconds)', 'minutes asleep', 'asleep (min)', 'asleep minutes');
  const asleepUnit: 'seconds' | 'minutes' = oura || (asleepCol !== undefined && /second/i.test(h[asleepCol]!)) ? 'seconds' : 'minutes';
  const latencyCol = oura ? pick(h, 'latency') : pick(h, 'Time before sleep (seconds)');
  const typeCol = oura ? pick(h, 'type') : undefined, qualityCol = cycle ? pick(h, 'Sleep quality', 'Sleep Quality') : undefined;
  const taken: {start: number; end: number}[] = existing.nights.map(n => ({start: Date.parse(n.start), end: n.end === null ? nowMs : Date.parse(n.end)}));
  parsed.rows.forEach((row, index) => {
    const line = index + 2, cell = (i: number | undefined) => i === undefined ? '' : (row[i] ?? '').trim();
    if (!row.some(c => c.trim())) return;
    const type = cell(typeCol);
    if (type === 'rest' || type === 'deleted') { plan.issues.push({line, reason: `Line ${line}: a period Oura marked as ${type} (left out).`}); return; }
    const s = readStamp(cell(start), zone), e = readStamp(cell(end), zone);
    if (s === null || e === null) { plan.issues.push({line, reason: `Line ${line}: the start or end does not read as a date and time (like 2026-11-03 23:10).`}); return; }
    if (e <= s) { plan.issues.push({line, reason: `Line ${line}: the night ends before it starts.`}); return; }
    if (e - s > MAX_NIGHT_MINUTES * 60_000) { plan.issues.push({line, reason: `Line ${line}: longer than 24 hours.`}); return; }
    if (e > nowMs + 60_000) { plan.issues.push({line, reason: `Line ${line}: it ends in the future.`}); return; }
    if (taken.some(t => s < t.end && t.start < e)) { plan.kept++; return; }
    const inBed = Math.round((e - s) / 60_000), asleepMin = readDuration(cell(asleepCol), asleepUnit), latency = readDuration(cell(latencyCol), 'seconds');
    const latencyMin = latency !== null ? Math.min(Math.round(latency), inBed) : undefined;
    const awake = asleepMin !== null ? inBed - Math.round(asleepMin) - (latencyMin ?? 0) : null;
    const quality = cell(qualityCol).replace(/\s*%$/, '');
    const night: SleepCsvNight = {line, kind: type === 'late_nap' || type === 'nap' ? 'nap' : napOrNight(s, e, zone), start: s, end: e, timeZone: zone,
      ...(latencyMin !== undefined ? {latencyMin} : {}), ...(awake !== null && awake >= 0 ? {awakeMin: awake} : {}),
      note: `Imported from ${plan.layout === 'sleep-cycle' ? 'Sleep Cycle' : plan.layout === 'oura' ? 'Oura' : 'a sleep file'} (CSV)${/^\d{1,3}$/.test(quality) ? ` · sleep quality ${quality} %` : ''}`};
    taken.push({start: s, end: e});
    plan.nights.push(night);
  });
  return plan;
}
/** The wake day of a previewed night, in its zone, for the preview list. */
export const csvNightDay = (n: Pick<NightInput, 'end' | 'timeZone'>) => wallClock(n.end, n.timeZone).date;
