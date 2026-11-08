'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {usePortfolios} from '../portfolio/use-portfolios';
import {useMarketQuotes} from './use-market-quotes';
import {portfolioResultsFor} from '../../lib/portfolio/wealth-result';
import {priceText, quoteFor} from '../../lib/price-alerts/engine';
import {PORTFOLIO_CURRENCIES, type PortfolioCurrency} from '../../lib/portfolio/schema';
import {formatExactNumber, formatMoney, formatPercent} from '../../lib/visual-format';
import type {MarketAssetRef} from '../../lib/market-assets';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-025, C-TK-11): on a coin's Wealth page, its gain or loss from what Portfolio
 * recorded it cost (lib/portfolio/wealth-result.ts): each real portfolio that holds the coin, in its own currency, at the
 * current price. Read-only; nothing is stored, converted or added up. An estimate at today's price, information only.
 * Renders nothing when no real portfolio holds the coin (and in the Showcase, whose portfolio is fictional).
 */
export default function AssetPortfolioResult({marketRef, symbol}: {marketRef: MarketAssetRef; symbol: string}) {
  const portfolios = usePortfolios();
  const held = useMemo(() => portfolios.loaded && !portfolios.showcase && !portfolios.unreadable ? portfolioResultsFor(portfolios.data, marketRef, () => undefined) : [], [portfolios, marketRef]);
  const currencies = useMemo(() => PORTFOLIO_CURRENCIES.filter(c => held.some(r => r.currency === c)), [held]);
  const market = useMarketQuotes(currencies.length ? currencies.map(currency => ({marketRef, currency})) : false);
  if (!held.length) return null;
  const priceOf = (currency: PortfolioCurrency) => { const q = quoteFor(market.quotes, marketRef.id, currency); return q ? priceText(q) : undefined; };
  const rows = portfolioResultsFor(portfolios.data, marketRef, priceOf);
  const signed = (value: string, currency: string) => `${value.startsWith('-') ? '−' : '+'}${formatMoney(value.replace(/^-/, ''), currency)}`;
  return <section className="panel asset-portfolio-result" aria-labelledby="asset-portfolio-result-title">
    <p className="eyebrow">GAIN OR LOSS · FROM PORTFOLIO</p>
    <h2 id="asset-portfolio-result-title">What your {symbol} cost, and what it is worth</h2>
    <ul>{rows.map(r => <li key={r.portfolioId}>
      <strong>{r.name}</strong>: {formatExactNumber(r.quantity)} {symbol}
      {r.cost === undefined ? <>, cost unknown (a transfer in had no price, so no gain or loss is shown)</> : <>, cost {formatMoney(r.cost, r.currency)}{r.averageCost && <> (average {formatMoney(r.averageCost, r.currency)} per {symbol})</>}</>}
      {r.value === undefined ? <>. No current price in {r.currency} just now.</> : <>; worth {formatMoney(r.value, r.currency)} now{r.unrealized !== undefined && <>: <strong>{signed(r.unrealized, r.currency)}{r.unrealizedPct !== undefined && ` (${formatPercent(Number(r.unrealizedPct), {decimals: 1, signed: true})})`}</strong></>}.</>}
    </li>)}</ul>
    <p className="fine">From the buys and sells you recorded in <Link className="text-link" href="/app/portfolio">Portfolio</Link>, in each portfolio&rsquo;s own currency, at the current market price: an estimate, not realised, and information only. Wealth counts this asset by its own quantity, which can differ from Portfolio&rsquo;s.</p>
  </section>;
}
