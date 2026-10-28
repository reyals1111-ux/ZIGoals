import {describe, expect, test} from 'vitest';
import {holdingsOf, moneyText, netWorth, netWorthTotal} from '../../accounts/net-worth';
import {emptyAccounts} from '../../accounts/schema';
import type {MarketQuote} from '../../market-quotes';
import {wealthOverview} from '../../wealth';
import {toolEnv} from './env';
import {gatesFor, showcaseSources, withPortfolios} from './fixtures';
import {runTool} from './registry';

/**
 * Session AI (ZI3, G7): ZIGi's numbers are the pages' numbers. The Wealth page's accounts section computes net worth as
 * `netWorthTotal(accounts, today, holdingsOf(wealthOverview(platform, now, quotes).rows))`; ZIGi's `net_worth` tool must
 * give the same per-currency totals for the same records and quotes, including a coin priced by a live quote (the
 * older `netWorth` left live-priced coins out: Grok's "wrong net worth", N-066/B-002).
 */
describe('ZIGi\'s net worth is the page\'s net worth', () => {
  const base = withPortfolios(showcaseSources());
  const btc = base.platform.positions.find(p => p.asset === 'BTC' && !p.archivedAt);
  test('the Showcase has a BTC holding to price', () => expect(btc).toBeTruthy());
  const at = base.now.toISOString();
  const quote = {base: {network: btc!.network, denom: btc!.denom, decimals: btc!.decimals}, ...(btc!.marketRef ? {marketRef: btc!.marketRef} : {}), currency: btc!.quoteCurrency ?? 'USD', price: '6200000', priceDecimals: 2, source: 'CoinGecko', providerAssetId: btc!.marketRef?.id ?? 'bitcoin', observedAt: at, fetchedAt: at, verification: 'VERIFIED'} as unknown as MarketQuote;
  const sources = {...base, quotes: [quote]};
  const env = toolEnv(sources, gatesFor(true, 'wealth'), 'local');
  const accounts = sources.accounts ?? emptyAccounts();
  const page = netWorthTotal(accounts, sources.habitDay, holdingsOf(wealthOverview(sources.platform, sources.now.getTime(), sources.quotes).rows));
  test('the same total per currency as the Wealth page', () => {
    const result = runTool('net_worth', {}, env) as unknown as {ok: true; data: {perCurrency: {currency: string; netWorth: string}[]}};
    expect(result.ok).toBe(true);
    expect(result.data.perCurrency.map(r => [r.currency, r.netWorth])).toEqual(page.rows.map(r => [r.currency, `${moneyText(r.net)} ${r.currency}`]));
  });
  test('a live-priced coin counts (the older total left it out)', () => {
    const older = netWorth(accounts, sources.habitDay, sources.platform.positions);
    const usd = (rows: {currency: string; net: {value: bigint; decimals: number}}[]) => rows.find(r => r.currency === 'USD');
    // The BTC holding is priced live by the quote, so the page's total is larger than the older one.
    const priced = wealthOverview(sources.platform, sources.now.getTime(), sources.quotes).rows.some(r => r.position.id === btc!.id && r.value !== undefined && r.source === 'CoinGecko');
    expect(priced).toBe(true);
    expect(moneyText(usd(page.rows)!.net)).not.toBe(moneyText(usd(older.rows)!.net));
  });
});
