import {describe, expect, test} from 'vitest';
import {allTimeResult, allocation, coinsInWindow, dayChange, dayStart, investedTotal, rangeWindow, realizedResults, valueSeries} from './performance';
import type {PortfolioTransaction} from './schema';

// Session W Part 15: Portfolio v2's results from the person's own entries; unknown stays unknown.
const BTC = 'coingecko:coin:bitcoin', ETH = 'coingecko:coin:ethereum', SOL = 'coingecko:coin:solana';
let n = 0;
const tx = (coin: string, kind: PortfolioTransaction['kind'], quantity: string, date: string, price?: string, fee?: string): PortfolioTransaction => ({id: `t${++n}`, coin, kind, quantity, date, note: '', createdAt: `${date}T12:00:00.000Z`, ...(price === undefined ? {} : {price}), ...(fee === undefined ? {} : {fee})});
const btc = [tx(BTC, 'buy', '1', '2026-01-01', '100', '1'), tx(BTC, 'buy', '1', '2026-02-01', '200'), tx(BTC, 'sell', '0.5', '2026-03-01', '300', '2')];
const eth = [tx(ETH, 'transfer-in', '2', '2026-01-15'), tx(ETH, 'sell', '1', '2026-02-15', '50')];
const sol = [tx(SOL, 'transfer-in', '10', '2026-01-10', '20'), tx(SOL, 'transfer-out', '10', '2026-01-20', undefined, '1')];

test('realized: proceeds minus fees minus the average cost of what was sold; a transfer\'s fee is a cost; unknown cost sold stays unknown', () => {
  const realized = realizedResults({transactions: [...btc, ...eth, ...sol]});
  // BTC cost 301 for 2; selling 0.5 takes 75.25 of it: 150 − 2 − 75.25.
  expect(realized.get(BTC)).toBe('72.75');
  expect(realized.get(ETH)).toBeUndefined();
  expect(realized.get(SOL)).toBe('-1');
});

test('invested: every cost that came in, fees included; unknown with a transfer in without a price', () => {
  expect(investedTotal({transactions: btc})).toBe('301');
  expect(investedTotal({transactions: [...btc, ...sol]})).toBe('501');
  expect(investedTotal({transactions: [...btc, ...eth]})).toBeUndefined();
});

describe('all-time result', () => {
  test('realized plus unrealized, and its share of what was invested', () => {
    const result = allTimeResult({transactions: btc}, () => '400');
    // Unrealized: 1.5 × 400 − 225.75 = 374.25; with 72.75 realized, 447 of 301 invested.
    expect(result).toMatchObject({value: '447', realized: '72.75', unrealized: '374.25'});
    expect(result.pct!.slice(0, 10)).toBe('148.504983');
  });
  test('no price: unknown, and says why', () => { expect(allTimeResult({transactions: btc}, () => undefined)).toEqual({realized: '72.75', unrealized: undefined, reason: 'price'}); });
  test('an unknown cost: unknown, and says why', () => { const result = allTimeResult({transactions: [...btc, ...eth]}, () => '400'); expect(result.value).toBeUndefined(); expect(result.reason).toBe('cost'); });
  test('a closed position is all realized', () => {
    const closed = [...btc, tx(BTC, 'sell', '1.5', '2026-04-01', '100')];
    // 150 − 225.75 more: 72.75 − 75.75 = −3.
    expect(allTimeResult({transactions: closed}, () => undefined)).toMatchObject({value: '-3', unrealized: '0'});
  });
});

test('the 24h change of what is held now: value × c / (100 + c), only from coins with both; the rest are counted', () => {
  expect(dayChange([{quantity: '1', value: '110', change24h: '10'}, {quantity: '2', value: '90', change24h: '-10'}, {quantity: '1', change24h: '5'}, {quantity: '0', value: '0', change24h: '3'}])).toEqual({value: '0', pct: '0', counted: 2, held: 3});
  expect(dayChange([{quantity: '1', value: '110', change24h: '10'}])).toEqual({value: '10', pct: '10', counted: 1, held: 1});
  expect(dayChange([{quantity: '1', value: '5', change24h: '-100'}, {quantity: '1', change24h: null}])).toEqual({counted: 0, held: 2});
});

test('allocation: shares of the known value, largest first, the rest folded into Other; no price, no share', () => {
  const rows = Array.from({length: 8}, (_, i) => ({key: `c${i}`, label: `Coin ${i}`, value: String((i + 1) * 10)}));
  const {slices, total} = allocation([...rows, {key: 'x', label: 'No price'}]);
  expect(total).toBe('360');
  expect(slices.map(s => s.label)).toEqual(['Coin 7', 'Coin 6', 'Coin 5', 'Coin 4', 'Coin 3', 'Other (3)']);
  expect(slices.at(-1)!.value).toBe('60');
  expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 10);
  expect(allocation([{key: 'x', label: 'No price'}])).toEqual({slices: [], total: '0'});
});

describe('value over time', () => {
  const now = Date.parse('2026-10-07T12:00:00.000Z'), DAY = 86400000;
  test('ranges ask the matching market history; "All" starts at the first transaction, at most a year back', () => {
    expect(rangeWindow('7d', btc, now)).toEqual({start: now - 7 * DAY, end: now, history: '7d', clipped: false});
    expect(rangeWindow('all', [tx(BTC, 'buy', '1', '2026-09-28', '1')], now)).toEqual({start: dayStart('2026-09-28'), end: now, history: '30d', clipped: false});
    expect(rangeWindow('all', [tx(BTC, 'buy', '1', '2025-01-01', '1')], now)).toEqual({start: now - 365 * DAY, end: now, history: '1y', clipped: true});
  });
  test('each moment: what was held then times its last observed price; before any price a gap, holding nothing a zero', () => {
    const start = dayStart('2026-01-31'), end = dayStart('2026-03-02');
    const prices = new Map([[BTC, [{at: dayStart('2026-02-10'), price: '150'}, {at: dayStart('2026-03-01'), price: '400'}]]]);
    const {points, complete} = valueSeries({transactions: btc}, prices, {start, end, steps: 30});
    expect(points).toHaveLength(31);
    // Held 1 BTC from 1 January but no price before 10 February: a gap, never a guess.
    expect(points[0]).toEqual({at: start, value: null});
    expect(points.find(p => p.at === dayStart('2026-02-10'))!.value).toBe('300');
    expect(points.at(-1)).toEqual({at: end, value: '600'});
    expect(complete).toBe(false);
    expect(valueSeries({transactions: btc}, prices, {start: dayStart('2025-12-01'), end: dayStart('2025-12-02'), steps: 1}).points.map(p => p.value)).toEqual(['0', '0']);
  });
  test('the coins a window needs: held now, moved in it, or held when it starts', () => {
    expect(coinsInWindow({transactions: [...btc, ...sol]}, dayStart('2026-02-01'))).toEqual([BTC]);
    expect(coinsInWindow({transactions: [...btc, ...sol]}, dayStart('2026-01-15'))).toEqual([BTC, SOL]);
  });
});
