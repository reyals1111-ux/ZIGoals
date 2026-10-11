import {describe, expect, it} from 'vitest';
import {PORTFOLIO_KEY, coinKey, emptyPortfolioData, portfolioDataSchema, type PortfolioData, type PortfolioTransaction} from './schema';
import {HoldingsBelowZero, holdings, portfolioTotals, readDecimal, valueHolding} from './math';
import {PortfolioUnreadable, addTransaction, createPortfolio, exportPortfolios, parsePortfolioImport, readPortfolios, removeTransaction, updatePortfolios} from './store';
import {SHOWCASE_PRICES, showcasePortfolios} from './showcase';

// Session I, Part 11: Portfolio, kept on this device (zigoals:portfolio:v1), with exact average-cost arithmetic.
const BTC = {ref: {provider: 'coingecko' as const, kind: 'coin' as const, id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'};
const ETH = {ref: {provider: 'coingecko' as const, kind: 'coin' as const, id: 'ethereum'}, name: 'Ethereum', symbol: 'ETH'};
const btc = coinKey(BTC.ref), eth = coinKey(ETH.ref);
let n = 0;
const tx = (kind: PortfolioTransaction['kind'], quantity: string, date: string, price?: string, fee?: string, coin = btc): PortfolioTransaction => ({id: `tx-${++n}`, coin, kind, quantity, date, note: '', createdAt: `${date}T10:00:00.000Z`, ...(price === undefined ? {} : {price}), ...(fee === undefined ? {} : {fee})});
const portfolio = (transactions: PortfolioTransaction[]) => ({transactions});
const memory = (entries: Record<string, string> = {}) => { const map = new Map(Object.entries(entries)); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map}; };

describe('average-cost basis', () => {
  it('adds buys with their fees, and a sale keeps the average cost of what remains', () => {
    const p = portfolio([tx('buy', '1', '2026-01-01', '100', '1'), tx('buy', '1', '2026-02-01', '200'), tx('sell', '1', '2026-03-01', '300', '2')]);
    expect(holdings(p).get(btc)).toEqual({coin: btc, quantity: '1', cost: '150.5', averageCost: '150.5', transactions: 3});
  });
  it('partial sells are exact, with no float error', () => {
    const p = portfolio([tx('buy', '0.3', '2026-01-01', '0.1'), tx('sell', '0.1', '2026-01-02', '0.2')]);
    expect(holdings(p).get(btc)).toMatchObject({quantity: '0.2', cost: '0.02', averageCost: '0.1'});
  });
  it('value and unrealized result need a known price; the result also needs a known cost', () => {
    const held = holdings(portfolio([tx('buy', '2', '2026-01-01', '100')])).get(btc)!;
    expect(valueHolding(held)).toEqual({});
    expect(valueHolding(held, '125')).toEqual({value: '250', unrealized: '50', unrealizedPct: '25'});
    const transferred = holdings(portfolio([tx('buy', '1', '2026-01-01', '100'), tx('transfer-in', '1', '2026-01-02')])).get(btc)!;
    expect(transferred.cost).toBeUndefined();
    expect(valueHolding(transferred, '125')).toEqual({value: '250'});
  });
  it('a holding back at zero starts again with a known cost', () => {
    const p = portfolio([tx('transfer-in', '1', '2026-01-01'), tx('transfer-out', '1', '2026-01-02'), tx('buy', '2', '2026-01-03', '50')]);
    expect(holdings(p).get(btc)).toMatchObject({quantity: '2', cost: '100', averageCost: '50'});
  });
  it('refuses a history that goes below zero at any point, in date order', () => {
    expect(() => holdings(portfolio([tx('sell', '1', '2026-01-01', '10'), tx('buy', '1', '2026-01-02', '10')]))).toThrow(HoldingsBelowZero);
    expect(() => holdings(portfolio([tx('buy', '1', '2026-01-01', '10'), tx('transfer-out', '1.000000000000000001', '2026-01-02')]))).toThrow(HoldingsBelowZero);
  });
  it('totals count coins without a price instead of valuing them at zero', () => {
    const p = portfolio([tx('buy', '1', '2026-01-01', '100'), tx('buy', '10', '2026-01-01', '2', undefined, eth)]);
    expect(portfolioTotals(p, coin => coin === btc ? '150' : undefined)).toMatchObject({knownValue: '150', unpriced: 1, held: 2, unrealized: undefined});
    expect(portfolioTotals(p, coin => coin === btc ? '150' : '3')).toMatchObject({knownValue: '180', unpriced: 0, cost: '120', unrealized: '60', unrealizedPct: '50'});
  });
});

describe('typed amounts', () => {
  it('reads a decimal comma, refuses an ambiguous one with a reason, and rejects other text', () => {
    expect(readDecimal(' 0,5 ')).toBe('0.5');
    expect(readDecimal('65000')).toBe('65000');
    expect(() => readDecimal('1,234')).toThrow(/could mean 1234 or 1.234/);
    expect(readDecimal('-1')).toBeNull();
    expect(readDecimal('1e3')).toBeNull();
  });
});

describe('device storage', () => {
  const created = (data = emptyPortfolioData()) => createPortfolio(data, {id: 'p1', name: ' Fictional coins ', kind: 'real', currency: 'USD', createdAt: '2026-01-01T00:00:00.000Z'});
  it('starts empty, writes only its own key, and refuses a sale before a buy', () => {
    const storage = memory({'zigoals:platform:v1': '{"untouched":true}'});
    expect(readPortfolios(storage)).toEqual({data: emptyPortfolioData(), unreadable: false});
    let data = updatePortfolios(storage, created);
    data = updatePortfolios(storage, d => addTransaction(d, 'p1', BTC, {id: 't1', kind: 'buy', quantity: '1', price: '100', date: '2026-01-02', note: '', createdAt: '2026-01-02T00:00:00.000Z'}));
    expect(data.portfolios[0]).toMatchObject({name: 'Fictional coins', coins: [BTC]});
    expect(() => updatePortfolios(storage, d => addTransaction(d, 'p1', BTC, {id: 't2', kind: 'sell', quantity: '2', price: '100', date: '2026-01-03', note: '', createdAt: '2026-01-03T00:00:00.000Z'}))).toThrow(HoldingsBelowZero);
    // Removing the buy would leave nothing for a later sale: refused too.
    updatePortfolios(storage, d => addTransaction(d, 'p1', BTC, {id: 't3', kind: 'sell', quantity: '1', price: '120', date: '2026-01-04', note: '', createdAt: '2026-01-04T00:00:00.000Z'}));
    expect(() => updatePortfolios(storage, d => removeTransaction(d, 'p1', 't1'))).toThrow(HoldingsBelowZero);
    expect([...storage.map.keys()].sort()).toEqual(['zigoals:platform:v1', PORTFOLIO_KEY]);
    expect(storage.map.get('zigoals:platform:v1')).toBe('{"untouched":true}');
  });
  it('damaged data reads as unreadable and is never overwritten unless the reader chooses to', () => {
    const storage = memory({[PORTFOLIO_KEY]: '{"version":1,"portfolios":[{"id":"x"}]}'});
    expect(readPortfolios(storage).unreadable).toBe(true);
    expect(() => updatePortfolios(storage, created)).toThrow(PortfolioUnreadable);
    expect(storage.map.get(PORTFOLIO_KEY)).toBe('{"version":1,"portfolios":[{"id":"x"}]}');
    updatePortfolios(storage, created, {replaceUnreadable: true});
    expect(readPortfolios(storage).data.portfolios).toHaveLength(1);
  });
  it('a buy or sell needs its price; amounts must be plain positive decimals', () => {
    const base: PortfolioData = created();
    expect(portfolioDataSchema.safeParse(addTransaction(base, 'p1', BTC, {id: 't', kind: 'buy', quantity: '1', date: '2026-01-02', note: '', createdAt: '2026-01-02T00:00:00.000Z'})).success).toBe(false);
    for (const quantity of ['0', '-1', '1e3', '01', '1.']) expect(portfolioDataSchema.safeParse(addTransaction(base, 'p1', BTC, {id: 't', kind: 'transfer-in', quantity, date: '2026-01-02', note: '', createdAt: '2026-01-02T00:00:00.000Z'})).success, quantity).toBe(false);
  });
});

describe('export and import', () => {
  it('round-trips exactly and refuses other files with a reason, changing nothing', () => {
    const data = showcasePortfolios('2026-10-01');
    expect(parsePortfolioImport(exportPortfolios(data))).toEqual(data);
    expect(() => parsePortfolioImport('{"kind":')).toThrow(/not a ZIGoals Portfolio export/);
    expect(() => parsePortfolioImport('{"kind":"zigoals-habits"}')).toThrow(/not a ZIGoals Portfolio export/);
    expect(() => parsePortfolioImport('{"kind":"zigoals-portfolio","version":1,"portfolios":[{"id":1}]}')).toThrow(/incomplete or damaged/);
    expect(() => parsePortfolioImport(`{"kind":"zigoals-portfolio","pad":"${'x'.repeat(2_000_001)}"}`)).toThrow(/2 MB/);
    const broken = structuredClone(data); broken.portfolios[0]!.transactions[4]!.quantity = '100';
    expect(() => parsePortfolioImport(exportPortfolios(broken))).toThrow(/sale before its coins came in/);
  });
});

describe('Showcase', () => {
  it('is valid, fictional, priced only by its own fixture, and valued exactly', () => {
    const data = portfolioDataSchema.parse(showcasePortfolios('2026-10-01'));
    expect(data.portfolios[0]!.name).toMatch(/Fictional/);
    const totals = portfolioTotals(data.portfolios[0]!, coin => SHOWCASE_PRICES[coin]);
    // 0.07 BTC × 65000 + 1 ETH × 2400 + 10 SOL × 150; SOL arrived by transfer, so the result stays unknown.
    expect(totals).toMatchObject({knownValue: '8450', unpriced: 0, costKnown: false, unrealized: undefined});
  });
});
