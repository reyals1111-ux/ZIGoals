import {describe, expect, test} from 'vitest';
import {readPartAmount} from '../../components/wealth/money-tools/split-panel';
import {checkMoneyForm, readMoneyAmount} from './form';
import {splitIssue} from '../money-split/parts';

/**
 * Session AV lane 2, round 4 (money; Actual's amount calculator, LEDGER #339). The money form's amount, the weekly and
 * month budgets and the other money amounts already take a sum (Session AK, lib/money-calc/expression.ts, `CalcHint`);
 * round 4 adds the last money-log amount field, a split's parts, so every amount kept in the money log can be typed as a
 * sum, worked out exactly, and only the result is kept.
 */
describe('sums in an amount (#339)', () => {
  test('the entry form keeps only the result, exactly', () => {
    expect(readMoneyAmount('12,50+3')).toBe('15.50');
    expect(readMoneyAmount('0.1+0.2')).toBe('0.30');
    expect(checkMoneyForm({amount: '3×4,99', date: '2026-11-14', today: '2026-11-14'})).toEqual({ok: true, amount: '14.97'});
    expect(checkMoneyForm({amount: '5/0', date: '2026-11-14', today: '2026-11-14'})).toEqual({ok: false, problem: 'A number cannot be divided by zero.'});
  });
  test('a split part takes a sum too, and the parts must still add up', () => {
    expect(readPartAmount('12,50+7,50')).toBe('20.00');
    expect(readPartAmount('30 - 10')).toBe('20.00');
    expect(readPartAmount('7,5')).toBe('7.5');
    expect(splitIssue({amount: '40.00'}, [{amount: readPartAmount('12,50+7,50')}, {amount: readPartAmount('2*10')}])).toBeNull();
    expect(readPartAmount('5/0')).toBe('5/0'); // unreadable, so the parts' own check refuses it in words
  });
});
