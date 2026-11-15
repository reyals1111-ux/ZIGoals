import {expect, test} from 'vitest';
import {readDurationText, readHabitValueText} from './habit-number';
import {createHabit, emptyHabitData, logHabitValue} from './habits';

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

// Session AO (NB-114): a Duration habit's "Set or add a value" takes part-minutes with a decimal comma or point, and
// stores them in the entry's existing shape (a number of minutes).
test('NB-114: "Warm up", 5 minutes, takes 2,5 and 2.5 minutes and keeps them as 2.5', () => {
  const minutes = {kind: 'duration', unit: 'minutes'};
  for (const typed of ['2,5', '2.5', ' 2,5 ', '2,5 min', '2.5 min']) expect(readHabitValueText(typed, minutes), typed).toBe(2.5);
  expect(readHabitValueText('1:30', minutes)).toBe(90);
  expect(readHabitValueText('0,5', {kind: 'duration', unit: 'hours'})).toBe(0.5);
  expect(() => readHabitValueText('2,5', {kind: 'count'})).toThrow('Enter a whole number');
  expect(() => readHabitValueText('', minutes)).toThrow('Enter a number');
  const id = '92000000-0000-4000-8000-000000000301', at = new Date('2026-11-02T08:00:00Z');
  let data = createHabit(emptyHabitData(), {title: 'Warm up', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 5, measurement: {kind: 'duration', unit: 'minutes'}}, at, id);
  data = logHabitValue(data, id, '2026-11-02', readHabitValueText('2,5', minutes), {}, at);
  data = logHabitValue(data, id, '2026-11-02', readHabitValueText('2.5', minutes), {mode: 'add'}, at);
  expect(data.habits[0]!.entries[0]).toMatchObject({date: '2026-11-02', count: 5, disposition: 'logged'});
});
