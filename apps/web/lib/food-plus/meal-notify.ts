import {HEALTH_MEALS, type HealthData} from '../health';
import {dailyData, healthDay} from '../health-daily';
import {mealLabel, mealTime, type HealthExtras} from '../health-extras';
import {mealRemindersOn} from '../meal-reminders';

/**
 * Session AV lane 2 (food, LEDGER #90; MyFitnessPal's meal reminders): the meal reminders as device notifications too.
 * Only while the person switched the meal reminders on in Health (Diary → "Name your meals and set their times") and
 * turned "Meal reminders" on in Settings → Notifications (off by default): one wake at each meal's usual time, every day;
 * today's is left out once that meal has an entry or "Not today" was chosen (as Today's in-app card). The plan never
 * carries what was eaten; the meal's own name only where names are allowed. Pure.
 */
export type MealWake = {meal: string; label: string; time: string; doneToday: boolean};
export function mealWakes(extras: HealthExtras | null | undefined, health: HealthData | null | undefined, now: Date): MealWake[] {
  if (!health || !mealRemindersOn(extras)) return [];
  let day: string;
  try { day = healthDay(dailyData(health).preferences.timezone, now); } catch { return []; }
  const dismissed = extras?.mealReminders?.dismissed ?? {};
  return HEALTH_MEALS.flatMap(meal => {
    const time = mealTime(extras, meal);
    if (!time) return [];
    const doneToday = dismissed[meal] === day || health.diary.some(e => e.meal === meal && e.date === day);
    return [{meal, label: mealLabel(extras, meal), time, doneToday}];
  });
}
