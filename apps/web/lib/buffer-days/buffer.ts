import {addLocalDays} from '../local-date';
import {balanceOn} from '../accounts/net-worth';
import type {Accounts, AccountKind} from '../accounts/schema';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';

/**
 * Session AK (lane M, item 11, COMPETITORS M4): buffer days — how many days the person's cash would cover their usual
 * spending: the latest balances of their cash and savings accounts ÷ the average daily spending in the money log over
 * the trailing 30 days, per currency, never converted. Pure and exact (minor units, BigInt). Unknown is never zero: no
 * cash balance, too little history or no spending in the window each give a reason instead of a number.
 */
export const CASH_LIKE: readonly AccountKind[] = ['cash', 'savings'];
export const WINDOW_DAYS = 30, MIN_HISTORY_DAYS = 14;
export type KnownBuffer = {currency: string; known: true; days: number; cashCents: bigint; dailyCents: number; windowDays: number; missingBalances: number; earlier: number | null};
export type UnknownBuffer = {currency: string; known: false; reason: 'no-cash' | 'short-history' | 'no-spending'; missingBalances: number};
export type BufferRow = KnownBuffer | UnknownBuffer;
const toCents = (value: bigint, decimals: number) => decimals >= 2 ? value / 10n ** BigInt(decimals - 2) : value * 10n ** BigInt(2 - decimals);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

function measure(accounts: Accounts, entries: readonly MoneyEntry[], currency: string, day: string): Omit<KnownBuffer, 'earlier'> | UnknownBuffer {
  let cash = 0n, withBalance = 0, missing = 0;
  for (const a of accounts.items) {
    if (a.archivedAt || a.currency !== currency || !CASH_LIKE.includes(a.kind)) continue;
    const b = balanceOn(a, day);
    if (b) { cash += toCents(b.value, b.decimals); withBalance++; } else missing++;
  }
  if (!withBalance) return {currency, known: false, reason: 'no-cash', missingBalances: missing};
  const mine = entries.filter(e => e.currency === currency && e.date <= day);
  const first = mine.reduce<string | null>((m, e) => m === null || e.date < m ? e.date : m, null);
  const from = addLocalDays(day, -(WINDOW_DAYS - 1)), start = first && first > from ? first : from;
  const windowDays = first ? dayDiff(start, day) + 1 : 0;
  if (windowDays < MIN_HISTORY_DAYS) return {currency, known: false, reason: 'short-history', missingBalances: missing};
  let spent = 0;
  for (const e of mine) if (e.kind === 'expense' && e.date >= start) spent += minorUnits(e.amount);
  if (spent <= 0) return {currency, known: false, reason: 'no-spending', missingBalances: missing};
  const days = Number(cash * BigInt(windowDays) / BigInt(spent));
  return {currency, known: true, days, cashCents: cash, dailyCents: Math.round(spent / windowDays), windowDays, missingBalances: missing};
}
/** One row per currency that has a cash-like account, the one with the most cash first; `earlier` is the same figure 30 days ago, when known. */
export function bufferDays(accounts: Accounts, entries: readonly MoneyEntry[], today: string): BufferRow[] {
  const currencies = [...new Set(accounts.items.filter(a => !a.archivedAt && CASH_LIKE.includes(a.kind)).map(a => a.currency))];
  const rows: BufferRow[] = currencies.map(currency => {
    const now = measure(accounts, entries, currency, today);
    if (!now.known) return now;
    const before = measure(accounts, entries, currency, addLocalDays(today, -WINDOW_DAYS));
    return {...now, earlier: before.known ? before.days : null};
  });
  return rows.sort((a, b) => Number((b.known ? b.cashCents : -1n) - (a.known ? a.cashCents : -1n)) || a.currency.localeCompare(b.currency));
}
/** One plain sentence per row, no judgement words. */
export function bufferSentence(row: BufferRow): string {
  if (!row.known) return row.reason === 'no-cash' ? `This cannot be worked out yet: add a balance to a cash or savings account in ${row.currency}.`
    : row.reason === 'short-history' ? `This cannot be worked out yet: log your ${row.currency} spending for at least ${MIN_HISTORY_DAYS} days.`
    : `This cannot be worked out yet: no ${row.currency} spending is logged in the last ${WINDOW_DAYS} days.`;
  const lead = row.missingBalances ? 'at least ' : '';
  return `Your cash covers ${lead}${row.days} ${row.days === 1 ? 'day' : 'days'} of your usual spending.`;
}
export function bufferTrend(row: BufferRow): string | null {
  if (!row.known || row.earlier === null) return null;
  return row.earlier === row.days ? `The same as 30 days ago.` : `30 days ago: ${row.earlier} ${row.earlier === 1 ? 'day' : 'days'}.`;
}
