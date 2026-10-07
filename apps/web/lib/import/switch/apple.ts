import {scanXml} from '../xml-scan';
import {timeZoneSchema} from '../../time-zone-schema';
import type {SleepNight} from '../../sleep/schema';
import type {MeditationSession} from '../../meditation/schema';
import {emptyItems, type ImportPlan} from './apply';
import {buildNight, buildSession, buildVital, checkStop, DayTotals, HeartDays, LastOfDay, localDay, parseStamp, planOf, Skipped, stepsLine, weightLine, workoutLine, type ReadContext} from './common';
import {progressCounter, textStream, type ImportFile} from './source';

/**
 * Apple Health's export.xml (Session W Part 7; docs/product/IMPORT_FORMATS.md "Apple Health"), read as it streams: the
 * file is often gigabytes, so each record is turned into a day's total, a night segment or a session and dropped.
 * Identifiers, units, sleep values and the HKTimeZone key are Apple's documented HealthKit names; the file's layout is
 * the DTD Apple ships inside it. Every timestamp carries the phone's offset at export time, so instants are exact but
 * their wall-clock times are not: a record's day comes from its own HKTimeZone when it has one, else the person's zone.
 */
export const APPLE_LABEL = 'Apple Health';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis', MINDFUL = 'HKCategoryTypeIdentifierMindfulSession';
const ASLEEP = new Set(['HKCategoryValueSleepAnalysisAsleepUnspecified', 'HKCategoryValueSleepAnalysisAsleep', 'HKCategoryValueSleepAnalysisAsleepCore', 'HKCategoryValueSleepAnalysisAsleepDeep', 'HKCategoryValueSleepAnalysisAsleepREM']);
const STAGE: Record<string, 'coreMin' | 'deepMin' | 'remMin'> = {HKCategoryValueSleepAnalysisAsleepCore: 'coreMin', HKCategoryValueSleepAnalysisAsleepDeep: 'deepMin', HKCategoryValueSleepAnalysisAsleepREM: 'remMin'};
const KCAL: Record<string, number> = {kcal: 1, Cal: 1, kJ: 1 / 4.184, cal: 1 / 1000, J: 1 / 4184};
const GRAMS: Record<string, number> = {kg: 1000, g: 1, lb: 453.59237, st: 6350.29318};
const BPM: Record<string, number> = {'count/min': 1, 'count/s': 60};
type Segment = {source: string; start: number; end: number; value: string; zone: string | null};
type Open = {name: string; attrs: Record<string, string>; meta: Record<string, string>};

/** "HKWorkoutActivityTypeTraditionalStrengthTraining" → "Traditional strength training". */
export function workoutName(type: string): string {
  const words = type.replace(/^HKWorkoutActivityType/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').trim();
  return words ? words[0]!.toUpperCase() + words.slice(1).toLowerCase() : 'Workout';
}
const zoneOf = (meta: Record<string, string>) => { const z = meta.HKTimeZone; return z && timeZoneSchema.safeParse(z).success ? z : null; };
const minutes = (ms: number) => ms / 60_000;

export async function readApple(file: ImportFile, ctx: ReadContext): Promise<ImportPlan> {
  const items = emptyItems(), skipped = new Skipped(), notRead = new Map<string, number>(), counter = progressCounter(ctx.onProgress);
  const steps = new DayTotals(), active = new DayTotals(), basal = new DayTotals(), heart = new HeartDays(), resting = new HeartDays(), weights = new LastOfDay();
  const segments: Segment[] = [], mindful: {start: number; end: number; zone: string | null}[] = [];
  let open: Open | null = null, sawHealthData = false;
  const dayOf = (ms: number, zone: string | null) => localDay(ms, zone ?? ctx.zone);
  const record = ({attrs, meta}: Open) => {
    const type = attrs.type ?? '', source = attrs.sourceName ?? 'unknown', start = parseStamp(attrs.startDate ?? ''), end = parseStamp(attrs.endDate ?? attrs['startDate#2'] ?? '');
    if (!start || !end) { skipped.add('a record without readable dates'); return; }
    const zone = zoneOf(meta), unit = attrs.unit ?? '', value = Number(attrs.value);
    switch (type) {
      case 'HKQuantityTypeIdentifierStepCount': if (Number.isFinite(value)) steps.add(dayOf(start.ms, zone), source, value); return;
      case 'HKQuantityTypeIdentifierActiveEnergyBurned': case 'HKQuantityTypeIdentifierBasalEnergyBurned': {
        const k = KCAL[unit]; if (k === undefined || !Number.isFinite(value)) { skipped.add(`energy in a unit ZIGoals does not know (${unit || 'none'})`); return; }
        (type.includes('Active') ? active : basal).add(dayOf(start.ms, zone), source, value * k); return;
      }
      case 'HKQuantityTypeIdentifierHeartRate': case 'HKQuantityTypeIdentifierRestingHeartRate': {
        const k = BPM[unit]; if (k === undefined || !Number.isFinite(value)) { skipped.add(`heart rate in a unit ZIGoals does not know (${unit || 'none'})`); return; }
        if (!(type.includes('Resting') ? resting : heart).add(dayOf(start.ms, zone), source, value * k)) skipped.add('a heart rate outside 20–250 bpm');
        return;
      }
      case 'HKQuantityTypeIdentifierBodyMass': {
        const k = GRAMS[unit]; if (k === undefined || !Number.isFinite(value)) { skipped.add(`a weight in a unit ZIGoals does not know (${unit || 'none'})`); return; }
        weights.add(dayOf(start.ms, zone), start.ms, value * k); return;
      }
      case SLEEP: segments.push({source, start: start.ms, end: end.ms, value: attrs.value ?? '', zone}); return;
      case MINDFUL: mindful.push({start: start.ms, end: end.ms, zone}); return;
      default: notRead.set(type || 'unnamed', (notRead.get(type || 'unnamed') ?? 0) + 1);
    }
  };
  const workout = ({attrs, meta}: Open) => {
    const start = parseStamp(attrs.startDate ?? ''), end = parseStamp(attrs.endDate ?? '');
    if (!start || !end) { skipped.add('a workout without readable dates'); return; }
    const unit = attrs.durationUnit ?? 'min', d = Number(attrs.duration);
    const length = Number.isFinite(d) ? (unit === 's' ? d / 60 : unit === 'hr' || unit === 'h' ? d * 60 : d) : minutes(end.ms - start.ms);
    const line = workoutLine('apple-health', new Date(start.ms).toISOString(), dayOf(start.ms, zoneOf(meta)), workoutName(attrs.workoutActivityType ?? ''), length);
    if (line) items.activity.push(line); else skipped.add('a workout shorter than a minute or longer than a day');
  };
  await scanXml(textStream(file, counter), element => {
    checkStop(ctx.signal);
    const {name, attrs, selfClosing, parent} = element;
    if (name === 'HealthData') { sawHealthData = true; return; }
    if (name === 'MetadataEntry' && open && parent === open.name) { if (attrs.key) open.meta[attrs.key] = attrs.value ?? ''; return; }
    if (name === 'Record' || name === 'Workout') {
      const entry: Open = {name, attrs, meta: {}};
      if (selfClosing) { if (name === 'Record') record(entry); else workout(entry); } else open = entry;
    }
  }, {onEnd: name => { if (open && name === open.name) { if (name === 'Record') record(open); else workout(open); open = null; } }, signal: ctx.signal});
  counter.flush();
  if (!sawHealthData) throw Error('This file is not an Apple Health export (its HealthData list is missing).');

  // Nights: each source's segments joined while less than an hour apart; overlapping nights from two sources keep one.
  const nights = sleepNights(segments, ctx, skipped);
  items.sleep.push(...nights.kept);
  for (const m of mindful) { const s = buildSession('apple-health', {startMs: m.start, seconds: (m.end - m.start) / 1000, zone: m.zone ?? ctx.zone, now: ctx.now}); if (typeof s === 'string') skipped.add(s); else items.meditation.push(s as MeditationSession); }
  const stepDays = steps.pick(), activeDays = active.pick(), basalDays = basal.pick(), heartDays = heart.pick(), restingDays = resting.pick();
  for (const [date, {value}] of stepDays.values) { const line = stepsLine('apple-health', APPLE_LABEL, date, value); if (line) items.activity.push(line); }
  for (const {date, value} of weights.entries()) { const line = weightLine('apple-health', date, value); if (line) items.weights.push(line); else skipped.add('a weight outside 1–1,000 kg'); }
  for (const date of new Set([...activeDays.values.keys(), ...basalDays.values.keys(), ...heartDays.keys(), ...restingDays.keys()])) {
    const h = heartDays.get(date), vital = buildVital('apple-health', date, {activeKcal: activeDays.values.get(date)?.value, restingKcal: basalDays.values.get(date)?.value, restingHr: restingDays.get(date)?.hrAvg, ...(h ?? {})}, ctx.now);
    if (vital) items.vitals.push(vital);
  }
  const summarised: string[] = [];
  if (heartDays.size) summarised.push(`Heart rate: each day's lowest, average and highest (${heartDays.size.toLocaleString('en')} days), not every reading.`);
  if (nights.staged) summarised.push('Sleep stages: the minutes of each stage per night, not every change of stage.');
  if (stepDays.multiSource || activeDays.multiSource) summarised.push(`Steps and energy: one total a day from the source that counted the most (${Math.max(stepDays.multiSource, activeDays.multiSource).toLocaleString('en')} days had more than one, such as a phone and a watch), never the two added together.`);
  const warnings = skipped.lines();
  const other = [...notRead].sort((a, b) => b[1] - a[1]);
  if (other.length) warnings.push(`${other.reduce((t, [, n]) => t + n, 0).toLocaleString('en')} records of ${other.length} other kinds are not kept (for example ${other.slice(0, 3).map(([t]) => t.replace(/^HK(Quantity|Category)TypeIdentifier/, '')).join(', ')}).`);
  return planOf('apple-health', APPLE_LABEL, items, summarised, warnings);
}

/** Sleep segments to nights (exported for tests). */
export function sleepNights(segments: readonly Segment[], ctx: Pick<ReadContext, 'zone' | 'now'>, skipped: Skipped): {kept: SleepNight[]; staged: boolean} {
  type Session = {source: string; start: number; end: number; parts: Segment[]};
  const bySource = new Map<string, Segment[]>();
  for (const s of segments) { if (!(s.end > s.start)) continue; const list = bySource.get(s.source) ?? []; list.push(s); bySource.set(s.source, list); }
  const sessions: Session[] = [];
  for (const [source, list] of bySource) {
    list.sort((a, b) => a.start - b.start);
    let current: Session | null = null;
    for (const s of list) {
      if (current && s.start <= current.end + 3_600_000) { current.end = Math.max(current.end, s.end); current.parts.push(s); }
      else { current = {source, start: s.start, end: s.end, parts: [s]}; sessions.push(current); }
    }
  }
  // Two sources recording the same night: the one with stages wins, then the one with more time asleep.
  const asleepOf = (x: Session) => x.parts.filter(p => ASLEEP.has(p.value)).reduce((t, p) => t + (p.end - p.start), 0);
  const stagedOf = (x: Session) => x.parts.some(p => STAGE[p.value]);
  sessions.sort((a, b) => Number(stagedOf(b)) - Number(stagedOf(a)) || asleepOf(b) - asleepOf(a) || a.start - b.start);
  const chosen: Session[] = [];
  for (const s of sessions) { if (chosen.some(c => c.start < s.end && s.start < c.end)) { skipped.add('a night another app in this export also recorded'); continue; } chosen.push(s); }
  const kept: SleepNight[] = [];
  let staged = false;
  for (const s of chosen.sort((a, b) => a.start - b.start)) {
    const asleepParts = s.parts.filter(p => ASLEEP.has(p.value));
    const zone = s.parts.map(p => p.zone).find(Boolean) ?? ctx.zone;
    const asleep = asleepParts.length ? minutes(union(asleepParts)) : undefined;
    const firstAsleep = asleepParts.length ? Math.min(...asleepParts.map(p => p.start)) : undefined;
    const stageMinutes = {deepMin: 0, remMin: 0, coreMin: 0};
    for (const p of s.parts) { const k = STAGE[p.value]; if (k) stageMinutes[k] += minutes(p.end - p.start); }
    // Stages only when every asleep minute has a stage (no "unspecified" time mixed in).
    const hasStages = stagedOf(s) && !asleepParts.some(p => !STAGE[p.value]);
    if (hasStages) staged = true;
    const night = buildNight('apple-health', {startMs: s.start, endMs: s.end, zone, now: ctx.now, ...(asleep !== undefined ? {asleepMin: asleep, latencyMin: minutes(firstAsleep! - s.start)} : {}), ...(hasStages ? {stages: stageMinutes} : {})});
    if (typeof night === 'string') skipped.add(night); else kept.push(night);
  }
  return {kept, staged};
}
/** Total length of possibly overlapping spans. */
function union(parts: readonly {start: number; end: number}[]): number {
  let total = 0, current: {start: number; end: number} | null = null;
  for (const p of [...parts].sort((a, b) => a.start - b.start)) {
    if (!current || p.start > current.end) { if (current) total += current.end - current.start; current = {start: p.start, end: p.end}; }
    else current.end = Math.max(current.end, p.end);
  }
  return current ? total + current.end - current.start : total;
}
