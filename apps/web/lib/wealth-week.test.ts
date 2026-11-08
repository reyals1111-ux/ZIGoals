import {describe, expect, it} from 'vitest';
import {wealthChange, weekWealthChange} from './wealth-week';
import {buildShowcase} from './showcase-data';
import {platformSchema} from './positions';
import {wealthHistory, wealthOverview} from './wealth';
import {splitWealthTotals} from './wealth-total';
import {emptyHabitData} from './habits';
import {createEmptyHealth} from './health';
import {lifeReview, reviewPeriod} from './life-review/engine';

const usd = (points: [string, string][]) => [{currency: 'USD', points: points.map(([at, value]) => ({at, value}))}];

describe('Session AL (RR-14): one reckoning for a week of tracked wealth', () => {
  it('starts at the recorded value a week ago and ends at the total shown now', () => {
    const h = usd([['2026-10-24T10:00:00Z', '500000'], ['2026-10-31T10:00:00Z', '520000']]);
    expect(weekWealthChange(h, 'USD', '2026-10-31', {value: 512000n, complete: true})).toEqual({currency: 'USD', start: 500000n, end: 512000n, change: 12000n});
    // A past period ends at its own recorded value.
    expect(wealthChange({history: h, currency: 'USD', before: '2026-10-24', end: '2026-10-31'}).change).toBe(20000n);
  });
  it('unknown is never zero: no reading a week ago, or a holding without a value now, leaves the change unknown', () => {
    const h = usd([['2026-10-26T10:00:00Z', '500000']]);
    expect(weekWealthChange(h, 'USD', '2026-10-31', {value: 510000n, complete: true})).toMatchObject({change: null, unknown: 'no-start'});
    expect(weekWealthChange(usd([['2026-10-20T10:00:00Z', '500000']]), 'USD', '2026-10-31', {value: 400000n, complete: false})).toMatchObject({change: null, unknown: 'incomplete'});
    expect(weekWealthChange([], 'USD', '2026-10-31', {value: 1n, complete: true}).change).toBeNull();
    // The review's month may start at its first reading inside the period.
    expect(wealthChange({history: h, currency: 'USD', before: '2026-09-30', end: '2026-10-31', firstInside: true, now: {value: 510000n, complete: true}}).change).toBe(10000n);
  });
  it('the Showcase with prices offline: Today and the Life review agree (both unknown, never +16,163.50 beside −19,442.60)', () => {
    const day = '2026-11-08', platform = platformSchema.parse(JSON.parse(buildShowcase(day, 'UTC').records['zigoals:platform:v1']!));
    const overview = wealthOverview(platform, Date.parse(`${day}T12:00:00Z`), []), primary = splitWealthTotals(overview.subtotals).primary!;
    expect(overview.missingValue).toBe(true); // Bitcoin and Ethereum have no value without prices
    const today = weekWealthChange(wealthHistory(platform), primary.currency, day, {value: primary.value, complete: !overview.missingValue});
    const review = lifeReview({window: reviewPeriod('week', day), habits: emptyHabitData(), health: createEmptyHealth(), platform, goals: [], averages: [], extras: {version: 1, goals: {}} as never, history: wealthHistory(platform), today: day, current: overview.subtotals, currentComplete: !overview.missingValue});
    const usdReview = review.money.find(m => m.currency === 'USD')!;
    expect(today.change).toBeNull();
    expect(usdReview.change).toBeNull();
    expect(usdReview.note).toBe('Change not known: a holding has no value right now');
    // With every holding valued, both read the same change from the same start to the same end.
    const complete = {value: primary.value, complete: true};
    const t = weekWealthChange(wealthHistory(platform), 'USD', day, complete);
    const r = lifeReview({window: reviewPeriod('week', day), habits: emptyHabitData(), health: createEmptyHealth(), platform, goals: [], averages: [], extras: {version: 1, goals: {}} as never, history: wealthHistory(platform), today: day, current: overview.subtotals, currentComplete: true}).money.find(m => m.currency === 'USD')!;
    expect(r.change).toBe((Number(t.change) / 100).toFixed(2));
  });
});
