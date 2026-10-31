import {habitCalendarDay, habitDay} from '../habits';
import {readReminders} from '../reminders/store';
import {readDeviceRecord} from '../device-record';
import {W_REMINDERS} from '../reminders/w-schema';
import {WIND_DOWN} from '../reminders/wind-down';
import {REMINDERS_PLAN, quietHours} from '../reminders-plan/schema';
import {CONTRIBUTION_PREFIX} from '../reminders/contribution-due';
import {fundingHealth} from '../goal-intelligence';
import {readFinance} from '../finance-homes-store';
import {readHealth} from '../sync-homes-store';
import {waterSummary} from '../health-daily';
import {getAppStorage, isShowcase} from '../showcase-storage';
import {readLock} from '../device-lock';
import {formatNumber} from '../visual-format';
import {habitWeekdays} from '../push/schedule';
import {storedHabits} from '../push/device';
import {namesOn} from '../push/labels-sync';
import {deviceZone} from '../push/support';
import {NOTIFY_PREFS} from './prefs';
import {addDays, wallClock} from './zone';
import {buildPlan, type Plan, type PlanInput} from './plan';

/**
 * Session AK Part 2 (ADR-036 A1): gathers this device's records into the plan's input. Reads only; never throws (a record
 * that does not read is left out, so its reminders simply do not wake the device). The Showcase plans nothing: its
 * example data must never reach a notification.
 */
export async function gatherPlanInput(now = Date.now()): Promise<PlanInput | null> {
  if (isShowcase()) return null;
  const storage = getAppStorage(), zone = deviceZone(), today = wallClock(now, zone).date;
  const prefs = readDeviceRecord(storage, NOTIFY_PREFS).data, plan = readDeviceRecord(storage, REMINDERS_PLAN).data, w = readDeviceRecord(storage, W_REMINDERS).data;
  const reminders = readReminders(storage).data, locked = !!readLock(storage);
  const input: PlanInput = {now, zone, prefs, quiet: quietHours(plan), labels: namesOn(storage) && !locked, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: []};
  try {
    const habits = await storedHabits(storage);
    if (habits) {
      const day = habitCalendarDay(habits, new Date(now));
      for (const habit of habits.habits) {
        const status = habitDay(habit, day, day).status;
        if (status === 'due' || status === 'partial' || status === 'complete') { input.orbit.total++; if (status === 'complete') input.orbit.done++; }
        const reminder = reminders.habits[habit.id];
        if (!reminder) continue;
        input.habits.push({id: habit.id, title: habit.title, time: reminder.time, weekdays: habitWeekdays(habits, habit.id, day), doneToday: !(status === 'due' || status === 'partial') || reminders.dismissed[habit.id] === day});
      }
    }
  } catch { /* habits unreadable: no habit wakes */ }
  if (reminders.water) {
    try {
      const health = await readHealth(storage), water = waterSummary(health, today), left = water.targetMl ? Math.max(0, water.targetMl - water.millilitres) : null;
      input.water = {time: reminders.water.time, toGo: left === null ? null : left >= 1000 ? `${formatNumber(left / 1000, {maximumFractionDigits: 1})} L` : `${Math.round(left)} mL`, done: left === 0 || reminders.dismissed.water === today};
    } catch { input.water = {time: reminders.water.time, toGo: null, done: false}; }
  }
  if (w.windDown) input.windDown = {time: w.windDown.time, doneToday: w.dismissed[WIND_DOWN] === today};
  const review = plan.items?.review;
  if (review?.on) input.review = {time: review.time ?? '18:00', weekday: review.weekday ?? 0};
  if (Object.keys(w.contributions).length) {
    try {
      const platform = await readFinance(storage);
      for (const [goalId, {time}] of Object.entries(w.contributions)) {
        const goal = platform.goals.find(g => g.id === goalId);
        if (!goal || goal.status !== 'active' || !goal.plan?.active) continue;
        for (const date of [today, addDays(today, 1)]) {
          let due = 0n;
          try { due = BigInt(fundingHealth(platform, goalId, date === today ? now : now + 86_400_000).dueToday); } catch { continue; }
          const done = date === today && w.dismissed[`${CONTRIBUTION_PREFIX}${goalId}`] === today;
          if (due > 0n) input.contributions.push({goalId, title: goal.name, time, date, amount: '', done});
        }
      }
    } catch { /* finance unreadable: no contribution wakes */ }
  }
  return input;
}
/** The plan for now, or null in the Showcase. */
export async function currentPlan(now = Date.now()): Promise<Plan | null> {
  const input = await gatherPlanInput(now);
  return input ? buildPlan(input) : null;
}
