import {describe, expect, test} from 'vitest';
import {reviewPeriod} from '../life-review/engine';
import {REVIEW_ROUTE, pillarGlance} from './glance';

const base = {window: reviewPeriod('week', '2026-10-31'), counts: {habitCheckIns: 0, healthDays: 0, contributions: 0}, goalsMoved: [], streaks: [], money: []};
describe('8.1 the unified review: one line per pillar, each a link to its chapter', () => {
  test('the one review route', () => expect(REVIEW_ROUTE).toBe('/app/review'));
  test('a full week: counts only, never an amount or a Health value', () => {
    const g = pillarGlance({...base, counts: {habitCheckIns: 12, healthDays: 5, contributions: 2},
      goalsMoved: [{name: 'House', href: '/a', line: '+€250 put in'}, {name: 'House', href: '/a', line: 'Milestone'}, {name: 'Trip', href: '/b', line: 'x'}],
      streaks: [{title: 'Read', streak: 9, unit: 'days'}],
      money: [{currency: 'EUR', start: '10', end: '20', change: '10', note: ''}, {currency: 'USD', start: null, end: '5', change: null, note: ''}]}, {financial: true});
    expect(g.map(x => [x.title, x.line, x.anchor])).toEqual([
      ['Goals', '2 contributions · 2 goals moved', '#life-review-goals'],
      ['Habits', '12 check-ins · longest streak 9 days', '#life-review-streaks'],
      ['Health', 'Records on 5 of 7 days', '#life-review-health'],
      ['Wealth', '1 currency with a recorded change', '#life-review-money'],
    ]);
    expect(g.map(x => x.line).join(' ')).not.toMatch(/€|\$/);
  });
  test('unknown is not zero; Wealth only when Wealth or Goals is shown', () => {
    const g = pillarGlance(base, {financial: false});
    expect(g.map(x => x.pillar)).toEqual(['goals', 'habits', 'health']);
    expect(g.every(x => x.quiet)).toBe(true);
    expect(g.map(x => x.line).join(' ')).not.toMatch(/\b0\b/);
    expect(pillarGlance({...base, money: [{currency: 'EUR', start: null, end: null, change: null, note: ''}]}, {financial: true}).at(-1)!.line).toBe('Not enough recorded values yet');
  });
  test('the month counts its own days', () => {
    expect(pillarGlance({...base, window: reviewPeriod('month', '2026-10-31'), counts: {habitCheckIns: 0, healthDays: 20, contributions: 0}}, {financial: false})[2]!.line).toBe('Records on 20 of 31 days');
  });
});
