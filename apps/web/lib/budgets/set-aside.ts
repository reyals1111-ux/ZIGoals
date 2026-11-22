import {cents, fromCents} from '../money-log/engine';
import {formatCurrencyAmount} from '../visual-format';
import {fromMinor, minorUnits} from '../money-split/parts';
import {budgetedIn, shiftMonth} from './engine';
import {budgetsSchema, MAX_AHEAD, type Budget, type BudgetsRecord} from './schema';

/**
 * Session AV lane 2, round 6 (money; Banktivity's budget one month ahead, LEDGER #428): "Set aside for next month". Part of
 * this month's ready money is given now to next month's budgets: it is held this month (Ready to assign is lower by it)
 * and covers those budgets next month (Ready to assign there does not ask for it again), so next month starts covered.
 * A budget can be covered up to its own amount next month. The person's own amounts; never advice. Pure.
 */
export type AheadItem = NonNullable<BudgetsRecord['ahead']>[number];
/**
 * What month `from` set aside for the month after, per currency (by each budget's currency). Review B6O-2: held by the same
 * cap as it covers there (`coveredIn`: never above a budget's amount next month), so when next month's amount is lowered
 * after setting aside, the excess is ready money again in `from` and never held in neither month.
 */
export const setAsideFrom = (record: Pick<BudgetsRecord, 'ahead' | 'budgets'>, from: string): Map<string, number> => coveredByCurrency(record, shiftMonth(from, 1));
/** What covers each budget in `month`, set aside in the month before (by budget id), never above its amount there. */
export function coveredIn(record: Pick<BudgetsRecord, 'ahead' | 'budgets'>, month: string): Map<string, number> {
  const from = shiftMonth(month, -1), out = new Map<string, number>();
  for (const a of record.ahead ?? []) if (a.from === from) out.set(a.budgetId, (out.get(a.budgetId) ?? 0) + cents(a.amount));
  for (const [id, c] of out) { const b = record.budgets.find(x => x.id === id); if (!b) out.delete(id); else out.set(id, Math.min(c, budgetedIn(b, month))); }
  return out;
}
/** What covers `month`'s budgets per currency (set aside the month before). */
export function coveredByCurrency(record: Pick<BudgetsRecord, 'ahead' | 'budgets'>, month: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, c] of coveredIn(record, month)) { const b = record.budgets.find(x => x.id === id)!; out.set(b.currency, (out.get(b.currency) ?? 0) + c); }
  return out;
}
export type AheadRow = {budget: Budget; next: number; covered: number; room: number};
/** Each budget that runs next month: its amount there, what this month already set aside for it, and the room left. */
export function aheadRows(record: BudgetsRecord, month: string): AheadRow[] {
  const next = shiftMonth(month, 1), have = coveredIn(record, next);
  return record.budgets.filter(b => b.since <= next).map(b => { const amount = budgetedIn(b, next), covered = have.get(b.id) ?? 0; return {budget: b, next: amount, covered, room: Math.max(0, amount - covered)}; });
}
/**
 * Sets aside `amounts` (budget id → decimal text) from `month` for the next month, replacing what `month` set aside before
 * for those budgets. `ready` is what Ready to assign has left per currency (before this change); the new total of a
 * currency may not pass it. Throws in plain words.
 */
export function setAside(record: BudgetsRecord, month: string, amounts: Readonly<Record<string, string>>, ready: ReadonlyMap<string, number>, at: string, newId: () => string): BudgetsRecord {
  const rows = new Map(aheadRows(record, month).map(r => [r.budget.id, r])), keep = (record.ahead ?? []).filter(a => !(a.from === month && a.budgetId in amounts));
  const added: AheadItem[] = [], before = setAsideFrom(record, month), after = new Map(before);
  for (const [budgetId, raw] of Object.entries(amounts)) {
    const text = raw.trim(), row = rows.get(budgetId);
    if (!row) throw new Error('That budget does not run next month.');
    // Review B6O-2: what `before` holds for this budget (capped at its amount next month, as `setAsideFrom`).
    const old = Math.min(row.next, (record.ahead ?? []).filter(a => a.from === month && a.budgetId === budgetId).reduce((s, a) => s + cents(a.amount), 0));
    after.set(row.budget.currency, (after.get(row.budget.currency) ?? 0) - old);
    if (!text || Number(text) === 0) continue;
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(text)) throw new Error(`${row.budget.category}: enter an amount such as 50 or 50.50.`);
    const c = minorUnits(text), most = row.next;
    if (c > most) throw new Error(`${row.budget.category}: up to ${formatCurrencyAmount(fromCents(most), row.budget.currency)}, its amount next month.`);
    after.set(row.budget.currency, (after.get(row.budget.currency) ?? 0) + c);
    added.push({id: newId(), from: month, budgetId, amount: fromMinor(c), at});
  }
  for (const [currency, total] of after) {
    const grew = total - (before.get(currency) ?? 0), left = ready.get(currency);
    if (grew > 0 && (left === undefined || grew > left)) throw new Error(left === undefined ? `No income is logged this month in ${currency}, so there is no ready money to set aside.` : `That is more than this month’s ready money in ${currency} (${formatCurrencyAmount(fromCents(Math.max(0, left)), currency)}).`);
  }
  const ahead = [...keep, ...added];
  if (ahead.length > MAX_AHEAD) throw new Error(`Up to ${MAX_AHEAD} amounts set aside.`);
  const next: Record<string, unknown> = {...record, ahead};
  if (!ahead.length) delete next.ahead;
  return budgetsSchema.parse(next);
}
