import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {evaluateAmount, isExpression, resolveAmountText} from './expression';

const ok = (raw: string) => { const r = evaluateAmount(raw); if (!r.ok) throw Error(`${raw}: ${r.reason}`); return r.text; };
const reason = (raw: string) => { const r = evaluateAmount(raw); return r.ok ? null : r.reason; };

describe('BUILD list 2 #19: a calculator in the money amount field', () => {
  test('the spec\'s examples, with locale commas', () => {
    expect(ok('12,50+3,20')).toBe('15.70');
    expect(ok('3*4.99')).toBe('14.97');
    expect(ok('3 × 4,99')).toBe('14.97');
    expect(ok('10 ÷ 4')).toBe('2.50');
    expect(ok('20 − 4,5')).toBe('15.50');
  });
  test('exact to two decimals: no floating point, rounded half away from zero only at the end', () => {
    expect(ok('0.1+0.2')).toBe('0.30');
    expect(ok('10/3')).toBe('3.33');
    expect(ok('20/3')).toBe('6.67');
    expect(ok('0,05/2')).toBe('0.03'); // 0.025 rounds up
    expect(ok('1/3*3')).toBe('1.00'); // fractions, not rounded steps
    expect(ok('100-0.01*3')).toBe('99.97');
  });
  test('× and ÷ before + and −, left to right', () => {
    expect(ok('2+3*4')).toBe('14.00');
    expect(ok('20-6/2')).toBe('17.00');
    expect(ok('12/2/3')).toBe('2.00');
    expect(ok('10-2-3')).toBe('5.00');
  });
  test('refused plainly: division by zero, at or below zero, too many decimals, other signs', () => {
    expect(reason('5/0')).toBe('A number cannot be divided by zero.');
    expect(reason('5/0,00')).toBe('A number cannot be divided by zero.');
    expect(reason('3-5')).toBe('The result is not above zero.');
    expect(reason('2-2')).toBe('The result is not above zero.');
    expect(reason('1,234+1')).toBe('Use at most two decimals in each number.');
    expect(reason('2+')).toBe('Finish the sum with a number.');
    expect(reason('2++3')).toBe('Use only numbers and + − × ÷.');
    expect(reason('(2+3)')).toBe('Use only numbers and + − × ÷.');
    expect(reason('2^3')).toBe('Use only numbers and + − × ÷.');
    expect(reason('alert(1)+1')).toBe('Use only numbers and + − × ÷.');
    expect(reason('999999999*2')).toBe('The result is above a billion.');
    expect(reason('1+'.repeat(41) + '1')).toMatch(/under 80 characters/);
  });
  test('a plain amount is not a sum and is left to the field\'s own reading', () => {
    expect(isExpression('12,50')).toBe(false);
    expect(isExpression('-4')).toBe(false);
    expect(isExpression('12.5+1')).toBe(true);
    expect(resolveAmountText('12,50')).toBe('12,50');
    expect(resolveAmountText('12,50+3,20')).toBe('15.70');
    expect(resolveAmountText('5/0')).toBeNull();
  });
  test('the parser never evaluates code', () => {
    const source = readFileSync(join(__dirname, 'expression.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/\beval\s*\(|new Function|Function\(/);
  });
});
