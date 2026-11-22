import {PortfolioDecimal, holdings} from './math';
import type {PricePoint} from './performance';
import type {Portfolio} from './schema';

/**
 * Session AV lane 2 (money; CoinStats' Time Machine): "On <date>" — what the portfolio held at the end of that day, from
 * the person's own transactions, and each coin's value then from the price history this app already reads (the same
 * market history as the value chart; a year back), with the cost of what was held and the result then. A coin with no
 * observed price within two days before that moment leaves the total unknown, never guessed. Pure.
 */
const D = PortfolioDecimal, TWO_DAYS = 2 * 86_400_000;
export type ThenRow = {coin: string; quantity: string; price?: string; value?: string; cost?: string};
export type Then = {date: string; rows: ThenRow[]; total?: string; cost?: string; result?: string; unpriced: number};
/** The end of a day (UTC, as the transactions' dates are kept). */
export const endOfDay = (date: string) => Date.parse(`${date}T23:59:59Z`);
export function priceAt(points: readonly PricePoint[] | undefined, at: number): string | undefined {
  let found: PricePoint | undefined;
  for (const p of points ?? []) { if (p.at <= at) found = p; else break; }
  return found && at - found.at <= TWO_DAYS ? found.price : undefined;
}
export function portfolioOn(portfolio: Pick<Portfolio, 'transactions'>, date: string, prices: ReadonlyMap<string, readonly PricePoint[]>): Then {
  const held = holdings({transactions: portfolio.transactions.filter(t => t.date <= date)}), at = endOfDay(date), rows: ThenRow[] = [];
  let total = new D(0), cost = new D(0), unpriced = 0, costKnown = true;
  for (const h of held.values()) {
    if (new D(h.quantity).isZero()) continue;
    const price = priceAt(prices.get(h.coin), at), value = price === undefined ? undefined : new D(h.quantity).times(price).toFixed();
    if (value === undefined) unpriced++; else total = total.plus(value);
    if (h.cost === undefined) costKnown = false; else cost = cost.plus(h.cost);
    rows.push({coin: h.coin, quantity: h.quantity, ...(price !== undefined ? {price} : {}), ...(value !== undefined ? {value} : {}), ...(h.cost !== undefined ? {cost: h.cost} : {})});
  }
  rows.sort((a, b) => Number(b.value ?? -1) - Number(a.value ?? -1));
  const known = unpriced === 0;
  return {date, rows, unpriced, ...(known ? {total: total.toFixed()} : {}), ...(costKnown ? {cost: cost.toFixed()} : {}), ...(known && costKnown && rows.length ? {result: total.minus(cost).toFixed()} : {})};
}
/** The first day a transaction was recorded, and the earliest day the market history (a year) reaches. */
export function timeMachineBounds(portfolio: Pick<Portfolio, 'transactions'>, today: string, now: number): {min: string; max: string} {
  const first = [...portfolio.transactions].map(t => t.date).sort()[0] ?? today, yearAgo = new Date(now - 364 * 86_400_000).toISOString().slice(0, 10);
  return {min: first > yearAgo ? first : yearAgo, max: today};
}
