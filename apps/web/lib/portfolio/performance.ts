import type {HistoryRange} from '../market-history';
import {HoldingsBelowZero, PortfolioDecimal, holdings, ordered, portfolioTotals} from './math';
import type {Portfolio} from './schema';

/**
 * Portfolio v2 (Session W Part 15): results from the person's own entries, in the portfolio's one currency, with the
 * same average-cost rules as lib/portfolio/math.ts. Nothing is assumed: a coin without a price, a cost that is unknown
 * or a missing market figure leaves its result unknown (undefined), never zero.
 */
const D = PortfolioDecimal;
type Dec = InstanceType<typeof PortfolioDecimal>;
const DAY_MS = 86400000;

/**
 * Realized result per coin: each sell's proceeds (quantity × price − fee) minus the average cost of what it sold; a fee
 * on a transfer out is a cost too. A transfer moves coins, it sells nothing. Unknown once a coin was sold while the cost
 * of what it held was unknown (a transfer in without a price), until that coin's history says otherwise.
 */
export function realizedResults(portfolio: Pick<Portfolio, 'transactions'>): Map<string, string | undefined> {
  const state = new Map<string, {quantity: Dec; cost: Dec | null; realized: Dec | null}>();
  for (const t of ordered(portfolio.transactions)) {
    const s = state.get(t.coin) ?? {quantity: new D(0), cost: new D(0), realized: new D(0)}, quantity = new D(t.quantity);
    if (t.kind === 'buy' || t.kind === 'transfer-in') {
      s.cost = s.cost !== null && t.price !== undefined ? s.cost.plus(quantity.times(t.price)).plus(t.fee ?? 0) : null;
      s.quantity = s.quantity.plus(quantity);
    } else {
      if (quantity.greaterThan(s.quantity)) throw new HoldingsBelowZero(t.coin, t.date);
      const remaining = s.quantity.minus(quantity);
      // The same arithmetic as holdings(): what stays keeps its average cost; what left takes the rest.
      const kept = s.cost === null ? null : s.quantity.isZero() ? new D(0) : s.cost.times(remaining).dividedBy(s.quantity), share = s.cost === null ? null : s.cost.minus(kept!);
      if (t.kind === 'sell') s.realized = s.realized === null || share === null ? null : s.realized.plus(quantity.times(t.price!)).minus(t.fee ?? 0).minus(share);
      else if (t.fee !== undefined && s.realized !== null) s.realized = s.realized.minus(t.fee);
      s.cost = remaining.isZero() ? new D(0) : kept;
      s.quantity = remaining;
    }
    state.set(t.coin, s);
  }
  return new Map([...state].map(([coin, s]) => [coin, s.realized?.toFixed()]));
}

/** One sale with its result (Session AH, WE18): proceeds, the average cost it took, the fee and the result; unknown cost stays unknown. */
export type RealizedSale = {kind: 'sell' | 'transfer-fee'; date: string; coin: string; quantity: string; proceeds: string; fee: string; cost?: string; result?: string};
/** Every sale in date order, with the same average-cost arithmetic as realizedResults; a fee on a transfer out is its own row, so the rows add up to the realized result. */
export function realizedSales(portfolio: Pick<Portfolio, 'transactions'>): RealizedSale[] {
  const state = new Map<string, {quantity: Dec; cost: Dec | null}>(), sales: RealizedSale[] = [];
  for (const t of ordered(portfolio.transactions)) {
    const s = state.get(t.coin) ?? {quantity: new D(0), cost: new D(0)}, quantity = new D(t.quantity);
    if (t.kind === 'buy' || t.kind === 'transfer-in') {
      s.cost = s.cost !== null && t.price !== undefined ? s.cost.plus(quantity.times(t.price)).plus(t.fee ?? 0) : null;
      s.quantity = s.quantity.plus(quantity);
    } else {
      if (quantity.greaterThan(s.quantity)) throw new HoldingsBelowZero(t.coin, t.date);
      const remaining = s.quantity.minus(quantity);
      const kept = s.cost === null ? null : s.quantity.isZero() ? new D(0) : s.cost.times(remaining).dividedBy(s.quantity), share = s.cost === null ? null : s.cost.minus(kept!);
      if (t.kind === 'sell') {
        const proceeds = quantity.times(t.price!), fee = new D(t.fee ?? 0);
        sales.push({kind: 'sell', date: t.date, coin: t.coin, quantity: quantity.toFixed(), proceeds: proceeds.toFixed(), fee: fee.toFixed(), cost: share?.toFixed(), result: share === null ? undefined : proceeds.minus(fee).minus(share).toFixed()});
      } else if (t.fee !== undefined) sales.push({kind: 'transfer-fee', date: t.date, coin: t.coin, quantity: quantity.toFixed(), proceeds: '0', fee: new D(t.fee).toFixed(), cost: '0', result: new D(t.fee).negated().toFixed()});
      s.cost = remaining.isZero() ? new D(0) : kept;
      s.quantity = remaining;
    }
    state.set(t.coin, s);
  }
  return sales;
}

/** Everything that came in at a known cost (buys and priced transfers in, with their fees); unknown with any unpriced transfer in. */
export function investedTotal(portfolio: Pick<Portfolio, 'transactions'>): string | undefined {
  let total = new D(0);
  for (const t of portfolio.transactions) {
    if (t.kind !== 'buy' && t.kind !== 'transfer-in') continue;
    if (t.price === undefined) return undefined;
    total = total.plus(new D(t.quantity).times(t.price)).plus(t.fee ?? 0);
  }
  return total.toFixed();
}

export type AllTimeResult = {value?: string; pct?: string; realized?: string; unrealized?: string; reason?: 'price' | 'cost'};
/**
 * All-time result = realized (every coin) + unrealized (every coin still held: value − its average-cost basis). Shown only
 * when both are known; the percentage is of everything invested, when that is known and above zero.
 */
export function allTimeResult(portfolio: Pick<Portfolio, 'transactions'>, priceOf: (coin: string) => string | undefined): AllTimeResult {
  const realizedByCoin = realizedResults(portfolio), totals = portfolioTotals(portfolio, priceOf);
  const realizedKnown = [...realizedByCoin.values()].every(v => v !== undefined);
  const realized = realizedKnown ? [...realizedByCoin.values()].reduce((sum, v) => sum.plus(v!), new D(0)) : undefined;
  const unrealized = totals.held === 0 ? new D(0) : totals.unrealized === undefined ? undefined : new D(totals.unrealized);
  const reason = totals.held > 0 && totals.unpriced > 0 ? 'price' as const : (!realizedKnown || totals.held > 0 && !totals.costKnown) ? 'cost' as const : undefined;
  if (realized === undefined || unrealized === undefined) return {realized: realized?.toFixed(), unrealized: unrealized?.toFixed(), reason};
  const value = realized.plus(unrealized), invested = investedTotal(portfolio);
  return {value: value.toFixed(), realized: realized.toFixed(), unrealized: unrealized.toFixed(), pct: invested !== undefined && new D(invested).greaterThan(0) ? value.dividedBy(invested).times(100).toFixed() : undefined};
}

export type DayChange = {value?: string; pct?: string; counted: number; held: number};
/**
 * The 24-hour change of what is held now: for each held coin with a value and the provider's 24h change c (%), its value
 * then was value / (1 + c/100), so the change is value × c / (100 + c). Coins without either are left out and counted.
 */
export function dayChange(rows: readonly {quantity: string; value?: string; change24h: string | null}[]): DayChange {
  let delta = new D(0), before = new D(0), counted = 0, held = 0;
  for (const row of rows) {
    if (new D(row.quantity).isZero()) continue;
    held++;
    if (row.value === undefined || row.change24h === null) continue;
    const c = new D(row.change24h);
    if (c.lessThanOrEqualTo(-100)) continue;
    const change = new D(row.value).times(c).dividedBy(c.plus(100));
    delta = delta.plus(change); before = before.plus(new D(row.value).minus(change)); counted++;
  }
  if (!counted) return {counted, held};
  return {value: delta.toFixed(), pct: before.greaterThan(0) ? delta.dividedBy(before).times(100).toFixed() : undefined, counted, held};
}

export type Slice = {key: string; label: string; value: string; share: number};
/** Shares of the known value, largest first; beyond `max` slices the rest is one "Other" slice. Unpriced coins have no share. */
export function allocation(rows: readonly {key: string; label: string; value?: string}[], max = 6): {slices: Slice[]; total: string} {
  const priced = rows.filter(r => r.value !== undefined && new D(r.value).greaterThan(0)).sort((a, b) => new D(b.value!).comparedTo(a.value!) || a.label.localeCompare(b.label));
  const total = priced.reduce((sum, r) => sum.plus(r.value!), new D(0));
  if (total.isZero()) return {slices: [], total: '0'};
  const head = priced.length > max ? priced.slice(0, max - 1) : priced, rest = priced.slice(head.length);
  const slices = head.map(r => ({key: r.key, label: r.label, value: new D(r.value!).toFixed()}));
  if (rest.length) slices.push({key: 'other', label: `Other (${rest.length})`, value: rest.reduce((sum, r) => sum.plus(r.value!), new D(0)).toFixed()});
  return {slices: slices.map(s => ({...s, share: new D(s.value).dividedBy(total).toNumber()})), total: total.toFixed()};
}

export const VALUE_RANGES = ['24h', '7d', '30d', '90d', '1y', 'all'] as const;
export type ValueRange = (typeof VALUE_RANGES)[number];
const RANGE_DAYS: Record<Exclude<ValueRange, 'all'>, {days: number; history: HistoryRange}> = {'24h': {days: 1, history: '1d'}, '7d': {days: 7, history: '7d'}, '30d': {days: 30, history: '30d'}, '90d': {days: 90, history: '90d'}, '1y': {days: 365, history: '1y'}};
/** A transaction keeps a date, not a time: it counts from the start of that date (UTC). */
export const dayStart = (date: string) => Date.parse(`${date}T00:00:00Z`);
/**
 * The window a range shows and the market history it needs. "All" starts at the first transaction, as far back as the
 * market history goes (one year): `clipped` says when the portfolio is older than that.
 */
export function rangeWindow(range: ValueRange, transactions: Pick<Portfolio, 'transactions'>['transactions'], now: number): {start: number; end: number; history: HistoryRange; clipped: boolean} {
  if (range !== 'all') return {start: now - RANGE_DAYS[range].days * DAY_MS, end: now, history: RANGE_DAYS[range].history, clipped: false};
  const first = transactions.length ? Math.min(...transactions.map(t => dayStart(t.date))) : now - DAY_MS;
  const start = Math.max(first, now - 365 * DAY_MS), span = now - start;
  const history = (['1d', '7d', '30d', '90d', '1y'] as const).find(h => span <= ({'1d': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365} as const)[h] * DAY_MS) ?? '1y';
  return {start: Math.min(start, now - 60 * 60000), end: now, history, clipped: first < now - 365 * DAY_MS};
}

export type PricePoint = {at: number; price: string};
export type ValuePoint = {at: number; value: string | null};
/**
 * The portfolio's value at evenly spaced moments: each coin held then (from the transactions, by date) times its last
 * observed price at or before that moment. A moment where a held coin has no observed price yet is a gap (null), never
 * a guess; holding nothing is a value of 0.
 */
export function valueSeries(portfolio: Pick<Portfolio, 'transactions'>, prices: ReadonlyMap<string, readonly PricePoint[]>, {start, end, steps = 96}: {start: number; end: number; steps?: number}): {points: ValuePoint[]; complete: boolean} {
  const changes = new Map<string, {at: number; delta: Dec}[]>();
  for (const t of ordered(portfolio.transactions)) {
    const list = changes.get(t.coin) ?? [], q = new D(t.quantity);
    list.push({at: dayStart(t.date), delta: t.kind === 'buy' || t.kind === 'transfer-in' ? q : q.negated()});
    changes.set(t.coin, list);
  }
  const points: ValuePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const at = Math.round(start + (end - start) * i / steps);
    let value: Dec | null = new D(0);
    for (const [coin, list] of changes) {
      const held = list.reduce((sum, c) => c.at <= at ? sum.plus(c.delta) : sum, new D(0));
      if (held.lessThanOrEqualTo(0)) continue;
      const series = prices.get(coin) ?? [];
      let price: string | undefined;
      for (const point of series) { if (point.at <= at) price = point.price; else break; }
      if (price === undefined) { value = null; break; }
      value = value.plus(held.times(price));
    }
    points.push({at, value: value?.toFixed() ?? null});
  }
  return {points, complete: points.every(p => p.value !== null)};
}
/** Held coins, for the chart's limit and requests. */
export function heldCoins(portfolio: Pick<Portfolio, 'transactions'>) { return [...holdings(portfolio).values()].filter(h => !new D(h.quantity).isZero()).map(h => h.coin); }
/** Coins held at any time in a window: the chart needs each one's prices. */
export function coinsInWindow(portfolio: Pick<Portfolio, 'transactions'>, start: number): string[] {
  const coins = new Set<string>(heldCoins(portfolio));
  for (const t of portfolio.transactions) if (dayStart(t.date) >= start - DAY_MS) coins.add(t.coin);
  // A coin sold before the window but held during it: its balance at the window's start is above zero.
  const before = new Map<string, Dec>();
  for (const t of ordered(portfolio.transactions)) { if (dayStart(t.date) > start) break; before.set(t.coin, (before.get(t.coin) ?? new D(0)).plus(t.kind === 'buy' || t.kind === 'transfer-in' ? t.quantity : new D(t.quantity).negated())); }
  for (const [coin, quantity] of before) if (quantity.greaterThan(0)) coins.add(coin);
  return [...coins].sort();
}

export type RangeReturns = {
  /** Time-weighted return over the range, in percent: each stretch between your transactions chained, so money you add or take out does not move it. */
  twr?: string;
  /** Money-weighted return over the range, in percent (Modified Dietz): what your money earned, weighted by how long each amount was in. */
  mwr?: string;
  /** Why a figure is unknown: a coin held at a moment had no observed price, or nothing was held long enough to measure. */
  reason?: 'price' | 'empty';
};
/**
 * Session AL (GAP-016, P-DVG-62, C-DVG-62): time- and money-weighted returns for a range, from the same observed prices
 * and transactions as the value chart. A transaction counts from the start of its date (UTC), as valueSeries. Coins are
 * valued at the observed market price at each moment (a trade's own price and fee are what Realized/All-time count);
 * a moment where a held coin has no observed price makes the figures unknown, never a guess. Over a range, not per year.
 */
export function rangeReturns(portfolio: Pick<Portfolio, 'transactions'>, prices: ReadonlyMap<string, readonly PricePoint[]>, {start, end}: {start: number; end: number}): RangeReturns {
  const txs = ordered(portfolio.transactions);
  // The range's first moment may fall just before a history's first point (it is asked for the same range): the first
  // point within a day stands in for it there, and only there.
  const priceAt = (coin: string, at: number) => { let price: string | undefined; const list = prices.get(coin) ?? []; for (const p of list) { if (p.at <= at) price = p.price; else break; } if (price === undefined && at === start && list[0] && list[0].at - at <= DAY_MS) price = list[0].price; return price; };
  const heldAt = (at: number, inclusive: boolean) => {
    const held = new Map<string, Dec>();
    for (const t of txs) { const day = dayStart(t.date); if (inclusive ? day > at : day >= at) break; held.set(t.coin, (held.get(t.coin) ?? new D(0)).plus(t.kind === 'buy' || t.kind === 'transfer-in' ? t.quantity : new D(t.quantity).negated())); }
    return held;
  };
  /** The value of what is held at `at` (after that moment's transactions when `after`), or null when a held coin has no price. */
  const valueAt = (at: number, after: boolean): Dec | null => {
    let value = new D(0);
    for (const [coin, quantity] of heldAt(at, after)) { if (quantity.lessThanOrEqualTo(0)) continue; const price = priceAt(coin, at); if (price === undefined) return null; value = value.plus(quantity.times(price)); }
    return value;
  };
  const flowDays = [...new Set(txs.map(t => dayStart(t.date)).filter(d => d > start && d <= end))].sort((a, b) => a - b);
  const startValue = valueAt(start, true), endValue = valueAt(end, true);
  if (startValue === null || endValue === null) return {reason: 'price'};
  // Time-weighted: chain each stretch's growth; a stretch that starts with nothing held adds nothing.
  let growth = new D(1), measured = false, base = startValue;
  for (const day of flowDays) {
    const before = valueAt(day, false), after = valueAt(day, true);
    if (before === null || after === null) return {reason: 'price'};
    if (base.greaterThan(0)) { growth = growth.times(before.dividedBy(base)); measured = true; }
    base = after;
  }
  if (base.greaterThan(0)) { growth = growth.times(endValue.dividedBy(base)); measured = true; }
  // Money-weighted (Modified Dietz): each day's net flow is what moved in or out at that day's observed prices.
  const span = Math.max(1, end - start);
  let flows = new D(0), weighted = new D(0);
  for (const day of flowDays) {
    const before = valueAt(day, false)!, after = valueAt(day, true)!, flow = after.minus(before);
    flows = flows.plus(flow); weighted = weighted.plus(flow.times((end - day) / span));
  }
  const capital = startValue.plus(weighted);
  if (!measured) return {reason: 'empty'};
  return {twr: growth.minus(1).times(100).toFixed(), ...(capital.greaterThan(0) ? {mwr: endValue.minus(startValue).minus(flows).dividedBy(capital).times(100).toFixed()} : {})};
}
/** Session AL (GAP-016): a reference coin's own price change over the same range, in percent, or undefined without both ends. */
export function priceChange(points: readonly PricePoint[] | undefined, {start, end}: {start: number; end: number}): string | undefined {
  let first: string | undefined, last: string | undefined;
  for (const p of points ?? []) { if (p.at <= start) first = p.price; if (p.at <= end) last = p.price; }
  first ??= points?.find(p => p.at > start && p.at <= end)?.price;
  if (first === undefined || last === undefined || !new D(first).greaterThan(0)) return undefined;
  return new D(last).dividedBy(first).minus(1).times(100).toFixed();
}
