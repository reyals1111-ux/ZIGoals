import type {BillsRecord} from './bills/schema';
import type {BudgetsRecord} from './budgets/schema';
import type {MoneyEntry} from './money-log/schema';
import {toReview, type MoneyReview} from './money-review/review';
import {billsCard, type BillLine} from './nova/cards/bills';
import {budgetsCard} from './nova/cards/budgets';
import {NEAR_SHARE, budgetPace} from './budgets/pace';
import {monthKey, monthView} from './budgets/engine';
import {watchedAbove} from './budgets/watch';
import {billNotesDue, challengeStates, payeesAbove, type NoteDue} from './money-notices';
import {fromCents} from './money-log/engine';
import {formatCurrencyAmount, formatDate} from './visual-format';

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
/**
 * Session AV lane 2 (money; YNAB's Spotlight, Rocket Money): `notes`, a bill's note to self due within three days;
 * `payees`, watched payees well above last month; `challenges`, a "spend less than last month" challenge already over or
 * within 10 % of last month; `low`, the day the 60-day cash forecast goes below the person's own line (worked out by the
 * caller, which holds the accounts; optional, so older callers are unchanged).
 */
export type LowCash = {date: string; currency: string; cents: bigint; line: bigint};
export type MoneyAttention = {review: number; over: {category: string; currency: string; words: string}[]; near: {category: string; currency: string}[]; fast: {category: string; currency: string}[]; watched: {category: string; currency: string}[]; bills: BillLine[]; count: number;
  notes?: NoteDue[]; payees?: {payee: string; currency: string}[]; challenges?: {category: string; currency: string; state: 'over' | 'close'}[]; low?: LowCash | null;
  /** Session AV lane 2 (money; Undebt.it): the kept debt plan, when what is owed is behind it (cents behind, its currency). */ debtsBehind?: {cents: bigint; currency: string} | null;
  /** Session AV lane 2 (money; Kubera's mark as stale): accounts past the person's own "update every". */ stale?: {id: string; name: string}[]};
export function moneyAttention({entries, review, budgets, bills, today, low = null, debtsBehind = null, stale = []}: {entries: readonly MoneyEntry[]; review?: MoneyReview | null; budgets?: BudgetsRecord | null; bills?: BillsRecord | null; today: string; low?: LowCash | null; debtsBehind?: {cents: bigint; currency: string} | null; stale?: readonly {id: string; name: string}[]}): MoneyAttention {
  const pending = review ? toReview(review, entries).length : 0;
  const lines = budgets?.budgets.length ? budgetsCard(budgets, entries, today).lines : [];
  const over = lines.filter(l => l.over).map(l => ({category: l.category, currency: l.currency, words: l.words}));
  const near = lines.filter(l => !l.over && l.share >= NEAR_SHARE).map(l => ({category: l.category, currency: l.currency}));
  const flagged = new Set([...over, ...near].map(b => `${b.currency}|${b.category}`));
  const fast = budgets?.budgets.length ? monthView(entries, budgets, monthKey(today), today).rows.filter(r => !flagged.has(`${r.currency}|${r.category}`) && budgetPace(r, monthKey(today), today)?.state === 'fast').map(r => ({category: r.category, currency: r.currency})) : [];
  const watched = budgets?.watch?.length ? watchedAbove(budgets, entries, today).map(w => ({category: w.category, currency: w.currency})) : [];
  const soon = bills?.bills.length ? billsCard(bills, today).lines.filter(l => l.days <= BILLS_SOON_DAYS) : [];
  const notes = billNotesDue(bills, today, BILLS_SOON_DAYS), payees = budgets?.payees?.length ? payeesAbove(budgets, entries, today).map(p => ({payee: p.payee, currency: p.currency})) : [];
  const challenges = budgets?.challenges?.length ? challengeStates(budgets, entries, today).filter(c => c.month === today.slice(0, 7) && (c.state === 'over' || c.state === 'close')).map(c => ({category: c.category, currency: c.currency, state: c.state as 'over' | 'close'})) : [];
  return {review: pending, over, near, fast, watched, bills: soon, notes, payees, challenges, low, debtsBehind, stale: stale.map(x => ({id: x.id, name: x.name})), count: stale.length + (debtsBehind ? 1 : 0) + (pending ? 1 : 0) + over.length + near.length + fast.length + watched.length + soon.length + notes.length + payees.length + challenges.length + (low ? 1 : 0)};
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
    ...a.bills.map(b => ({text: `${b.title} due ${b.when}`, href: ATTENTION_HREF.bills})),
    // Session AV lane 2 (money): the notes, payees, challenges and the low-balance line.
    ...(a.notes ?? []).map(n => ({text: `${n.title}: your note ${n.days < 0 ? 'was due' : 'is due'} ${n.days === 0 ? 'today' : n.days === 1 ? 'tomorrow' : n.days < 0 ? formatDate(n.by) : `in ${n.days} days`}`, href: ATTENTION_HREF.bills})),
    ...(a.payees ?? []).map(p => ({text: `${p.payee} well above last month`, href: ATTENTION_HREF.budgets})),
    ...(a.challenges ?? []).map(c => ({text: c.state === 'over' ? `${c.category} challenge: past last month` : `${c.category} challenge: close to last month`, href: ATTENTION_HREF.budgets})),
    ...(a.stale ?? []).map(x => ({text: `${x.name}: due for an update`, href: '/app/wealth'})),
    ...(a.debtsBehind ? [{text: `Debts: ${formatCurrencyAmount(fromCents(Number(a.debtsBehind.cents)), a.debtsBehind.currency)} behind your kept plan`, href: '/app/wealth/calculator'}] : []),
    ...(a.low ? [{text: `Cash may go below ${formatCurrencyAmount(fromCents(Number(a.low.line)), a.low.currency)} on ${formatDate(a.low.date)}`, href: ATTENTION_HREF.review}] : [])];
}
