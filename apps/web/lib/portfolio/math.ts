import Decimal from 'decimal.js';
import type {Portfolio, PortfolioTransaction} from './schema';
import {normalizeDecimalInput} from '../decimal-input';

/** Exact arithmetic for Portfolio, on its own Decimal so no other module's settings are changed. */
export const PortfolioDecimal = Decimal.clone({precision: 64, rounding: Decimal.ROUND_HALF_EVEN, toExpNeg: -40, toExpPos: 64});
const D = PortfolioDecimal;
type Dec = InstanceType<typeof PortfolioDecimal>;

/** A coin held in one portfolio. `cost` is the average-cost basis of what is still held; undefined means unknown. */
export type Holding = {coin: string; quantity: string; cost?: string; averageCost?: string; transactions: number};
/** Refused history: a sell or transfer out that would take holdings below zero at that point in time. */
export class HoldingsBelowZero extends Error {
  constructor(readonly coin: string, readonly date: string) { super(`This would take the holding below zero on ${date}. Record what came in first, or change the amount.`); this.name = 'HoldingsBelowZero'; }
}

/** Transactions in the order they happened: by date, then by when they were recorded. */
export function ordered(transactions: readonly PortfolioTransaction[]) {
  return [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/**
 * Average-cost holdings per coin. A buy adds its quantity and its cost (quantity × price + fee). A transfer in with a
 * price does the same; without one, what it brings has no known cost, so the coin's cost basis becomes unknown until
 * the holding returns to zero. A sell or transfer out removes quantity and the same share of the cost basis, so the
 * average cost of what remains is unchanged. Throws HoldingsBelowZero if the history ever goes below zero.
 */
export function holdings(portfolio: Pick<Portfolio, 'transactions'>): Map<string, Holding> {
  const state = new Map<string, {quantity: Dec; cost: Dec | null; count: number}>();
  for (const t of ordered(portfolio.transactions)) {
    const current = state.get(t.coin) ?? {quantity: new D(0), cost: new D(0), count: 0}, quantity = new D(t.quantity);
    current.count++;
    if (t.kind === 'buy' || t.kind === 'transfer-in') {
      const known = current.cost !== null && t.price !== undefined;
      current.cost = known ? current.cost!.plus(quantity.times(t.price!)).plus(t.fee ?? 0) : null;
      current.quantity = current.quantity.plus(quantity);
    } else {
      if (quantity.greaterThan(current.quantity)) throw new HoldingsBelowZero(t.coin, t.date);
      const remaining = current.quantity.minus(quantity);
      current.cost = current.cost === null ? null : current.quantity.isZero() ? new D(0) : current.cost.times(remaining).dividedBy(current.quantity);
      current.quantity = remaining;
      // A position that closes starts again: a later buy has a known cost even after an unknown transfer.
      if (remaining.isZero()) current.cost = new D(0);
    }
    state.set(t.coin, current);
  }
  return new Map([...state].map(([coin, s]) => [coin, {coin, quantity: s.quantity.toFixed(), cost: s.cost?.toFixed(), averageCost: s.cost && s.quantity.greaterThan(0) ? s.cost.dividedBy(s.quantity).toFixed() : undefined, transactions: s.count}]));
}
/** Whether a portfolio's history stays at or above zero at every point. */
export function validHistory(portfolio: Pick<Portfolio, 'transactions'>) { try { holdings(portfolio); return true; } catch (error) { if (error instanceof HoldingsBelowZero) return false; throw error; } }

export type HoldingValue = {value?: string; unrealized?: string; unrealizedPct?: string};
/** Value and unrealized result, only with a known price; the result also needs a known cost basis. */
export function valueHolding(holding: Pick<Holding, 'quantity' | 'cost'>, price?: string): HoldingValue {
  if (price === undefined) return {};
  const value = new D(holding.quantity).times(price);
  if (holding.cost === undefined) return {value: value.toFixed()};
  const cost = new D(holding.cost), unrealized = value.minus(cost);
  return {value: value.toFixed(), unrealized: unrealized.toFixed(), unrealizedPct: cost.greaterThan(0) ? unrealized.dividedBy(cost).times(100).toFixed() : undefined};
}

export type PortfolioTotals = {knownValue: string; unpriced: number; costKnown: boolean; cost: string; unrealized?: string; unrealizedPct?: string; held: number};
/**
 * One portfolio's totals in its own currency (portfolios in other currencies are never added in). Coins without a
 * price are counted, not valued at zero; the result is shown only when every held coin has a price and a known cost.
 */
export function portfolioTotals(portfolio: Pick<Portfolio, 'transactions'>, priceOf: (coin: string) => string | undefined): PortfolioTotals {
  let known = new D(0), cost = new D(0), unpriced = 0, costKnown = true, held = 0;
  for (const holding of holdings(portfolio).values()) {
    if (new D(holding.quantity).isZero()) continue;
    held++;
    const price = priceOf(holding.coin);
    if (price === undefined) unpriced++; else known = known.plus(new D(holding.quantity).times(price));
    if (holding.cost === undefined) costKnown = false; else cost = cost.plus(holding.cost);
  }
  const complete = unpriced === 0 && costKnown && held > 0, unrealized = complete ? known.minus(cost) : undefined;
  return {knownValue: known.toFixed(), unpriced, costKnown, cost: cost.toFixed(), held, unrealized: unrealized?.toFixed(), unrealizedPct: unrealized && cost.greaterThan(0) ? unrealized.dividedBy(cost).times(100).toFixed() : undefined};
}
/**
 * A decimal typed in a form, read as lib/decimal-input reads money ("0,5" is 0.5; an ambiguous "1,234" is refused with a
 * reason): plain non-negative decimal text, or null when it is not a number. Throws only the ambiguity message.
 */
export function readDecimal(text: string): string | null {
  const value = normalizeDecimalInput(text);
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  return new D(value).toFixed();
}
