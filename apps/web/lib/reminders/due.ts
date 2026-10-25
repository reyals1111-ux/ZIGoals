import {habitCalendarDay, habitDay, type HabitData} from '../habits';
import {healthDay, healthZone, dailyData, waterSummary} from '../health-daily';
import {journalTimeZone} from '../journal-zone';
import type {HealthData} from '../health';
import {WATER_REMINDER, type Reminders} from './schema';

export type DueReminder = {id: string; kind: 'habit' | 'water'; title: string; time: string; day: string; href: string};
/** The device's own clock, as "HH:MM": reminders follow local device time (the time zone this device is set to). */
export const localClock = (now: Date) => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
/**
 * The clock as "HH:MM" in a journal's zone, or the device's clock when there is none (QA2-04, Session AH): a reminder's
 * time and its day come from the same zone, so travelling never shows the journal's next day in the device's evening.
 */
export function zoneClock(zone: string | null | undefined, now: Date): string {
  if (!zone) return localClock(now);
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
    return `${get('hour')}:${get('minute')}`;
  } catch { return localClock(now); }
}

/**
 * Reminder cards to show now: a habit whose reminder time has passed in its journal's zone (the device's when none), on a day its schedule includes
 * (by the habit journal's day), that is not done yet and was not dismissed today; and water, once its time has passed,
 * when nothing is logged or the day's total is below the personal target. Nothing here is synced, and the funding
 * schedule (UTC) is not involved.
 */
export function dueReminders({reminders, habits, health, now}: {reminders: Reminders; habits?: HabitData; health?: HealthData; now: Date}): DueReminder[] {
  const due: DueReminder[] = [];
  if (habits) {
    const day = habitCalendarDay(habits, now), clock = zoneClock(habits.timeZone ?? journalTimeZone(), now);
    for (const habit of habits.habits) {
      const reminder = reminders.habits[habit.id];
      if (!reminder || reminder.time > clock || reminders.dismissed[habit.id] === day) continue;
      const status = habitDay(habit, day, day).status;
      if (status === 'due' || status === 'partial') due.push({id: habit.id, kind: 'habit', title: habit.title, time: reminder.time, day, href: `/app/habits#habit-${habit.id}`});
    }
  }
  const healthTz = health ? dailyData(health).preferences.timezone : null;
  if (health && reminders.water && reminders.water.time <= zoneClock(healthZone(healthTz), now)) {
    const day = healthDay(healthTz, now), water = waterSummary(health, day);
    const open = water.entries === 0 || (water.targetMl !== null && water.millilitres < water.targetMl);
    if (open && reminders.dismissed[WATER_REMINDER] !== day) due.push({id: WATER_REMINDER, kind: 'water', title: 'Water', time: reminders.water.time, day, href: '/app/health#water'});
  }
  return due.sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}
