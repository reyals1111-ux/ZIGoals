// Session AL (lane L1, second pass, step 6): guards for positives the Tokyo bot confirmed (keep-list), so they stay true.
import {expect, it} from 'vitest';
import {compound, DEFAULT_INPUT} from './compound/engine';
import {parseAmountInput} from './amount-input';
import {searchMarketAssets} from './market-assets';
import {FEATURED_MARKETS} from './product-insights';
import {buyAsset} from './onramps/assets';
import {addAccount, moneyText, netWorthTotal, recordBalance} from './accounts/net-worth';
import {emptyAccounts} from './accounts/schema';

it('keep TK-218/C1: 1,000 at 5.29 % for 3 years, added monthly, is $1,171.58', () => {
  const r = compound({...DEFAULT_INPUT, start: '1000', contribution: '0', ratePercent: 5.29, years: 3, compounding: 'monthly'});
  expect(r.final).toBe('1171.58');
});

it('keep TK-140: an account balance reads "1,5" as 1.50 and refuses a negative or letters', () => {
  expect(parseAmountInput('1,5', 2)).toBe(150n);
  expect(() => parseAmountInput('-50', 2)).toThrow();
  expect(() => parseAmountInput('abc', 2)).toThrow();
  expect(parseAmountInput('999999999999', 2)).toBe(99999999999900n);
});

it('keep TK-001/TK-206 (M1): "BTC" finds Bitcoin first', () => {
  expect(searchMarketAssets('BTC', FEATURED_MARKETS)[0]!.name).toBe('Bitcoin');
  expect(searchMarketAssets('btc', FEATURED_MARKETS)[0]!.name).toBe('Bitcoin');
});

it('keep TK-158: Add money suggests Base for USDC (the cheap network)', () => {
  expect(buyAsset('usdc')!.recommended).toBe('base');
});

it('keep TK-006/TK-125/TK-197: net worth is per currency, exact, never converted', () => {
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'], at = '2026-11-04T10:00:00.000Z', on = '2026-11-04';
  let a = addAccount(emptyAccounts(), {id: ids[0]!, kind: 'savings', name: 'Savings', currency: 'EUR'}, at);
  a = addAccount(a, {id: ids[1]!, kind: 'mortgage', name: 'Mortgage', currency: 'EUR'}, at);
  a = addAccount(a, {id: ids[2]!, kind: 'cash', name: 'USD cash', currency: 'USD'}, at);
  a = recordBalance(a, ids[0]!, {value: 150050n, decimals: 2, date: on}, at);
  a = recordBalance(a, ids[1]!, {value: 1200000n, decimals: 2, date: on}, at);
  a = recordBalance(a, ids[2]!, {value: 50000n, decimals: 2, date: on}, at);
  const rows = netWorthTotal(a, on, [{name: 'House', currency: 'EUR', value: 35000000n}]).rows;
  const eur = rows.find(r => r.currency === 'EUR')!, usd = rows.find(r => r.currency === 'USD')!;
  expect(moneyText(eur.net)).toBe('339500.50'); // 1,500.50 + 350,000 − 12,000
  expect(moneyText(usd.net)).toBe('500.00');
  expect(rows).toHaveLength(2);
});
