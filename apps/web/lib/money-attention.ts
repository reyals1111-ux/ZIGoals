import type {BillsRecord} from './bills/schema';
import type {BudgetsRecord} from './budgets/schema';
import type {MoneyEntry} from './money-log/schema';
import {toReview, type MoneyReview} from './money-review/review';
import {billsCard, type BillLine} from './nova/cards/bills';
import {budgetsCard} from './nova/cards/budgets';
import {NEAR_SHARE, budgetPace} from './budgets/pace';
import {monthKey, monthView} from './budgets/engine';
import {watchedAbove} from './budgets/watch';

/**
 * Session AV (owner follow-up 1, F-MONEY-ATTENTION; YNAB's Spotlight): what in Wealth asks for a look today, in one
 * place — imported entries still to review, budgets this month that went over, are near their limit (80 %) or run faster
 * than the month, watched categories well above last month, and bills due in the next three days.
 * From the person's own records only; nothing is judged or advised. Empty when nothing asks. Pure.
 */
export const BILLS_SOON_DAYS = 3;
/** Session AV (F-BUDGET-PACE): `near` lists budgets of this month from 80 % spent and not over (lib/budgets/pace.ts). */
/**
 * Session AV (fresh-agent check q2, ranks 20 and 31): `fast` lists budgets spent faster than the month (lib/budgets/pace.ts),
 * and `watched` the watched categories well above last month by the same day (lib/budgets/watch.ts watchedAbove).
 */
export type MoneyAttention = {review: number; over: {category: string; currency: string; words: string}[]; near: {category: string; currency: string}[]; fast: {category: string; currency: string}[]; watched: {category: string; currency: string}[]; bills: BillLine[]; count: number};
export function moneyAttention({entries, review, budgets, bills, today}: {entries: readonly MoneyEntry[]; review?: MoneyReview | null; budgets?: BudgetsRecord | null; bills?: BillsRecord | null; today: string}): MoneyAttention {
  const pending = review ? toReview(review, entries).length : 0;
  const lines = budgets?.budgets.length ? budgetsCard(budgets, entries, today).lines : [];
  const over = lines.filter(l => l.over).map(l => ({category: l.category, currency: l.currency, words: l.words}));
  const near = lines.filter(l => !l.over && l.share >= NEAR_SHARE).map(l => ({category: l.category, currency: l.currency}));
  const flagged = new Set([...over, ...near].map(b => `${b.currency}|${b.category}`));
  const fast = budgets?.budgets.length ? monthView(entries, budgets, monthKey(today), today).rows.filter(r => !flagged.has(`${r.currency}|${r.category}`) && budgetPace(r, monthKey(today), today)?.state === 'fast').map(r => ({category: r.category, currency: r.currency})) : [];
  const watched = budgets?.watch?.length ? watchedAbove(budgets, entries, today).map(w => ({category: w.category, currency: w.currency})) : [];
  const soon = bills?.bills.length ? billsCard(bills, today).lines.filter(l => l.days <= BILLS_SOON_DAYS) : [];
  return {review: pending, over, near, fast, watched, bills: soon, count: (pending ? 1 : 0) + over.length + near.length + fast.length + watched.length + soon.length};
}
/** The line's pieces in plain words: "3 to review", "Groceries over budget", "Rent due tomorrow". */
export function attentionPieces(a: MoneyAttention): string[] {
  return attentionLinks(a).map(l => l.text);
}
/**
 * Session AV (fresh-agent check q2, rank 20; YNAB's Spotlight opens each item's place): each piece with the place it
 * opens in Wealth — the review list in Spending's money tools, Budgets by category, Upcoming bills.
 */
export const ATTENTION_HREF = {review: '/app/wealth#spending', budgets: '/app/wealth?view=budgets', bills: '/app/wealth?view=bills'} as const;
export function attentionLinks(a: MoneyAttention): {text: string; href: string}[] {
  return [...(a.review ? [{text: `${a.review} ${a.review === 1 ? 'entry' : 'entries'} to review`, href: ATTENTION_HREF.review}] : []),
    ...a.over.map(o => ({text: `${o.category} over budget`, href: ATTENTION_HREF.budgets})), ...a.near.map(n => ({text: `${n.category} near its limit`, href: ATTENTION_HREF.budgets})),
    ...(a.fast ?? []).map(f => ({text: `${f.category} faster than the month`, href: ATTENTION_HREF.budgets})), ...(a.watched ?? []).map(w => ({text: `${w.category} well above last month`, href: ATTENTION_HREF.budgets})),
    ...a.bills.map(b => ({text: `${b.title} due ${b.when}`, href: ATTENTION_HREF.bills}))];
}
