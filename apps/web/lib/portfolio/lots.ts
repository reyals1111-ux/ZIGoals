import {HoldingsBelowZero, PortfolioDecimal, ordered} from './math';
import type {Portfolio} from './schema';

/**
 * Session AI (B3, WE21): the cost of what was sold, by lots — first in, first out (FIFO) or last in, first out (LIFO) —
 * beside the average cost the Portfolio has always used (lib/portfolio/math.ts). Each buy or priced transfer in is a lot
 * (its quantity and its cost, the fee included); a sell or transfer out takes quantity from the oldest (FIFO) or newest
 * (LIFO) lots first. A lot without a known cost (a transfer in without a price) makes whatever it touches unknown, never
 * zero. A transfer out sells nothing: its fee is a cost, as in the average-cost rules. Read only; nothing is stored, and
 * the method changes how a result is shown, never a record.
 */
const D = PortfolioDecimal;
type Dec = InstanceType<typeof PortfolioDecimal>;
type Lot = {quantity: Dec; unit: Dec | null};
export type LotMethod = 'fifo' | 'lifo';
export type LotResult = {coin: string; realized?: string; heldCost?: string; heldQuantity: string};
export function lotResults(portfolio: Pick<Portfolio, 'transactions'>, method: LotMethod): Map<string, LotResult> {
  const state = new Map<string, {lots: Lot[]; realized: Dec | null}>();
  for (const t of ordered(portfolio.transactions)) {
    const s = state.get(t.coin) ?? {lots: [], realized: new D(0)}, quantity = new D(t.quantity);
    if (t.kind === 'buy' || t.kind === 'transfer-in') {
      const unit = t.price === undefined ? null : quantity.isZero() ? new D(0) : quantity.times(t.price).plus(t.fee ?? 0).dividedBy(quantity);
      s.lots.push({quantity, unit});
    } else {
      const held = s.lots.reduce((sum, lot) => sum.plus(lot.quantity), new D(0));
      if (quantity.greaterThan(held)) throw new HoldingsBelowZero(t.coin, t.date);
      let left = quantity, cost: Dec | null = new D(0);
      while (left.greaterThan(0)) {
        const lot = method === 'fifo' ? s.lots[0]! : s.lots[s.lots.length - 1]!, take = D.min(lot.quantity, left);
        cost = cost === null || lot.unit === null ? null : cost.plus(take.times(lot.unit));
        lot.quantity = lot.quantity.minus(take); left = left.minus(take);
        if (lot.quantity.isZero()) { if (method === 'fifo') s.lots.shift(); else s.lots.pop(); }
      }
      if (t.kind === 'sell') s.realized = s.realized === null || cost === null ? null : s.realized.plus(quantity.times(t.price!)).minus(t.fee ?? 0).minus(cost);
      else if (t.fee !== undefined && s.realized !== null) s.realized = s.realized.minus(t.fee);
    }
    state.set(t.coin, s);
  }
  return new Map([...state].map(([coin, s]) => {
    const heldQuantity = s.lots.reduce((sum, lot) => sum.plus(lot.quantity), new D(0));
    const heldCost = s.lots.some(lot => lot.unit === null && lot.quantity.greaterThan(0)) ? undefined : s.lots.reduce((sum, lot) => sum.plus(lot.quantity.times(lot.unit ?? 0)), new D(0)).toFixed();
    return [coin, {coin, realized: s.realized?.toFixed(), heldCost, heldQuantity: heldQuantity.toFixed()}];
  }));
}
