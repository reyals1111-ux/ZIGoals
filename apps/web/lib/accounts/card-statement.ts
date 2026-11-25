import Decimal from 'decimal.js';
import {addLocalDays} from '../local-date';
import type {MoneyEntry} from '../money-log/schema';
import {addMonths} from '../bills/cadence';
import type {Account, Accounts} from './schema';

/**
 * Session AW, round 7 X7 (money; Money Manager's card balance, LEDGER #464, on #293's credit card): what a credit card's
 * next payment comes to, from the person's own entries — "Next payment on 25 Nov: €412.30 (statement of 5 Nov)" — and
 * "So far this statement: €96.10". A statement closes on the card's statement day (the wealth sheet's `cards`,
 * lib/wealth-sheet/cards.ts); its amount is what the money log puts on the card between the statement before and that
 * one (each purchase whole, as the card charges it, with refunds and other credits taken off; both sides of a transfer —
 * a card payment from another account — left out), less the payments the person recorded on the card since that
 * statement (the account's `payments`). An entry is on the card when its bank-file account name is the card's name, or,
 * with no account name, when it was "Paid with: credit card" and this is the person's only credit card in that currency.
 * Only entries in the card's currency count; never converted. With no statement day, or with no entry ever on the card,
 * the figure is unknown and is never shown as 0. A fact, not advice. Decimal arithmetic on the stored decimal strings. Pure.
 */
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const lastDay = (month: string) => { const [y, m] = month.split('-').map(Number) as [number, number]; return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
/** The statement day of a month ("YYYY-MM"), the month's last day when it is shorter. */
const onDay = (month: string, day: number) => `${month}-${String(Math.min(day, lastDay(month))).padStart(2, '0')}`;
/** The last statement date on or before `date`. */
export function statementOnOrBefore(day: number, date: string): string {
  const here = onDay(date.slice(0, 7), day);
  return here <= date ? here : onDay(addMonths(`${date.slice(0, 7)}-01`, -1).slice(0, 7), day);
}
/** The statement before `statement` (one month back, on the statement day). */
export const statementBefore = (day: number, statement: string) => onDay(addMonths(`${statement.slice(0, 7)}-01`, -1).slice(0, 7), day);
/** The first date on or after `from` that falls on `day` of its month. */
export function dayOnOrAfter(day: number, from: string): string {
  const here = onDay(from.slice(0, 7), day);
  return here >= from ? here : onDay(addMonths(`${from.slice(0, 7)}-01`, 1).slice(0, 7), day);
}

/** Whether an entry is on this card (see above). `onlyCard`: the card is the only credit card in its currency. */
export function onCard(e: Pick<MoneyEntry, 'account' | 'paidWith' | 'currency'>, card: Pick<Account, 'name' | 'currency'>, onlyCard: boolean): boolean {
  if (e.currency !== card.currency) return false;
  if (e.account) return norm(e.account) === norm(card.name);
  return onlyCard && e.paidWith === 'credit';
}
/** Whether `card` is the only credit card (not archived) in its currency. */
export const onlyCreditCard = (accounts: Accounts | null | undefined, card: Pick<Account, 'id' | 'currency'>) =>
  (accounts?.items ?? []).filter(a => a.kind === 'credit-card' && !a.archivedAt && a.currency === card.currency).every(a => a.id === card.id);

const signed = (e: MoneyEntry) => e.kind === 'expense' ? new Decimal(e.amount) : new Decimal(e.amount).neg();
const sum = (list: readonly MoneyEntry[]) => list.reduce((s, e) => s.plus(signed(e)), new Decimal(0));
const fixed = (d: Decimal) => d.toFixed(2);
export type CardStatement =
  | {state: 'no-day'}
  | {state: 'no-entries'; statementDay: number; lastStatement: string}
  | {
    state: 'known'; currency: string; statementDay: number;
    /** The last statement closed (on or before today), and what is on the card since it, through today. */
    lastStatement: string; soFar: {amount: string; count: number};
    /** The next payment: its due day, its statement, and — once that statement has closed — its amount. */
    next: null | {due: string; statement: string; open: boolean; charged: string | null; paid: string | null; amount: string | null; count: number};
  };
/**
 * The card's statement figures on `today`. `statementDay` and `dueDay` are the card's days (null: not kept); `entries` is the
 * money log's. A due day without a statement day says nothing of an amount.
 */
export function cardStatement(card: Account, entries: readonly MoneyEntry[], {statementDay, dueDay, onlyCard}: {statementDay: number | null; dueDay: number | null; onlyCard: boolean}, today: string): CardStatement {
  if (!statementDay) return {state: 'no-day'};
  const mine = entries.filter(e => !e.transfer && onCard(e, card, onlyCard)), lastStatement = statementOnOrBefore(statementDay, today);
  if (!mine.length) return {state: 'no-entries', statementDay, lastStatement};
  const between = (after: string, through: string) => mine.filter(e => e.date > after && e.date <= through);
  const since = between(lastStatement, today);
  let next: Extract<CardStatement, {state: 'known'}>['next'] = null;
  if (dueDay) {
    const due = dayOnOrAfter(dueDay, today), statement = statementOnOrBefore(statementDay, addLocalDays(due, -1)), open = statement > today;
    if (open) next = {due, statement, open, charged: null, paid: null, amount: null, count: between(lastStatement, today).length};
    else {
      const list = between(statementBefore(statementDay, statement), statement), charged = sum(list);
      const paid = card.payments.filter(p => p.date > statement && p.date <= today).reduce((s, p) => s.plus(new Decimal(p.value).div(new Decimal(10).pow(p.decimals))), new Decimal(0));
      const left = Decimal.max(0, charged.minus(paid));
      next = {due, statement, open, charged: fixed(charged), paid: paid.isZero() ? null : fixed(paid), amount: fixed(left), count: list.length};
    }
  }
  return {state: 'known', currency: card.currency, statementDay, lastStatement, soFar: {amount: fixed(sum(since)), count: since.length}, next};
}
