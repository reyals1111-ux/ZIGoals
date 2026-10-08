import {sleepImportId, meditationImportId, activityImportId, weightImportId} from './ids';
import {sleepNightSchema, type SleepNight, type SleepSource} from '../../sleep/schema';
import {meditationSessionSchema, type MeditationSession} from '../../meditation/schema';
import {vitalDaySchema, type VitalDay, type VitalSource} from '../../vitals/schema';
import {wallClock, zoneOffsetMinutes} from '../../zone-time';
import {napOrNight} from '../../sleep/engine';
import type {ImportFormat} from '../batches-schema';
import type {ActivityLine, ImportItems, ImportPlan, WeightLine} from './apply';

/**
 * Shared pieces of the Switch-to-ZIGoals readers (Session W Part 7): where a record's day falls, one source per day,
 * a day's heart rate as three numbers, and a night or session built exactly as the journal keeps it. Every reader
 * produces records the Health v4 schemas accept, with deterministic ids, so a second import finds its duplicates.
 */
export type ReadContext = {zone: string; now: number; onProgress?: (done: number) => void; signal?: AbortSignal};
export const STOPPED = 'The import was stopped.';
/** A real calendar day (`2026-02-30` and `0000-00-00` are not) between two days. Session X P2.4: a reader that only
 *  checked a day's shape let an impossible one through to the journal's own check, which refused the whole preview. */
/** "1 day", "12 days" (Session X P2.1: summaries read "1 days"). */
export const dayCount = (n: number): string => `${n.toLocaleString('en')} ${n === 1 ? 'day' : 'days'}`;
export function realDay(text: string, from = '1900-01-01', to = '2199-12-31'): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || text < from || text > to) return false;
  const t = Date.parse(`${text}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === text;
}
export function checkStop(signal?: AbortSignal) { if (signal?.aborted) throw Error(STOPPED); }

/**
 * The zone a record was lived in, from the offset its file gives: the person's own zone when it had that offset at that
 * instant (so daylight saving keeps working), otherwise the fixed IANA zone for a whole-hour offset ("Etc/GMT+4" is
 * UTC−4; the sign is reversed by convention). A half-hour offset elsewhere than home keeps home's zone and is counted.
 */
export function zoneFor(ms: number, offsetMinutes: number | null, home: string): {zone: string; guessed: boolean} {
  if (offsetMinutes === null) return {zone: home, guessed: false};
  if (zoneOffsetMinutes(ms, home) === offsetMinutes) return {zone: home, guessed: false};
  if (offsetMinutes === 0) return {zone: 'UTC', guessed: false};
  if (offsetMinutes % 60 === 0 && Math.abs(offsetMinutes) <= 14 * 60) return {zone: `Etc/GMT${offsetMinutes > 0 ? '-' : '+'}${Math.abs(offsetMinutes / 60)}`, guessed: false};
  return {zone: home, guessed: true};
}
/** "+0200", "-05:00", "UTC+0200", "Z" → minutes east of UTC; null when not an offset. */
export function parseOffset(text: string): number | null {
  const t = text.trim().replace(/^(?:UTC|GMT)/i, '');
  if (/^z$/i.test(t)) return 0;
  const m = t.match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!m) return null;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return minutes > 14 * 60 ? null : (m[1] === '-' ? -minutes : minutes);
}
/** "2019-04-10 08:10:34 -0500" (Apple), "2026-04-12 12:32:30+0000" (Fitbit), ISO 8601 with an offset or Z → an instant. */
export function parseStamp(text: string): {ms: number; offset: number | null} | null {
  const m = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = '0', frac = '0', zone] = m;
  const base = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s), Math.round(Number(`0.${frac}`) * 1000));
  if (Number.isNaN(base) || Number(mo) > 12 || Number(d) > 31 || Number(h) > 23 || Number(mi) > 59 || Number(s) > 60) return null;
  if (!zone) return {ms: base, offset: null};
  const offset = parseOffset(zone);
  return offset === null ? null : {ms: base - offset * 60_000, offset};
}
export const isoOf = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, '.000Z');
export const localDay = (ms: number, zone: string) => wallClock(ms, zone).date;

/** Totals per day and source (steps, energy): each day keeps the one source that counted the most, never a sum of two. */
export class DayTotals {
  private days = new Map<string, Map<string, number>>();
  add(date: string, source: string, value: number) { if (!(value >= 0) || !Number.isFinite(value)) return; let s = this.days.get(date); if (!s) this.days.set(date, s = new Map()); s.set(source, (s.get(source) ?? 0) + value); }
  /** Per day: the largest source's total, and how many days had more than one source. */
  pick(): {values: Map<string, {value: number; source: string}>; multiSource: number} {
    const values = new Map<string, {value: number; source: string}>(); let multiSource = 0;
    for (const [date, sources] of this.days) {
      if (sources.size > 1) multiSource++;
      let best: {value: number; source: string} | null = null;
      for (const [source, value] of sources) if (!best || value > best.value || (value === best.value && source < best.source)) best = {value, source};
      if (best) values.set(date, best);
    }
    return {values, multiSource};
  }
  get size() { return this.days.size; }
}
/** Heart rate per day and source; each day becomes lowest, average and highest from the source with the most readings. */
export class HeartDays {
  private days = new Map<string, Map<string, {min: number; max: number; sum: number; n: number}>>();
  add(date: string, source: string, bpm: number, lowest = bpm, highest = bpm) {
    if (!(bpm >= 20 && bpm <= 250) || !(lowest >= 20 && lowest <= 250) || !(highest >= 20 && highest <= 250)) return false;
    let s = this.days.get(date); if (!s) this.days.set(date, s = new Map());
    const v = s.get(source) ?? {min: lowest, max: highest, sum: 0, n: 0};
    v.min = Math.min(v.min, lowest); v.max = Math.max(v.max, highest); v.sum += bpm; v.n++; s.set(source, v);
    return true;
  }
  pick(): Map<string, {hrMin: number; hrAvg: number; hrMax: number}> {
    const out = new Map<string, {hrMin: number; hrAvg: number; hrMax: number}>();
    for (const [date, sources] of this.days) {
      let best: {min: number; max: number; sum: number; n: number} | null = null;
      for (const v of sources.values()) if (!best || v.n > best.n) best = v;
      if (best && best.n) out.set(date, {hrMin: Math.round(best.min), hrAvg: Math.min(Math.round(best.max), Math.max(Math.round(best.min), Math.round(best.sum / best.n))), hrMax: Math.round(best.max)});
    }
    return out;
  }
  get size() { return this.days.size; }
}
/** Values per day that a later one replaces (a weight: the day's last reading by time). */
export class LastOfDay {
  private days = new Map<string, {ms: number; value: number}>();
  add(date: string, ms: number, value: number) { const v = this.days.get(date); if (!v || ms >= v.ms) this.days.set(date, {ms, value}); }
  entries() { return [...this.days].map(([date, v]) => ({date, value: v.value})); }
  get size() { return this.days.size; }
}

export {napOrNight};
const minutes = (ms: number) => Math.max(0, Math.round(ms / 60_000));
/**
 * A night as the journal keeps it. When the source says how long the person slept, time awake is what is left of the
 * night after falling asleep, so ZIGoals' "asleep" equals the source's own figure; stage minutes are kept only when the
 * source has all three (deep, REM, light/core), never one alone. Null when the night cannot be kept (and why).
 */
export function buildNight(source: SleepSource, {startMs, endMs, zone, kind, latencyMin, asleepMin, awakeMin, stages, now}: {startMs: number; endMs: number; zone: string; kind?: 'night' | 'nap'; latencyMin?: number; asleepMin?: number; awakeMin?: number; stages?: {deepMin: number; remMin: number; coreMin: number}; now: number}): SleepNight | string {
  if (!(endMs > startMs)) return 'a night that ends before it starts';
  if (endMs - startMs > 24 * 3_600_000) return 'a night longer than 24 hours';
  if (endMs > now + 60_000) return 'a night that ends in the future';
  const span = minutes(endMs - startMs), latency = latencyMin === undefined ? undefined : Math.min(span, Math.max(0, Math.round(latencyMin)));
  let awake = awakeMin === undefined ? undefined : Math.max(0, Math.round(awakeMin));
  if (asleepMin !== undefined) awake = Math.max(0, span - (latency ?? 0) - Math.round(asleepMin));
  if (awake !== undefined && (latency ?? 0) + awake > span) awake = span - (latency ?? 0);
  const start = isoOf(startMs), end = isoOf(endMs), at = isoOf(now);
  const night = {
    id: sleepImportId(source, start, end), kind: kind ?? napOrNight(startMs, endMs, zone), start, end, timeZone: zone,
    ...(latency !== undefined ? {latencyMin: latency} : {}),
    ...(awake !== undefined ? {awakeMin: awake} : {}),
    ...(stages ? {stages: {deepMin: Math.round(stages.deepMin), remMin: Math.round(stages.remMin), coreMin: Math.round(stages.coreMin)}} : {}),
    source, createdAt: at, updatedAt: at,
  };
  const parsed = sleepNightSchema.safeParse(night);
  return parsed.success ? parsed.data : 'a night the journal cannot hold';
}
export function buildSession(source: MeditationSession['source'], {startMs, seconds, zone, now}: {startMs: number; seconds: number; zone: string; now: number}): MeditationSession | string {
  const s = Math.round(seconds);
  if (s < 60) return 'a session shorter than a minute';
  if (s > 86_400) return 'a session longer than a day';
  if (startMs + s * 1000 > now + 60_000) return 'a session in the future';
  const startedAt = isoOf(startMs), at = isoOf(now);
  const parsed = meditationSessionSchema.safeParse({id: meditationImportId(source, startedAt, s), startedAt, seconds: s, kind: 'import', timeZone: zone, source, createdAt: at, updatedAt: at});
  return parsed.success ? parsed.data : 'a session the journal cannot hold';
}
export function buildVital(source: VitalSource, date: string, values: Partial<Pick<VitalDay, 'restingHr' | 'hrMin' | 'hrAvg' | 'hrMax' | 'activeKcal' | 'restingKcal'>>, now: number): VitalDay | null {
  const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && Number.isFinite(v)).map(([k, v]) => [k, Math.round(v as number)]));
  const parsed = vitalDaySchema.safeParse({id: `health_vital-${source}-${date}`, date, source, ...clean, updatedAt: isoOf(now)});
  return parsed.success ? parsed.data : null;
}
export const stepsLine = (source: ImportFormat, label: string, date: string, steps: number): ActivityLine | null =>
  steps >= 1 && steps <= 1_000_000 ? {id: activityImportId(source, `steps|${date}`), date, name: `Steps · ${label}`, steps: Math.round(steps), minutes: 0} : null;
export const workoutLine = (source: ImportFormat, key: string, date: string, name: string, minutesDone: number): ActivityLine | null =>
  minutesDone >= 1 && minutesDone <= 1440 ? {id: activityImportId(source, `workout|${key}`), date, name: name.slice(0, 120), steps: 0, minutes: Math.round(minutesDone)} : null;
export const weightLine = (source: ImportFormat, date: string, grams: number): WeightLine | null =>
  grams >= 1000 && grams <= 1_000_000 ? {id: weightImportId(source, date), date, grams: Math.round(grams)} : null;

/** Counts of what a reader left out, by reason, for the preview ("12 · a night that ends in the future"). */
export class Skipped {
  private reasons = new Map<string, number>();
  add(reason: string, n = 1) { this.reasons.set(reason, (this.reasons.get(reason) ?? 0) + n); }
  lines(): string[] { return [...this.reasons].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${n.toLocaleString('en')} skipped: ${reason}`); }
}
export function planOf(format: ImportFormat, label: string, items: ImportItems, summarised: string[], warnings: string[]): ImportPlan {
  const byDate = <T>(list: T[], key: (t: T) => string) => list.sort((a, b) => key(a).localeCompare(key(b)));
  byDate(items.sleep, n => n.start); byDate(items.meditation, s => s.startedAt); byDate(items.vitals, d => d.date); byDate(items.activity, a => a.date); byDate(items.weights, w => w.date);
  return {format, label, items, summarised, warnings};
}
