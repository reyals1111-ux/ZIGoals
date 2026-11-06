import {describe, expect, it} from 'vitest';
import {ABOVE_ZERO, OVER_CAP, readGoalAmount} from './goal-amount';

// Session AL (L4): DV-001/P-DVR-01, DV-003a, DV-033a, DV-049a/b, DV-050a/b, DV-055b, DV-098 — one reading of a goal amount.
describe('readGoalAmount', () => {
  it('0 and −5 say the same sentence (DV-003a, DV-049a)', () => {
    for (const raw of ['0', '-5', '−5', '0.00']) expect(readGoalAmount(raw, 'USD').error, raw).toBe(ABOVE_ZERO);
    for (const raw of ['0', '-5']) expect(readGoalAmount(raw, 'BOOKS').error, raw).toBe(ABOVE_ZERO);
  });
  it('refuses above a trillion: 1e18, 1e20, 1e21 and 1e28 (D-071, D-102, N-143)', () => {
    for (const raw of ['999999999999999999', '99999999999999999999', '999999999999999999999', '12345678901234567890123456789']) expect(readGoalAmount(raw, 'USD').error, raw).toBe(OVER_CAP);
    expect(readGoalAmount('1000000000000', 'USD').ok).toBe(true);
    expect(readGoalAmount('1e21', 'USD').ok).toBe(false);
  });
  it('says what is missing, and keeps the money forms\' sentence for unreadable text', () => {
    expect(readGoalAmount('', 'USD', 'target').error).toBe('Enter your target.');
    expect(readGoalAmount(' ', 'USD', 'plan').error).toBe('Enter the planned amount.');
    // Session AL second pass (COPY_AUDIT, deliberate): plain words for unreadable text, no "non-negative decimal".
    expect(readGoalAmount('lots', 'USD').error).toBe('Enter a number, like 1500 or 12.50.');
  });
  it('reads a decimal comma and grouping; money keeps 2 decimals', () => {
    expect(readGoalAmount('1,5', 'EUR')).toMatchObject({ok: true, text: '1.5'});
    expect(readGoalAmount('1,234.56', 'USD')).toMatchObject({ok: true, text: '1234.56'});
    expect(readGoalAmount('10.555', 'USD').ok).toBe(false);
    expect(readGoalAmount('0.5', 'BTC')).toMatchObject({ok: true, text: '0.5'});
  });
});
