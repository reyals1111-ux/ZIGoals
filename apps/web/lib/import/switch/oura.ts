import {emptyItems, type ImportPlan} from './apply';
import {buildNight, buildVital, checkStop, parseStamp, planOf, Skipped, stepsLine, zoneFor, type ReadContext} from './common';
import {csvRows, headerIndex} from './csv-stream';
import {baseName, progressCounter, textStream, type ImportFile} from './source';

/**
 * Oura's data export from the Membership Hub (Session W Part 7; IMPORT_FORMATS.md "Oura"). Oura says the export follows
 * the data models of its API v2, so each column means what the API's documentation says: durations in seconds, bedtimes
 * with their offset, `day` as Oura's own day. Files are semicolon-delimited (the delimiter is taken from each header).
 * Resting heart rate is the lowest heart rate of the main sleep, as Oura defines it; it can differ slightly from the app.
 */
export const OURA_LABEL = 'Oura';
export const isOuraFile = (path: string) => /(^|\/)(sleepmodel|dailyactivity)\.csv$/i.test(path);
const day = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;

export async function readOura(files: readonly ImportFile[], ctx: ReadContext): Promise<ImportPlan> {
  const items = emptyItems(), skipped = new Skipped(), counter = progressCounter(ctx.onProgress), warnings: string[] = [];
  const resting = new Map<string, number>(), activeKcal = new Map<string, number>();
  let guessed = 0, read = 0;
  for (const file of files.filter(f => isOuraFile(f.path))) {
    const sleep = /sleepmodel\.csv$/i.test(file.path);
    const need = sleep ? ['day', 'bedtime_start', 'bedtime_end', 'type', 'total_sleep_duration'] : ['day', 'steps'];
    let header: Map<string, number> | null = null;
    for await (const row of csvRows(textStream(file, counter))) {
      checkStop(ctx.signal);
      if (!header) {
        header = headerIndex(row);
        const missing = need.filter(c => !header!.has(c));
        if (missing.length) { warnings.push(`${baseName(file.path)} was not read: it has no ${missing.join(', ')} column.`); break; }
        read++;
        continue;
      }
      const get = (name: string) => (row[header!.get(name) ?? -1] ?? '').trim(), num = (name: string) => { const t = get(name); return t === '' ? NaN : Number(t); };
      const date = day(get('day'));
      if (!date) { skipped.add('a row without a readable day'); continue; }
      if (!sleep) {
        const steps = num('steps'); if (Number.isFinite(steps)) { const line = stepsLine('oura', OURA_LABEL, date, steps); if (line) items.activity.push(line); }
        const active = num('active_calories'); if (Number.isFinite(active) && active >= 0) activeKcal.set(date, active);
        continue;
      }
      const type = get('type');
      if (type === 'rest' || type === 'deleted') { skipped.add('a period Oura marked as rest or deleted'); continue; }
      const start = parseStamp(get('bedtime_start')), end = parseStamp(get('bedtime_end'));
      if (!start || !end) { skipped.add('a night without readable times'); continue; }
      const zone = zoneFor(end.ms, end.offset, ctx.zone);
      if (zone.guessed) guessed++;
      const total = num('total_sleep_duration'), latency = num('latency'), deep = num('deep_sleep_duration'), rem = num('rem_sleep_duration'), light = num('light_sleep_duration');
      const staged = [deep, rem, light].every(v => Number.isFinite(v) && v >= 0);
      const night = buildNight('oura', {startMs: start.ms, endMs: end.ms, zone: zone.zone, now: ctx.now, ...(type === 'late_nap' ? {kind: 'nap' as const} : {}),
        ...(Number.isFinite(total) && total >= 0 ? {asleepMin: total / 60} : {}), ...(Number.isFinite(latency) && latency >= 0 ? {latencyMin: latency / 60} : {}),
        ...(staged ? {stages: {deepMin: deep / 60, remMin: rem / 60, coreMin: light / 60}} : {})});
      if (typeof night === 'string') { skipped.add(night); continue; }
      items.sleep.push(night);
      const lowest = num('lowest_heart_rate');
      if (type === 'long_sleep' && lowest >= 20 && lowest <= 250) resting.set(date, Math.min(resting.get(date) ?? Infinity, lowest));
    }
  }
  counter.flush();
  if (!read) throw Error('No Oura files that ZIGoals reads were found (sleepmodel.csv or dailyactivity.csv in "App Data").');
  for (const date of new Set([...resting.keys(), ...activeKcal.keys()])) { const vital = buildVital('oura', date, {restingHr: resting.get(date), activeKcal: activeKcal.get(date)}, ctx.now); if (vital) items.vitals.push(vital); }
  const summarised: string[] = [];
  if (items.sleep.some(n => n.stages)) summarised.push('Sleep stages: the minutes of each stage per night; the five-minute heart rate and HRV inside each night are not kept.');
  if (resting.size) summarised.push('Resting heart rate: the lowest heart rate of each main sleep, as Oura defines it (it can differ slightly from the app).');
  if (guessed) warnings.push(`${guessed} ${guessed === 1 ? 'night was' : 'nights were'} recorded at an offset that is not a whole hour away from your time zone; ${guessed === 1 ? 'its' : 'their'} day uses your own zone.`);
  return planOf('oura', OURA_LABEL, items, summarised, [...skipped.lines(), ...warnings]);
}
