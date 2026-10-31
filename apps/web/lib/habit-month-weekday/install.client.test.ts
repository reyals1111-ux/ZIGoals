// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {createHabit, emptyHabitData, habitDay, scheduleLabel, setHabitScheduleOverlay} from '../habits';
import {installMonthWeekdayOverlay, refreshMonthWeekdays} from './install';

// Session AK F0 (5.1): in the browser the engine reads the overlay from this device's habit extras.
const ID = '7a000000-0000-4000-8000-0000000000d2';
afterEach(() => { localStorage.clear(); refreshMonthWeekdays(); });
test('the overlay follows the habit extras on this device, and a change is read after a refresh', () => {
  localStorage.setItem(HABIT_EXTRAS_KEY, JSON.stringify({version: 1, monthWeekday: {[ID]: {weekday: 1, nth: 1, from: '2026-08-01'}}}));
  installMonthWeekdayOverlay();
  const habit = createHabit(emptyHabitData(), {title: 'Budget review', category: 'Finance', description: '', notes: '', schedule: {kind: 'weekdays', days: [1]}, target: 1}, new Date('2026-08-01T09:00:00Z'), ID).habits[0]!;
  expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('not-scheduled');
  expect(habitDay(habit, '2026-11-02', '2026-11-30').status).toBe('failed');
  expect(scheduleLabel(habit.rules[0]!.schedule, ID)).toBe('First Monday of the month');
  localStorage.setItem(HABIT_EXTRAS_KEY, JSON.stringify({version: 1}));
  refreshMonthWeekdays();
  expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('failed');
  expect(scheduleLabel(habit.rules[0]!.schedule, ID)).toBe('Mon');
  // An unreadable record never hides a day: the stored schedule is read as it is.
  localStorage.setItem(HABIT_EXTRAS_KEY, '{not json');
  refreshMonthWeekdays();
  expect(habitDay(habit, '2026-11-09', '2026-11-30').status).toBe('failed');
  setHabitScheduleOverlay(null);
});
