import {emptyItems, type ImportPlan} from './apply';
import {buildNight, buildVital, checkStop, DayTotals, HeartDays, LastOfDay, localDay, parseOffset, parseStamp, planOf, Skipped, stepsLine, weightLine, zoneFor, type ReadContext} from './common';
import {csvRows, headerIndex} from './csv-stream';
import {baseName, progressCounter, textStream, type ImportFile} from './source';

/**
 * Fitbit and Google Health exports from Google Takeout (Session W Part 7; IMPORT_FORMATS.md "Fitbit / Google Health").
 * Only the CSV files are read: their columns are described by the README Google ships beside each one, and their times
 * are UTC (sleep adds each night's offset). The older JSON files ("Global Export Data") carry times without a zone that
 * sources disagree about, so they are never read; an archive with only those is refused with a plain message. Takeout
 * repeats data across folders and devices, so steps keep one source per day and nothing is added twice.
 */
export const FITBIT_LABEL = 'Fitbit / Google Health';
const kind = (path: string): 'sleeps' | 'stages' | 'steps' | 'resting' | 'weight' | 'heart' | null => {
  const name = baseName(path).toLowerCase();
  if (!name.endsWith('.csv')) return null;
  if (/health fitness data_googledata\//i.test(path)) { if (name.startsWith('usersleepstages')) return 'stages'; if (name.startsWith('usersleeps')) return 'sleeps'; return null; }
  if (/physical activity_googledata\//i.test(path)) {
    if (/^steps(_|\.csv)/.test(name)) return 'steps';
    if (name.startsWith('daily_resting_heart_rate')) return 'resting';
    if (/^weight(_|\.csv)/.test(name)) return 'weight';
    if (/^heart_rate(_|\.csv)/.test(name)) return 'heart';
  }
  return null;
};
export const isFitbitCsv = (path: string) => kind(path) !== null;
export const isFitbitLegacy = (path: string) => /global export data\/.+\.json$/i.test(path) || /(^|\/)sleep\/sleep-.+\.json$/i.test(path);
export const FITBIT_LEGACY_ONLY = 'This Fitbit archive has only the older JSON files, whose times ZIGoals cannot place safely. Export again with Google Takeout and choose Google Health (or Fitbit): that export has the CSV files ZIGoals reads.';

export async function readFitbit(files: readonly ImportFile[], ctx: ReadContext): Promise<ImportPlan> {
  const items = emptyItems(), skipped = new Skipped(), counter = progressCounter(ctx.onProgress), warnings: string[] = [];
  const steps = new DayTotals(), heart = new HeartDays(), resting = new DayTotals(), weights = new LastOfDay();
  const stages = new Map<string, {deepMin: number; remMin: number; coreMin: number; light: boolean}>();
  const sleeps: Record<string, string>[] = [];
  let guessed = 0;
  const sorted = [...files].filter(f => kind(f.path)).sort((a, b) => Number(kind(a.path) === 'sleeps') - Number(kind(b.path) === 'sleeps'));
  if (!sorted.length) throw Error(files.some(f => isFitbitLegacy(f.path)) ? FITBIT_LEGACY_ONLY : 'No Fitbit or Google Health CSV files were found in this export.');
  for (const file of sorted) {
    const k = kind(file.path)!;
    let header: Map<string, number> | null = null;
    const need: Record<typeof k, string[]> = {sleeps: ['sleep_id', 'sleep_start', 'sleep_end', 'end_utc_offset', 'minutes_asleep'], stages: ['sleep_id', 'sleep_stage_type', 'sleep_stage_start', 'sleep_stage_end'], steps: ['timestamp', 'steps', 'data source'], resting: ['timestamp', 'beats per minute'], weight: ['timestamp', 'weight grams'], heart: ['timestamp', 'beats per minute']};
    for await (const row of csvRows(textStream(file, counter))) {
      checkStop(ctx.signal);
      if (!header) {
        header = headerIndex(row);
        const missing = need[k].filter(c => !header!.has(c));
        if (missing.length) { warnings.push(`${baseName(file.path)} was not read: it has no ${missing.join(', ')} column.`); break; }
        continue;
      }
      const get = (name: string) => (row[header!.get(name) ?? -1] ?? '').trim();
      if (k === 'sleeps') { sleeps.push(Object.fromEntries([...header].map(([name, i]) => [name, (row[i] ?? '').trim()]))); continue; }
      if (k === 'stages') {
        const start = parseStamp(get('sleep_stage_start')), end = parseStamp(get('sleep_stage_end')), id = get('sleep_id'), type = get('sleep_stage_type').toUpperCase();
        if (!start || !end || !id || !(end.ms > start.ms)) continue;
        const s = stages.get(id) ?? {deepMin: 0, remMin: 0, coreMin: 0, light: false}, m = (end.ms - start.ms) / 60_000;
        if (type === 'DEEP') s.deepMin += m; else if (type === 'REM') s.remMin += m; else if (type === 'LIGHT') { s.coreMin += m; s.light = true; }
        stages.set(id, s);
        continue;
      }
      const at = parseStamp(get('timestamp'));
      if (!at) { skipped.add('a row without a readable time'); continue; }
      const source = get('data source') || 'Fitbit';
      if (k === 'steps') { const n = Number(get('steps')); if (Number.isFinite(n) && n > 0) steps.add(localDay(at.ms, ctx.zone), source, n); continue; }
      if (k === 'heart') { const n = Number(get('beats per minute')); if (!heart.add(localDay(at.ms, ctx.zone), source, n)) skipped.add('a heart rate outside 20–250 bpm'); continue; }
      // A daily row at midnight UTC names the local date it belongs to (Google's README).
      if (k === 'resting') { const n = Number(get('beats per minute')); if (n >= 20 && n <= 250) resting.add(new Date(at.ms).toISOString().slice(0, 10), source, n); continue; }
      if (k === 'weight') { const g = Number(get('weight grams')); if (Number.isFinite(g) && g > 0) weights.add(localDay(at.ms, ctx.zone), at.ms, g); }
    }
  }
  counter.flush();
  for (const r of sleeps) {
    const start = parseStamp(r.sleep_start ?? ''), end = parseStamp(r.sleep_end ?? '');
    if (!start || !end) { skipped.add('a night without readable times'); continue; }
    const zone = zoneFor(end.ms, parseOffset(r.end_utc_offset ?? ''), ctx.zone);
    if (zone.guessed) guessed++;
    const st = stages.get(r.sleep_id ?? ''), asleep = Number(r.minutes_asleep), latency = Number(r.minutes_to_fall_asleep);
    const night = buildNight('fitbit', {startMs: start.ms, endMs: end.ms, zone: zone.zone, now: ctx.now, ...(Number.isFinite(asleep) && asleep >= 0 ? {asleepMin: asleep} : {}), ...(Number.isFinite(latency) && latency >= 0 ? {latencyMin: latency} : {}), ...(st?.light ? {stages: st} : {})});
    if (typeof night === 'string') skipped.add(night); else items.sleep.push(night);
  }
  const stepDays = steps.pick(), restingDays = resting.pick(), heartDays = heart.pick();
  for (const [date, {value}] of stepDays.values) { const line = stepsLine('fitbit', FITBIT_LABEL, date, value); if (line) items.activity.push(line); }
  for (const {date, value} of weights.entries()) { const line = weightLine('fitbit', date, value); if (line) items.weights.push(line); else skipped.add('a weight outside 1–1,000 kg'); }
  for (const date of new Set([...restingDays.values.keys(), ...heartDays.keys()])) {
    const vital = buildVital('fitbit', date, {restingHr: restingDays.values.get(date)?.value, ...(heartDays.get(date) ?? {})}, ctx.now);
    if (vital) items.vitals.push(vital);
  }
  const summarised: string[] = [];
  if (heartDays.size) summarised.push(`Heart rate: each day's lowest, average and highest (${heartDays.size.toLocaleString('en')} days), not every reading.`);
  if (items.sleep.some(n => n.stages)) summarised.push('Sleep stages: the minutes of each stage per night, not every change of stage.');
  if (stepDays.multiSource) summarised.push(`Steps: one total a day from the source that counted the most (${stepDays.multiSource.toLocaleString('en')} days had more than one, such as a phone and a tracker), never added together.`);
  if (guessed) warnings.push(`${guessed} ${guessed === 1 ? 'night was' : 'nights were'} recorded at an offset that is not a whole hour away from your time zone; ${guessed === 1 ? 'its' : 'their'} day uses your own zone.`);
  if (files.some(f => isFitbitLegacy(f.path))) warnings.push('The older JSON copies of the same data were not read: the CSV files hold it with clear times.');
  return planOf('fitbit', FITBIT_LABEL, items, summarised, [...skipped.lines(), ...warnings]);
}
