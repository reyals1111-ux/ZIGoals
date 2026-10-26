import {expect, test} from 'vitest';
import {dateIssue, feeWarning, LimitError, waterDayIssue, waterEntryIssue, weightIssue} from './plausibility';
import {createEmptyHealth, saveActivity, saveWeight, setHealthTargets} from '../health';
import {addWater, editWater, dailyData} from '../health-daily';

// Session AH Part 5 (VA2, VA3, B3, B9): one set of limits on the write functions, for every entry point.
const AT = '2026-10-01T08:00:00.000Z', DAY = '2026-10-01';
test('weight 20–400 kg; water per entry and per day in mL after fl oz; dates from 1990 to today; fee warning', () => {
  expect(weightIssue(72_000)).toBeNull(); expect(weightIssue(1_000_000)).toMatch(/20 to 400 kg/); expect(weightIssue(5_000)).toMatch(/20 to 400 kg/);
  expect(waterEntryIssue(250)).toBeNull(); expect(waterEntryIssue(6_000)).toMatch(/5,000 mL/); expect(waterEntryIssue(-250)).toMatch(/5,000 mL/);
  expect(waterDayIssue(10_001)).toMatch(/10,000 mL/);
  expect(dateIssue('1900-01-01', DAY)).toMatch(/1990/); expect(dateIssue('2026-10-02', DAY)).toMatch(/today or an earlier/); expect(dateIssue('2027-09-30', DAY, 'year-ahead')).toBeNull(); expect(dateIssue('2199-01-01', DAY, 'year-ahead')).toMatch(/within a year/);
  expect(feeWarning(5000, 1)).toMatch(/larger than the trade/); expect(feeWarning(1, 100)).toBeNull();
});
test('the Health writes refuse what does not fit, with the sentence; earlier values in range still save', () => {
  const h = createEmptyHealth();
  expect(() => saveWeight(h, {id: 'health_weight-001', date: DAY, grams: 720_000}, AT)).toThrow(LimitError);
  expect(saveWeight(h, {id: 'health_weight-001', date: DAY, grams: 72_000}, AT).weights).toHaveLength(1);
  expect(() => saveActivity(h, {id: 'health_activity-001', date: DAY, name: 'Run', steps: 1_000_000, minutes: 28}, AT)).toThrow(/100,000 steps/);
  expect(() => setHealthTargets(h, {...h.targets, kcal: 99_999})).toThrow(/10,000 kcal/);
  // fl oz are converted before the limit: 200 fl oz is about 5,915 mL.
  expect(() => addWater(h, {id: 'health_water-001', date: DAY, amountMilli: 200_000, unit: 'fl-oz-us'}, AT)).toThrow(/5,000 mL/);
  let w = h;
  for (let i = 0; i < 2; i++) w = addWater(w, {id: `health_water-00${i}`, date: DAY, amountMilli: 5_000_000, unit: 'ml'}, AT);
  expect(dailyData(w).water).toHaveLength(2);
  expect(() => addWater(w, {id: 'health_water-009', date: DAY, amountMilli: 250_000, unit: 'ml'}, AT)).toThrow(/10,000 mL in one day/);
  expect(() => editWater(w, 'health_water-000', {date: DAY, amountMilli: 6_000_000, unit: 'ml'}, AT)).toThrow(/5,000 mL/);
});
