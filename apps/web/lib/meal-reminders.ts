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

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-049, -067, -081; C-MO-10, C-MO-37, C-DVG-41): a fast's start, tied to the Diary.
 * Switched on by the person on the fasting card ("After I log Dinner…"); once that meal has an entry in the Diary for the
 * Health journal's day, Today asks whether to start a fast, until one starts after that entry, one is running, or "Not
 * today" is chosen. It suggests nothing about how long: the hours are the person's own choice (their last fast's target,
 * else 16 h, the preset the fasting card starts on). In-app on this device only; nothing is sent.
 */
export type FastStartDue = {id: 'fast-start'; meal: Meal; label: string; loggedAt: string; hours: number; day: string; zone: string};
type FastLike = {startedAt: string; endedAt: string | null; targetHours: number};
export const fastAfterMealOn = (extras: HealthExtras | null | undefined): Meal | null => extras?.fastAfterMeal?.meal ?? null;
export function fastStartDue({extras, health, sessions, now}: {extras: HealthExtras | null | undefined; health: HealthData | null | undefined; sessions: readonly FastLike[]; now: Date}): FastStartDue | null {
  const meal = fastAfterMealOn(extras);
  if (!health || !meal) return null;
  let tz: string | null;
  try { tz = dailyData(health).preferences.timezone; } catch { return null; }
  const day = healthDay(tz, now);
  if (extras?.fastAfterMeal?.dismissed === day || sessions.some(s => s.endedAt === null)) return null;
  const logged = health.diary.filter(e => e.meal === meal && e.date === day).map(e => e.createdAt).sort().at(-1);
  if (!logged || sessions.some(s => s.startedAt >= logged)) return null;
  const last = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt)).at(-1);
  return {id: 'fast-start', meal, label: mealLabel(extras, meal), loggedAt: logged, hours: extras?.fastAfterMeal?.hours ?? last?.targetHours ?? 16, day, zone: healthZone(tz)};
}
/** Switches the ask on for one meal (null switches it off). */
export function setFastAfterMeal(extras: HealthExtras, meal: Meal | null): HealthExtras {
  if (!meal) { const {fastAfterMeal: _old, ...rest} = extras; void _old; return healthExtrasSchema.parse(rest); }
  // A new choice of meal asks again today (an earlier "Not today" is dropped); the hours, if any, stay.
  const kept: Record<string, unknown> = {...(extras.fastAfterMeal ?? {})}; delete kept.dismissed;
  return healthExtrasSchema.parse({...extras, fastAfterMeal: {...kept, meal}});
}
/** "Not today": the card stays away for the rest of the Health journal's day. */
export const dismissFastStart = (extras: HealthExtras, day: string): HealthExtras => extras.fastAfterMeal ? healthExtrasSchema.parse({...extras, fastAfterMeal: {...extras.fastAfterMeal, dismissed: day}}) : extras;
