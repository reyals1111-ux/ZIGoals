import {expenseCategory, incomeCategory} from '../../money-log/category';
import {AMOUNT_MAX, MAX_ENTRIES, moneyLogSchema, type MoneyEntry, type MoneyLog} from '../../money-log/schema';
import {csvTable, safeLine} from '../../workouts/import-lifts';
import {realDay} from './common';
import {stableHash} from './ids';

/**
 * Session AK (A15): YNAB's register export (web: plan name → Export Plan; the ZIP's register file, CSV or, for currencies
 * written with a comma, TSV; FORMATS.md section a — the path from YNAB's help, the columns observed, confidence Low):
 * `Account, Flag, Date, Payee, Category Group/Category, Category Group, Category, Memo, Outflow, Inflow, Cleared`.
 * Each outflow becomes an expense and each inflow an income in the money log, in the currency the person chooses (YNAB
 * writes amounts in the plan's format, such as `€1.234,56`, without a currency code). YNAB's categories are the person's
 * own, so each maps to the money log's nearest category by its words (or "Other"); the YNAB name is kept beside it.
 * Transfers between the person's own accounts are not spending and are left out. Dates follow the plan's own format; the
 * order (day/month or month/day) is worked out from the dates themselves, or asked for when every date could be either.
 */
export const YNAB_LABEL = 'YNAB';
export const isYnabHeader = (line: string) => /\boutflow\b/i.test(line) && /\binflow\b/i.test(line) && /\bpayee\b/i.test(line);
export type DateOrder = 'ymd' | 'dmy' | 'mdy';
/** YNAB's own starter category names, to the money log's categories; anything else goes by the money log's words. */
const YNAB_WORDS: [RegExp, string][] = [
  [/eating out|dining|restaurant|take ?away|coffee/i, 'Food & drink'], [/groceries|grocery|food$/i, 'Groceries'],
  [/rent|mortgage|home maintenance|furnishing|household/i, 'Home'], [/utilit|electric|water|internet|phone|insurance|taxes?\b/i, 'Bills'],
  [/subscription|streaming|software|music/i, 'Subscriptions'], [/auto|car\b|fuel|gas\b|transport|transit|parking/i, 'Transport'],
  [/medical|health|pharmacy|doctor|dental|fitness|gym/i, 'Health'], [/fun|entertainment|hobb|vacation|travel|games?\b/i, 'Fun'],
  [/clothing|shopping/i, 'Shopping'], [/gift|giving|charit|donation/i, 'Gifts'],
];
const ynabExpense = (group: string, category: string, words: string) => YNAB_WORDS.find(([re]) => re.test(category))?.[1] ?? YNAB_WORDS.find(([re]) => re.test(group))?.[1] ?? expenseCategory(category, words);
export type YnabPlan = {entries: MoneyEntry[]; dateOrder: DateOrder; ambiguousDates: boolean; transfers: number; warnings: string[]};

/**
 * An amount as written by YNAB ("€1.234,56", "$1,234.56", "1 234,56 kr", "-12.00") as a two-decimal string; undefined
 * when empty or zero (no movement), null when it cannot be read.
 */
export function ynabAmount(text: string): string | undefined | null {
  let t = text.trim().replace(/[\s  ']/g, '');
  if (!t) return undefined;
  const negative = /-|^\(.*\)$/.test(t);
  t = t.replace(/[^\d.,]/g, '');
  if (!t || !/\d/.test(t)) return null;
  const lastDot = t.lastIndexOf('.'), lastComma = t.lastIndexOf(','), last = Math.max(lastDot, lastComma);
  let whole = t, cents = '';
  if (last >= 0) {
    const after = t.length - last - 1, both = lastDot >= 0 && lastComma >= 0;
    // The later separator is the decimal one when both appear, or when one is followed by one or two digits.
    if (both || after === 1 || after === 2) { whole = t.slice(0, last); cents = t.slice(last + 1); }
  }
  whole = whole.replace(/[.,]/g, '');
  if (!/^\d*$/.test(whole) || !/^\d{0,2}$/.test(cents)) return null;
  const value = Number(`${whole || '0'}.${cents.padEnd(2, '0')}`);
  if (!Number.isFinite(value) || value > AMOUNT_MAX) return null;
  if (value === 0) return undefined;
  return negative ? null : value.toFixed(2);
}
const DATE = /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/;
/** Which order the dates are in: any first part above 12 means day first, any middle part above 12 month first. */
export function dateOrderOf(dates: readonly string[]): {order: DateOrder | null; ambiguous: boolean} {
  let dayFirst = false, monthFirst = false, iso = false, any = false;
  for (const d of dates) {
    const m = DATE.exec(d.trim()); if (!m) continue; any = true;
    if (m[1]!.length === 4) { iso = true; continue; }
    if (Number(m[1]) > 12) dayFirst = true;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  if (!any) return {order: null, ambiguous: false};
  if (iso) return {order: 'ymd', ambiguous: false};
  if (dayFirst && monthFirst) return {order: null, ambiguous: false};
  return dayFirst ? {order: 'dmy', ambiguous: false} : monthFirst ? {order: 'mdy', ambiguous: false} : {order: null, ambiguous: true};
}
export function ynabDate(text: string, order: DateOrder): string | null {
  const m = DATE.exec(text.trim()); if (!m) return null;
  const [a, b, c] = [m[1]!, m[2]!, m[3]!];
  const [y, mo, d] = order === 'ymd' ? [a, b, c] : order === 'dmy' ? [c, b, a] : [c, a, b];
  if (y.length !== 4) return null;
  const day = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return realDay(day, '1990-01-01', '2199-12-31') ? day : null;
}

export async function readYnab(text: string, {currency, today, now, dateOrder}: {currency: string; today: string; now: Date; dateOrder?: DateOrder}): Promise<YnabPlan> {
  if (!/^[A-Z]{3}$/.test(currency)) throw Error('Choose the currency this YNAB plan is in.');
  const {header, rows} = await csvTable(text, 'YNAB register');
  const at = (name: string) => header.get(name);
  if ([at('date'), at('payee'), at('outflow'), at('inflow')].some(i => i === undefined)) throw Error('This is not a YNAB register export (its columns are different). In YNAB on the web: your plan’s name → Export Plan, then choose the Register file from the ZIP.');
  const get = (row: string[], name: string) => (row[at(name) ?? -1] ?? '').trim();
  const found = dateOrderOf(rows.map(r => get(r, 'date')));
  const order = found.order ?? dateOrder ?? (found.ambiguous ? 'mdy' : null);
  if (!order) throw Error('The dates in this file are in a format ZIGoals cannot read. Export again with a date format such as 2026-10-01.');
  const entries: MoneyEntry[] = [], warnings: string[] = [], seen = new Map<string, number>(), createdAt = now.toISOString();
  let transfers = 0, unreadable = 0, future = 0, empty = 0;
  for (const row of rows) {
    const payee = safeLine(get(row, 'payee'), 120), memo = safeLine(get(row, 'memo'), 200);
    if (/^transfer\s*:/i.test(payee)) { transfers++; continue; }
    const date = ynabDate(get(row, 'date'), order), out = ynabAmount(get(row, 'outflow')), inn = ynabAmount(get(row, 'inflow'));
    if (!date || out === null || inn === null) { unreadable++; continue; }
    if (date > today) { future++; continue; }
    if (out === undefined && inn === undefined) { empty++; continue; }
    const group = safeLine(get(row, 'category group'), 60), category = safeLine(get(row, 'category'), 60) || safeLine(get(row, 'category group/category').split(':').at(-1) ?? '', 60);
    const ynabCategory = [group, category].filter(Boolean).join(': ').slice(0, 80);
    const words = `${group} ${category} ${payee} ${memo}`;
    const account = safeLine(get(row, 'account'), 60);
    for (const [kind, amount] of [['expense', out], ['income', inn]] as const) {
      if (amount === undefined) continue;
      const key = `${account}|${date}|${payee}|${memo}|${kind}|${amount}`, n = seen.get(key) ?? 0; seen.set(key, n + 1);
      const note = [payee, memo].filter(Boolean).join(' · ').slice(0, 200).trim();
      entries.push({id: `money-ynab-${stableHash(`${key}|${n}`)}`, kind, amount, currency, date, createdAt,
        category: kind === 'expense' ? ynabExpense(group, category, words) : incomeCategory(undefined, `${payee} ${memo}`),
        ...(note ? {note} : {}), importedFrom: 'ynab', ...(ynabCategory ? {importedCategory: ynabCategory} : {})} as MoneyEntry);
    }
  }
  if (!entries.length) throw Error('This YNAB export has no spending or income ZIGoals can read.');
  if (found.ambiguous && !dateOrder) warnings.push('Every date in this file could be day/month or month/day; they are read as month/day. Choose day/month if that is wrong.');
  if (transfers) warnings.push(`${transfers.toLocaleString('en')} ${transfers === 1 ? 'transfer' : 'transfers'} between your own accounts ${transfers === 1 ? 'is' : 'are'} not spending and ${transfers === 1 ? 'was' : 'were'} left out.`);
  if (unreadable) warnings.push(`${unreadable.toLocaleString('en')} ${unreadable === 1 ? 'row has' : 'rows have'} a date or amount ZIGoals cannot read and ${unreadable === 1 ? 'was' : 'were'} skipped.`);
  if (future) warnings.push(`${future.toLocaleString('en')} ${future === 1 ? 'transaction is' : 'transactions are'} dated after today (scheduled) and ${future === 1 ? 'was' : 'were'} skipped.`);
  if (empty) warnings.push(`${empty.toLocaleString('en')} ${empty === 1 ? 'row has' : 'rows have'} no amount and ${empty === 1 ? 'was' : 'were'} skipped.`);
  return {entries, dateOrder: order, ambiguousDates: found.ambiguous, transfers, warnings};
}
/** Adds the entries not imported before (by id); refuses an import that would pass the money log's 10,000 entries. */
export function mergeMoneyEntries(log: MoneyLog, add: readonly MoneyEntry[]): {next: MoneyLog; added: number; duplicates: number} {
  const have = new Set(log.entries.map(e => e.id)), fresh = add.filter(e => !have.has(e.id));
  if (log.entries.length + fresh.length > MAX_ENTRIES) throw Error(`The money log keeps up to ${MAX_ENTRIES.toLocaleString('en')} entries; you have ${log.entries.length.toLocaleString('en')} and this export adds ${fresh.length.toLocaleString('en')}. Nothing was imported.`);
  return {next: moneyLogSchema.parse({...log, entries: [...log.entries, ...fresh]}), added: fresh.length, duplicates: add.length - fresh.length};
}
