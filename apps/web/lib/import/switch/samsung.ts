import {emptyItems, type ImportPlan} from './apply';
import {buildNight, buildVital, checkStop, HeartDays, LastOfDay, localDay, parseOffset, parseStamp, planOf, Skipped, stepsLine, weightLine, zoneFor, type ReadContext, dayCount} from './common';
import {csvRows, headerIndex} from './csv-stream';
import {baseName, progressCounter, textStream, type ImportFile} from './source';

/**
 * Samsung Health's "Download personal data" (Session W Part 7; IMPORT_FORMATS.md "Samsung Health"): a folder of CSV files,
 * or a ZIP the person makes of it. The first line of each file describes it and the second names the columns; the column
 * names are the Samsung Health SDK's documented field names (start_time, time_offset, day_time, source_type, stage…),
 * sometimes with a "com.samsung.health.<type>." prefix, and so are their meanings: times in UTC with the offset beside
 * them, sleep stages 40001 awake, 40002 light, 40003 deep, 40004 REM, and one daily step record per source type, where
 * −2 is all sources combined (the only one kept).
 */
export const SAMSUNG_LABEL = 'Samsung Health';
const PREFIX = /^com\.samsung\.(?:s?health)\.[a-z_.]+?\.(?=[a-z_]+$)/;
type Kind = 'steps' | 'sleep' | 'stage' | 'weight' | 'heart';
const kind = (path: string): Kind | null => {
  const name = baseName(path).toLowerCase();
  if (!/\.\d{14}\.csv$/.test(name) && !name.endsWith('.csv')) return null;
  if (name.startsWith('com.samsung.shealth.step_daily_trend.')) return 'steps';
  if (name.startsWith('com.samsung.shealth.sleep.')) return 'sleep';
  if (name.startsWith('com.samsung.health.sleep_stage.')) return 'stage';
  if (name.startsWith('com.samsung.health.weight.')) return 'weight';
  if (name.startsWith('com.samsung.shealth.tracker.heart_rate.')) return 'heart';
  return null;
};
export const isSamsungFile = (path: string) => /(^|\/)com\.samsung\.[a-z_.]+\.\d{14}\.csv$/i.test(path);
/** "2025-10-21 21:00:00.000" is UTC in these files (the SDK keeps UTC milliseconds); the offset sits in time_offset. */
const utc = (text: string) => parseStamp(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text.trim()) ? text : `${text.trim()}Z`);

export async function readSamsung(files: readonly ImportFile[], ctx: ReadContext): Promise<ImportPlan> {
  const items = emptyItems(), skipped = new Skipped(), counter = progressCounter(ctx.onProgress), warnings: string[] = [];
  const stepsByDay = new Map<string, number>(), heart = new HeartDays(), weights = new LastOfDay();
  const stages = new Map<string, {deepMin: number; remMin: number; coreMin: number; awakeMin: number; light: boolean}>();
  const sleeps: Record<string, string>[] = [];
  let guessed = 0;
  const order: Kind[] = ['stage', 'sleep', 'steps', 'weight', 'heart'];
  const picked = files.filter(f => kind(f.path)).sort((a, b) => order.indexOf(kind(a.path)!) - order.indexOf(kind(b.path)!));
  if (!picked.length) throw Error('No Samsung Health files that ZIGoals reads were found. Choose the "Samsung Health" folder from Download personal data, or a ZIP of it.');
  const need: Record<Kind, string[]> = {steps: ['day_time', 'count', 'source_type'], sleep: ['start_time', 'end_time', 'time_offset', 'datauuid'], stage: ['start_time', 'end_time', 'stage', 'sleep_id'], weight: ['weight', 'start_time', 'time_offset'], heart: ['heart_rate', 'start_time', 'time_offset']};
  for (const file of picked) {
    const k = kind(file.path)!;
    let header: Map<string, number> | null = null;
    for await (const row of csvRows(textStream(file, counter), {skipLines: 1, delimiter: ','})) {
      checkStop(ctx.signal);
      if (!header) {
        header = headerIndex(row, PREFIX);
        const missing = need[k].filter(c => !header!.has(c));
        if (missing.length) { warnings.push(`${baseName(file.path)} was not read: it has no ${missing.join(', ')} column.`); break; }
        continue;
      }
      const get = (name: string) => (row[header!.get(name) ?? -1] ?? '').trim();
      if (k === 'steps') {
        if (get('source_type') !== '-2') continue;
        const day = Number(get('day_time')), n = Number(get('count'));
        if (Number.isFinite(day) && Number.isFinite(n) && n > 0) { const date = new Date(day).toISOString().slice(0, 10); stepsByDay.set(date, Math.max(stepsByDay.get(date) ?? 0, n)); }
        continue;
      }
      if (k === 'sleep') { sleeps.push(Object.fromEntries([...header].map(([name, i]) => [name, (row[i] ?? '').trim()]))); continue; }
      if (k === 'stage') {
        const start = utc(get('start_time')), end = utc(get('end_time')), id = get('sleep_id'), stage = get('stage');
        if (!start || !end || !id || !(end.ms > start.ms)) continue;
        const s = stages.get(id) ?? {deepMin: 0, remMin: 0, coreMin: 0, awakeMin: 0, light: false}, m = (end.ms - start.ms) / 60_000;
        if (stage === '40001') s.awakeMin += m; else if (stage === '40002') { s.coreMin += m; s.light = true; } else if (stage === '40003') s.deepMin += m; else if (stage === '40004') s.remMin += m;
        stages.set(id, s);
        continue;
      }
      const at = utc(get('start_time'));
      if (!at) { skipped.add('a row without a readable time'); continue; }
      const zone = zoneFor(at.ms, parseOffset(get('time_offset')), ctx.zone).zone, date = localDay(at.ms, zone);
      if (k === 'weight') { const kg = Number(get('weight')); if (Number.isFinite(kg) && kg > 0) weights.add(date, at.ms, kg * 1000); continue; }
      const bpm = Number(get('heart_rate')), low = Number(get('min')), high = Number(get('max'));
      if (!heart.add(date, 'samsung', bpm, Number.isFinite(low) && low > 0 ? low : bpm, Number.isFinite(high) && high > 0 ? high : bpm)) skipped.add('a heart rate outside 20–250 bpm');
    }
  }
  counter.flush();
  for (const r of sleeps) {
    const start = utc(r.start_time ?? ''), end = utc(r.end_time ?? '');
    if (!start || !end) { skipped.add('a night without readable times'); continue; }
    const zone = zoneFor(end.ms, parseOffset(r.time_offset ?? ''), ctx.zone);
    if (zone.guessed) guessed++;
    const st = stages.get(r.datauuid ?? ''), latencyMs = Number(r.sleep_latency);
    const latency = Number.isFinite(latencyMs) && latencyMs >= 0 && r.sleep_latency !== '' ? latencyMs / 60_000 : undefined;
    const night = buildNight('samsung', {startMs: start.ms, endMs: end.ms, zone: zone.zone, now: ctx.now, ...(latency !== undefined ? {latencyMin: latency} : {}), ...(st?.light ? {stages: st, asleepMin: st.deepMin + st.remMin + st.coreMin} : {})});
    if (typeof night === 'string') skipped.add(night); else items.sleep.push(night);
  }
  for (const [date, n] of stepsByDay) { const line = stepsLine('samsung', SAMSUNG_LABEL, date, n); if (line) items.activity.push(line); }
  for (const {date, value} of weights.entries()) { const line = weightLine('samsung', date, value); if (line) items.weights.push(line); else skipped.add('a weight outside 1–1,000 kg'); }
  const heartDays = heart.pick();
  for (const [date, h] of heartDays) { const vital = buildVital('samsung', date, h, ctx.now); if (vital) items.vitals.push(vital); }
  const summarised: string[] = [];
  if (heartDays.size) summarised.push(`Heart rate: each day's lowest, average and highest (${dayCount(heartDays.size)}), not every reading.`);
  if (items.sleep.some(n => n.stages)) summarised.push('Sleep stages: the minutes of each stage per night, not every change of stage.');
  if (stepsByDay.size) summarised.push('Steps: Samsung Health\'s own daily total for all your devices together, not each device\'s count.');
  if (guessed) warnings.push(`${guessed} ${guessed === 1 ? 'night was' : 'nights were'} recorded at an offset that is not a whole hour away from your time zone; ${guessed === 1 ? 'its' : 'their'} day uses your own zone.`);
  return planOf('samsung', SAMSUNG_LABEL, items, summarised, [...skipped.lines(), ...warnings]);
}
