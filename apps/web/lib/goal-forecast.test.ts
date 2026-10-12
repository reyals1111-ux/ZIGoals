import {describe, expect, it} from 'vitest';
import {FORECAST, addDays, forecastWords, paceForecast, privateGoalPoints, slope} from './goal-forecast';
import type {ContributionEvent, PrivateGoal} from './positions';

const today = '2026-10-11';
const line = (days: number[], perDay: number, start = 0) => days.map(d => ({day: addDays(today, -d), value: start + (days[0]! - d) * perDay}));

describe('G1 pace forecast (Session AA-Cloud Part 2)', () => {
  it('slope is the least-squares rate', () => {
    expect(slope([[0, 0], [10, 100], [20, 200]])).toBe(10);
    expect(slope([[0, 5]])).toBeNull();
    expect(slope([[3, 1], [3, 2]])).toBeNull();
  });
  it('a steady pace gives one date, and the range collapses onto it', () => {
    // 100 a day for 60 days, 6,000 counted, target 9,000: 30 more days.
    const f = paceForecast(line([60, 45, 30, 15, 0], 100), 6000, 9000, today);
    expect(f.state).toBe('estimate');
    expect(f.date).toBe(addDays(today, 30));
    expect(f.earliest).toBe(addDays(today, 30));
    expect(f.latest).toBe(addDays(today, 30));
    expect(f.perDay).toBeCloseTo(100, 9);
  });
  it('a pace that sped up gives a range: the later half sooner, the earlier half later', () => {
    const pts = [{day: addDays(today, -40), value: 0}, {day: addDays(today, -30), value: 100}, {day: addDays(today, -20), value: 200}, {day: addDays(today, -10), value: 700}, {day: today, value: 1200}];
    const f = paceForecast(pts, 1200, 3000, today);
    expect(f.state).toBe('estimate');
    expect(f.earliest! <= f.date!).toBe(true);
    expect(f.latest! >= f.date!).toBe(true);
    expect(f.earliest).toBe(addDays(today, Math.ceil(1800 / 50)));
    expect(f.latest).toBe(addDays(today, Math.ceil(1800 / 10)));
  });
  it('too little history says so instead of guessing', () => {
    expect(paceForecast(line([10, 5, 0], 100), 1000, 5000, today).state).toBe('not-enough'); // 10 days
    expect(paceForecast(line([30, 0], 100), 1000, 5000, today).state).toBe('not-enough'); // 2 points
    expect(paceForecast([], 0, 5000, today)).toEqual({state: 'not-enough', points: 0, spanDays: 0});
    expect(FORECAST.minDays).toBe(14);
  });
  it('flat or falling progress gives no date; a reached target says so', () => {
    expect(paceForecast(line([60, 30, 0], 0, 500), 500, 5000, today).state).toBe('no-pace');
    expect(paceForecast(line([60, 30, 0], -10, 900), 300, 5000, today).state).toBe('no-pace');
    expect(paceForecast(line([60, 30, 0], 100), 5000, 5000, today).state).toBe('reached');
  });
  it('a slower half that did not move forward leaves the latest date open', () => {
    const pts = [{day: addDays(today, -40), value: 100}, {day: addDays(today, -30), value: 100}, {day: addDays(today, -20), value: 100}, {day: addDays(today, -10), value: 600}, {day: today, value: 1100}];
    const f = paceForecast(pts, 1100, 3000, today);
    expect(f.state).toBe('estimate');
    expect(f.latest).toBeNull();
    expect(forecastWords(f, d => d).detail).toMatch(/^From .* at the earliest\. An estimate from your pace so far, not a promise\.$/);
  });
  it('ignores days after today and older than the window; uses a day’s last value', () => {
    // Gate C audit: today's later entry (900) replaces the earlier one (600), so the pace is steeper than the plain line's.
    const pts = [{day: addDays(today, -400), value: -1e9}, ...line([60, 30, 0], 10), {day: addDays(today, 5), value: 1e9}, {day: today, value: 900}];
    const f = paceForecast(pts, 900, 1200, today), plain = paceForecast(line([60, 30, 0], 10), 600, 1200, today);
    expect(f.points).toBe(3);
    expect(f.state).toBe('estimate');
    expect(plain.perDay).toBeCloseTo(10, 6);
    expect(f.perDay).toBeCloseTo(15, 6);
  });
  it('a far-off date (beyond 100 years) is no date', () => {
    expect(paceForecast(line([60, 30, 0], 0.0001), 0, 1e9, today).state).toBe('no-pace');
  });
  it('words are labelled as an estimate', () => {
    const f = paceForecast(line([60, 45, 30, 15, 0], 100), 6000, 9000, today);
    const w = forecastWords(f, d => `on ${d}`);
    expect(w.headline).toBe(`At this pace: about on ${addDays(today, 30)}`);
    expect(w.detail).toBe('Your pace has been steady. An estimate from your pace so far, not a promise.');
    expect(forecastWords({state: 'not-enough', points: 1, spanDays: 0}, d => d).headline).toBe('Not enough history yet');
  });
  it('a private goal’s points follow its own contributions, shifted to the counted value; reward income and other units are left out', () => {
    const goal = {id: '7', asset: 'USD', decimals: 2, type: 'VALUE'} as PrivateGoal;
    const ev = (id: string, day: string, cents: string, extra: Partial<ContributionEvent> = {}) => ({id, goalId: '7', goalScope: 'private', occurredAt: `${day}T10:00:00.000Z`, direction: 'IN', asset: 'USD', quantity: cents, decimals: 2, provenance: 'MANUAL', ...extra}) as unknown as ContributionEvent;
    const events = [ev('a', '2026-09-01', '10000'), ev('b', '2026-09-15', '10000'), ev('c', '2026-09-20', '5000', {provenance: 'REWARD_INCOME'} as Partial<ContributionEvent>), ev('d', '2026-10-01', '2000', {direction: 'OUT'} as Partial<ContributionEvent>), ev('e', '2026-10-02', '999', {asset: 'EUR'} as Partial<ContributionEvent>), ev('f', '2026-10-20', '50000')];
    const pts = privateGoalPoints(goal, events, 500, today);
    expect(pts).toEqual([{day: '2026-09-01', value: 500 - 180 + 100}, {day: '2026-09-15', value: 500 - 180 + 200}, {day: '2026-10-01', value: 500}]);
  });
});
