import {emptyItems, type ImportPlan} from './apply';
import {buildNight, buildVital, checkStop, LastOfDay, parseStamp, planOf, Skipped, stepsLine, weightLine, zoneFor, type ReadContext} from './common';
import {baseName, progressCounter, textOf, type ImportFile} from './source';

/**
 * Garmin's "Export Your Data" archive (Session W Part 7; IMPORT_FORMATS.md "Garmin"). Garmin publishes nothing about this
 * layout, and its help page could not be read, so the reader below follows public example files only. ZIGoals reads
 * only layouts it can check against the vendor, so it ships switched off (GARMIN_READS in formats.ts): the importer
 * recognises a Garmin archive and says why it does not read it. Kept and tested so that switching it on, once the
 * layout can be checked, is one line.
 */
export const GARMIN_LABEL = 'Garmin';
export const isGarminFile = (path: string) => /(^|\/)DI_CONNECT\//i.test(path);
type Day = {calendarDate?: string; totalSteps?: number; restingHeartRate?: number; minHeartRate?: number; maxHeartRate?: number; activeKilocalories?: number; bmrKilocalories?: number; wellnessStartTimeGmt?: string; wellnessStartTimeLocal?: string};
type Nap = {napStartTimestampGMT?: string; napEndTimestampGMT?: string; calendarDate?: string};
type Sleep = {calendarDate?: string; sleepStartTimestampGMT?: string; sleepEndTimestampGMT?: string; deepSleepSeconds?: number; lightSleepSeconds?: number; remSleepSeconds?: number; awakeSleepSeconds?: number; napList?: Nap[]};
type Bio = {metaData?: {calendarDate?: string}; weight?: {weight?: number; timestampGMT?: string}};
const gmt = (text?: string) => text ? parseStamp(/[zZ]$/.test(text) ? text : `${text}Z`) : null;
const list = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

export async function readGarmin(files: readonly ImportFile[], ctx: ReadContext): Promise<ImportPlan> {
  const items = emptyItems(), skipped = new Skipped(), counter = progressCounter(ctx.onProgress), offsets = new Map<string, number>(), weights = new LastOfDay();
  const days = files.filter(f => /DI-Connect-Aggregator\/UDSFile_.*\.json$/i.test(f.path)), sleeps = files.filter(f => /DI-Connect-Wellness\/.*_sleepData\.json$/i.test(f.path)), bios = files.filter(f => /DI-Connect-Wellness\/.*_userBioMetrics\.json$/i.test(f.path));
  if (!days.length && !sleeps.length && !bios.length) throw Error('No Garmin daily summary, sleep or weight files were found in this archive.');
  const seen = new Set<string>();
  for (const file of days) for (const d of list<Day>(JSON.parse(await textOf(file, counter)))) {
    checkStop(ctx.signal);
    const date = d.calendarDate;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || seen.has(date)) continue;
    seen.add(date);
    const local = gmt(d.wellnessStartTimeLocal), utc = gmt(d.wellnessStartTimeGmt);
    if (local && utc) offsets.set(date, Math.round((local.ms - utc.ms) / 60_000));
    const line = stepsLine('garmin', GARMIN_LABEL, date, d.totalSteps ?? 0); if (line) items.activity.push(line);
    const vital = buildVital('garmin', date, {restingHr: d.restingHeartRate, hrMin: d.minHeartRate, hrMax: d.maxHeartRate, activeKcal: d.activeKilocalories, restingKcal: d.bmrKilocalories}, ctx.now);
    if (vital) items.vitals.push(vital);
  }
  for (const file of sleeps) for (const s of list<Sleep>(JSON.parse(await textOf(file, counter)))) {
    checkStop(ctx.signal);
    const add = (startText: string | undefined, endText: string | undefined, date: string | undefined, nap: boolean, stages?: Sleep) => {
      const start = gmt(startText), end = gmt(endText);
      if (!start || !end) return;
      const zone = zoneFor(end.ms, date !== undefined ? offsets.get(date) ?? null : null, ctx.zone).zone;
      const staged = stages && [stages.deepSleepSeconds, stages.lightSleepSeconds, stages.remSleepSeconds].every(v => typeof v === 'number' && v >= 0);
      const night = buildNight('garmin', {startMs: start.ms, endMs: end.ms, zone, now: ctx.now, ...(nap ? {kind: 'nap' as const} : {}),
        ...(staged ? {stages: {deepMin: stages!.deepSleepSeconds! / 60, remMin: stages!.remSleepSeconds! / 60, coreMin: stages!.lightSleepSeconds! / 60}, asleepMin: (stages!.deepSleepSeconds! + stages!.remSleepSeconds! + stages!.lightSleepSeconds!) / 60} : {})});
      if (typeof night === 'string') skipped.add(night); else items.sleep.push(night);
    };
    if (s.sleepStartTimestampGMT && s.sleepEndTimestampGMT) add(s.sleepStartTimestampGMT, s.sleepEndTimestampGMT, s.calendarDate, false, s);
    for (const n of s.napList ?? []) add(n.napStartTimestampGMT, n.napEndTimestampGMT, n.calendarDate ?? s.calendarDate, true);
  }
  for (const file of bios) for (const b of list<Bio>(JSON.parse(await textOf(file, counter)))) {
    const date = b.metaData?.calendarDate, grams = b.weight?.weight, at = gmt(b.weight?.timestampGMT);
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof grams === 'number' && grams > 0) weights.add(date, at?.ms ?? 0, grams);
  }
  counter.flush();
  for (const {date, value} of weights.entries()) { const line = weightLine('garmin', date, value); if (line) items.weights.push(line); }
  const warnings = skipped.lines();
  if (files.some(f => /DI-Connect-Fitness\//i.test(f.path))) warnings.push(`Workouts (${baseName('DI-Connect-Fitness')}) are not read.`);
  return planOf('garmin', GARMIN_LABEL, items, items.sleep.some(n => n.stages) ? ['Sleep stages: the minutes of each stage per night.'] : [], warnings);
}
