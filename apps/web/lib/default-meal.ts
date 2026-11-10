import { HEALTH_MEALS } from "./health";
import { mealTime, type HealthExtras, type Meal } from "./health-extras";
import { wallClock } from "./zone-time";

/**
 * Session AL (A10-2): the meal a new diary entry starts on, by the time of day where it is lived. With no usual meal
 * times set, the hours are the ones a one-tap Checklist favourite uses (lib/checklist/derive `mealAt`; the unit test
 * keeps the two equal): 04:00–10:59 Breakfast, 11:00–14:59 Lunch, 17:00–21:59 Dinner, otherwise Snacks.
 * With usual times ("Name your meals and set their times"), the meal whose time is nearest now, round the clock; a meal
 * with no time of its own counts at the middle of its hours above (Snacks only when it has a time).
 */
const HOURS = (minutes: number): Meal => { const h = Math.floor(minutes / 60); return h >= 4 && h < 11 ? "Breakfast" : h >= 11 && h < 15 ? "Lunch" : h >= 17 && h < 22 ? "Dinner" : "Snacks"; };
const MIDDLE: Partial<Record<Meal, number>> = { Breakfast: 7 * 60 + 30, Lunch: 13 * 60, Dinner: 19 * 60 + 30 };
const DAY = 24 * 60;
const minutesOf = (clock: string | null) => { const m = clock ? /^(\d{2}):(\d{2})$/.exec(clock) : null; return m ? Number(m[1]) * 60 + Number(m[2]) : null; };

export function defaultMeal(now: Date, zone: string, extras: HealthExtras | null | undefined): Meal {
  const minutes = wallClock(now.getTime(), zone).minutes;
  const own = HEALTH_MEALS.map(meal => [meal, minutesOf(mealTime(extras, meal))] as const);
  if (own.every(([, at]) => at === null)) return HOURS(minutes);
  let best: Meal = HOURS(minutes), gap = Infinity;
  for (const [meal, at] of own) {
    const when = at ?? MIDDLE[meal];
    if (when === undefined) continue;
    const apart = Math.min(Math.abs(when - minutes), DAY - Math.abs(when - minutes));
    if (apart < gap) { best = meal; gap = apart; }
  }
  return best;
}
