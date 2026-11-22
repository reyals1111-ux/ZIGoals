import {addLocalDays} from '../local-date';
import {monthKey, shiftMonth} from '../budgets/engine';
import {monthOf, totals, weekOf} from './engine';
import {countedBetween, countedByCategoryBetween, foldName, type CountedFilter} from './counted';
import {searchEntries, type MoneyQuery} from './search';
import {parseNumberInput} from '../numbers/parse';
import type {MoneyEntry} from './schema';
import {MAX_QUESTIONS, type MoneyMore, type SavedQuestion} from '../money-more/schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's Query Tool, LEDGER #344): a money search kept with a name ("Eating out
 * on weekends"), up to ten, and drawn as a chart by month, by week or by category over its range, with its total and its
 * monthly average. Only the filters are kept (on the money extras record, `questions`), never an entry or an amount
 * found, so the chart always reads the log as it is now. Pure.
 *
 * One figure: what the search finds is summed by the shared rule in lib/money-log/counted.ts (review b4f #2:
 * `countedBetween` for a month, a week and the range, `countedByCategoryBetween` by category) — left out, transfers and
 * refunds not counted, a shared cost by the person's share, a spread cost by its share in each of its months.
 */
export type SearchState = {query: MoneyQuery; min: string; max: string; tag: string};
const clip = (s: string | undefined, n: number) => { const t = (s ?? '').trim(); return t ? t.slice(0, n) : undefined; };
/**
 * Review b4f #4: an amount limit read as the search reads it (`parseNumberInput`: "1.250,00", "1,250.00", "12,50"), kept
 * as two decimals; empty or zero is no limit. One that cannot be read, or has more than two decimals, is refused in words
 * (never dropped), so the saved search is the search the person sees.
 */
function amount(raw: string, which: 'from' | 'up to'): string | undefined {
  if (!raw.trim()) return undefined;
  const r = parseNumberInput(raw);
  if (!r.ok || !/^\d{1,10}(?:\.\d{1,2})?$/.test(r.text)) throw new Error(`The amount ${which} “${raw.trim()}” cannot be read: type it as a number, for example 50 or 12,50.`);
  return r.value > 0 ? r.value.toFixed(2) : undefined;
}
/** The filters of the search as kept (empty ones left out). */
export function toQuestion(id: string, name: string, s: SearchState, by?: 'week' | 'category'): SavedQuestion {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the search a name, for example Eating out on weekends.');
  if (clean.length > 60) throw new Error('A name has at most 60 characters.');
  const q = s.query, out: Record<string, unknown> = {id, name: clean,
    text: clip(q.text, 80), not: clip(q.not, 80), payee: clip(q.payee, 80), category: clip(q.category, 40), sub: clip(q.sub, 40),
    kind: q.kind && q.kind !== 'all' ? q.kind : undefined, from: q.from || undefined, to: q.to || undefined,
    min: amount(s.min, 'from'), max: amount(s.max, 'up to'), counted: q.counted && q.counted !== 'all' ? q.counted : undefined, tax: q.tax ? true : undefined,
    paidWith: q.paidWith || undefined, tag: clip(s.tag, 24), by};
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as SavedQuestion;
}
/** The search state a saved one opens with. */
export function fromQuestion(q: SavedQuestion): SearchState {
  return {query: {text: q.text ?? '', kind: q.kind ?? 'all', category: q.category ?? '', from: q.from ?? '', to: q.to ?? '', not: q.not ?? '', payee: q.payee ?? '', counted: q.counted ?? 'all', tax: !!q.tax, paidWith: q.paidWith ?? '', sub: q.sub ?? ''}, min: q.min ?? '', max: q.max ?? '', tag: q.tag ?? ''};
}
export const questionsOf = (more: Pick<MoneyMore, 'questions'> | null | undefined): readonly SavedQuestion[] => more?.questions ?? [];
export function saveQuestion(more: MoneyMore, q: SavedQuestion): MoneyMore {
  const list = questionsOf(more), same = list.find(x => x.name.toLowerCase() === q.name.toLowerCase());
  if (same) return {...more, questions: list.map(x => x.id === same.id ? {...q, id: same.id} : x)};
  if (list.length >= MAX_QUESTIONS) throw new Error(`Up to ${MAX_QUESTIONS} saved searches. Remove one to keep this one.`);
  return {...more, questions: [...list, q]};
}
export function removeQuestion(more: MoneyMore, id: string): MoneyMore {
  const list = questionsOf(more).filter(q => q.id !== id);
  if (list.length) return {...more, questions: list};
  const {questions: _q, ...rest} = more; void _q;
  return rest;
}
export const setQuestionBy = (more: MoneyMore, id: string, by: 'month' | 'week' | 'category'): MoneyMore => ({...more, questions: questionsOf(more).map(q => { if (q.id !== id) return q; const {by: _b, ...rest} = q; void _b; return by === 'month' ? rest : {...rest, by}; })});

/** The entries a saved search finds now (`tagged`: the ids its tag names, from the tags record). */
export function questionEntries(entries: readonly MoneyEntry[], q: SavedQuestion, tagged?: ReadonlySet<string>): MoneyEntry[] {
  const s = fromQuestion(q), cents = (t: string) => t ? Math.round(Number(t) * 100) : undefined, minCents = cents(s.min), maxCents = cents(s.max);
  return searchEntries(entries, {...s.query, ...(minCents !== undefined ? {minCents} : {}), ...(maxCents !== undefined ? {maxCents} : {}), ...(q.tag ? {tagged: tagged ?? new Set()} : {})});
}
export type Bar = {key: string; label: string; cents: number};
export type QuestionChart = {currency: string; figure: 'spent' | 'received'; from: string; to: string; by: 'month' | 'week' | 'category'; bars: Bar[]; total: number; months: number; monthly: number; count: number};
const MAX_WEEKS = 26, MAX_MONTHS = 24;
/**
 * The chart of a saved search, per currency (never converted). Its range is the search's own dates, else from the first
 * entry it finds to today; the monthly average is the total over the calendar months of that range. Spending unless the
 * search asks for income only.
 */
export function questionChart(found: readonly MoneyEntry[], q: SavedQuestion, today: string, weekStartsOn: 'monday' | 'sunday' = 'monday'): QuestionChart[] {
  if (!found.length) return [];
  const figure = q.kind === 'income' ? 'received' : 'spent', kind = q.kind === 'income' ? 'income' : 'expense';
  const first = found.reduce((m, e) => e.date < m ? e.date : m, found[0]!.date), to = q.to && q.to < today ? q.to : today, from = q.from ?? first;
  const by = q.by ?? 'month', months = Math.max(1, (Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7))) - (Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7))) + 1);
  return [...new Set(found.map(e => e.currency))].sort().map(currency => {
    // Review b4f #2: every bar, the total and the average count as the budgets do (`countedBetween`), a spread cost by its share in each month.
    // Review b4f #1: a search on a category counts only the parts in that category (a split entry adds just its part there, as
    // This month by category does); on a subcategory, only the parts in the entry's own category.
    const only: CountedFilter['only'] = q.category ? (_e, p) => foldName(p.category) === foldName(q.category!) : q.sub ? (e, p) => foldName(p.category) === foldName(e.category) : undefined;
    const mine = found.filter(e => e.currency === currency), sum = (a: string, b: string) => countedBetween(mine, a, b, {kind, currency, ...(only ? {only} : {})}).get(currency) ?? 0;
    const sums = totals(mine, from, to), total = sum(from, to), count = sums.find(x => x.currency === currency)?.count ?? 0;
    let bars: Bar[];
    if (by === 'category') bars = countedByCategoryBetween(mine, from, to, kind, only).filter(r => r.currency === currency).map(r => ({key: r.category, label: r.category, cents: r.total}));
    else if (by === 'week') {
      bars = [];
      for (let w = weekOf(to, weekStartsOn).start; w >= weekOf(from, weekStartsOn).start && bars.length < MAX_WEEKS; w = addLocalDays(w, -7)) bars.unshift({key: w, label: w, cents: sum(w < from ? from : w, addLocalDays(w, 6) > to ? to : addLocalDays(w, 6))});
    } else {
      bars = [];
      for (let m = monthKey(to); m >= monthKey(from) && bars.length < MAX_MONTHS; m = shiftMonth(m, -1)) { const r = monthOf(`${m}-01`); bars.unshift({key: m, label: m, cents: sum(r.start < from ? from : r.start, r.end > to ? to : r.end)}); }
    }
    return {currency, figure, from, to, by, bars, total, months, monthly: Math.round(total / months), count};
  });
}
