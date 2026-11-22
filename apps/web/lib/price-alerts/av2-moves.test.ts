import {describe, expect, test} from 'vitest';
import {addMoveAlert, addPortfolioMove, checkMoveAlerts, checkPortfolioMoves, removeMove, type MoveAlert, type PortfolioMove} from './moves';
import {alertsForToday, anyActive, markSeen} from './engine';
import {emptyPriceAlerts, priceAlertsSchema} from './schema';
import {forResults, setCounted, uncountedOf} from '../portfolio/counted';
import {portfolioOn, priceAt, timeMachineBounds} from '../portfolio/time-machine';
import {allTimeResult} from '../portfolio/performance';
import {portfolioTotals} from '../portfolio/math';
import {emptyReceipts} from '../portfolio/receipts';
import type {PortfolioTransaction} from '../portfolio/schema';
import {av2MoneyAnswer} from '../ai/local-answers/av2-money';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';

/** Session AV lane 2 (money; CoinStats): 24 h move alerts, portfolio percent alerts, "count in results", the Time Machine. */
const AT = '2026-11-14T10:00:00.000Z';
const move = (more: Partial<MoveAlert> = {}): MoveAlert => ({id: 'alert_move-0001', coin: 'bitcoin', coinName: 'Bitcoin', currency: 'EUR', percent: 5, direction: 'either', createdAt: AT, active: true, ...more});
const pmove = (more: Partial<PortfolioMove> = {}): PortfolioMove => ({id: 'alert_pmove-0001', portfolioId: 'p1', portfolioName: 'Long term', currency: 'EUR', percent: 10, direction: 'down', base: '10000', createdAt: AT, active: true, ...more});

describe('a coin moving a percent within 24 hours', () => {
  test('either way, up, down; once a day while the move lasts; on Today until seen', () => {
    let r = addMoveAlert(emptyPriceAlerts(), move());
    expect(() => addMoveAlert(r, move({id: 'alert_move-0002'}))).toThrow('already set');
    expect(() => addMoveAlert(r, move({id: 'alert_move-0003', percent: 95}))).toThrow('1 to 90');
    expect(anyActive(r)).toBe(true);
    expect(checkMoveAlerts(r, () => '3.9', AT).fired).toEqual([]);
    const out = checkMoveAlerts(r, () => '-6.25', AT);
    expect(out.fired[0]!.text).toBe('Bitcoin moved -6.3% in 24 h in EUR (your alert: 5% up or down).');
    r = out.record;
    expect(r.moves![0]).toMatchObject({active: true, firedAt: AT});
    expect(alertsForToday(r).fresh.map(f => f.line)).toEqual(['Bitcoin moved -6.3% in 24 h in EUR (your alert: 5% up or down).']);
    expect(checkMoveAlerts(r, () => '-8', '2026-11-14T20:00:00.000Z').fired).toEqual([]);
    r = markSeen(r, '2026-11-14T11:00:00.000Z');
    expect(alertsForToday(r).fresh).toEqual([]);
    const again = checkMoveAlerts(r, () => '-8', '2026-11-15T11:00:00.000Z');
    expect(again.fired).toHaveLength(1);
    expect(again.record.moves![0]!.seenAt).toBeUndefined();
    expect(checkMoveAlerts(addMoveAlert(emptyPriceAlerts(), move({direction: 'up'})), () => '-9', AT).fired).toEqual([]);
    expect(checkMoveAlerts(addMoveAlert(emptyPriceAlerts(), move({direction: 'down'})), () => null, AT).fired).toEqual([]);
    expect(priceAlertsSchema.parse(again.record)).toEqual(again.record);
  });
  test('a portfolio worth a percent less than when the alert was set fires once', () => {
    let r = addPortfolioMove(emptyPriceAlerts(), pmove());
    expect(() => addPortfolioMove(emptyPriceAlerts(), pmove({id: 'alert_pmove-0002', base: '0'}))).toThrow('no full value');
    expect(checkPortfolioMoves(r, () => '9500', AT).fired).toEqual([]);
    expect(checkPortfolioMoves(r, () => null, AT).fired).toEqual([]);
    const out = checkPortfolioMoves(r, () => '8900.40', AT);
    // Session AV lane 2 (review b2a #7: amounts through the app's money formatter, deliberate)
    expect(out.fired[0]!.text).toBe('Long term is worth -11% from €10,000.00: €8,900.40 now.');
    r = out.record;
    expect(r.portfolioMoves![0]!.active).toBe(false);
    expect(checkPortfolioMoves(r, () => '5000', AT).fired).toEqual([]);
    expect(removeMove(r, 'alert_pmove-0001').portfolioMoves).toBeUndefined();
  });
});

const tx = (id: string, date: string, kind: PortfolioTransaction['kind'], quantity: string, price?: string): PortfolioTransaction => ({id, coin: 'coingecko:coin:bitcoin', kind, quantity, date, ...(price ? {price} : {})} as PortfolioTransaction);
describe('count in results', () => {
  const p = {transactions: [tx('t1', '2026-01-05', 'buy', '1', '30000'), tx('t2', '2026-03-01', 'transfer-in', '0.5', '40000'), tx('t3', '2026-06-01', 'sell', '0.4', '50000')]};
  test('a gift left out: the cost and results without it, the holdings with it', () => {
    let r = setCounted(emptyReceipts(), p, 't2', false);
    expect(r.uncounted).toEqual(['t2']);
    const counted = forResults(p, uncountedOf(r)), price = () => '60000';
    expect(portfolioTotals(p, price).knownValue).toBe('66000');
    expect(portfolioTotals(counted, price)).toMatchObject({knownValue: '36000', cost: '18000', unrealized: '18000'});
    expect(allTimeResult(counted, price).realized).toBe('8000');
    r = setCounted(r, p, 't2', true);
    expect(r.uncounted).toBeUndefined();
  });
  test('refused when a later sale needs its coins', () => {
    expect(() => setCounted(emptyReceipts(), {transactions: [tx('t1', '2026-01-05', 'buy', '1', '30000'), tx('t3', '2026-06-01', 'sell', '0.4', '50000')]}, 't1', false)).toThrow('cannot be left out');
  });
});

describe('the Time Machine', () => {
  test('what was held at the end of a day, valued with the last price within two days', () => {
    const p = {transactions: [tx('t1', '2026-01-05', 'buy', '1', '30000'), tx('t3', '2026-06-01', 'sell', '0.4', '50000')]};
    const day = (d: string) => Date.parse(`${d}T12:00:00Z`), prices = new Map([['coingecko:coin:bitcoin', [{at: day('2026-05-30'), price: '48000'}, {at: day('2026-06-01'), price: '50000'}]]]);
    expect(portfolioOn(p, '2026-05-31', prices)).toMatchObject({total: '48000', cost: '30000', result: '18000', unpriced: 0, rows: [{quantity: '1', price: '48000'}]});
    expect(portfolioOn(p, '2026-06-01', prices)).toMatchObject({total: '30000', rows: [{quantity: '0.6'}]});
    expect(portfolioOn(p, '2026-06-10', prices)).toMatchObject({unpriced: 1, rows: [{quantity: '0.6'}]});
    expect(portfolioOn(p, '2026-06-10', prices).total).toBeUndefined();
    expect(portfolioOn(p, '2025-12-31', prices).rows).toEqual([]);
    expect(priceAt([], 0)).toBeUndefined();
    expect(timeMachineBounds(p, '2026-11-14', Date.parse('2026-11-14T12:00:00Z'))).toEqual({min: '2026-01-05', max: '2026-11-14'});
  });
});

describe('answers', () => {
  const text = (q: string, s = showcaseAll()) => { const r = av2MoneyAnswer(q, zigiEnv(s)); return r && 'text' in r ? r.text : ''; };
  test('move alerts and the Time Machine, EN and NL', () => {
    expect(text('which move alerts do I have')).toContain('No move alert is set');
    const s = showcaseAll(); s.ak = {...s.ak, priceAlerts: {...emptyPriceAlerts(), moves: [move()], portfolioMoves: [pmove()]}};
    expect(text('which move alerts do I have', s)).toBe('Bitcoin: 5% up or down within 24 h in EUR. Long term: worth 10% down from 10000 EUR. Checked with the market figures this app already reads; information, not advice.');
    expect(text('welke bewegingsalarmen heb ik', s)).toMatch(/^Bitcoin: 5% omhoog of omlaag binnen 24 uur in EUR\./);
    expect(text('what was my portfolio worth a month ago')).toContain('On a past day');
    expect(text('wat was mijn portefeuille vorige maand waard')).toContain('On a past day');
  });
});
