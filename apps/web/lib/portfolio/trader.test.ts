import {describe, expect, test} from 'vitest';
import {leverageCost, tiltLine, tiltSignals, tradeHealth, tradeSales} from './trader';
import type {PortfolioTransaction} from './schema';

// Session AJ (item 30, D11): trader tools from the person's own trades; read only; never advice.
let n = 0;
const tx = (kind: PortfolioTransaction['kind'], quantity: string, date: string, price?: string, fee?: string, createdAt = `${date}T12:00:00.000Z`, coin = 'coingecko:coin:bitcoin'): PortfolioTransaction =>
  ({id: `t${++n}`, coin, kind, quantity, date, note: '', createdAt, ...(price ? {price} : {}), ...(fee ? {fee} : {})});

describe('trade health', () => {
  test('wins and losses by FIFO lots with fees, holding days, fee share and the result by month', () => {
    const p = {transactions: [
      tx('buy', '1', '2026-01-01', '100', '1'), tx('buy', '1', '2026-01-11', '200', '1'),
      tx('sell', '1', '2026-01-21', '150', '1'), // FIFO takes the 100 lot (cost 101): +48, held 20 days
      tx('sell', '1', '2026-02-10', '150', '1'), // the 200 lot (cost 201): −52, held 30 days
    ]};
    const s = tradeSales(p);
    expect(s.map(x => [x.result, x.holdDays])).toEqual([['48', 20], ['-52', 30]]);
    const h = tradeHealth(p);
    expect(h).toMatchObject({sales: 2, wins: 1, losses: 1, even: 0, unknown: 0, winShare: 0.5, averageHoldDays: 25, fees: '4', traded: '600'});
    expect(h.feeShare).toBeCloseTo(4 / 600);
    expect(h.byMonth).toEqual([{month: '2026-01', result: '48', sales: 1}, {month: '2026-02', result: '-52', sales: 1}]);
  });
  test('a sale from a lot of unknown cost is unknown, never a win or a loss, and its month is unknown', () => {
    const h = tradeHealth({transactions: [tx('transfer-in', '1', '2026-03-01'), tx('sell', '1', '2026-03-05', '50')]});
    expect(h).toMatchObject({sales: 1, wins: 0, losses: 0, unknown: 1, winShare: null});
    expect(h.byMonth).toEqual([{month: '2026-03', result: null, sales: 1}]);
  });
  test('no sales: nothing to show', () => expect(tradeHealth({transactions: [tx('buy', '1', '2026-01-01', '1')]})).toMatchObject({sales: 0, winShare: null, averageHoldDays: null}));
});

describe('the tilt check', () => {
  const now = Date.parse('2026-10-29T12:00:00Z');
  const buys = [tx('buy', '10', '2026-10-01', '100')];
  test('three sales at a loss within 48 hours this week', () => {
    const p = {transactions: [...buys, tx('sell', '1', '2026-10-27', '90', undefined, '2026-10-27T10:00:00.000Z'), tx('sell', '1', '2026-10-28', '80', undefined, '2026-10-28T09:00:00.000Z'), tx('sell', '1', '2026-10-29', '85', undefined, '2026-10-29T08:00:00.000Z')]};
    expect(tiltSignals(p, now, 'UTC')).toEqual([{kind: 'losses', count: 3}]);
    expect(tiltLine({kind: 'losses', count: 3})).toBe('3 sales at a loss within 48 hours this week.');
  });
  test('losses spread over more than 48 hours, or older than a week, say nothing', () => {
    const spread = {transactions: [...buys, tx('sell', '1', '2026-10-23', '90', undefined, '2026-10-23T10:00:00.000Z'), tx('sell', '1', '2026-10-26', '80', undefined, '2026-10-26T10:00:00.000Z'), tx('sell', '1', '2026-10-29', '85', undefined, '2026-10-29T10:00:00.000Z')]};
    expect(tiltSignals(spread, now, 'UTC')).toEqual([]);
    const old = {transactions: [...buys, ...[1, 2, 3].map(h => tx('sell', '1', '2026-10-10', '90', undefined, `2026-10-10T0${h}:00:00.000Z`))]};
    expect(tiltSignals(old, now, 'UTC')).toEqual([]);
  });
  test('two sales logged late at night in the device\'s zone', () => {
    const p = {transactions: [...buys, tx('sell', '1', '2026-10-27', '120', undefined, '2026-10-27T22:30:00.000Z'), tx('sell', '1', '2026-10-28', '120', undefined, '2026-10-28T02:10:00.000Z')]};
    expect(tiltSignals(p, now, 'Europe/Brussels')).toEqual([{kind: 'late', count: 2}]); // 23:30 and 03:10 there
    expect(tiltSignals(p, now, 'UTC')).toEqual([]); // 22:30 and 02:10: only one is late in UTC
  });
});

describe('the cost of leverage (an illustration)', () => {
  test('a yearly rate over days, and the move that uses up the margin', () => {
    expect(leverageCost({size: '10000', leverage: 5, entry: '50000', side: 'long', rate: '10', rateKind: 'yearly', days: 73})).toEqual({cost: '200', costShareOfMargin: 0.1, margin: '2000', moveToClose: 0.2, closePrice: '40000'});
  });
  test('a funding rate per 8 hours, short side', () => {
    const r = leverageCost({size: '1000', leverage: 10, entry: '2000', side: 'short', rate: '0.01', rateKind: 'per-8h', days: 30});
    expect(r).toMatchObject({cost: '9', margin: '100', moveToClose: 0.1, closePrice: '2200'});
  });
  test('input it cannot use is refused in plain words', () => {
    expect(() => leverageCost({size: '0', leverage: 5, entry: '1', side: 'long', rate: '1', rateKind: 'yearly', days: 1})).toThrow('above zero');
    expect(() => leverageCost({size: '1', leverage: 200, entry: '1', side: 'long', rate: '1', rateKind: 'yearly', days: 1})).toThrow('125×');
    expect(() => leverageCost({size: '1', leverage: 2, entry: '1', side: 'long', rate: '1', rateKind: 'yearly', days: 0})).toThrow('Days');
  });
});
