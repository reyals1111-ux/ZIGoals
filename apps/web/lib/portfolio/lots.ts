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
/** Session AL (P-TK-75, C-TK-06, GAP-014): HIFO too — the highest cost per coin first. With an open lot of unknown cost
 * the order cannot be known, so what the sale touches is unknown, never guessed. */
export type LotMethod = 'fifo' | 'lifo' | 'hifo';
const pickLot = (lots: readonly Lot[], method: LotMethod): number => {
  if (method === 'fifo') return 0;
  if (method === 'lifo') return lots.length - 1;
  const unknown = lots.findIndex(l => l.unit === null);
  if (unknown >= 0) return unknown;
  let best = 0;
  lots.forEach((l, i) => { if (l.unit!.greaterThan(lots[best]!.unit!)) best = i; });
  return best;
};
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
        const index = pickLot(s.lots, method), lot = s.lots[index]!, take = D.min(lot.quantity, left);
        cost = cost === null || lot.unit === null || (method === 'hifo' && s.lots.some(l => l.unit === null)) ? null : cost.plus(take.times(lot.unit));
        lot.quantity = lot.quantity.minus(take); left = left.minus(take);
        if (lot.quantity.isZero()) s.lots.splice(index, 1);
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
