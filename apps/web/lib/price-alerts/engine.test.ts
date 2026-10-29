import {expect, test} from 'vitest';
import type {MarketQuote} from '../market-quotes';
import {addAlert, checkPriceAlerts, markSeen, removeAlert, unseen} from './engine';
import {emptyPriceAlerts, priceAlertsSchema, type PriceAlert} from './schema';

// Session AJ (item 15, WE17/J11; D9).
const AT = '2026-10-29T10:00:00.000Z';
const quote = (price: string, priceDecimals: number, providerAssetId = 'bitcoin', currency = 'USD'): MarketQuote => ({base: {kind: 'coin', id: providerAssetId} as never, currency, price, priceDecimals, source: 'CoinGecko', providerAssetId, observedAt: AT, fetchedAt: AT, verification: 'VERIFIED'} as unknown as MarketQuote);
const above = (price: string): PriceAlert => ({id: `alert_${price.replace('.', '-')}-aaaaaaaa`, kind: 'price', coin: 'bitcoin', coinName: 'Bitcoin', currency: 'USD', direction: 'above', price, createdAt: AT, active: true, channels: {inApp: true, push: false}});
test('a price alert fires once when the quote crosses its figure, exactly; then it is off', () => {
  let r = addAlert(emptyPriceAlerts(), above('100000'));
  expect(checkPriceAlerts(r, [quote('9999999', 2)], AT).fired).toEqual([]); // 99,999.99 is below
  const out = checkPriceAlerts(r, [quote('10000000', 2)], AT); // exactly 100,000.00
  expect(out.fired.map(f => f.text)).toEqual(['Bitcoin is above 100000 USD: 100000 USD (CoinGecko).']);
  r = out.record;
  expect(r.alerts[0]).toMatchObject({active: false, firedAt: AT});
  expect(r.fired).toEqual([{alertId: r.alerts[0]!.id, at: AT, text: out.fired[0]!.text}]);
  expect(checkPriceAlerts(r, [quote('20000000', 2)], AT).fired).toEqual([]);
  expect(unseen(r)).toHaveLength(1);
  expect(unseen(markSeen(r, AT))).toHaveLength(0);
});
test('below; another currency or coin never fires it; no quote, no firing', () => {
  const below = {...above('50000.5'), id: 'alert_below-aaaaaaaa', direction: 'below' as const};
  const r = addAlert(emptyPriceAlerts(), below);
  expect(checkPriceAlerts(r, [quote('4000000', 2, 'bitcoin', 'EUR'), quote('1', 0, 'ethereum')], AT).fired).toEqual([]);
  expect(checkPriceAlerts(r, [], AT).fired).toEqual([]);
  expect(checkPriceAlerts(r, [quote('5005000', 2)], AT).fired).toEqual([]); // 50,050.00 is not below 50,000.5
  expect(checkPriceAlerts(r, [quote('5000050', 2)], AT).fired).toHaveLength(1); // 50,000.50 is at it: fires
});
test('a goal alert fires when the goal reaches its percent with the prices already read', () => {
  const g: PriceAlert = {id: 'alert_goal-aaaaaaaa', kind: 'goal', coin: 'bitcoin', coinName: 'Bitcoin', currency: 'USD', goalId: '7', goalName: 'Emergency fund', percent: 75, createdAt: AT, active: true, channels: {inApp: true, push: false}};
  const r = addAlert(emptyPriceAlerts(), g);
  expect(checkPriceAlerts(r, [], AT, () => 74.9).fired).toEqual([]);
  expect(checkPriceAlerts(r, [], AT, () => null).fired).toEqual([]);
  expect(checkPriceAlerts(r, [], AT, () => 80.2).fired[0]!.text).toBe('Bitcoin puts “Emergency fund” at 80% (your alert: 75%).');
});
test('the record: twins refused, 50 at most, push never on, loose and versioned', () => {
  const r = addAlert(emptyPriceAlerts(), above('1'));
  expect(() => addAlert(r, {...above('1'), id: 'alert_other-aaaaaaaa'})).toThrow('already set');
  expect(removeAlert(r, r.alerts[0]!.id).alerts).toEqual([]);
  expect(priceAlertsSchema.parse({...r, later: true}).later).toBe(true);
  expect(r.alerts[0]!.channels.push).toBe(false);
  expect(() => addAlert(emptyPriceAlerts(), {...above('1'), price: undefined})).toThrow();
});
