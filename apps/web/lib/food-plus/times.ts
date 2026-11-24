import {scaleNutrition, type HealthData, type HealthDiaryEntry} from '../health';
import {addLocalDays} from '../local-date';
import {wallClock} from '../zone-time';
import {foodPlusSchema, isClock, type FoodPlus} from './schema';

/**
 * Session AV lane 2 (food, LEDGER #101 Cronometer's diary timestamps, #108 MacroFactor's nutrient timing): when each diary
 * entry was eaten, and what was eaten when. Pure.
 *
 * An entry's time is the one the person set (`times[id]`), else — when it was logged on its own day, by the Health
 * journal's clock — the clock time it was logged at (never a stamp of exactly midnight, a day's stamp), else none. "none" takes a time off for good (a day logged later).
 * Nothing is estimated: an entry with no time is counted apart, never put in a part of the day.
 */
export type EatenAt = {clock: string; set: boolean};
export function eatenAt(entry: Pick<HealthDiaryEntry, 'id' | 'date' | 'createdAt'>, record: FoodPlus | null | undefined, zone: string): EatenAt | null {
  const own = record?.times?.[entry.id];
  if (own === 'none') return null;
  if (own && isClock(own)) return {clock: own, set: true};
  try {
    const ms = Date.parse(entry.createdAt), w = wallClock(ms, zone);
    // A stamp of exactly midnight to the millisecond is a day's stamp (a record made for the day, as the Showcase's
    // today), not a clock reading: no time is said for it.
    if (w.clock === '00:00' && ms % 60_000 === 0) return null;
    return w.date === entry.date ? {clock: w.clock, set: false} : null;
  } catch { return null; }
}
/** Sets an entry's time ("07:45"), takes it off ("none"), or goes back to the logged time (null). Keeps only live ids. */
export function setEatenAt(record: FoodPlus, entryId: string, value: string | 'none' | null, liveIds?: ReadonlySet<string>): FoodPlus {
  if (value !== null && value !== 'none' && !isClock(value)) throw new Error('Enter a time like 07:45.');
  const times: Record<string, string> = {...record.times};
  if (value === null) delete times[entryId]; else times[entryId] = value;
  if (liveIds) for (const id of Object.keys(times)) if (id !== entryId && !liveIds.has(id)) delete times[id];
  const kept = Object.keys(times).length ? {times} : {};
  const {times: _old, ...rest} = record; void _old;
  return foodPlusSchema.parse({...rest, ...kept});
}

/** MacroFactor-style parts of the day, by the clock (start inclusive, end exclusive). */
export const DAY_PARTS = [
  {key: 'early', en: 'Early (0:00–5:00)', nl: 'Vroeg (0:00–5:00)', from: '00:00', to: '05:00'},
  {key: 'morning', en: 'Morning (5:00–11:00)', nl: 'Ochtend (5:00–11:00)', from: '05:00', to: '11:00'},
  {key: 'midday', en: 'Midday (11:00–14:00)', nl: 'Middag (11:00–14:00)', from: '11:00', to: '14:00'},
  {key: 'afternoon', en: 'Afternoon (14:00–17:00)', nl: 'Namiddag (14:00–17:00)', from: '14:00', to: '17:00'},
  {key: 'evening', en: 'Evening (17:00–21:00)', nl: 'Avond (17:00–21:00)', from: '17:00', to: '21:00'},
  {key: 'late', en: 'Late (21:00–24:00)', nl: 'Laat (21:00–24:00)', from: '21:00', to: '24:00'},
] as const;
export type DayPartKey = (typeof DAY_PARTS)[number]['key'];
export const dayPartOf = (clock: string): DayPartKey => DAY_PARTS.find(p => clock >= p.from && clock < p.to)!.key;
const TIMED = ['kcal', 'proteinMg', 'carbsMg', 'fatMg', 'fiberMg'] as const;
export type TimingKey = (typeof TIMED)[number];
export type TimingPart = {key: DayPartKey; entries: number} & Record<TimingKey, number>;
export type Timing = {from: string; to: string; parts: TimingPart[]; timedEntries: number; untimedEntries: number; daysWithTimes: number; totals: Record<TimingKey, number>};

/** What was eaten in each part of the day over a range of days (inclusive): sums of the known values, entries counted. */
export function nutrientTiming(data: HealthData, record: FoodPlus | null | undefined, zone: string, to: string, days: number): Timing {
  const from = addLocalDays(to, -(Math.max(1, days) - 1));
  const parts: TimingPart[] = DAY_PARTS.map(p => ({key: p.key, entries: 0, kcal: 0, proteinMg: 0, carbsMg: 0, fatMg: 0, fiberMg: 0}));
  const totals = {kcal: 0, proteinMg: 0, carbsMg: 0, fatMg: 0, fiberMg: 0};
  const timedDays = new Set<string>();
  let timedEntries = 0, untimedEntries = 0;
  for (const entry of data.diary) {
    if (entry.date < from || entry.date > to) continue;
    const at = eatenAt(entry, record, zone);
    if (!at) { untimedEntries++; continue; }
    timedEntries++; timedDays.add(entry.date);
    const part = parts.find(p => p.key === dayPartOf(at.clock))!, n = scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli);
    part.entries++;
    for (const key of TIMED) { const v = n[key]; if (typeof v === 'number') { part[key] += v; totals[key] += v; } }
  }
  return {from, to, parts, timedEntries, untimedEntries, daysWithTimes: timedDays.size, totals};
}
/** A part's share of a nutrient over the range, in whole percent (null when nothing timed carries it). */
export const share = (timing: Timing, part: TimingPart, key: TimingKey): number | null => timing.totals[key] > 0 ? Math.round(part[key] / timing.totals[key] * 100) : null;

/** One day's entries in the order they were eaten (timed first, by clock), each with its time or null. */
export function dayTimeline(data: HealthData, record: FoodPlus | null | undefined, zone: string, date: string) {
  return data.diary.filter(e => e.date === date).map(entry => ({entry, at: eatenAt(entry, record, zone)}))
    .sort((a, b) => (a.at ? 0 : 1) - (b.at ? 0 : 1) || (a.at?.clock ?? '').localeCompare(b.at?.clock ?? '') || a.entry.createdAt.localeCompare(b.entry.createdAt));
}
/** The day's first and last eaten times ("07:40" – "21:15"), the eating window, or null with fewer than one timed entry. */
export function eatingWindow(data: HealthData, record: FoodPlus | null | undefined, zone: string, date: string): {first: string; last: string; minutes: number} | null {
  const clocks = dayTimeline(data, record, zone, date).flatMap(r => r.at ? [r.at.clock] : []);
  if (!clocks.length) return null;
  const first = clocks[0]!, last = clocks[clocks.length - 1]!, m = (c: string) => Number(c.slice(0, 2)) * 60 + Number(c.slice(3));
  return {first, last, minutes: m(last) - m(first)};
}
