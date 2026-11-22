import {scaleNutrition, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {nightDay} from '../sleep/night';
import type {Sleep} from '../sleep/schema';
import {healthGroupIn} from '../vault/w-homes';
import {wallClock} from '../zone-time';
import {eatenAt} from '../food-plus/times';
import type {FoodPlus} from '../food-plus/schema';

/**
 * Session AV lane 2 (r5-body; Bevel's late-meal tag with a calorie threshold; LEDGER #371): a late-meal night read from
 * the food log — food of at least the person's own calorie number logged within their own number of hours before the
 * night's bedtime (3 hours and 300 kcal until they change them). The day before the night is "with" a late meal, so
 * Compare's "Time asleep" (the night after the day) is the night that followed it. A fact about the records, never "late
 * meals hurt your sleep". Unknown is not "without": a day with no food logged, or with food whose time or calories are not
 * known that could reach the number, is left out. An eaten-at time is the one the person set, else the time logged on
 * its own day (lib/food-plus/times.ts). Pure; nothing is stored here.
 */
export const LATE_MEAL_HOURS = 3, LATE_MEAL_KCAL = 300;
export type LateMealRule = {hours: number; kcal: number};
export const lateMealRule = (food: Pick<FoodPlus, 'lateMeal'> | null | undefined): LateMealRule => ({hours: food?.lateMeal?.hours ?? LATE_MEAL_HOURS, kcal: food?.lateMeal?.kcal ?? LATE_MEAL_KCAL});
const naive = (date: string, clock: string) => Date.parse(`${date}T${clock}:00Z`);

/** Each day before a logged night: true (a late meal), false (food logged, none late enough or big enough) or unknown (absent). */
export function lateMealDays(health: HealthData | null | undefined, food: FoodPlus | null | undefined, zone: string, rule: LateMealRule = lateMealRule(food)): Map<string, boolean> {
  const out = new Map<string, boolean>();
  if (!health) return out;
  const nights = ((healthGroupIn(health, 'sleep') as Sleep | undefined)?.nights ?? []).filter(n => n.kind === 'night' && n.end !== null);
  const byDate = new Map<string, HealthData['diary'][number][]>();
  for (const e of health.diary) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  for (const n of nights) {
    let end: string | null, bed: {date: string; clock: string};
    try { end = nightDay(n); bed = wallClock(Date.parse(n.start), n.timeZone); } catch { continue; }
    if (!end) continue;
    const day = addLocalDays(end, -1), bedAt = naive(bed.date, bed.clock), from = bedAt - rule.hours * 3_600_000;
    const dates = [...new Set([day, bed.date, new Date(from).toISOString().slice(0, 10)])];
    const entries = dates.flatMap(d => byDate.get(d) ?? []);
    if (!(byDate.get(day)?.length || byDate.get(bed.date)?.length)) continue; // nothing logged: unknown, never "without"
    let kcal = 0, unknown = false;
    for (const e of entries) {
      const at = eatenAt(e, food, zone), energy = scaleNutrition(e.snapshot.nutrients, e.quantityMilli).kcal;
      if (!at) { unknown = true; continue; }
      const t = naive(e.date, at.clock);
      if (t < from || t > bedAt) continue;
      if (typeof energy === 'number') kcal += energy; else unknown = true;
    }
    if (kcal >= rule.kcal) out.set(day, true);
    else if (!unknown) out.set(day, out.get(day) ?? false);
  }
  return out;
}
/** How many of the last `days` days (ending today) were late-meal days, of those known: "8 of your 30 known days". */
export function lateMealCount(map: ReadonlyMap<string, boolean>, today: string, days = 90): {late: number; known: number} {
  const from = addLocalDays(today, 1 - days);
  let late = 0, known = 0;
  for (const [d, v] of map) if (d >= from && d <= today) { known++; if (v) late++; }
  return {late, known};
}
