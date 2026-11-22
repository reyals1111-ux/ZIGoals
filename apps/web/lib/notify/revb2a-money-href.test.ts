import {describe, expect, test} from 'vitest';
import {buildPlan, moneyHref} from './plan';
import {emptyNotifyPrefs} from './prefs';
import {loanWakes} from '../money-more/people';

/**
 * Session AV lane 2 (review b2a #9): a money notice opens where its subject lives — a budget over or near its amount opens
 * Budgets; a reminded loan opens Spending (its "Between you and others"), as Today's line for the same loan does; payday
 * and the low-balance line open Spending's 60-day forecast.
 */
describe('where a money notice opens', () => {
  test('by its kind', () => {
    expect(moneyHref('money:over:g:2026-11')).toBe('/app/wealth?view=budgets');
    expect(moneyHref('money:near:g:2026-11')).toBe('/app/wealth?view=budgets');
    expect(moneyHref('money:loan:l1:0')).toBe('/app/wealth#spending');
    expect(moneyHref('money:payday:2026-11-28')).toBe('/app/wealth#spending');
    expect(moneyHref('money:low:2026-11-21:7')).toBe('/app/wealth#spending');
  });
  test('a reminded loan’s notice in the plan opens Spending', () => {
    const more = {version: 1 as const, loans: [{id: 'l1', kind: 'lent' as const, name: 'Sam', amount: '40.00', currency: 'EUR', date: '2026-11-01', due: '2026-11-15', remind: true as const}]};
    const wakes = loanWakes(more, '2026-11-14');
    const plan = buildPlan({now: Date.parse('2026-11-14T06:00:00Z'), zone: 'UTC', prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], money: wakes});
    const items = plan.snapshot.items.filter(i => i.kind === 'money');
    expect(items.map(i => [i.label, i.href])).toEqual([['Sam owes you: due tomorrow', '/app/wealth#spending'], ['Sam owes you: due today', '/app/wealth#spending']]);
  });
});
