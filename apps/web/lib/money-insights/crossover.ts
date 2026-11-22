import {monthKey, shiftMonth} from '../budgets/engine';
import {byCategory, monthOf, totals} from '../money-log/engine';
import type {MoneyEntry, MoneyLog} from '../money-log/schema';
import {MAX_INVEST_INCOME} from '../money-log/schema';

/**
 * Session AV lane 2, round 4 (money; Actual's crossover report, LEDGER #345): each month's income in the categories the
 * person marks as investment income (interest, dividends, staking rewards) beside that month's spending, over 24 months,
 * one currency at a time, and the share it covers ("covers 6 % of spending"). Facts from the person's own records: no
 * projection, no "years to freedom" (that stays the FI model, labelled a model), never a target. Pure.
 *
 * One figure: investment income is Wealth → Spending's own `byCategory(…, 'income')` for the marked categories, spending
 * is its own `totals` (left out, transfers and refunds not counted; a shared cost by the person's share). A month with no
 * record in the currency is a gap (unknown), never a zero.
 */
export const CROSSOVER_MONTHS = 24;
/** The income categories offered for the mark: the ones the log uses, then any already marked, A to Z. */
export function incomeCategoriesUsed(entries: readonly MoneyEntry[], marks: readonly string[] = []): string[] {
  return [...new Set([...entries.filter(e => e.kind === 'income').flatMap(e => [e.category, ...(e.parts ?? []).map(p => p.category).filter((c): c is string => !!c)]), ...marks])].sort((a, b) => a.localeCompare(b));
}
export const isMarked = (marks: readonly string[] | undefined, category: string) => !!marks?.some(m => m.toLowerCase() === category.toLowerCase());
export function withInvestMark(log: MoneyLog, category: string, on: boolean): MoneyLog {
  const list = (log.investIncome ?? []).filter(m => m.toLowerCase() !== category.toLowerCase());
  if (on && list.length >= MAX_INVEST_INCOME) throw new Error(`Up to ${MAX_INVEST_INCOME} categories can be marked.`);
  const next = on ? [...list, category.slice(0, 40)] : list;
  if (next.length) return {...log, investIncome: next};
  const {investIncome: _i, ...rest} = log; void _i;
  return rest;
}
export type CrossoverMonth = {month: string; recorded: boolean; invest: number; spending: number; share: number | null};
export type Crossover = {currency: string; months: CrossoverMonth[]; invest: number; spending: number; share: number | null; recordedMonths: number; latest: CrossoverMonth | null};
/** The 24 calendar months to today's (the month still running counts to today), oldest first. */
export function crossover(entries: readonly MoneyEntry[], marks: readonly string[] | undefined, currency: string, today: string, span = CROSSOVER_MONTHS): Crossover {
  const last = monthKey(today), mine = entries.filter(e => e.currency === currency && e.date <= today);
  const recordedSet = new Set(mine.map(e => monthKey(e.date)));
  const months = Array.from({length: span}, (_, i) => shiftMonth(last, i - span + 1)).map((month): CrossoverMonth => {
    const {start, end} = monthOf(`${month}-01`), to = end > today ? today : end, recorded = recordedSet.has(month);
    const invest = recorded ? byCategory(mine, start, to, 'income').filter(r => r.currency === currency && isMarked(marks, r.category)).reduce((s, r) => s + r.total, 0) : 0;
    const spending = recorded ? totals(mine, start, to).find(t => t.currency === currency)?.expenses ?? 0 : 0;
    return {month, recorded, invest, spending, share: recorded && spending > 0 ? invest / spending : null};
  });
  const known = months.filter(m => m.recorded), invest = known.reduce((s, m) => s + m.invest, 0), spending = known.reduce((s, m) => s + m.spending, 0);
  const latest = [...known].reverse().find(m => m.month < last) ?? known.at(-1) ?? null;
  return {currency, months, invest, spending, share: spending > 0 ? invest / spending : null, recordedMonths: known.length, latest};
}
