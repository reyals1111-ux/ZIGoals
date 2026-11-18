import {heartTrack, sleepTrack, stepsTrack, waterTrack, weightTrack, workoutsTrack} from '../../../ai/local-answers/exact/health';
import {resolvePeriod} from '../../../ai/local-answers/exact/period';
import type {DayPoint} from '../../../ai/local-answers/exact/series';
import type {Track} from '../../../ai/local-answers/exact/track';
import {latestWeightObservation, measurementHistory} from '../../../body-measurements';
import type {BodyMeasurement} from '../../../body-measurement-schema';
import type {HealthData} from '../../../health';
import {dailyData, healthDay} from '../../../health-daily';
import {measureText, weightReadingText, weightText, type MeasureUnit} from '../../../health-units';
import {addLocalDays} from '../../../local-date';
import {formatDate} from '../../../visual-format';
import type {Workouts} from '../../../workouts/schema';
import {clamp01} from '../../holo/geometry';
import {shortDate} from '../weight';

/**
 * Session AS (ADR-042 Part 2, family: scanners): the figures of "Health scan" and "Body scan". The scan reads the same
 * tracks as the answer "how is my health" (lib/ai/local-answers/exact/health.ts `healthScan`): last night's sleep, today's
 * steps and water, the latest weight and the latest resting heart rate, each with its own day and the person's own target
 * where they set one. Facts only: no score, no grade, no judgement. A measure with nothing recorded is unknown (null),
 * never zero; a resting heart rate that was never recorded has no card at all.
 */
export type VitalKey = 'sleep' | 'steps' | 'water' | 'weight' | 'heart';
export type Vital = {
  key: VitalKey; label: string;
  /** The value in words ("8 h", "8,800 steps"); null: nothing recorded. */
  value: string | null;
  /** The person's own target in words ("of your 8,000 steps target"); null without one. */
  target: string | null;
  /** The share of a target that adds up over a day (steps, water) or a night (sleep), 0–1; null without a target or a value. */
  share: number | null;
  date: string | null;
  /** The value's own day in words: "last night", "today", "yesterday", "Mon, Nov 16". */
  asOf: string;
  /** The whole card as one phrase, for the table. */
  words: string;
};
export type ScanView = {vitals: Vital[]; recorded: number; missing: string[]; /** Days with a finished workout this week; null while the workout log is not read. */ workoutsThisWeek: number | null};

/** A record's day beside its value: "today", "yesterday", else the day with its weekday (and its year when that is another year). */
export function asOfDay(date: string, today: string): string {
  return date === today ? 'today' : date === addLocalDays(today, -1) ? 'yesterday' : formatDate(date, {weekday: true, year: date.slice(0, 4) !== today.slice(0, 4)});
}
/** The newest day with a value on or before today, looking back a year (as the answer does). */
export function latestPoint(track: Track, today: string): DayPoint | null {
  const back = track.points(resolvePeriod('last-366-days', today)!.days);
  for (let i = back.length - 1; i >= 0; i--) if (back[i]!.value !== null) return back[i]!;
  return null;
}
export function healthVitals(health: HealthData, workouts: Workouts | null | undefined, today: string): ScanView {
  const unit = dailyData(health).preferences.weightUnit, goalGrams = health.targets.weightGrams ?? null;
  const one = (key: VitalKey, label: string, track: Track, todayOnly: boolean, targetWord: string): Vital => {
    const point = todayOnly ? track.points([today])[0]! : latestPoint(track, today), m = track.measure!;
    const target = key === 'weight' ? (goalGrams === null ? null : `your goal: ${weightText(goalGrams, unit)}`) : m.target === null ? null : `of your ${m.text(m.target, 'en')} ${targetWord}`;
    if (!point || point.value === null) return {key, label, value: null, target, share: null, date: null, asOf: todayOnly ? 'today' : '', words: todayOnly ? 'Nothing recorded today' : 'Nothing recorded'};
    const value = m.text(point.value, 'en'), asOf = key === 'sleep' && point.date === today ? 'last night' : asOfDay(point.date, today);
    return {key, label, value, target, share: key !== 'weight' && m.target ? clamp01(point.value / m.target) : null, date: point.date, asOf, words: `${value}, ${asOf}${target ? `, ${target}` : ''}`};
  };
  const heart = one('heart', 'Resting heart rate', heartTrack(health, today), false, '');
  const vitals = [
    one('sleep', 'Sleep', sleepTrack(health, today), false, 'goal'),
    one('steps', 'Steps', stepsTrack(health, today), true, 'target'),
    one('water', 'Water', waterTrack(health, today), true, 'target'),
    one('weight', 'Weight', weightTrack(health, today), false, ''),
    // A resting heart rate comes from an import or a device link: without one there is no card (and nothing to call missing).
    ...(heart.value === null ? [] : [heart]),
  ];
  const week = resolvePeriod('this-week', today)!;
  return {vitals, recorded: vitals.filter(v => v.value !== null).length, missing: vitals.filter(v => v.value === null).map(v => v.label),
    workoutsThisWeek: workouts ? workoutsTrack(workouts, today).points(week.days).filter(p => p.state === 'done').length : null};
}
export function scanRows(view: ScanView): (readonly [string, string])[] {
  return [
    ...view.vitals.map(v => [v.key === 'sleep' ? 'Sleep, latest night' : v.key === 'steps' || v.key === 'water' ? `${v.label} today` : `${v.label}, latest record`, v.words] as const),
    ...(view.workoutsThisWeek === null ? [] : [['Days with a workout this week', String(view.workoutsThisWeek)] as const]),
    ['The heart', 'Decoration, not a live measurement'],
  ];
}
/** The scan's figure and words: how many of the measures hold a record (a count of records, never a score). */
export function scanWords(view: ScanView): ScanWords {
  const n = view.workoutsThisWeek;
  // The resting heart rate is one of the measures even when none was ever recorded (the scan then says "none recorded"),
  // so the figure never reads as complete while it is missing.
  const measures = new Set([...view.vitals.map(v => v.key), 'heart']).size;
  return {figure: String(view.recorded), unit: `of ${measures}`, label: 'measures on record', note: `The latest of each, with its own day${n ? ` · ${n} ${n === 1 ? 'day' : 'days'} with a workout this week` : ''}`,
    asOf: 'the latest of each · not a live reading', caption: 'Health scan: what is on record', rows: scanRows(view)};
}
export type ScanWords = {figure: string; unit?: string; label: string; note: string; asOf: string; caption: string; rows: (readonly [string, string])[]};

/* ---- Body scan: the latest body measurements, each with its day ---- */
export type BodyKind = BodyMeasurement['kind'];
export type BodyPart = {
  kind: BodyKind; label: string;
  /** The latest reading in its own unit ("84 cm"); null: never measured. */
  value: string | null;
  date: string | null; asOf: string | null;
  /** The change since the first reading of this place ("down 2 cm since Oct 13"); null with fewer than two. */
  change: string | null;
  words: string;
};
export type BodyView = {parts: BodyPart[]; recorded: number; /** The newest reading of all (a tape measurement before the weight on the same day). */ newest: BodyPart | null};
const BODY: readonly (readonly [BodyKind, string])[] = [['chest', 'Chest'], ['arm', 'Arm'], ['waist', 'Waist'], ['hips', 'Hips'], ['thigh', 'Thigh'], ['weight', 'Weight']];
const readingDay = (r: BodyMeasurement): string => { try { return healthDay(r.timezone, new Date(r.observedAt)); } catch { return r.observedAt.slice(0, 10); } };
export function bodyScan(health: HealthData, today: string): BodyView {
  const unit = dailyData(health).preferences.weightUnit;
  const parts = BODY.map(([kind, label]): BodyPart => {
    const none: BodyPart = {kind, label, value: null, date: null, asOf: null, change: null, words: 'Not measured yet'};
    if (kind === 'weight') {
      // The weight is the Weight view's own latest weigh-in (a timed reading or the day's own), in the person's weight unit.
      const w = latestWeightObservation(health, today);
      if (!w) return none;
      const value = weightReadingText(w.grams, unit), asOf = asOfDay(w.date, today);
      return {kind, label, value, date: w.date, asOf, change: null, words: `${value}, ${asOf}`};
    }
    const readings = measurementHistory(health, kind).readings.filter(r => readingDay(r) <= today), last = readings.at(-1), first = readings[0];
    if (!last) return none;
    const text = (milli: number) => measureText(milli / 1000, last.unit as MeasureUnit), date = readingDay(last), asOf = asOfDay(date, today);
    // A length is kept in micrometres beside its own unit: the change is said in the latest reading's unit.
    const per = last.unit === 'in' ? 25_400 : 10_000, delta = first && first !== last ? (last.canonical - first.canonical) / per : null;
    const size = delta === null ? null : measureText(Math.abs(delta), last.unit as MeasureUnit), flat = size !== null && size === measureText(0, last.unit as MeasureUnit);
    const change = delta === null || !first ? null : flat ? `no change since ${shortDate(readingDay(first), today)}` : `${delta < 0 ? 'down' : 'up'} ${size} since ${shortDate(readingDay(first), today)}`;
    const value = text(last.quantityMilli);
    return {kind, label, value, date, asOf, change, words: `${value}, ${asOf}${change ? `, ${change}` : ''}`};
  });
  const known = parts.filter(p => p.date !== null);
  const newest = known.length ? known.reduce((a, p) => p.date! > a.date! ? p : a) : null;
  return {parts, recorded: known.length, newest};
}
export const bodyRows = (view: BodyView): (readonly [string, string])[] => view.parts.map(p => [p.label, p.words] as const);
export function bodyWords(view: BodyView): ScanWords {
  const p = view.newest, at = p?.value?.lastIndexOf(' ') ?? -1, n = view.recorded;
  return {figure: p?.value ? (at < 0 ? p.value : p.value.slice(0, at)) : '—', ...(p?.value && at >= 0 ? {unit: p.value.slice(at + 1)} : {}), label: p ? `${p.label.toLowerCase()} · measured ${p.asOf}` : 'nothing measured yet',
    note: [p?.change ? `${p.change[0]!.toUpperCase()}${p.change.slice(1)}` : '', `${n} of ${view.parts.length} places on record`].filter(Boolean).join(' · '),
    asOf: 'the latest of each place', caption: 'Body scan: your latest measurements', rows: bodyRows(view)};
}
