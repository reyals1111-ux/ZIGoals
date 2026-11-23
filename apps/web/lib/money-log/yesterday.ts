import {addLocalDays} from '../local-date';
import {balanceOn} from '../accounts/net-worth';
import type {Accounts} from '../accounts/schema';
import {CASH_LIKE} from '../buffer-days/buffer';
import {formatCurrencyAmount} from '../visual-format';
import {countedBetween} from './counted';
import {fromCents} from './engine';
import type {MoneyEntry} from './schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Hello Money, LEDGER #384): "Yesterday's money" — a short summary of one day:
 * how many entries were logged for it, what was spent and received per currency, and the latest balance of each cash and
 * savings account. Off unless the person turns it on (a morning notification, a quiet line on Today).
 *
 * Every figure is Wealth → Spending's own rule (lib/money-log/counted.ts `countedBetween`, by `countedDayParts`): a shared
 * cost counts the person's share, an entry left out of the figures, either side of a transfer and a Settle-up refund
 * count nothing, and a cost spread over months counts its share on its day of each month, as the budgets and the month
 * calendar count it. Per currency, never converted. The notification's words follow the notification rules: amounts,
 * account names and the summary's own words only where names are allowed; otherwise a count only. Never a payee. Pure.
 */
export type DayMoney = {day: string; entries: number; byCurrency: {currency: string; spent: number; received: number}[]; balances: {name: string; currency: string; cents: number; date: string}[]};
const centsOf = (value: bigint, decimals: number) => Number(decimals >= 2 ? value / 10n ** BigInt(decimals - 2) : value * 10n ** BigInt(2 - decimals));
/** One day's money: entries logged with that date, its counted spending and income per currency, and the cash balances as of `asOf`. */
export function dayMoney(entries: readonly MoneyEntry[], accounts: Accounts | null | undefined, day: string, asOf: string = addLocalDays(day, 1)): DayMoney {
  const spent = countedBetween(entries, day, day, {kind: 'expense'}), received = countedBetween(entries, day, day, {kind: 'income'});
  const byCurrency = [...new Set([...spent.keys(), ...received.keys()])].sort().map(currency => ({currency, spent: spent.get(currency) ?? 0, received: received.get(currency) ?? 0}));
  const balances = (accounts?.items ?? []).flatMap(a => {
    if (a.archivedAt || !CASH_LIKE.includes(a.kind)) return [];
    const b = balanceOn(a, asOf);
    return b ? [{name: a.name, currency: a.currency, cents: centsOf(b.value, b.decimals), date: b.date}] : [];
  });
  return {day, entries: entries.filter(e => e.date === day).length, byCurrency, balances};
}
/** Yesterday, as of today. */
export const yesterdayMoney = (entries: readonly MoneyEntry[], accounts: Accounts | null | undefined, today: string) => dayMoney(entries, accounts, addLocalDays(today, -1), today);
/** Whether there is anything to say for the day (an entry or a counted figure). */
export const hasDayMoney = (d: DayMoney) => d.entries > 0 || d.byCurrency.length > 0;

const fmt = (cents: number, currency: string, locale?: string) => formatCurrencyAmount(fromCents(cents), currency, locale);
/** "3 entries" — the count alone: what a notification says while names are off. */
export const countWords = (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`;
/** Review b5k #10: what a day's line says first — its count, or (a day holding only a spread cost's share) that share; never "0 entries". */
export const SPREAD_ONLY = 'a share of a cost spread over months';
export const dayWords = (d: Pick<DayMoney, 'entries'>) => d.entries > 0 ? countWords(d.entries) : SPREAD_ONLY;
/** "spent €42.10, received €2,000.00" per currency, joined with " · ". */
export const figureWords = (d: DayMoney, locale?: string) => d.byCurrency.map(c => `spent ${fmt(c.spent, c.currency, locale)}${c.received ? `, received ${fmt(c.received, c.currency, locale)}` : ''}`).join(' · ');
/** "Current account €1,230.00" for each cash and savings account with a balance (at most `max`). */
export const balanceWords = (d: DayMoney, max = 2) => d.balances.slice(0, max).map(b => `${b.name} ${fmt(b.cents, b.currency)}`).join(' · ') + (d.balances.length > max ? ` and ${d.balances.length - max} more` : '');

/**
 * The notification plan's input (TIER 3 (PWA)): this morning's summary of yesterday, and tomorrow morning's of today as
 * logged so far (the plan is written again each time ZIGoals opens, so it holds what was logged by then). A day with
 * nothing logged and nothing counted sends nothing. `plain` is the count, the only words shown while names are off;
 * `detail` adds the amounts and account names for names-on.
 */
export type MorningMoneyWake = {id: string; date: string; title: string; plain: string; detail: string};
export function morningMoneyWakes(entries: readonly MoneyEntry[], accounts: Accounts | null | undefined, today: string): MorningMoneyWake[] {
  return [today, addLocalDays(today, 1)].flatMap(date => {
    const d = dayMoney(entries, accounts, addLocalDays(date, -1), today);
    if (!hasDayMoney(d)) return [];
    const plain = dayWords(d), figures = figureWords(d), balances = balanceWords(d);
    return [{id: `money:yesterday:${date}`, date, title: 'Yesterday’s money', plain, detail: [plain, figures, balances].filter(Boolean).join(' · ')}];
  });
}
