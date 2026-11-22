import {billPriceChange, candidatePriceChange, type PriceChange} from '../../bills/price-change';
import {detectBills, openCandidates} from '../../bills/detect';
import type {BillsRecord} from '../../bills/schema';
import {monthKey} from '../../budgets/engine';
import {readyToAssign} from '../../budgets/ready-to-assign';
import type {BudgetsRecord} from '../../budgets/schema';
import {AGE_MIN_HISTORY_DAYS, AGE_WINDOW_DAYS, ageOfMoney} from '../../money-insights/age-of-money';
import {currenciesOf} from '../../money-insights/cash-flow';
import {PACE_MIN_MONTHS, ordinal, spendingPace} from '../../money-insights/spending-pace';
import type {MoneyLog} from '../../money-log/schema';
import type {MoneyTags} from '../../money-tags/schema';
import {allTags, tagTotals} from '../../money-tags/tags';
import {formatMonth, formatNumber} from '../../visual-format';
import type {WidgetRange} from '../stage/record';
import {cardMoney, spendingWindow, type SpendingWindow} from './spending';

/**
 * Session AM-2 (step 3, "NOVA connected"): the figures of five Wealth widgets NOVA makes on request, pure, each from the
 * page's own engine and read only: "Ready to assign" (lib/budgets/ready-to-assign.ts), "Age of money"
 * (lib/money-insights/age-of-money.ts), "Spending pace" (lib/money-insights/spending-pace.ts), "Bill changes"
 * (lib/bills/price-change.ts) and "Spending by tag" (lib/money-tags/tags.ts).
 *
 * The rules they share: exact cents, one currency at a time (never converted, never added across); the money log's own
 * currency leads where it has records, the others are listed apart. A figure the records cannot give is "not enough
 * records yet" with what is missing, never a zero. Comparisons of records only: no forecast, no advice. Nothing here
 * moves money or writes a record.
 */
type Log = Pick<MoneyLog, 'entries'> & {currency?: string};
/** The row that leads: the money log's own currency when it has a row, else the first row with a figure, else the first. */
function lead<T extends {currency: string}>(rows: readonly T[], log: Log, has: (row: T) => boolean): T | null {
  return rows.find(r => r.currency === log.currency && has(r)) ?? rows.find(has) ?? rows.find(r => r.currency === log.currency) ?? rows[0] ?? null;
}

/* ---- Ready to assign ---- */
export type ReadyRow = {currency: string; status: 'ok' | 'no-income'; /** Logged as income this month (text), and what the month's budgets hold. */ income: string | null; held: string; heldCents: number;
  /** Income minus what the budgets hold; negative: more is budgeted than was logged as income. null: no income logged. */ readyCents: number | null; ready: string | null; over: boolean; /** The share of the income the budgets hold (0–1; null without income). */ share: number | null; words: string};
export type ReadyCard = {state: 'empty' | 'live'; month: string; monthName: string; rows: ReadyRow[]; lead: ReadyRow | null};
export function readyCard(log: Log, budgets: BudgetsRecord, today: string): ReadyCard {
  const month = monthKey(today);
  const rows = readyToAssign(log.entries, budgets, month).map((r): ReadyRow => {
    const held = cardMoney(r.held, r.currency);
    if (r.status === 'no-income') return {currency: r.currency, status: 'no-income', income: null, held, heldCents: r.held, readyCents: null, ready: null, over: false, share: null, words: `Nothing logged as income this month; your budgets hold ${held}`};
    const over = r.ready < 0, income = cardMoney(r.income, r.currency);
    return {currency: r.currency, status: 'ok', income, held, heldCents: r.held, readyCents: r.ready, ready: cardMoney(Math.abs(r.ready), r.currency), over, share: r.income > 0 ? Math.min(1, r.held / r.income) : null,
      words: over ? `${cardMoney(-r.ready, r.currency)} more in budgets than logged as income` : `${cardMoney(r.ready, r.currency)} ready to assign: ${income} logged as income, minus ${held} your budgets hold`};
  });
  return {state: rows.length ? 'live' : 'empty', month, monthName: formatMonth(month), rows, lead: lead(rows, log, r => r.status === 'ok')};
}
export const readyRows = (card: ReadyCard): [string, string][] => card.rows.length ? card.rows.map(r => [`Ready to assign in ${r.currency}, ${card.monthName}`, r.words]) : [['Ready to assign', 'Nothing logged as income this month, and no budgets yet']];

/* ---- Age of money ---- */
export type AgeRow = {currency: string; status: 'ok' | 'not-enough'; days: number | null; daysText: string | null; /** The age against the 90 days it is read over (0–1). */ share: number | null; uncounted: string | null; words: string};
export type AgeCard = {state: 'empty' | 'live'; rows: AgeRow[]; lead: AgeRow | null};
const dayCount = (n: number) => `${formatNumber(n, {maximumFractionDigits: 1})} ${n === 1 ? 'day' : 'days'}`;
export function ageCard(log: Log, today: string): AgeCard {
  const rows = currenciesOf(log.entries, today).map((c): AgeRow => {
    const a = ageOfMoney(log.entries, c, today);
    if (a.status === 'ok') {
      const uncounted = a.unmatched > 0 ? `${cardMoney(a.unmatched, c)} of ${cardMoney(a.spent, c)} spent is not counted: no income logged in the ${AGE_WINDOW_DAYS} days covers it` : null;
      return {currency: c, status: 'ok', days: a.days, daysText: dayCount(a.days), share: Math.min(1, a.days / AGE_WINDOW_DAYS), uncounted, words: `The money you spent in the last ${AGE_WINDOW_DAYS} days was on average ${dayCount(a.days)} old`};
    }
    const why = a.reason === 'history' ? `this needs at least ${AGE_MIN_HISTORY_DAYS} days of entries, and there ${a.historyDays === 1 ? 'is 1 day' : `are ${a.historyDays} days`}`
      : a.reason === 'no-income' ? `no income logged in the last ${AGE_WINDOW_DAYS} days` : `no spending that logged income covers in the last ${AGE_WINDOW_DAYS} days`;
    return {currency: c, status: 'not-enough', days: null, daysText: null, share: null, uncounted: null, words: `Not enough records yet: ${why}`};
  });
  return {state: rows.length ? 'live' : 'empty', rows, lead: lead(rows, log, r => r.status === 'ok')};
}
export const ageRows = (card: AgeCard): [string, string][] => card.rows.length ? card.rows.flatMap(r => [[`Age of money in ${r.currency}`, r.words] as [string, string], ...(r.uncounted ? [[`Not counted in ${r.currency}`, r.uncounted] as [string, string]] : [])]) : [['Age of money', 'Nothing logged yet']];

/* ---- Spending pace ---- */
export type PaceRow = {currency: string; status: 'ok' | 'not-enough'; day: number; dayWords: string; months: number; usual: string | null; thisMonth: string | null; usualCents: number | null; thisCents: number | null;
  /** This month minus the usual; null without a usual figure. */ differenceCents: number | null; difference: string | null; direction: 'up' | 'down' | 'flat' | null; words: string};
export type PaceCard = {state: 'empty' | 'live'; rows: PaceRow[]; lead: PaceRow | null};
export function paceCard(log: Log, today: string): PaceCard {
  const rows = currenciesOf(log.entries, today).map((c): PaceRow => {
    const p = spendingPace(log.entries, c, today), dayWords = ordinal(p.day);
    if (p.status === 'not-enough') return {currency: c, status: 'not-enough', day: p.day, dayWords, months: p.months, usual: null, thisMonth: null, usualCents: null, thisCents: null, differenceCents: null, difference: null, direction: null,
      words: `Not enough months yet: this needs ${PACE_MIN_MONTHS} earlier months with spending logged, and ${p.months === 0 ? 'there are none' : p.months === 1 ? 'there is 1' : `there are ${p.months}`}`};
    const usual = cardMoney(p.usual, c), now = cardMoney(p.thisMonth, c), size = cardMoney(Math.abs(p.difference), c);
    return {currency: c, status: 'ok', day: p.day, dayWords, months: p.months, usual, thisMonth: now, usualCents: p.usual, thisCents: p.thisMonth, differenceCents: p.difference, difference: size,
      direction: p.difference > 0 ? 'up' : p.difference < 0 ? 'down' : 'flat',
      words: `By the ${dayWords} you usually have spent ${usual}; this month ${now}${p.difference === 0 ? ', the same' : `, ${size} ${p.difference > 0 ? 'more' : 'less'}`}`};
  });
  return {state: rows.length ? 'live' : 'empty', rows, lead: lead(rows, log, r => r.status === 'ok')};
}
export const paceRows = (card: PaceCard): [string, string][] => card.rows.length ? card.rows.map(r => [`Your usual pace in ${r.currency}`, `${r.words}. A comparison of your records, not a forecast`]) : [['Your usual pace', 'Nothing logged yet']];

/* ---- Bill changes ---- */
export type BillChangeLine = {id: string; title: string; direction: 'up' | 'down'; by: string; then: string; now: string; since: string; /** The month of `since` ("2026-07"), for a Dutch line (Session AV lane 2, loose ends). */ month: string; words: string};
export type BillChangesCard = {/** 'empty': no bills kept; 'none': bills kept, no payment differs from the one before it. */ state: 'empty' | 'none' | 'live'; bills: number;
  /** Bills found in the money log: only those have payments to compare. */ fromLog: number; lines: BillChangeLine[]};
export function billChangesCard(bills: BillsRecord, log: Log, today: string): BillChangesCard {
  const line = (id: string, title: string, c: PriceChange): BillChangeLine => {
    const by = cardMoney(c.cents, c.currency), then = cardMoney(c.previous, c.currency), now = cardMoney(c.latest, c.currency), since = formatMonth(c.sinceMonth);
    return {id, title, direction: c.direction, by, then, now, since, month: c.sinceMonth.slice(0, 7), words: `went ${c.direction} by ${by} since ${since} (${then} then, ${now} now)`};
  };
  // Session AU (ADR-044 D-SHOWCASE, helper E): the bills found in the money log but not confirmed yet count too, as Wealth →
  // Bills and ZIGi's answer count them (lib/ai/local-answers/exact/money.ts), so the three never disagree.
  const found = openCandidates(detectBills(log.entries, today), bills);
  const lines = [...bills.bills.flatMap((b): BillChangeLine[] => { const c = billPriceChange(b, log.entries, today); return c ? [line(b.id, b.title, c)] : []; }),
    ...found.flatMap((k): BillChangeLine[] => { const c = candidatePriceChange(k, log.entries, today); return c ? [line(k.key, k.title, c)] : []; })];
  const kept = bills.bills.length + found.length;
  return {state: !kept ? 'empty' : lines.length ? 'live' : 'none', bills: kept, fromLog: bills.bills.filter(b => b.origin === 'detected' && !!b.matchKey).length + found.length, lines};
}
export const billChangesRows = (card: BillChangesCard): [string, string][] => card.lines.length ? card.lines.map(l => [l.title, l.words])
  : [['Bill changes', card.state === 'empty' ? 'No bills kept yet' : card.fromLog ? 'No bill’s latest payment differs from the one before it' : 'None of your bills came from the money log, so there are no payments to compare']];

/* ---- Spending by tag ---- */
export type TagRow = {tag: string; cents: number; text: string; received: string | null; entries: number; /** Against the largest tag (an entry counts whole under each of its tags, so the tags do not add up to a total). */ share: number};
export type MoneyTagsCard = {/** 'empty': no tag on any entry the log holds; 'quiet': tags exist, none in this range. */ state: 'empty' | 'quiet' | 'live'; window: SpendingWindow; currency: string | null; rows: TagRow[];
  /** Tags on entries in other currencies, each apart. */ others: {currency: string; tags: number}[]; /** Tags in use at all, and the newest tagged entry's day in the range. */ tags: number; lastDate: string | null};
export function moneyTagsCard(tags: MoneyTags, log: Log, today: string, range?: WidgetRange): MoneyTagsCard {
  const window = spendingWindow(today, range), all = allTags(tags, log.entries), totals = tagTotals(log.entries, tags, window.from, window.to);
  const byCurrency = new Map<string, number>();
  for (const t of totals) byCurrency.set(t.currency, (byCurrency.get(t.currency) ?? 0) + t.spent + t.received);
  const currencies = [...byCurrency.keys()].sort((a, b) => (b === log.currency ? 1 : 0) - (a === log.currency ? 1 : 0) || byCurrency.get(b)! - byCurrency.get(a)! || a.localeCompare(b));
  const currency = currencies[0] ?? null, own = totals.filter(t => t.currency === currency), top = Math.max(1, ...own.map(t => t.spent));
  const live = new Set(own.map(t => t.tag)), tagged = log.entries.filter(e => e.date >= window.from && e.date <= window.to && e.currency === currency && (tags.tags[e.id] ?? []).some(t => live.has(t)));
  return {
    state: !all.length ? 'empty' : own.length ? 'live' : 'quiet', window, currency,
    rows: own.map(t => ({tag: t.tag, cents: t.spent, text: cardMoney(t.spent, t.currency), received: t.received ? cardMoney(t.received, t.currency) : null, entries: t.entries, share: t.spent / top})),
    others: currencies.slice(1).map(c => ({currency: c, tags: totals.filter(t => t.currency === c).length})), tags: all.length,
    lastDate: tagged.reduce<string | null>((latest, e) => !latest || e.date > latest ? e.date : latest, null),
  };
}
export function moneyTagsRows(card: MoneyTagsCard, shown = card.rows.length): [string, string][] {
  if (card.state !== 'live') return [[`Spending by tag ${card.window.words}`, card.state === 'empty' ? 'No tags yet' : 'No tagged entry in this range']];
  return [
    ...card.rows.slice(0, shown).map(r => [`Tag “${r.tag}”`, `${r.text} spent${r.received ? `, ${r.received} received` : ''} in ${r.entries} ${r.entries === 1 ? 'entry' : 'entries'}`] as [string, string]),
    ...(card.rows.length > shown ? [['More tags', `${card.rows.length - shown} more on Wealth`] as [string, string]] : []),
    ['How tags count', 'An entry counts whole under each of its tags, so tags do not add up to a total'],
    ...card.others.map(o => [`Also tagged in ${o.currency}`, `${o.tags} ${o.tags === 1 ? 'tag' : 'tags'}, never converted`] as [string, string]),
  ];
}
