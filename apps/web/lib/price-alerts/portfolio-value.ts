import {formatUnits} from '@zigoals/chain-config';
import {quoteIsStale, type MarketQuote} from '../market-quotes';
import {referenceQuote} from '../product-insights';
import {portfolioTotals} from '../portfolio/math';
import {coinKey, type Portfolio} from '../portfolio/schema';

/**
 * Session AV (fresh-agent check q2, rank 35; CoinStats checks a portfolio's value whenever prices move): a portfolio's
 * whole value from the prices this app has read, as its own page counts it (portfolioTotals with each coin's reference
 * quote in the portfolio's currency) — or null when anything held has no price or a stale one, so an unknown value never
 * fires an alert. Pure; read by the app-wide alert check (components/price-alerts/price-alerts.tsx).
 */
export function portfolioValueNow(portfolio: Portfolio, quotes: readonly MarketQuote[], now: number): string | null {
  const prices = new Map<string, {value: string; stale: boolean}>();
  for (const c of portfolio.coins) { const q = referenceQuote(c.ref, portfolio.currency, quotes, now); if (q) prices.set(coinKey(c.ref), {value: formatUnits(q.price, q.priceDecimals), stale: quoteIsStale(q, now)}); }
  let stale = false;
  const totals = portfolioTotals(portfolio, coin => { const p = prices.get(coin); if (p?.stale) stale = true; return p?.value; });
  return totals.held > 0 && totals.unpriced === 0 && !stale ? totals.knownValue : null;
}
