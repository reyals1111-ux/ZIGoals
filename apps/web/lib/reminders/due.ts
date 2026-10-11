import {habitCalendarDay, habitDay, type HabitData} from '../habits';
import {healthDay, dailyData, waterSummary} from '../health-daily';
import type {HealthData} from '../health';
import {WATER_REMINDER, type Reminders} from './schema';

export type DueReminder = {id: string; kind: 'habit' | 'water'; title: string; time: string; day: string; href: string};
/** The device's own clock, as "HH:MM": reminders follow local device time (the time zone this device is set to). */
export const localClock = (now: Date) => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

/**
 * Reminder cards to show now: a habit whose reminder time has passed on this device, on a day its schedule includes
 * (by the habit journal's day), that is not done yet and was not dismissed today; and water, once its time has passed,
 * when nothing is logged or the day's total is below the personal target. Nothing here is synced, and the funding
 * schedule (UTC) is not involved.
 */
export function dueReminders({reminders, habits, health, now}: {reminders: Reminders; habits?: HabitData; health?: HealthData; now: Date}): DueReminder[] {
  const clock = localClock(now), due: DueReminder[] = [];
  if (habits) {
    const day = habitCalendarDay(habits, now);
    for (const habit of habits.habits) {
      const reminder = reminders.habits[habit.id];
      if (!reminder || reminder.time > clock || reminders.dismissed[habit.id] === day) continue;
      const status = habitDay(habit, day, day).status;
      if (status === 'due' || status === 'partial') due.push({id: habit.id, kind: 'habit', title: habit.title, time: reminder.time, day, href: `/app/habits#habit-${habit.id}`});
    }
  }
  if (health && reminders.water && reminders.water.time <= clock) {
    const day = healthDay(dailyData(health).preferences.timezone, now), water = waterSummary(health, day);
    const open = water.entries === 0 || (water.targetMl !== null && water.millilitres < water.targetMl);
    if (open && reminders.dismissed[WATER_REMINDER] !== day) due.push({id: WATER_REMINDER, kind: 'water', title: 'Water', time: reminders.water.time, day, href: '/app/health#water'});
  }
  return due.sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}
