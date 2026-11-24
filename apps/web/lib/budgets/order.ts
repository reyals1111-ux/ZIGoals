import {budgetsSchema, type Budget, type BudgetsRecord} from './schema';

/**
 * Session AV lane 2, round 6 (money; EveryDollar's reorder, LEDGER #429): budgets in the person's own order (rent first,
 * fun last), kept as an optional `order` on each loose budget and used on Budgets, the month view and the fill. A record
 * with no order sorts as before (by currency, then most spent). Pure.
 */
export const hasOwnOrder = (budgets: readonly Pick<Budget, 'order'>[]) => budgets.some(b => b.order !== undefined);
/** Each budget's place: its own order, or after every ordered one in the record's order. */
export function rankOf(budgets: readonly Pick<Budget, 'id' | 'order'>[]): Map<string, number> {
  return new Map(budgets.map((b, i) => [b.id, b.order ?? 1000 + i]));
}
/** The budgets in the person's order (the record's order when none is set). */
export function budgetsInOrder<T extends Pick<Budget, 'id' | 'order'>>(budgets: readonly T[]): T[] {
  const rank = rankOf(budgets);
  return [...budgets].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
}
/** Keeps `ids` as the order (0 first); budgets not named follow in their present order. */
export function setOrder(record: BudgetsRecord, ids: readonly string[]): BudgetsRecord {
  const known = ids.filter(id => record.budgets.some(b => b.id === id)), rest = budgetsInOrder(record.budgets).map(b => b.id).filter(id => !known.includes(id));
  const at = new Map([...known, ...rest].map((id, i) => [id, i]));
  return budgetsSchema.parse({...record, budgets: record.budgets.map(b => ({...b, order: at.get(b.id)!}))});
}
/** Moves one budget up (-1) or down (+1) in the order shown; the ends stay where they are. */
export function moveBudget(record: BudgetsRecord, id: string, by: -1 | 1): BudgetsRecord {
  const list = budgetsInOrder(record.budgets).map(b => b.id), i = list.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return record;
  [list[i], list[j]] = [list[j]!, list[i]!];
  return setOrder(record, list);
}
/** Moves one budget to `index` (a drag dropped there). */
export function moveBudgetTo(record: BudgetsRecord, id: string, index: number): BudgetsRecord {
  const list = budgetsInOrder(record.budgets).map(b => b.id).filter(x => x !== id);
  if (list.length === record.budgets.length) return record;
  list.splice(Math.max(0, Math.min(list.length, index)), 0, id);
  return setOrder(record, list);
}
/** Back to the usual order (most spent first). */
export function clearOrder(record: BudgetsRecord): BudgetsRecord {
  return budgetsSchema.parse({...record, budgets: record.budgets.map(b => { const {order: _o, ...rest} = b; void _o; return rest; })});
}
