import {HoldingsBelowZero, PortfolioDecimal, ordered} from './math';
import type {Portfolio} from './schema';

/**
 * Session AJ (item 30; owner decision D11): trader tools, opt-in, shown only when a portfolio has sells. Read only, from
 * the person's own recorded trades; nothing is stored here except the opt-in and a dismissal (zigoals:ui-prefs:v1 `trader`).
 * - Trade health: wins and losses (a sale's result by FIFO lots, fees counted), the average holding time of what was sold,
 *   fees as a share of the money traded, and the realised result by month. A sale whose cost is unknown (a transfer in
 *   without a price) is "unknown", never a win or a loss.
 * - The tilt check: three or more sales at a loss within 48 hours, or two or more sales logged late at night (23:00–05:00
 *   on this device), in the last 7 days. An observation and a question, never advice; dismissible for 7 days.
 * - The cost of leverage: an illustration of borrowing or funding cost over time and of how far a price can move before a
 *   leveraged position is closed, before fees and the exchange's own margin rules. Never a recommendation.
 */
const D = PortfolioDecimal;
type Dec = InstanceType<typeof PortfolioDecimal>;
type Lot = {quantity: Dec; unit: Dec | null; date: string};
export type TradeSale = {id: string; coin: string; date: string; createdAt: string; result: string | null; holdDays: number | null};
export type MonthResult = {month: string; result: string | null; sales: number};
export type TradeHealth = {sales: number; wins: number; losses: number; even: number; unknown: number; winShare: number | null;
  averageHoldDays: number | null; fees: string; traded: string; feeShare: number | null; byMonth: MonthResult[]};

const days = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000));

/** Every sale with its FIFO result (fees included) and the quantity-weighted days its coins were held. */
export function tradeSales(portfolio: Pick<Portfolio, 'transactions'>): TradeSale[] {
  const lots = new Map<string, Lot[]>(), out: TradeSale[] = [];
  for (const t of ordered(portfolio.transactions)) {
    const list = lots.get(t.coin) ?? [], quantity = new D(t.quantity);
    lots.set(t.coin, list);
    if (t.kind === 'buy' || t.kind === 'transfer-in') {
      list.push({quantity, unit: t.price === undefined ? null : quantity.times(t.price).plus(t.fee ?? 0).dividedBy(quantity), date: t.date});
      continue;
    }
    const held = list.reduce((sum, lot) => sum.plus(lot.quantity), new D(0));
    if (quantity.greaterThan(held)) throw new HoldingsBelowZero(t.coin, t.date);
    let left = quantity, cost: Dec | null = new D(0), dayWeight = new D(0);
    while (left.greaterThan(0)) {
      const lot = list[0]!, take = D.min(lot.quantity, left);
      cost = cost === null || lot.unit === null ? null : cost.plus(take.times(lot.unit));
      dayWeight = dayWeight.plus(take.times(days(lot.date, t.date)));
      lot.quantity = lot.quantity.minus(take); left = left.minus(take);
      if (lot.quantity.isZero()) list.shift();
    }
    if (t.kind !== 'sell') continue;
    const result = cost === null ? null : quantity.times(t.price!).minus(t.fee ?? 0).minus(cost).toFixed();
    out.push({id: t.id, coin: t.coin, date: t.date, createdAt: t.createdAt, result, holdDays: dayWeight.dividedBy(quantity).toNumber()});
  }
  return out;
}

export function tradeHealth(portfolio: Pick<Portfolio, 'transactions'>): TradeHealth {
  const sales = tradeSales(portfolio);
  let wins = 0, losses = 0, even = 0, unknown = 0, fees = new D(0), traded = new D(0), held = new D(0), heldCount = 0;
  for (const s of sales) {
    if (s.result === null) unknown++; else if (new D(s.result).greaterThan(0)) wins++; else if (new D(s.result).lessThan(0)) losses++; else even++;
    if (s.holdDays !== null) { held = held.plus(s.holdDays); heldCount++; }
  }
  for (const t of portfolio.transactions) if ((t.kind === 'buy' || t.kind === 'sell') && t.price !== undefined) { traded = traded.plus(new D(t.quantity).times(t.price)); fees = fees.plus(t.fee ?? 0); }
  const months = new Map<string, {result: Dec | null; sales: number}>();
  for (const s of sales) {
    const m = months.get(s.date.slice(0, 7)) ?? {result: new D(0), sales: 0};
    months.set(s.date.slice(0, 7), {result: m.result === null || s.result === null ? null : m.result.plus(s.result), sales: m.sales + 1});
  }
  const decided = wins + losses + even;
  return {sales: sales.length, wins, losses, even, unknown, winShare: decided ? wins / decided : null,
    averageHoldDays: heldCount ? held.dividedBy(heldCount).toNumber() : null, fees: fees.toFixed(), traded: traded.toFixed(),
    feeShare: traded.greaterThan(0) ? fees.dividedBy(traded).toNumber() : null,
    byMonth: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, m]) => ({month, result: m.result?.toFixed() ?? null, sales: m.sales}))};
}

export const TILT_WINDOW_DAYS = 7, TILT_LOSSES = 3, TILT_HOURS = 48, LATE_SALES = 2;
export type TiltSignal = {kind: 'losses'; count: number} | {kind: 'late'; count: number};
const hourIn = (instant: string, timeZone?: string) => { const h = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hourCycle: 'h23', ...(timeZone ? {timeZone} : {})}).format(new Date(instant)); return Number(h); };
/** What the tilt check notices in the last 7 days (by when each sale was logged); empty when nothing. */
export function tiltSignals(portfolio: Pick<Portfolio, 'transactions'>, now: number, timeZone?: string): TiltSignal[] {
  const since = now - TILT_WINDOW_DAYS * 86_400_000;
  const recent = tradeSales(portfolio).filter(s => { const at = Date.parse(s.createdAt); return at >= since && at <= now; });
  const losing = recent.filter(s => s.result !== null && new D(s.result).lessThan(0)).map(s => Date.parse(s.createdAt)).sort((a, b) => a - b);
  let most = 0;
  for (let i = 0, j = 0; j < losing.length; j++) { while (losing[j]! - losing[i]! > TILT_HOURS * 3_600_000) i++; most = Math.max(most, j - i + 1); }
  const late = recent.filter(s => { const h = hourIn(s.createdAt, timeZone); return h >= 23 || h < 5; }).length;
  return [...(most >= TILT_LOSSES ? [{kind: 'losses' as const, count: most}] : []), ...(late >= LATE_SALES ? [{kind: 'late' as const, count: late}] : [])];
}
export function tiltLine(signal: TiltSignal): string {
  return signal.kind === 'losses' ? `${signal.count} sales at a loss within 48 hours this week.` : `${signal.count} sales logged late at night this week.`;
}

export type LeverageInput = {size: string; leverage: number; entry: string; side: 'long' | 'short'; rate: string; rateKind: 'yearly' | 'per-8h'; days: number};
export type LeverageResult = {cost: string; costShareOfMargin: number; margin: string; moveToClose: number; closePrice: string};
/**
 * The illustration only: the cost of keeping a position of `size` (in money) open for `days` at `rate` percent (a yearly
 * borrowing rate, or a funding rate per 8 hours, as exchanges quote them), and the price move that would use up the margin
 * (1 / leverage), before fees and maintenance margin. Throws a plain message on input it cannot use.
 */
export function leverageCost(input: LeverageInput): LeverageResult {
  const size = new D(input.size), entry = new D(input.entry), rate = new D(input.rate).dividedBy(100);
  if (!size.greaterThan(0) || !entry.greaterThan(0)) throw new Error('Enter a position size and an entry price above zero.');
  if (!Number.isFinite(input.leverage) || input.leverage < 1 || input.leverage > 125) throw new Error('Leverage runs from 1× to 125×.');
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 3650) throw new Error('Days run from 1 to 3650.');
  if (rate.lessThan(0) || rate.greaterThan(10)) throw new Error('Enter a rate from 0 to 1000 percent.');
  const periods = input.rateKind === 'yearly' ? new D(input.days).dividedBy(365) : new D(input.days).times(3);
  const cost = size.times(rate).times(periods), margin = size.dividedBy(input.leverage), move = new D(1).dividedBy(input.leverage);
  const closePrice = input.side === 'long' ? entry.times(new D(1).minus(move)) : entry.times(new D(1).plus(move));
  return {cost: cost.toDecimalPlaces(2).toFixed(), costShareOfMargin: cost.dividedBy(margin).toNumber(), margin: margin.toDecimalPlaces(2).toFixed(), moveToClose: move.toNumber(), closePrice: closePrice.toSignificantDigits(8).toFixed()};
}
