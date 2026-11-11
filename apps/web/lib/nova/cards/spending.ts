import {addLocalDays} from '../../local-date';
import {byCategory, cents, fromCents, monthOf, totals} from '../../money-log/engine';
import type {MoneyEntry, MoneyLog} from '../../money-log/schema';
import {formatCurrencyAmount, formatDate, formatPercent} from '../../visual-format';
import {splitWealthTotals} from '../../wealth-total';
import {RANGE_DAYS, RANGE_WORDS, type WidgetRange} from '../stage/record';

/**
 * Session AM (ADR-038; art direction §4, Wealth): the "Spending" widget's figures, pure, from the person's own money log
 * with the log's own sums (lib/money-log/engine.ts totals and byCategory, as Wealth → Spending and the `spending` tool
 * use them: exact cents, a split entry counted by its parts). One currency leads (the one with the most logged as spent
 * in the range, as the Wealth headline picks its own); every other currency is listed apart, never converted and never
 * added. Only what was logged counts: nothing logged in the range is "nothing logged", never "you spent 0".
 */
export type SpendingWindow = {from: string; to: string; words: string;
  /** The range of days counted back from today; absent: this calendar month so far. */
  range?: Exclude<WidgetRange, 'month'>};
/**
 * The range: this calendar month so far when the request names none or names the month; else the last 7, 90 or 365 days,
 * today included. Session AM (design review AM-D13): one definition of "the month" in every size, in NOVA's words and in
 * the on-device answer ("You spent … this month" is the calendar month, as Wealth → Spending counts it). Before, a
 * request that said "this month" drew the last 30 days beside words about the calendar month.
 */
export function spendingWindow(today: string, range?: WidgetRange): SpendingWindow {
  if (!range || range === 'month' || !Object.hasOwn(RANGE_DAYS, range)) return {from: monthOf(today).start, to: today, words: 'this month'};
  return {from: addLocalDays(today, -(RANGE_DAYS[range] - 1)), to: today, words: `in ${RANGE_WORDS[range]}`, range};
}
export const cardMoney = (amountCents: number, currency: string) => formatCurrencyAmount(fromCents(amountCents), currency);
export type SpendingCategory = {category: string; cents: number; share: number; text: string; percent: string};
export type SpendingCard = {
  /** 'empty': the log holds no expense at all; 'quiet': none in this range; 'live': figures. */
  state: 'empty' | 'quiet' | 'live';
  window: SpendingWindow;
  currency: string | null;
  totalCents: number; total: string;
  /** Expense entries in the leading currency inside the range. */
  entries: number;
  /** Every category of the leading currency by size, each with its share of that currency's total. */
  categories: SpendingCategory[];
  /** The largest single expense entry in the leading currency. */
  largest: {cents: number; text: string; what: string; date: string} | null;
  /** What was logged as spent in other currencies, each on its own (never converted, never added). */
  others: {currency: string; cents: number; text: string}[];
  /** The day of the newest expense entry counted here (any currency), for the foot. */
  lastDate: string | null;
};

export function spendingCard(log: Pick<MoneyLog, 'entries'>, today: string, range?: WidgetRange): SpendingCard {
  const window = spendingWindow(today, range), expenses = log.entries.filter(e => e.kind === 'expense');
  const inRange = expenses.filter(e => e.date >= window.from && e.date <= window.to);
  const blank = {window, currency: null, totalCents: 0, total: '—', entries: 0, categories: [], largest: null, others: [], lastDate: null};
  if (!expenses.length) return {state: 'empty', ...blank};
  if (!inRange.length) return {state: 'quiet', ...blank, lastDate: expenses.reduce((latest, e) => e.date > latest ? e.date : latest, '')};
  const perCurrency = totals(inRange, window.from, window.to).map(t => ({currency: t.currency, value: BigInt(t.expenses)}));
  const {primary, others} = splitWealthTotals(perCurrency), currency = primary!.currency, totalCents = Number(primary!.value);
  const own = inRange.filter(e => e.currency === currency);
  const categories = byCategory(own, window.from, window.to).map(c => {
    const share = totalCents > 0 ? c.total / totalCents : 0;
    return {category: c.category, cents: c.total, share, text: cardMoney(c.total, currency), percent: formatPercent(share * 100)};
  });
  const top = own.reduce<MoneyEntry | null>((best, e) => !best || cents(e.amount) > cents(best.amount) || (cents(e.amount) === cents(best.amount) && e.date > best.date) ? e : best, null);
  return {
    state: 'live', window, currency, totalCents, total: cardMoney(totalCents, currency), entries: own.length, categories,
    largest: top ? {cents: cents(top.amount), text: cardMoney(cents(top.amount), currency), what: top.note?.trim() || top.category, date: top.date} : null,
    others: others.map(o => ({currency: o.currency, cents: Number(o.value), text: cardMoney(Number(o.value), o.currency)})),
    lastDate: inRange.reduce((latest, e) => e.date > latest ? e.date : latest, ''),
  };
}
const day = (date: string) => formatDate(date, {year: false});
/** The foot's time: the day of the newest entry counted. */
export const spendingAsOf = (card: SpendingCard): string | null => card.lastDate ? `last entry ${day(card.lastDate)}` : null;
/** The widget's table for assistive technology: the same figures as text. */
export function spendingRows(card: SpendingCard, shown = card.categories.length): [string, string][] {
  if (card.state !== 'live') return [[`Spent ${card.window.words}`, 'Nothing logged']];
  return [
    [`Spent ${card.window.words}`, `${card.total} in ${card.entries} ${card.entries === 1 ? 'entry' : 'entries'}`],
    ...card.categories.slice(0, shown).map(c => [c.category, `${c.text}, ${c.percent} of the total`] as [string, string]),
    ...(card.largest ? [['Largest entry', `${card.largest.text} for ${card.largest.what} on ${day(card.largest.date)}`] as [string, string]] : []),
    ...card.others.map(o => [`Also spent in ${o.currency}`, `${o.text}, never converted`] as [string, string]),
  ];
}
