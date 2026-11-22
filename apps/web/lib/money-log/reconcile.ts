import {minorUnits} from '../money-split/parts';
import type {MoneyEntry, MoneyLog} from './schema';

/**
 * Session AV lane 2, round 4 (money; Actual's reconcile, LEDGER #340): "Check against my bank". The person types their
 * statement's opening and closing balance and its last day, ticks the money-log entries the statement shows, and sees the
 * difference until it is zero; then the ticked entries are marked checked (`checked`: the statement's day) and carry a
 * quiet mark in Spending. Pure.
 *
 * Not a spending figure, on purpose: a statement lists what the bank moved, so here every entry counts whole and as it
 * is — the full amount paid (not the person's share), a transfer and an entry left out of the figures included. Spending
 * figures stay Wealth → Spending's own `totals` / `byCategory`; nothing here changes them.
 */
export type ReconcileInput = {opening: number; closing: number; debt: boolean};
/** The account names bank files wrote on entries in this currency (A to Z), to narrow the list to one account. */
export function bankAccountNames(entries: readonly MoneyEntry[], currency: string): string[] {
  return [...new Set(entries.filter(e => e.currency === currency && e.account).map(e => e.account!))].sort((a, b) => a.localeCompare(b));
}
/** The last statement day checked (for this bank account name, or any), or null. */
export function lastChecked(entries: readonly MoneyEntry[], currency: string, account = ''): string | null {
  let last: string | null = null;
  for (const e of entries) if (e.checked && e.currency === currency && (!account || e.account === account) && (!last || e.checked > last)) last = e.checked;
  return last;
}
/** Entries in the currency not yet checked, from `from` to `through` (both included), oldest first; one bank account name or all. */
export function toCheck(entries: readonly MoneyEntry[], {currency, from, through, account = ''}: {currency: string; from: string; through: string; account?: string}): MoneyEntry[] {
  return entries.filter(e => !e.checked && e.currency === currency && e.date >= from && e.date <= through && (!account || e.account === account))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}
/** What the ticked entries moved, in cents: money in adds, money out takes away (every entry whole). */
export const movement = (ticked: readonly MoneyEntry[]) => ticked.reduce((sum, e) => sum + (e.kind === 'income' ? minorUnits(e.amount) : -minorUnits(e.amount)), 0);
/**
 * The difference still to find: the statement's closing balance less (opening + what the ticked entries moved). For a
 * debt (a credit card) the balance is what is owed, so spending raises it and a payment lowers it. Zero: it matches.
 */
export function difference(input: ReconcileInput, ticked: readonly MoneyEntry[]): number {
  const moved = movement(ticked);
  return input.closing - (input.debt ? input.opening - moved : input.opening + moved);
}
/** The ticked entries marked checked on the statement's day. */
export function markChecked(log: MoneyLog, ids: ReadonlySet<string>, day: string): MoneyLog {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Choose the statement’s day.');
  return {...log, entries: log.entries.map(e => ids.has(e.id) ? {...e, checked: day} : e)};
}
/** Takes the checked mark off one entry (it is found again the next time). */
export function uncheck(log: MoneyLog, id: string): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (e.id !== id || !e.checked) return e; const {checked: _c, ...rest} = e; void _c; return rest; })};
}
/** A typed balance as cents: "1.234,56", "-12,50", "−3", or a sum ("100+20"); null when it cannot be read. */
export function balanceCents(raw: string, read: (text: string) => string | null): number | null {
  const text = raw.trim();
  if (!text) return null;
  const negative = /^[-−–]/.test(text), rest = negative ? text.replace(/^[-−–]\s*/, '') : text;
  if (/^0+(?:[.,]0+)?$/.test(rest)) return 0;
  const value = read(rest);
  return value === null ? null : (negative ? -1 : 1) * minorUnits(value);
}
