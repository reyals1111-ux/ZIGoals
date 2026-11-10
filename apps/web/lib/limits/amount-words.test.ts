import {describe, expect, it} from 'vitest';
import {ABOVE_ZERO, UNREADABLE, amountRefusal} from './amount-words';
import {amountInputPreview, parseAmountInput} from '../amount-input';
import {readGoalAmount} from '../goals/goal-amount';

describe('one sentence for a refused amount (Session AL final pass: BUG-012, M-057, NB-189, DV-144, B-024, DV-003a, MO-121, BN-141, N-DV-16)', () => {
  it('-5, abc and 1e3 never say "non-negative decimal" (Fund Goal, Wealth → Add cash, the wizard preview)', () => {
    for (const raw of ['-5', '−5', ' -0.5', 'abc', '1e3', '12abc']) {
      expect(() => parseAmountInput(raw, 2), raw).toThrow(/^Enter (an amount above 0|a number, like 1500 or 12\.50)\.$/);
      const preview = amountInputPreview(raw, 2);
      expect('error' in preview && preview.error, raw).not.toMatch(/non-negative/i);
    }
    expect(() => parseAmountInput('-5', 2)).toThrow(ABOVE_ZERO);
    expect(() => parseAmountInput('abc', 2)).toThrow(UNREADABLE);
    expect(() => parseAmountInput('1e3', 2)).toThrow(UNREADABLE);
  });
  it('0 and -5 say the same thing as the goal fields (readGoalAmount)', () => {
    expect(readGoalAmount('0', 'USD', 'amount').error).toBe(ABOVE_ZERO);
    expect(readGoalAmount('-5', 'USD', 'amount').error).toBe(ABOVE_ZERO);
    expect(() => parseAmountInput('-5', 2)).toThrow(readGoalAmount('-5', 'USD', 'amount').error!);
  });
  it('a plain reason from the parser is kept (an ambiguous "1,234", too many decimals)', () => {
    expect(() => parseAmountInput('1,234', 2)).toThrow(/could mean 1234 or 1\.234/);
    expect(() => parseAmountInput('1.234', 2)).toThrow('Use at most 2 decimal places.');
    expect(amountRefusal('x', 'Use at most 2 decimal places.')).toBe('Use at most 2 decimal places.');
  });
  it('a readable amount is unchanged', () => {
    expect(parseAmountInput('12.50', 2)).toBe(1250n);
    expect(parseAmountInput('0', 2)).toBe(0n);
  });
});
