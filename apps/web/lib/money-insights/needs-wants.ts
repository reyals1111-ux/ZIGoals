import {byCategory, monthOf, totals} from '../money-log/engine';
import {moneyLogSchema, NEED_WANT, type MoneyEntry, type MoneyLog, type NeedWant} from '../money-log/schema';
import {addLocalDays} from '../local-date';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's needs, wants and savings, LEDGER #295): each spending category marked
 * need, want or saving — the person's own choice, kept on the money log (`needWant`) — and a month's spending in each mark
 * as a share of that month's income, per currency, never converted. Only the person's own shares are shown: no split is
 * ever offered as a target or a "should" (no money advice; the 50/30/20 rule is never named or shown). Spending and income
 * are Wealth → Spending's own figures (`totals`, `byCategory` in lib/money-log/engine.ts): left-out entries, transfers and
 * Settle-up refunds are not counted, a shared cost counts the person's share, a split entry counts in each part's
 * category. Pure.
 */
export const NEED_WANT_WORDS: Readonly<Record<NeedWant, {en: string; nl: string}>> = {need: {en: 'Needs', nl: 'Nodig'}, want: {en: 'Wants', nl: 'Wensen'}, saving: {en: 'Saving', nl: 'Sparen'}};
export type NeedWantMonth = {
  currency: string; month: string; income: number; spent: number;
  parts: Record<NeedWant | 'unmarked', {cents: number; categories: string[]}>;
  /** Income less all spending (null without income); never called saving unless the person marks a category so. */
  notSpent: number | null;
};
const fold = (s: string) => s.trim().toLowerCase();
/** The mark of a category (case does not matter), or null. */
export function markOf(marks: MoneyLog['needWant'], category: string): NeedWant | null {
  if (!marks) return null;
  const hit = Object.entries(marks).find(([k]) => fold(k) === fold(category));
  return hit ? hit[1] : null;
}
/** The log with one category's mark set, or cleared with null. */
export function setMark(log: MoneyLog, category: string, mark: NeedWant | null): MoneyLog {
  const name = category.trim().slice(0, 40);
  if (!name) throw Error('Choose a category.');
  if (mark !== null && !(NEED_WANT as readonly string[]).includes(mark)) throw Error('Choose need, want or saving.');
  const rest = Object.fromEntries(Object.entries(log.needWant ?? {}).filter(([k]) => fold(k) !== fold(name)));
  const next = mark ? {...rest, [name]: mark} : rest, {needWant: _n, ...others} = log; void _n;
  return moneyLogSchema.parse(Object.keys(next).length ? {...others, needWant: next} : others);
}
/** One month (its key, "2026-11"; the month still running counts up to its last day) per currency with spending or income. */
export function needWantMonth(entries: readonly MoneyEntry[], marks: MoneyLog['needWant'], month: string): NeedWantMonth[] {
  const {start, end} = monthOf(`${month}-01`), out = new Map<string, NeedWantMonth>();
  const row = (currency: string) => { let r = out.get(currency); if (!r) { r = {currency, month, income: 0, spent: 0, parts: {need: {cents: 0, categories: []}, want: {cents: 0, categories: []}, saving: {cents: 0, categories: []}, unmarked: {cents: 0, categories: []}}, notSpent: null}; out.set(currency, r); } return r; };
  for (const t of totals(entries, start, end)) { const r = row(t.currency); r.income = t.income; r.spent = t.expenses; }
  for (const c of byCategory(entries, start, end)) { const part = row(c.currency).parts[markOf(marks, c.category) ?? 'unmarked']; part.cents += c.total; part.categories.push(c.category); }
  const rows = [...out.values()].filter(r => r.income || r.spent);
  for (const r of rows) r.notSpent = r.income ? r.income - r.spent : null;
  return rows.sort((a, b) => b.income - a.income || b.spent - a.spent || a.currency.localeCompare(b.currency));
}
/** A part as a share of the month's income (0–1 and above), or null without income. */
export const shareOfIncome = (cents: number, r: Pick<NeedWantMonth, 'income'>) => r.income > 0 ? cents / r.income : null;
/** The categories to mark: those spent in during the last 90 days, then any already marked, A to Z. */
export function categoriesToMark(entries: readonly MoneyEntry[], marks: MoneyLog['needWant'], today: string): string[] {
  const seen = new Map<string, string>();
  for (const c of byCategory(entries, addLocalDays(today, -89), today)) if (!seen.has(fold(c.category))) seen.set(fold(c.category), c.category);
  for (const k of Object.keys(marks ?? {})) if (!seen.has(fold(k))) seen.set(fold(k), k);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
