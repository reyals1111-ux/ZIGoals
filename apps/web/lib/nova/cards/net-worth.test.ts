import {describe, expect, it} from 'vitest';
import {wealthHud, type WealthInput} from '../holo/wealth';
import {changeWords, netWorthAsOf, netWorthCard, netWorthRows} from './net-worth';

const TODAY = '2026-11-11';
const money = (cents: bigint) => `$${(Number(cents) / 100).toFixed(2)}`, percent = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, day = (at: string) => at.slice(5, 10);
const sub = (currency: string, value: bigint) => ({currency, value, allocated: 0n, unallocated: value});
const overview = (o: Partial<WealthInput>): WealthInput => ({subtotals: [], incomplete: false, missingValue: false, categories: [], history: [], rows: [], ...o});
const usd = (points: [string, string][]) => ({currency: 'USD', points: points.map(([at, value]) => ({at: `${at}T09:00:00.000Z`, value}))});

describe('net worth card (Session AM)', () => {
  it('teaches when nothing is tracked: no figure, no zero', () => {
    const card = netWorthCard(wealthHud(overview({})), TODAY);
    expect(card).toMatchObject({state: 'empty', total: null, currency: null, change: null, points: [], series: []});
  });
  it('states the change between the first and last recorded valuation in the range, in exact cents', () => {
    const hud = wealthHud(overview({subtotals: [sub('USD', 1_250_000n)], rows: [{}], history: [usd([['2026-05-01', '900000'], ['2026-09-01', '1000000'], ['2026-10-01', '950010'], ['2026-11-09', '1200033']])]}));
    const card = netWorthCard(hud, TODAY);
    expect(card.range).toBe('quarter');
    expect(card.points.map(p => p.cents)).toEqual([1_000_000n, 950_010n, 1_200_033n]);
    expect(card.change).toEqual({cents: 200_033n, direction: 'up', since: '2026-09-01T09:00:00.000Z', percent: 20.003});
    expect(changeWords(card.change!, money, percent, day)).toBe('+$2000.33 (+20.0%) since 09-01');
    expect(card.high?.cents).toBe(1_200_033n); expect(card.low?.cents).toBe(950_010n);
    expect(card.total).toBe(1_250_000n);
    // The line: one slot per calendar day from the first to the last record; a day without a record is a gap, never 0.
    expect(card.series).toHaveLength(70);
    expect(card.series[0]).toBe(10000); expect(card.series[30]).toBe(9500.1); expect(card.series.at(-1)).toBe(12000.33);
    expect(card.series.filter(v => v !== null)).toHaveLength(3);
    expect(card.series).not.toContain(0);
  });
  it('a fall is said with its sign, and the range follows the request', () => {
    const hud = wealthHud(overview({subtotals: [sub('USD', 80_000n)], rows: [{}], history: [usd([['2026-09-01', '100000'], ['2026-11-06', '90000'], ['2026-11-10', '80000']])]}));
    const quarter = netWorthCard(hud, TODAY), week = netWorthCard(hud, TODAY, 'week');
    expect(changeWords(quarter.change!, money, percent, day)).toBe('−$200.00 (-20.0%) since 09-01');
    expect(week.rangeWords).toBe('the last 7 days');
    expect(week.change).toMatchObject({cents: -10_000n, direction: 'down', since: '2026-11-06T09:00:00.000Z'});
  });
  it('with fewer than two recorded valuations in the range there is no change to state', () => {
    const hud = wealthHud(overview({subtotals: [sub('USD', 500n)], rows: [{}], history: [usd([['2026-01-05', '400'], ['2026-11-01', '500']])]}));
    const card = netWorthCard(hud, TODAY, 'month');
    expect(card.points).toHaveLength(1); expect(card.change).toBeNull(); expect(card.lastAt).toBe('2026-11-01T09:00:00.000Z');
    expect(netWorthRows(card, money, percent, day)).toContainEqual(['Change over the last 30 days', 'One valuation recorded, so no change to state yet']);
    const none = netWorthCard(hud, TODAY, 'week');
    expect(none.points).toEqual([]);
    expect(netWorthRows(none, money, percent, day)).toContainEqual(['Change over the last 7 days', 'No valuation recorded in this range']);
  });
  it('two currencies stay apart: the headline currency leads, the other is named, nothing is added', () => {
    const hud = wealthHud(overview({subtotals: [sub('EUR', 30_000n), sub('USD', 100_000n)], rows: [{}, {}], history: [usd([['2026-10-01', '90000'], ['2026-11-01', '100000']]), {currency: 'EUR', points: [{at: '2026-11-02T09:00:00.000Z', value: '30000'}]}]}));
    const card = netWorthCard(hud, TODAY);
    expect(card.currency).toBe('USD'); expect(card.total).toBe(100_000n); expect(card.otherCurrencies).toEqual(['EUR']);
    expect(card.points.map(p => p.cents)).toEqual([90_000n, 100_000n]);
    expect(netWorthRows(card, money, percent, day)).toContainEqual(['Other currencies', 'EUR, never converted']);
  });
  it('a holding without a value is not valued, never zero; a partly known total is known so far', () => {
    const unvalued = netWorthCard(wealthHud(overview({rows: [{}], incomplete: true, missingValue: true})), TODAY);
    expect(unvalued).toMatchObject({state: 'live', total: null, knownSoFar: false});
    expect(netWorthRows(unvalued, money, percent, day)[0]).toEqual(['Tracked wealth', 'Not valued yet']);
    const partly = netWorthCard(wealthHud(overview({subtotals: [sub('USD', 100n)], rows: [{}, {}], incomplete: true, missingValue: true})), TODAY);
    expect(partly.knownSoFar).toBe(true);
    expect(netWorthRows(partly, money, percent, day)[0]).toEqual(['Tracked wealth, known so far', '$1.00']);
  });
  it('no change is said as no change; a first valuation of zero gives no percent', () => {
    const flat = netWorthCard(wealthHud(overview({subtotals: [sub('USD', 100n)], rows: [{}], history: [usd([['2026-10-01', '100'], ['2026-11-01', '100']])]})), TODAY);
    expect(changeWords(flat.change!, money, percent, day)).toBe('No change since 10-01');
    const fromZero = netWorthCard(wealthHud(overview({subtotals: [sub('USD', 100n)], rows: [{}], history: [usd([['2026-10-01', '0'], ['2026-11-01', '100']])]})), TODAY);
    expect(fromZero.change?.percent).toBeNull();
    expect(changeWords(fromZero.change!, money, percent, day)).toBe('+$1.00 since 10-01');
  });
  it('the foot names the newest valuation, and the market prices\' time only when the total follows them', () => {
    const time = (at: string) => at.slice(11, 16);
    expect(netWorthAsOf('2026-11-09T09:00:00.000Z', undefined, day, time)).toBe('last valuation 11-09');
    expect(netWorthAsOf('2026-11-09T09:00:00.000Z', {kind: 'own'}, day, time)).toBe('last valuation 11-09');
    expect(netWorthAsOf('2026-11-09T09:00:00.000Z', {kind: 'market', at: '2026-11-11T14:20:00.000Z'}, day, time)).toBe('last valuation 11-09 · market prices as of 14:20');
    expect(netWorthAsOf(null, undefined, day, time)).toBe('no valuation recorded yet');
  });
});
