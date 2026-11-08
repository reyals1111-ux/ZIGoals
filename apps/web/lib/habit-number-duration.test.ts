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
