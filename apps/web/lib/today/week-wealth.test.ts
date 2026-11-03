import {describe, expect, it} from 'vitest';
import {weekWealthNet} from './week-wealth';

// Session AK F0 (M42): the week's change in tracked wealth for Today's line.
const usd = (points: [string, string][]) => [{currency: 'USD', points: points.map(([at, value]) => ({at, value}))}];
describe('weekWealthNet', () => {
  it('today\'s last value minus the value a week ago (the latest reading on or before that day), exact in minor units', () => {
    const history = usd([['2026-10-20T10:00:00Z', '1000000'], ['2026-10-24T09:00:00Z', '1012000'], ['2026-10-24T18:00:00Z', '1010050'], ['2026-10-31T08:00:00Z', '1022050']]);
    expect(weekWealthNet(history, 'USD', '2026-10-31')).toEqual({change: 12000n, from: '2026-10-24'});
    expect(weekWealthNet(history, 'USD', '2026-10-30')).toEqual({change: 10050n, from: '2026-10-23'}); // a week ago read from the 20th
  });
  it('a fall is negative, no change is zero', () => {
    expect(weekWealthNet(usd([['2026-10-24T10:00:00Z', '500000'], ['2026-10-31T10:00:00Z', '480000']]), 'USD', '2026-10-31')?.change).toBe(-20000n);
    expect(weekWealthNet(usd([['2026-10-24T10:00:00Z', '500000'], ['2026-10-31T10:00:00Z', '500000']]), 'USD', '2026-10-31')?.change).toBe(0n);
  });
  it('unknown is not zero: no reading a week ago, another currency, or a single reading → null', () => {
    expect(weekWealthNet(usd([['2026-10-26T10:00:00Z', '500000'], ['2026-10-31T10:00:00Z', '510000']]), 'USD', '2026-10-31')).toBeNull();
    expect(weekWealthNet(usd([['2026-10-20T10:00:00Z', '500000'], ['2026-10-31T10:00:00Z', '510000']]), 'EUR', '2026-10-31')).toBeNull();
    expect(weekWealthNet(usd([['2026-10-20T10:00:00Z', '500000']]), 'USD', '2026-10-31')).toBeNull();
    expect(weekWealthNet([], 'USD', '2026-10-31')).toBeNull();
  });
  it('across a month end and a year end', () => {
    expect(weekWealthNet(usd([['2026-12-28T10:00:00Z', '100'], ['2027-01-03T10:00:00Z', '250']]), 'USD', '2027-01-04')).toEqual({change: 150n, from: '2026-12-28'});
  });
});
