import {describe, expect, it} from 'vitest';
import {budgetPace, paceWords} from './pace';

describe('Session AV F-BUDGET-PACE: a budget against the month', () => {
  const row = (spent: number, available = 30000) => ({spent, available, over: spent > available});
  it('says near the limit from 80 % spent, with what is left and the days', () => {
    const p = budgetPace(row(24000), '2026-11', '2026-11-21')!;
    expect(p.state).toBe('near');
    expect(paceWords(p, '€60.00 left')).toBe('Near the limit: 80% spent, €60.00 left for 10 days.');
  });
  it('says faster than the month when spending runs more than 10 points ahead, from the 5th', () => {
    const p = budgetPace(row(18000), '2026-11', '2026-11-12')!; // 60 % spent, 40 % of the month
    expect(p.state).toBe('fast');
    expect(paceWords(p, '')).toBe('60% spent with 40% of the month gone: faster than the month.');
    expect(budgetPace(row(9000), '2026-11', '2026-11-03')!.state).toBe('steady'); // one early shop is not "fast"
    expect(budgetPace(row(15000), '2026-11', '2026-11-15')!.state).toBe('steady');
  });
  it('leaves over to the row, and is silent for other months or nothing available', () => {
    const p = budgetPace(row(31000), '2026-11', '2026-11-21')!;
    expect(p.state).toBe('over'); expect(paceWords(p, '')).toBeNull();
    expect(budgetPace(row(100), '2026-10', '2026-11-21')).toBeNull();
    expect(budgetPace(row(100, 0), '2026-11', '2026-11-21')).toBeNull();
  });
  it('says the last day in words', () => {
    expect(paceWords(budgetPace(row(27000), '2026-11', '2026-11-30')!, '€30.00 left')).toBe('Near the limit: 90% spent, €30.00 left for the last day.');
  });
});
