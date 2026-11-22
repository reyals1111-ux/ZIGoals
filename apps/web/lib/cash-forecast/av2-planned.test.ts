import {describe, expect, test} from 'vitest';
import {addPlanned, plannedForForecast, plannedIssue, plannedStates, removePlanned} from './planned';
import {cashForecast, forecastDays, monthLows, type KnownForecast} from './model';
import type {Accounts} from '../accounts/schema';
import {emptyBills} from '../bills/schema';
import type {MoneyEntry} from '../money-log/schema';
import type {MoneyMore} from '../money-more/schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi's planned spending and projected cash flow, LEDGER #292, #294): planned
 * one-off costs are open until an entry matches or the person clears them, count in the forecast on their day (a passed
 * one tomorrow), and the forecast runs 60 days, 6 or 12 months with each month's lowest point.
 */
const TODAY = '2026-11-22', at = `${TODAY}T10:00:00.000Z`, ACC = '00000000-0000-4000-8000-0000000000a1';
const accounts: Accounts = {version: 1, items: [{id: ACC, kind: 'cash', name: 'Current', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000000b1', date: TODAY, value: '100000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]};
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: 'x', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Other', date: TODAY, createdAt: at, ...over});
const base: MoneyMore = {version: 1};
const withTwo = addPlanned(addPlanned(base, {name: 'Birthday present', amount: '60.00', currency: 'EUR', date: '2026-12-14', category: 'Gifts'}, 'p1'), {name: 'Car service', amount: '320.00', currency: 'EUR', date: '2026-11-18'}, 'p2');

describe('planned one-off costs', () => {
  test('kept in date order; a name, an amount above zero and a day are needed', () => {
    expect(withTwo.planned!.map(p => p.id)).toEqual(['p2', 'p1']);
    expect(plannedIssue({name: ' ', amount: '5.00', currency: 'EUR', date: TODAY})).toMatch(/name/);
    expect(plannedIssue({name: 'X', amount: '0', currency: 'EUR', date: TODAY})).toMatch(/above zero/);
    expect(plannedIssue({name: 'X', amount: '5.00', currency: 'EUR', date: ''})).toMatch(/day/);
    expect(() => addPlanned(base, {name: '', amount: '5.00', currency: 'EUR', date: TODAY}, 'p')).toThrow();
  });
  test('open until an entry matches (amount within 5 % near its day, with its name or category); a passed one is overdue', () => {
    const none = plannedStates(withTwo.planned, [], TODAY);
    expect(none.map(s => [s.cost.id, s.state, s.overdue])).toEqual([['p2', 'open', true], ['p1', 'open', false]]);
    const log = [e({id: 'a', amount: '318.00', note: 'Garage Jansen · car service', date: '2026-11-20'}), e({id: 'b', amount: '320.00', note: 'Something else', date: '2026-11-19'})];
    const seen = plannedStates(withTwo.planned, log, TODAY);
    expect(seen[0]).toMatchObject({state: 'seen', entry: {id: 'a'}});
    // the category alone matches too; an entry left out of the figures never matches
    expect(plannedStates(withTwo.planned, [e({id: 'c', amount: '60.00', category: 'Gifts', date: '2026-12-13'})], '2026-12-14')[1]!.state).toBe('seen');
    expect(plannedStates(withTwo.planned, [e({id: 'd', amount: '318.00', note: 'car service', date: '2026-11-20', excluded: true})], TODAY)[0]!.state).toBe('open');
    // an entry far from its amount, or too long before its day, does not match
    expect(plannedStates(withTwo.planned, [e({id: 'f', amount: '200.00', note: 'car service', date: '2026-11-20'})], TODAY)[0]!.state).toBe('open');
    expect(plannedStates(withTwo.planned, [e({id: 'g', amount: '320.00', note: 'car service', date: '2026-11-10'})], TODAY)[0]!.state).toBe('open');
  });
  test('a shared cost matches by the person’s own share, as Wealth → Spending counts it', () => {
    const one = addPlanned(base, {name: 'Dinner out', amount: '40.00', currency: 'EUR', date: TODAY}, 'p');
    expect(plannedStates(one.planned, [e({id: 's', amount: '120.00', share: '40.00', note: 'Dinner out with Sam'})], TODAY)[0]!.state).toBe('seen');
  });
  test('cleared: removed from the record (the record without the list when none is left)', () => {
    expect(removePlanned(withTwo, 'p2').planned!.map(p => p.id)).toEqual(['p1']);
    expect(removePlanned(removePlanned(withTwo, 'p2'), 'p1')).toEqual({version: 1});
  });
});

describe('the forecast counts them, and runs 60 days, 6 or 12 months', () => {
  test('an open cost on its day, an overdue one tomorrow; a seen one not at all', () => {
    const planned = plannedForForecast(withTwo, [], TODAY);
    const row = cashForecast({accounts, bills: emptyBills(), entries: [], planned, today: TODAY, days: 60}).rows[0] as KnownForecast;
    expect(row.events.filter(x => x.kind === 'planned').map(x => [x.date, x.title, x.cents])).toEqual([['2026-11-23', 'Car service', -32000n], ['2026-12-14', 'Birthday present', -6000n]]);
    expect(row.points.at(-1)!.mid).toBe(100000n - 32000n - 6000n);
    const after = plannedForForecast(withTwo, [e({id: 'a', amount: '320.00', note: 'car service', date: '2026-11-20'})], TODAY);
    expect(after.map(p => p.name)).toEqual(['Birthday present']);
  });
  test('a planned cost in a currency with no cash account is named, not drawn', () => {
    const planned = [{name: 'Trip', amount: '50.00', currency: 'GBP', date: '2026-12-01'}];
    expect(cashForecast({accounts, bills: emptyBills(), entries: [], planned, today: TODAY}).unplaced).toEqual(['GBP']);
  });
  test('the lengths, and each month’s lowest point', () => {
    expect(forecastDays('60d', TODAY)).toBe(60);
    expect(forecastDays('6m', TODAY)).toBe(181); // 22 Nov to 22 May
    expect(forecastDays('12m', TODAY)).toBe(365);
    const row = cashForecast({accounts, bills: emptyBills(), entries: [], planned: plannedForForecast(withTwo, [], TODAY), today: TODAY, days: forecastDays('6m', TODAY)}).rows[0] as KnownForecast;
    expect(row.points).toHaveLength(182);
    const lows = monthLows(row);
    expect(lows.map(m => m.month)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05']);
    expect(lows[0]).toMatchObject({date: '2026-11-23', cents: 68000n});
    expect(lows[1]).toMatchObject({date: '2026-12-14', cents: 62000n});
  });
});
