import {monthKey, monthView, type BudgetRow} from '../../budgets/engine';
import type {BudgetsRecord} from '../../budgets/schema';
import {fromCents} from '../../money-log/engine';
import type {MoneyEntry} from '../../money-log/schema';
import {formatCurrencyAmount, formatDate, formatMonth} from '../../visual-format';

/**
 * Session AM (ADR-038; art direction §4, Wealth): the "Budgets" widget's figures, pure, from the Wealth page's own month
 * view (lib/budgets/engine.ts monthView, as Wealth → Budgets by category and the `budgets` tool use it): each budget's
 * amount for this month (with what earlier months carried over) against what the money log shows spent in its category
 * and currency, in exact cents. A budget is in its own currency; nothing is converted and nothing is added across
 * currencies (the hero only *counts* budgets). Facts from the log; no projection and no advice.
 */
const money = (amountCents: number, currency: string) => formatCurrencyAmount(fromCents(amountCents), currency);
export type BudgetLine = {
  id: string; category: string; currency: string; over: boolean;
  /** Spent ÷ available, not capped (1.2 is 20 % over); the meter caps it, the words say it. */
  share: number;
  spent: string; available: string;
  /** "€180.00 left", "all used" or "over by €40.00". */
  words: string;
  /** Session AV lane 2 (fr-money, FR-L-3): what is left, in cents (below zero when over), for an answer's own words. */
  leftCents: number;
  /** Session AV (F-BUDGET-TARGETS): the budget's target in words, English and Dutch, when it has one. */
  target?: {en: string; nl: string};
};
export type BudgetsCard = {
  state: 'empty' | 'live';
  month: string;
  /** Over first, then the fullest; each in its own currency. */
  lines: BudgetLine[];
  within: number; count: number;
  /** "3 of 4". */
  hero: string;
  daysLeft: number | null;
  /** Spending this month in categories with no budget, per currency (never added across). */
  unbudgeted: {currency: string; text: string; categories: number}[];
  /** The day of the newest expense entry of this month, for the foot. */
  lastDate: string | null;
};
export const budgetWords = (row: Pick<BudgetRow, 'left' | 'over' | 'currency'>): string =>
  row.over ? `over by ${money(-row.left, row.currency)}` : row.left === 0 ? 'all used' : `${money(row.left, row.currency)} left`;

/**
 * Session AV (F-BUDGET-TARGETS): a target in plain words, as the Budgets row says it (information, not advice).
 * Session AV lane 2 (Dutch dates, R5): `nlMonth` writes the month of the Dutch words (a Dutch answer passes its own
 * month writer, "december 2026"); the default keeps the card as it was.
 */
export function targetWords(r: Pick<BudgetRow, 'currency' | 'budgeted'> & {target?: BudgetRow['target']}, nlMonth: (month: string) => string = formatMonth): {en: string; nl: string} {
  const t = r.target!, m = (c: number) => money(c, r.currency), en = `target ${m(t.amount)} by ${formatMonth(t.by)}`, nl = `doel ${m(t.amount)} uiterlijk ${nlMonth(t.by)}`;
  if (t.state === 'reached') return {en: `${en}: reached`, nl: `${nl}: bereikt`};
  if (t.state === 'past') return {en: `${en}: that month has gone by, ${m(t.toGo)} was still to go`, nl: `${nl}: die maand is voorbij, er moest nog ${m(t.toGo)} bij`};
  if (t.monthsLeft === 0) return {en: `${en}: this is the month, ${m(t.toGo)} still to go`, nl: `${nl}: dit is de maand, nog ${m(t.toGo)} te gaan`};
  return t.state === 'on-track'
    ? {en: `${en}: ${m(t.setAside)} set aside, ${m(t.perMonth)} a month from next month, on track`, nl: `${nl}: ${m(t.setAside)} opzij, ${m(t.perMonth)} per maand vanaf volgende maand, op schema`}
    : {en: `${en}: ${m(t.setAside)} set aside, ${m(t.perMonth)} a month from next month, ${m(t.short)} a month short`, nl: `${nl}: ${m(t.setAside)} opzij, ${m(t.perMonth)} per maand vanaf volgende maand, ${m(t.short)} per maand te weinig`};
}
export function budgetsCard(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string, nlMonth?: (month: string) => string): BudgetsCard {
  const month = monthKey(today), view = monthView(entries, record, month, today);
  const lines = view.rows.map(r => ({id: r.id, category: r.category, currency: r.currency, over: r.over, share: r.available > 0 ? r.spent / r.available : r.spent > 0 ? 2 : 0,
    spent: money(r.spent, r.currency), available: money(r.available, r.currency), words: budgetWords(r), leftCents: r.left, ...(r.target ? {target: targetWords(r, nlMonth)} : {})}))
    .sort((a, b) => Number(b.over) - Number(a.over) || b.share - a.share || a.category.localeCompare(b.category));
  const within = lines.filter(l => !l.over).length;
  const loose = new Map<string, {cents: number; categories: number}>();
  for (const u of view.unbudgeted) { const t = loose.get(u.currency) ?? {cents: 0, categories: 0}; t.cents += u.spent; t.categories++; loose.set(u.currency, t); }
  const lastDate = entries.reduce((latest, e) => e.kind === 'expense' && e.date.startsWith(month) && e.date <= today && e.date > latest ? e.date : latest, '');
  return {
    state: lines.length ? 'live' : 'empty', month, lines, within, count: lines.length, hero: `${within} of ${lines.length}`, daysLeft: view.daysLeft,
    unbudgeted: [...loose].sort(([a], [b]) => a.localeCompare(b)).map(([currency, t]) => ({currency, text: money(t.cents, currency), categories: t.categories})),
    lastDate: lastDate || null,
  };
}
/** The foot's time: the newest entry counted this month. */
export const budgetsAsOf = (card: BudgetsCard): string => card.lastDate ? `last entry ${formatDate(card.lastDate, {year: false})}` : 'nothing logged yet this month';
/** The widget's table for assistive technology: the same figures as text. */
export function budgetsRows(card: BudgetsCard, shown = card.lines.length): [string, string][] {
  return [
    ['Budgets within plan this month', `${card.hero}`],
    ...card.lines.slice(0, shown).map(l => [l.category, `${l.spent} of ${l.available} spent, ${l.words}`] as [string, string]),
    ...(card.lines.length > shown ? [['More budgets', `${card.lines.length - shown} more on Wealth`] as [string, string]] : []),
    ...card.unbudgeted.map(u => [`Spent with no budget in ${u.currency}`, u.text] as [string, string]),
    ...(card.daysLeft !== null ? [['Days left this month', String(card.daysLeft)] as [string, string]] : []),
  ];
}
