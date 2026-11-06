import {HEALTH_MEALS, type HealthData} from './health';
import {dailyData, healthDay, healthZone} from './health-daily';
import {healthExtrasSchema, mealLabel, mealTime, type HealthExtras, type Meal} from './health-extras';
import {zoneClock} from './reminders/due';

/**
 * Session AL sweep 3 (C-MO-10, C-MO-37): a reminder at each meal's usual time (Health → Diary → "Name your meals and set
 * their times"), switched on by the person. Once the time has passed on the Health journal's clock, Today's reminder
 * cards show "Lunch time" until something is logged for that meal that day, or "Not today" is chosen. In-app only, on
 * this device (kept in the loose `zigoals:health-extras:v1`); nothing is sent and no device notification is made.
 */
export type MealDue = {id: `meal:${Meal}`; meal: Meal; label: string; time: string; day: string; href: string};
export const mealRemindersOn = (extras: HealthExtras | null | undefined): boolean => extras?.mealReminders?.on === true;

export function mealsDue({extras, health, now}: {extras: HealthExtras | null | undefined; health: HealthData | null | undefined; now: Date}): MealDue[] {
  if (!health || !mealRemindersOn(extras)) return [];
  let tz: string | null;
  try { tz = dailyData(health).preferences.timezone; } catch { return []; }
  const day = healthDay(tz, now), clock = zoneClock(healthZone(tz), now), dismissed = extras?.mealReminders?.dismissed ?? {};
  return HEALTH_MEALS.flatMap(meal => {
    const time = mealTime(extras, meal);
    if (!time || time > clock || dismissed[meal] === day) return [];
    if (health.diary.some(e => e.meal === meal && e.date === day)) return [];
    return [{id: `meal:${meal}` as const, meal, label: mealLabel(extras, meal), time, day, href: '/app/health?view=diary'}];
  });
}
/** Switches the meal reminders on or off (the times stay; off forgets the day's dismissals). */
export function setMealReminders(extras: HealthExtras, on: boolean): HealthExtras {
  if (!on) { const {mealReminders: _old, ...rest} = extras; void _old; return healthExtrasSchema.parse(rest); }
  return healthExtrasSchema.parse({...extras, mealReminders: {...extras.mealReminders, on: true}});
}
/** "Not today": that meal's card stays away for the rest of the Health journal's day; older dismissals are replaced. */
export function dismissMeal(extras: HealthExtras, meal: Meal, day: string): HealthExtras {
  return healthExtrasSchema.parse({...extras, mealReminders: {on: true, ...extras.mealReminders, dismissed: {...extras.mealReminders?.dismissed, [meal]: day}}});
}
