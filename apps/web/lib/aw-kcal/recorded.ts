import type {HealthData} from '../health';
import type {VitalSource} from '../vitals/schema';
import {healthGroupIn} from '../vault/w-homes';
import {liveExtras, type ActivityExtras} from './activity-extras';
export {energySourceOf, energySourceWords, ENERGY_SOURCE_WORDS, SOURCE_NAMES} from './source';

/**
 * Session AW (kcal; owner decision 1a and amendment 4, ADR-046): the calories burned that a person's own records hold for
 * a span of days — the ones they typed on an activity ("you entered") and the active energy a file or a linked account
 * brought in ("from your file") — each summed on its own, with its source. Never an estimate: with neither, there is
 * nothing (null), never zero. The two are kept apart (a day's imported active energy can count the same walk the person
 * typed), so nothing here adds them together. Pure.
 */
export type RecordedCalories = {
  /** Typed on activities in the span: their sum, how many, and their names (first five). */
  entered: {kcal: number; activities: number; names: string[]} | null;
  /** Active energy brought in for days of the span (one value a day, the most recently updated source): sum, days, sources. */
  imported: {kcal: number; days: number; sources: VitalSource[]} | null;
};
export function recordedCalories(health: HealthData | null | undefined, extras: ActivityExtras | null | undefined, from: string, to: string): RecordedCalories {
  const inSpan = (health?.activity ?? []).filter(a => a.date >= from && a.date <= to);
  const typed = liveExtras(extras, inSpan.map(a => a.id)), named = inSpan.filter(a => typed.get(a.id)?.kcal !== undefined);
  const enteredKcal = named.reduce((t, a) => t + (typed.get(a.id)!.kcal ?? 0), 0);
  const byDay = new Map<string, {source: VitalSource; activeKcal?: number; updatedAt: string}>();
  for (const d of (health ? healthGroupIn(health, 'vitals')?.days : undefined) ?? []) {
    if (d.date < from || d.date > to || d.activeKcal === undefined) continue;
    const seen = byDay.get(d.date); if (!seen || d.updatedAt > seen.updatedAt) byDay.set(d.date, d);
  }
  const days = [...byDay.values()];
  return {
    entered: named.length ? {kcal: enteredKcal, activities: named.length, names: named.slice(0, 5).map(a => a.name)} : null,
    imported: days.length ? {kcal: days.reduce((t, d) => t + (d.activeKcal ?? 0), 0), days: days.length, sources: [...new Set(days.map(d => d.source))]} : null,
  };
}
