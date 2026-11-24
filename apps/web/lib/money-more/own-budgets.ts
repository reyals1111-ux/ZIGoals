import {monthOf} from '../money-log/engine';
import {perDay, daysLeftInMonth} from '../budgets/per-day';
import {amountText, currencyCode, type MoneyEntry} from '../money-log/schema';
import {isSpending, mineParts} from '../money-log/counted';
import {MAX_OWN_BUDGETS, type MoneyMore, type OwnBudget} from './schema';
import type {BudgetsRecord} from '../budgets/schema';
import {NEAR_SHARE} from '../budgets/pace';
import {payeeRows, type PayeeRow} from '../money-notices';

/**
 * Session AV lane 2, round 2 (money; Spendee's daily amount left and budgets by label, Wallet's one-time budgets, Emma's
 * merchant budgets): pure.
 * - `perDay`: what is left divided by the days left in the budget's own period, rounded down to the cent — a fact from the
 *   person's own figures ("about €6 a day left for 9 days"), never advice.
 * - Your own budgets: the entries with one tag (in any category) or in chosen categories, against an amount each month or
 *   once between two days, with spent, left, days to go and the amount a day. Counted entries only, each its own share,
 *   in the budget's currency, never converted. Kept apart from the monthly category budgets (an entry can count in both).
 * - A payee budget: an amount a month on a watched payee, with spent, left and the near-limit line.
 */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
export {perDay, perDayWords, daysLeftInMonth} from '../budgets/per-day';

export type OwnBudgetInput = {name: string; currency: string; amount: string; tag?: string; categories?: readonly string[]; every: 'month' | 'once'; from?: string; to?: string};
export function ownBudgetIssue(input: OwnBudgetInput): string | null {
  if (!input.name.trim()) return 'Give the budget a name, for example Holiday.';
  if (input.name.trim().length > 40) return 'A name has at most 40 characters.';
  if (!currencyCode.safeParse(input.currency).success) return 'Choose a currency.';
  if (!amountText.safeParse(input.amount).success) return 'Enter the amount above zero, with at most two decimals.';
  if (!input.tag && !input.categories?.length) return 'Choose a tag, or one or more categories, for what counts.';
  if (input.tag && input.categories?.length) return 'Count either a tag or categories, not both.';
  if (input.every === 'once') {
    if (!input.from || !input.to || !/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to)) return 'Choose the first and the last day.';
    if (input.to < input.from) return 'The last day comes after the first.';
    if (daysBetween(input.from, input.to) > 731) return 'A one-time budget runs at most two years.';
  }
  return null;
}
export function withOwnBudget(more: MoneyMore, input: OwnBudgetInput, id: string): MoneyMore {
  const issue = ownBudgetIssue(input); if (issue) throw new Error(issue);
  const list = more.budgets ?? [], same = list.find(b => b.id === id);
  if (!same && list.length >= MAX_OWN_BUDGETS) throw new Error(`Up to ${MAX_OWN_BUDGETS} of your own budgets.`);
  const next: OwnBudget = {id, name: input.name.trim().replace(/\s+/g, ' '), currency: input.currency, amount: input.amount, every: input.every,
    ...(input.tag ? {tag: input.tag} : {categories: [...new Set(input.categories!.map(c => c.trim()).filter(Boolean))].slice(0, 20)}),
    ...(input.every === 'once' ? {from: input.from!, to: input.to!} : {})};
  return {...more, budgets: same ? list.map(b => b.id === id ? next : b) : [...list, next]};
}
export function withoutOwnBudget(more: MoneyMore, id: string): MoneyMore {
  const list = (more.budgets ?? []).filter(b => b.id !== id);
  const {budgets: _b, ...rest} = more; void _b;
  return list.length ? {...rest, budgets: list} : rest;
}
export type OwnBudgetRow = {budget: OwnBudget; from: string; to: string; spent: number; amount: number; left: number; over: boolean; share: number;
  state: 'running' | 'not-started' | 'ended'; daysLeft: number | null; daysToStart: number | null; perDay: number | null; count: number};
/** Each of the person's own budgets in its period (this month for a monthly one), from the money log; `tagged` names the entries with each tag. */
export function ownBudgetRows(more: Pick<MoneyMore, 'budgets'> | null | undefined, entries: readonly MoneyEntry[], tagged: (tag: string) => ReadonlySet<string>, today: string): OwnBudgetRow[] {
  return (more?.budgets ?? []).map(b => {
    const period = b.every === 'month' || !b.from || !b.to ? monthOf(today) : {start: b.from, end: b.to};
    const ids = b.tag ? tagged(b.tag) : null, cats = new Set((b.categories ?? []).map(c => c.toLowerCase()));
    let spent = 0, count = 0;
    for (const e of entries) {
      if (!isSpending(e) || e.currency !== b.currency || e.date < period.start || e.date > period.end) continue; // Round 6 (#425): a refund lowers it
      const c = ids ? (ids.has(e.id) ? mineParts(e).reduce((s, p) => s + p.cents, 0) : 0) : mineParts(e).filter(p => cats.has(p.category.toLowerCase())).reduce((s, p) => s + p.cents, 0);
      if (c) { spent += c; count++; }
    }
    const amount = Math.round(Number(b.amount) * 100), left = amount - spent;
    const state: OwnBudgetRow['state'] = today < period.start ? 'not-started' : today > period.end ? 'ended' : 'running';
    const daysLeft = state === 'running' ? daysBetween(today, period.end) + 1 : null;
    return {budget: b, from: period.start, to: period.end, spent, amount, left, over: spent > amount, share: amount > 0 ? Math.min(1, spent / amount) : 1, state, daysLeft,
      daysToStart: state === 'not-started' ? daysBetween(today, period.start) : null, perDay: perDay(left, daysLeft), count};
  }).sort((x, y) => (x.state === 'ended' ? 1 : 0) - (y.state === 'ended' ? 1 : 0) || x.to.localeCompare(y.to) || x.budget.name.localeCompare(y.budget.name));
}

// ── Payee budgets (Emma's merchant budgets) ─────────────────────────────────────────────────────────────────────────
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** Sets (or, with null, takes off) the amount a month on a watched payee. */
export function withPayeeAmount(record: BudgetsRecord, payee: string, currency: string, amount: string | null): BudgetsRecord {
  if (amount !== null && !amountText.safeParse(amount).success) throw new Error('Enter the amount a month above zero, with at most two decimals.');
  const list = record.payees ?? [];
  if (!list.some(p => same(p.payee, payee) && p.currency === currency)) throw new Error(`${payee} is not watched in ${currency}.`);
  return {...record, payees: list.map(p => { if (!(same(p.payee, payee) && p.currency === currency)) return p; const {amount: _a, ...rest} = p; void _a; return amount === null ? rest : {...rest, amount}; })};
}
export type PayeeBudgetRow = PayeeRow & {amount: number; left: number; over: boolean; near: boolean; perDay: number | null};
/** Watched payees with an amount: this month's spent, left, over, near the limit (80 %), and a day's amount left. */
export function payeeBudgets(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): PayeeBudgetRow[] {
  const amounts = new Map((record.payees ?? []).filter(p => p.amount).map(p => [`${p.currency}|${p.payee.toLowerCase()}`, Math.round(Number(p.amount) * 100)]));
  return payeeRows(record, entries, today).flatMap(r => {
    const amount = amounts.get(`${r.currency}|${r.payee.toLowerCase()}`);
    if (!amount) return [];
    const left = amount - r.thisMonth;
    return [{...r, amount, left, over: left < 0, near: left >= 0 && r.thisMonth >= amount * NEAR_SHARE, perDay: perDay(left, daysLeftInMonth(today))}];
  });
}
