import {expect, test} from 'vitest';
import {checkGoalTarget} from './target';

// Session AL (DV-027a/b, DV-059, P-DV-02 for L4): a Health goal's target goes through the one limits table.
test('DV-059: 99,999,999 steps a day is refused with the real range; 10,000 is kept', () => {
  const big = checkGoalTarget('99999999', 'steps', {weightUnit: 'kg'});
  expect(big.ok).toBe(false);
  expect(big.error).toBe('Enter a whole number from 0 to 100,000 steps.');
  expect(checkGoalTarget('10000', 'steps', {weightUnit: 'kg'}).value).toBe(10_000);
});
test('DV-027a: an empty or zero target says why', () => {
  expect(checkGoalTarget('', 'steps', {weightUnit: 'kg'}).error).toBe('Enter a target above zero.');
  expect(checkGoalTarget('0', 'activeMinutes', {weightUnit: 'kg'}).error).toBe('Enter a target above zero.');
});
test('a weight target is checked in the journal unit, decimal comma read', () => {
  const lb = checkGoalTarget('1000', 'weight', {weightUnit: 'lb'});
  expect(lb.ok).toBe(false);
  expect(lb.error).toContain('lb');
  const kg = checkGoalTarget('72,5', 'weight', {weightUnit: 'kg'});
  expect([kg.ok, kg.text]).toEqual([true, '72.5']);
  expect(checkGoalTarget('2000', 'activeMinutes', {weightUnit: 'kg'}).ok).toBe(false);
});
