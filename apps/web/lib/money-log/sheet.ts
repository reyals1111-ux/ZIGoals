import {addLocalDays} from '../local-date';
import {balanceOn} from '../accounts/net-worth';
import type {Accounts} from '../accounts/schema';
import {csvSafeCell} from '../export/csv-safe';
import {buildXlsx, cellRef, type XlsxCell, type XlsxSheet} from '../export/xlsx';
import {PAID_WITH_WORDS} from '../money-more/quick';
import {allCategories, countedByCategoryBetween, countedCents, countedIn, isCounted} from './counted';
import {fromCents, monthOf} from './engine';
import {bankAccountNames} from './reconcile';
import {MAX_ENTRIES, type MoneyEntry, type MoneyLog} from './schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Foundation Template, LEDGER #389): "Your money as a spreadsheet" — the money
 * log as a table (in Spending, sortable), as a CSV file through the export's own guard (`csvSafeCell`), and as one .xlsx
 * workbook (lib/export/xlsx.ts, no package) with four sheets: Entries, Categories, Accounts, and Month by month with
 * working SUM formulas for each category's year and each month's total.
 *
 * The "Counted" column and every month figure are the shared rule (lib/money-log/counted.ts): `countedCents` per entry (the
 * person's share of a shared cost; nothing for an entry left out, a transfer or a refund passed on), and
 * `countedByCategoryBetween` per month (a cost spread over months by its share in each month, a split entry by its parts)
 * — so the sheet's months add up to what Budgets and "Your money over time" count. "Amount" is what was paid, as the log
 * keeps it. Per currency, never converted. Nothing is stored. Pure.
 */
export type SheetRange = 'month' | '3m' | 'year' | 'all';
export const SHEET_RANGES: readonly SheetRange[] = ['month', '3m', 'year', 'all'];
export function rangeOf(range: SheetRange, today: string, entries: readonly MoneyEntry[]): {from: string; to: string} {
  if (range === 'month') return {from: monthOf(today).start, to: today};
  if (range === '3m') { const [y, m] = today.split('-').map(Number) as [number, number]; const d = new Date(Date.UTC(y, m - 3, 1)); return {from: d.toISOString().slice(0, 10), to: today}; }
  if (range === 'year') return {from: `${today.slice(0, 4)}-01-01`, to: today};
  const first = entries.reduce<string | null>((min, e) => !min || e.date < min ? e.date : min, null);
  return {from: first ?? today, to: entries.reduce((max, e) => e.date > max ? e.date : max, today)};
}
export type CountedAs = 'counted' | 'left out' | 'transfer';
export const countedAs = (e: MoneyEntry): CountedAs => e.transfer ? 'transfer' : e.excluded ? 'left out' : 'counted';
export type SheetRow = {id: string; date: string; kind: MoneyEntry['kind']; category: string; sub: string; note: string; account: string; paidWith: string; amount: number; counted: number; currency: string; as: CountedAs; spread: number};
/** The entries from `from` to `to`, newest first, as the table and the files show them. */
export function sheetRows(entries: readonly MoneyEntry[], from: string, to: string): SheetRow[] {
  return entries.filter(e => e.date >= from && e.date <= to).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ENTRIES).map(e => ({
    id: e.id, date: e.date, kind: e.kind, category: e.category, sub: e.sub ?? '', note: e.note ?? '', account: e.account ?? '', paidWith: e.paidWith ? PAID_WITH_WORDS[e.paidWith].en : '',
    amount: Math.round(Number(e.amount) * 100), counted: countedCents(e), currency: e.currency, as: countedAs(e), spread: e.kind === 'expense' && isCounted(e) ? e.spread ?? 1 : 1,
  }));
}
export type SortKey = 'date' | 'category' | 'amount';
export function sortRows(rows: readonly SheetRow[], key: SortKey, dir: 'ascending' | 'descending'): SheetRow[] {
  const sign = dir === 'ascending' ? 1 : -1;
  return [...rows].sort((a, b) => sign * (key === 'date' ? a.date.localeCompare(b.date) : key === 'category' ? a.category.localeCompare(b.category) : (a.kind === 'expense' ? -a.amount : a.amount) - (b.kind === 'expense' ? -b.amount : b.amount)) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
/** Every month from `from` to `to` ("2026-01" …). */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7) && out.length < 600; m = addLocalDays(`${m}-28`, 7).slice(0, 7)) out.push(m);
  return out;
}
export type MonthGrid = {currency: string; months: string[]; spending: {category: string; cents: number[]}[]; income: {category: string; cents: number[]}[]};
/** Per currency, each category's counted spending (and income) in each month, by the shared rule; months with no record are 0. */
export function monthGrid(entries: readonly MoneyEntry[], from: string, to: string): MonthGrid[] {
  const months = monthsBetween(from, to), currencies = [...new Set(entries.map(e => e.currency))].sort();
  return currencies.flatMap(currency => {
    if (!countedIn(entries, currency, from, to)) return [];
    const mine = entries.filter(e => e.currency === currency);
    const grid = (kind: MoneyEntry['kind']) => {
      const rows = new Map<string, number[]>();
      months.forEach((m, i) => {
        const {start, end} = monthOf(`${m}-01`), lo = start < from ? from : start, hi = end > to ? to : end;
        for (const r of countedByCategoryBetween(mine, lo, hi, kind)) { const row = rows.get(r.category) ?? months.map(() => 0); row[i]! += r.total; rows.set(r.category, row); }
      });
      return [...rows].map(([category, cents]) => ({category, cents})).sort((a, b) => b.cents.reduce((s, x) => s + x, 0) - a.cents.reduce((s, x) => s + x, 0) || a.category.localeCompare(b.category));
    };
    return [{currency, months, spending: grid('expense'), income: grid('income')}];
  });
}
const HEADER = ['Date', 'Kind', 'Category', 'Subcategory', 'Note', 'Account (bank file)', 'Paid with', 'Amount', 'Counted', 'Currency', 'Counted as', 'Spread over months', 'Entry id'];
/** The CSV of these rows: every cell through the export's guard; amounts as plain decimals, never converted. */
export function sheetCsv(rows: readonly SheetRow[]): string {
  const lines = rows.map(r => [r.date, r.kind, r.category, r.sub, r.note, r.account, r.paidWith, fromCents(r.amount), fromCents(r.counted), r.currency, r.as, r.spread, r.id]);
  return [HEADER, ...lines].map(row => row.map(csvSafeCell).join(',')).join('\r\n') + '\r\n';
}
const money = (cents: number): XlsxCell => ({number: cents / 100, format: 'money'});
/** The workbook: Entries, Categories, Accounts and Month by month (with SUM formulas). */
/** Review b5k #8: the business space's workbook holds the business money log's bank-file names only, never the personal accounts. */
export function sheetWorkbook({log, accounts: given, from, to, today, modified, business = false}: {log: MoneyLog; accounts: Accounts | null; from: string; to: string; today: string; modified: Date; business?: boolean}): Uint8Array {
  const accounts = business ? null : given;
  const rows = sheetRows(log.entries, from, to);
  const entries: XlsxSheet = {name: 'Entries', widths: [12, 9, 18, 16, 30, 20, 12, 12, 12, 9, 11, 10, 20], rows: [HEADER, ...rows.map(r => [r.date, r.kind, r.category, r.sub, r.note, r.account, r.paidWith, money(r.amount), money(r.counted), r.currency, r.as, r.spread, r.id] as XlsxCell[])]};
  const categories: XlsxSheet = {name: 'Categories', widths: [10, 22, 34, 10, 10], rows: [['Kind', 'Category', 'Subcategories', 'Yours', 'Archived'], ...(['expense', 'income'] as const).flatMap(kind => allCategories(log, kind).map(c => {
    const own = ((kind === 'expense' ? log.own?.expense : log.own?.income) ?? []).some(x => x.toLowerCase() === c.toLowerCase()), archived = ((kind === 'expense' ? log.archived?.expense : log.archived?.income) ?? []).some(x => x.toLowerCase() === c.toLowerCase());
    return [kind, c, (log.subs?.[c] ?? []).join(', '), own ? 'yes' : '', archived ? 'yes' : ''] as XlsxCell[];
  }))]};
  const accountRows: XlsxCell[][] = (accounts?.items ?? []).filter(a => !a.archivedAt).map(a => { const b = balanceOn(a, today); return [a.name, a.kind, a.currency, b ? {number: Number(b.value) / 10 ** b.decimals, format: 'money'} : null, b?.date ?? '', a.institution ?? '', log.accounts?.notes?.[a.id] ?? '']; });
  const fileNames = [...new Set(log.entries.map(e => e.currency))].flatMap(c => bankAccountNames(log.entries, c).map(n => [n, 'bank file', c, null, '', '', `${log.entries.filter(e => e.currency === c && e.account === n).length} entries`] as XlsxCell[]));
  const accountsSheet: XlsxSheet = {name: 'Accounts', widths: [24, 12, 9, 14, 12, 18, 30], rows: [['Account', 'Kind', 'Currency', 'Latest balance', 'On', 'Bank or provider', 'Note'], ...accountRows, ...fileNames, ...(business ? [['Your accounts and balances are kept in your personal space and are not in this business file.'] as XlsxCell[]] : [])]};
  const grids = monthGrid(log.entries, from, to), monthRows: XlsxCell[][] = [['Counted as your budgets count it: your share, a spread cost by its share each month; left-out entries and transfers not counted.']];
  for (const g of grids) {
    const n = g.months.length, last = n; // columns: A = category, B.. = months, then Total; a row's index is its sheet row
    monthRows.push([`${g.currency}: spending`, ...g.months, 'Total']);
    const first = monthRows.length;
    for (const r of g.spending) { const row = monthRows.length; monthRows.push([r.category, ...r.cents.map(money), {formula: `SUM(${cellRef(1, row)}:${cellRef(last, row)})`}]); }
    const end = monthRows.length - 1;
    if (g.spending.length) monthRows.push(['All spending', ...g.months.map((_, i) => ({formula: `SUM(${cellRef(i + 1, first)}:${cellRef(i + 1, end)})`}) as XlsxCell), {formula: `SUM(${cellRef(n + 1, first)}:${cellRef(n + 1, end)})`}]);
    if (g.income.length) {
      monthRows.push([`${g.currency}: received`, ...g.months, 'Total']);
      for (const r of g.income) { const row = monthRows.length; monthRows.push([r.category, ...r.cents.map(money), {formula: `SUM(${cellRef(1, row)}:${cellRef(last, row)})`}]); }
    }
    monthRows.push([]);
  }
  const monthsSheet: XlsxSheet = {name: 'Month by month', widths: [22, ...(grids[0]?.months ?? []).map(() => 12), 14], rows: monthRows};
  return buildXlsx([entries, categories, accountsSheet, monthsSheet], modified);
}
export const sheetFileName = (from: string, to: string, ext: 'csv' | 'xlsx') => `zigoals-money-${from}-to-${to}.${ext}`;
