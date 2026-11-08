import {coinKey, type PortfolioCurrency, type PortfolioData} from './schema';
import {holdings, valueHolding, HoldingsBelowZero} from './math';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-025, C-TK-11): per-asset gain or loss on Wealth, as Kubera, CoinStats and Delta show
 * it. Wealth keeps no purchase price (its holdings record quantity and value only; adding a cost would change its strict
 * stored format), but Portfolio records what each coin cost. So a coin's page on Wealth shows, read-only, each REAL
 * portfolio that holds the same coin: its quantity, what it cost (average cost) and, at the current price in that
 * portfolio's own currency, the gain or loss. Nothing is stored or copied; amounts are never converted between
 * currencies or added across portfolios; an unknown cost or price stays unknown (never 0). Hypothetical portfolios are
 * left out: they are not money the person holds.
 */
export type WealthResultRow = {portfolioId: string; name: string; currency: PortfolioCurrency; quantity: string; cost?: string; averageCost?: string; value?: string; unrealized?: string; unrealizedPct?: string};
export function portfolioResultsFor(data: PortfolioData, ref: {provider: string; kind: string; id: string}, priceOf: (currency: PortfolioCurrency) => string | undefined): WealthResultRow[] {
  const key = coinKey(ref), rows: WealthResultRow[] = [];
  for (const p of data.portfolios) {
    if (p.kind !== 'real' || !p.coins.some(c => coinKey(c.ref) === key)) continue;
    let held;
    try { held = holdings(p).get(key); } catch (error) { if (error instanceof HoldingsBelowZero) continue; throw error; }
    if (!held || !(Number(held.quantity) > 0)) continue;
    const valued = valueHolding(held, priceOf(p.currency));
    rows.push({portfolioId: p.id, name: p.name, currency: p.currency, quantity: held.quantity, ...(held.cost !== undefined ? {cost: held.cost} : {}), ...(held.averageCost !== undefined ? {averageCost: held.averageCost} : {}), ...valued});
  }
  return rows;
}
