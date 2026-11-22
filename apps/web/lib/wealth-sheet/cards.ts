import {moneyText, owedAfterPayments} from '../accounts/net-worth';
import type {Account, Accounts} from '../accounts/schema';
import type {ManualBill} from '../bills/store';
import type {BillsRecord} from '../bills/schema';
import {addLocalDays} from '../local-date';
import {wealthSheetSchema, type WealthSheet} from './schema';

/**
 * Session AV lane 2, round 3 (money; Simplifi's credit card dashboard, LEDGER #293): per credit card, from numbers the
 * person types — its limit, the share of it used, what is still available, the day its statement is made and the day its
 * payment is due — kept in the wealth sheet (`cards`), since the accounts record is strict. "Used" is what the card owes
 * today as the accounts show it (its latest balance less the payments recorded since; lib/accounts/net-worth.ts
 * `owedAfterPayments`). A payment reminder is an ordinary bill (monthly, on the due day, for what is owed now) that the
 * person adds with one tap and can change or remove in Upcoming bills; its id is `card-<account id>`. Facts only. Pure.
 */
export type CardInput = {limit: string | null; statementDay: number | null; dueDay: number | null};
export type CardState = {
  id: string; name: string; currency: string;
  /** What it owes today, in cents; null without a balance. */
  owed: number | null; limit: number | null; share: number | null; available: number | null;
  statementDay: number | null; dueDay: number | null; nextStatement: string | null; nextDue: string | null;
};
const cents = (amount: string) => Math.round(Number(amount) * 100);
export const reminderId = (accountId: string) => `card-${accountId}`;
/** The next day on or after `from` that falls on `day` of its month (a shorter month uses its last day). */
export function nextMonthDay(day: number, from: string): string {
  for (let k = 0; k < 2; k++) {
    const [y, m] = from.split('-').map(Number) as [number, number], at = new Date(Date.UTC(y, m - 1 + k, 1)), last = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
    const date = `${at.toISOString().slice(0, 7)}-${String(Math.min(day, last)).padStart(2, '0')}`;
    if (date >= from) return date;
  }
  return addLocalDays(from, 31);
}
export function withCard(sheet: WealthSheet, accountId: string, input: CardInput): WealthSheet {
  if (input.limit !== null && !(/^\d{1,13}(\.\d{1,2})?$/.test(input.limit) && Number(input.limit) > 0)) throw Error('Enter the limit above zero, with at most two decimals, or leave it empty.');
  for (const d of [input.statementDay, input.dueDay]) if (d !== null && !(Number.isInteger(d) && d >= 1 && d <= 31)) throw Error('A day of the month is 1 to 31.');
  const card = {...(input.limit !== null ? {limit: input.limit} : {}), ...(input.statementDay !== null ? {statementDay: input.statementDay} : {}), ...(input.dueDay !== null ? {dueDay: input.dueDay} : {})};
  const rest = Object.fromEntries(Object.entries(sheet.cards ?? {}).filter(([k]) => k !== accountId));
  const cards = Object.keys(card).length ? {...rest, [accountId]: card} : rest, {cards: _c, ...others} = sheet; void _c;
  return wealthSheetSchema.parse(Object.keys(cards).length ? {...others, cards} : others);
}
export function cardState(account: Account, sheet: WealthSheet | null | undefined, today: string): CardState {
  const c = sheet?.cards?.[account.id], owedMoney = owedAfterPayments(account, today), owed = owedMoney ? cents(moneyText(owedMoney)) : null;
  const limit = c?.limit ? cents(c.limit) : null, statementDay = c?.statementDay ?? null, dueDay = c?.dueDay ?? null;
  return {id: account.id, name: account.name, currency: account.currency, owed, limit,
    share: limit && owed !== null ? owed / limit : null, available: limit !== null && owed !== null ? limit - owed : null,
    statementDay, dueDay, nextStatement: statementDay ? nextMonthDay(statementDay, today) : null, nextDue: dueDay ? nextMonthDay(dueDay, today) : null};
}
/** Every credit card that is not archived, with what the person typed for it. */
export const cardStates = (accounts: Accounts | null | undefined, sheet: WealthSheet | null | undefined, today: string): CardState[] =>
  (accounts?.items ?? []).filter(a => a.kind === 'credit-card' && !a.archivedAt).map(a => cardState(a, sheet, today));
/** The bill a payment reminder adds (null without a due day or with nothing owed). */
export function reminderBill(state: CardState): ManualBill | null {
  if (!state.nextDue || !state.owed || state.owed <= 0) return null;
  return {title: `${state.name} payment`.slice(0, 80), amount: (state.owed / 100).toFixed(2), currency: state.currency, cadence: 'monthly', nextDue: state.nextDue, category: 'Bills'};
}
export const hasReminder = (bills: BillsRecord | null | undefined, accountId: string) => !!bills?.bills.some(b => b.id === reminderId(accountId));
