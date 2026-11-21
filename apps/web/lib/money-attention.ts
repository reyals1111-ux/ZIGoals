import type {BillsRecord} from './bills/schema';
import type {BudgetsRecord} from './budgets/schema';
import type {MoneyEntry} from './money-log/schema';
import {toReview, type MoneyReview} from './money-review/review';
import {billsCard, type BillLine} from './nova/cards/bills';
import {budgetsCard} from './nova/cards/budgets';

/**
 * Session AV (owner follow-up 1, F-MONEY-ATTENTION; YNAB's Spotlight): what in Wealth asks for a look today, in one
 * place — imported entries still to review, budgets this month that went over, and bills due in the next three days.
 * From the person's own records only; nothing is judged or advised. Empty when nothing asks. Pure.
 */
export const BILLS_SOON_DAYS = 3;
export type MoneyAttention = {review: number; over: {category: string; currency: string; words: string}[]; bills: BillLine[]; count: number};
export function moneyAttention({entries, review, budgets, bills, today}: {entries: readonly MoneyEntry[]; review?: MoneyReview | null; budgets?: BudgetsRecord | null; bills?: BillsRecord | null; today: string}): MoneyAttention {
  const pending = review ? toReview(review, entries).length : 0;
  const over = budgets?.budgets.length ? budgetsCard(budgets, entries, today).lines.filter(l => l.over).map(l => ({category: l.category, currency: l.currency, words: l.words})) : [];
  const soon = bills?.bills.length ? billsCard(bills, today).lines.filter(l => l.days <= BILLS_SOON_DAYS) : [];
  return {review: pending, over, bills: soon, count: (pending ? 1 : 0) + over.length + soon.length};
}
/** The line's pieces in plain words: "3 to review", "Groceries over budget", "Rent due tomorrow". */
export function attentionPieces(a: MoneyAttention): string[] {
  return [...(a.review ? [`${a.review} ${a.review === 1 ? 'entry' : 'entries'} to review`] : []), ...a.over.map(o => `${o.category} over budget`), ...a.bills.map(b => `${b.title} due ${b.when}`)];
}
