import {expect, test} from 'vitest';
import {readDurationText} from './habit-number';

test('AL-COMPETITOR-GAP-121: a time habit takes hours and minutes as typed, in its own unit', () => {
  expect(readDurationText('1:30', 'minutes')).toBe(90);
  expect(readDurationText('1h 30m', 'minutes')).toBe(90);
  expect(readDurationText('1 h 30 min', 'hours')).toBe(1.5);
  expect(readDurationText('1 hour and 15 minutes', 'minutes')).toBe(75);
  expect(readDurationText('90 min', 'hours')).toBe(1.5);
  expect(readDurationText('45m', 'minutes')).toBe(45);
  expect(readDurationText('1,5 h', 'minutes')).toBe(90);
  expect(readDurationText('1 u 30', 'minutes')).toBe(90);
  expect(readDurationText('1h30', 'minutes')).toBe(90);
  expect(readDurationText('2 uur en 10 minuten', 'minutes')).toBe(130);
  expect(readDurationText('20 min', 'hours')).toBe(0.3333);
  // A plain number is the habit's own unit, read elsewhere.
  expect(readDurationText('25', 'minutes')).toBeNull();
  expect(readDurationText('0,5', 'hours')).toBeNull();
  expect(readDurationText('soon', 'minutes')).toBeNull();
  expect(() => readDurationText('1:75', 'minutes')).toThrow('00 to 59');
  expect(() => readDurationText('1 h 2 h', 'minutes')).toThrow('once each');
  expect(() => readDurationText('1 h lots', 'minutes')).toThrow('like 1:30');
});

// Session AL final pass (C-DVG-10, B-197): the target field reads time like the values do, and holds to the limits table.
test('C-DVG-10, B-197: a habit target reads "1:30" and keeps to the shared limits', async () => {
  const {habitTargetMax, readHabitTarget} = await import('./habit-number');
  const minutes = {measurement: 'duration', unit: 'minutes', period: 'day', positive: true};
  expect(readHabitTarget('1:30', minutes)).toBe(90);
  expect(readHabitTarget('1 h 30 min', {...minutes, unit: 'hours'})).toBe(1.5);
  expect(readHabitTarget('45', minutes)).toBe(45);
  expect(() => readHabitTarget('25:00', minutes)).toThrow('Enter a number greater than 0 and at most 1,440.');
  expect(readHabitTarget('25:00', {...minutes, period: 'week'})).toBe(1500);
  const count = {measurement: 'count', unit: 'times', period: 'day', min: 1, whole: true, positive: true};
  expect(() => readHabitTarget('1000000000', count)).toThrow('Enter a whole number from 1 to 1,000,000.');
  expect(readHabitTarget('8', count)).toBe(8);
  expect(habitTargetMax('quantity', 'steps', 'day')).toBe(100_000);
  expect(habitTargetMax('quantity', 'hours', 'week')).toBe(168);
  expect(habitTargetMax('quantity', 'pages', 'day')).toBe(1_000_000_000);
});
