'use client';
import {useMemo, useState} from 'react';
import {formatUnits} from '@zigoals/chain-config';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {useMarketInsights} from '../platform/use-market-insights';
import {useMarketDetails} from '../platform/use-market-detail';
import {marketRequestKey} from '../../lib/market-assets';
import {quoteIsStale} from '../../lib/market-quotes';
import {referenceQuote} from '../../lib/product-insights';
import {DETAIL_NOT_PROVIDED, amountText} from '../../lib/market-detail';
import {coinKey, type PortfolioCoin, type PortfolioCurrency} from '../../lib/portfolio/schema';
import {SHOWCASE_PRICES, showcaseMarket} from '../../lib/portfolio/showcase';

export type Price = {value: string; source: string; at?: string; stale: boolean};
export type Sizes = {marketCap: string | null; volume24h: string | null; circulatingSupply: string | null; totalSupply: string | null; maxSupply: string | null};
/** What Portfolio knows about one coin's market. `details` says where the sizes and 1h/7d come from, or why they are missing. */
export type CoinMarket = {price?: Price; change1h: string | null; change24h: string | null; change7d: string | null; sparkline: {value: string; decimals: number}[] | null; logoUrl: string | null; sizes: Sizes | null; observedAt: string | null; details: 'live' | 'stale' | 'showcase' | 'loading' | 'unavailable' | 'not-provided'};
const NONE: Sizes = {marketCap: null, volume24h: null, circulatingSupply: null, totalSupply: null, maxSupply: null};

/**
 * Session W Part 15: one page-level read of the market for a portfolio's coins in its currency: quotes, insights (24h
 * change, 7-day line, logo) and details (1h/7d change, sizes), each batched and labelled when stale. The Showcase asks
 * nothing: its labelled fixture market answers instead (USD only, like its fixture prices).
 */
export function usePortfolioMarket(coins: readonly PortfolioCoin[], currency: PortfolioCurrency, showcase: boolean, enabled = true) {
  const live = enabled && !showcase && coins.length > 0, refs = useMemo(() => live ? coins.map(c => c.ref) : [], [live, coins]);
  const requests = useMemo(() => refs.map(marketRef => ({marketRef, currency})), [refs, currency]);
  const market = useMarketQuotes(requests.length ? requests : false), insights = useMarketInsights(refs, currency), details = useMarketDetails(refs, currency);
  // The Showcase's fixture line is drawn to the moment the page opened; live data ages by the quotes' own clock.
  const [opened] = useState(() => Date.now()), now = market.now || opened;
  function of(coin: PortfolioCoin): CoinMarket {
    const key = coinKey(coin.ref);
    if (showcase) {
      const fixture = currency === 'USD' ? showcaseMarket(key, opened) : undefined, value = currency === 'USD' ? SHOWCASE_PRICES[key] : undefined;
      return {price: value ? {value, source: 'Showcase fixture price', stale: false} : undefined, change1h: fixture?.change1h ?? null, change24h: fixture?.change24h ?? null, change7d: fixture?.change7d ?? null, sparkline: fixture?.sparkline ?? null, logoUrl: null, sizes: fixture ? {marketCap: fixture.marketCap, volume24h: fixture.volume24h, circulatingSupply: fixture.circulatingSupply, totalSupply: fixture.totalSupply, maxSupply: fixture.maxSupply} : null, observedAt: null, details: 'showcase'};
    }
    const quote = referenceQuote(coin.ref, currency, market.quotes, now), requestKey = marketRequestKey({marketRef: coin.ref, currency});
    const insight = insights.results[requestKey]?.insight ?? null, result = details.results[requestKey], detail = result?.detail ?? null;
    const sizes: Sizes | null = detail ? {marketCap: detail.marketCap && amountText(detail.marketCap), volume24h: detail.volume24h && amountText(detail.volume24h), circulatingSupply: detail.circulatingSupply && amountText(detail.circulatingSupply), totalSupply: detail.totalSupply && amountText(detail.totalSupply), maxSupply: detail.maxSupply && amountText(detail.maxSupply)} : null;
    const state: CoinMarket['details'] = detail ? (result!.stale ? 'stale' : 'live') : !result ? (details.loading ? 'loading' : 'unavailable') : result.error === DETAIL_NOT_PROVIDED ? 'not-provided' : details.loading ? 'loading' : 'unavailable';
    return {
      price: quote ? {value: formatUnits(quote.price, quote.priceDecimals), source: quote.source, at: quote.observedAt ?? quote.fetchedAt, stale: quoteIsStale(quote, now)} : undefined,
      change1h: detail?.change1h ?? null, change24h: insight?.change24h ?? detail?.change24h ?? null, change7d: detail?.change7d ?? null,
      sparkline: insight?.sparkline?.prices ?? null, logoUrl: insight?.logoUrl ?? null, sizes: sizes ?? (state === 'not-provided' ? NONE : null), observedAt: detail?.observedAt ?? null, details: state,
    };
  }
  return {of, loading: market.loading || details.loading, priced: market.quotes.length > 0, refresh: () => { void market.refresh(); void insights.refresh(); void details.refresh(); }};
}
