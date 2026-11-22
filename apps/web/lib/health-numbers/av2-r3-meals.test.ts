import {describe, expect, test} from 'vitest';
import {labEntry} from './engine';
import {MEAL_MARKS, mealReadings, mealTag, readMealMark} from './meals';
import {healthNumbersSchema} from './store';
import {formatClock} from '../visual-format';

/**
 * Session AV lane 2 (health r3; LEDGER #284, Carb Manager): readings marked before or after a meal and shown beside it —
 * the readings only, no range, verdict or index.
 */
const TODAY = '2026-11-20';
describe('readings beside a meal (LEDGER #284)', () => {
  test('the form offers before and after each meal, and reads only those', () => {
    expect(MEAL_MARKS).toHaveLength(8);
    expect(MEAL_MARKS[0]).toEqual({value: 'before:Breakfast', label: 'Before breakfast'});
    expect(readMealMark('after:Snacks')).toEqual({meal: 'Snacks', when: 'after'});
    expect(readMealMark('during:Lunch')).toBeNull();
    expect(readMealMark('')).toBeNull();
  });
  test('a lab value keeps its meal and time; a time it cannot read is said', () => {
    expect(labEntry({date: TODAY, name: 'Glucose', value: '7,8', unit: 'mmol/L', meal: 'after:Lunch', time: '13:45'}, 'n1', TODAY)).toEqual({id: 'n1', date: TODAY, kind: 'lab', name: 'Glucose', value: 7.8, unit: 'mmol/L', meal: 'Lunch', mealWhen: 'after', time: '13:45'});
    expect(labEntry({date: TODAY, name: 'Ketones', value: '0.6', unit: 'mmol/L'}, 'n2', TODAY)).not.toHaveProperty('meal');
    expect(() => labEntry({date: TODAY, name: 'Glucose', value: '5', time: '1:45pm'}, 'n3', TODAY)).toThrow('like 13:45');
  });
  test('a meal’s readings on a day: before first, then by time; others left out', () => {
    const rec = healthNumbersSchema.parse({version: 1, entries: [
      {id: 'a', date: TODAY, kind: 'lab', name: 'Glucose', value: 7.8, unit: 'mmol/L', meal: 'Lunch', mealWhen: 'after', time: '13:45'},
      {id: 'b', date: TODAY, kind: 'lab', name: 'Glucose', value: 5.2, unit: 'mmol/L', meal: 'Lunch', mealWhen: 'before', time: '12:00'},
      {id: 'c', date: TODAY, kind: 'lab', name: 'Ketones', value: 0.6, unit: 'mmol/L', meal: 'Lunch', mealWhen: 'after', time: '13:40'},
      {id: 'd', date: TODAY, kind: 'lab', name: 'Glucose', value: 5.0, unit: 'mmol/L', meal: 'Dinner', mealWhen: 'before'},
      {id: 'e', date: '2026-11-19', kind: 'lab', name: 'Glucose', value: 6.0, unit: 'mmol/L', meal: 'Lunch', mealWhen: 'after'},
      {id: 'f', date: TODAY, kind: 'lab', name: 'Glucose', value: 4.9, unit: 'mmol/L'},
    ]});
    expect(mealReadings(rec, TODAY, 'Lunch').map(r => r.id)).toEqual(['b', 'c', 'a']);
    expect(mealReadings(rec, TODAY, 'Breakfast')).toEqual([]);
    // Session AV lane 2 (review B3B-7, deliberate): the time in the app's hour cycle, as formatClock says it.
    expect(mealTag(rec.entries[0]!)).toBe(`after lunch, ${formatClock('13:45')}`);
    expect(mealTag(rec.entries[5]!)).toBeNull();
    // Only the readings: nothing in the result is a verdict, a range or an index.
    expect(Object.keys(mealReadings(rec, TODAY, 'Lunch')[0]!).sort()).toEqual(['id', 'name', 'time', 'unit', 'value', 'when']);
  });
});
