import {parseDateCell, type DateFormat} from '../dates';
import type {NumberStyle} from '../numbers';
import {markDuplicateRows} from '../../bankfiles';
import {readAmount, textCleaner, flaggedWarning, isZero} from '../../bankfiles/text';
import type {BankTransaction, RefusedRow} from '../../bankfiles/types';

/**
 * Session AK (7.1): CSV rows mapped to MONEY_FIELDS → the same normalised transaction list the bank files give, so the
 * preview, duplicate marks and money-log entries (lib/bankfiles toMoneyEntries) are shared. The direction comes from
 * an In/out column, else from separate Money out / Money in columns, else from the amount's sign (negative = out).
 * Nothing is guessed: an unreadable date or amount is refused with its reason.
 */
const OUT = /^(d|db|dbit|debit|af|out|withdrawal|payment|expense|uitgave|-)$/i, IN = /^(c|cr|crdt|credit|bij|in|deposit|income|inkomst|\+)$/i;
export function planMoneyRows({rows, mapping, numberStyle, dateFormat, currency = 'EUR'}: {rows: readonly (readonly string[])[]; mapping: Partial<Record<string, number>>; numberStyle: NumberStyle; dateFormat: DateFormat; currency?: string}): {transactions: BankTransaction[]; refused: RefusedRow[]; warnings: string[]} {
  const cell = (row: readonly string[], field: string) => { const i = mapping[field]; return i === undefined ? '' : (row[i] ?? '').trim(); };
  const clean = textCleaner(), transactions: BankTransaction[] = [], refused: RefusedRow[] = [];
  let anyNegative = false, unknownDirection = 0;
  rows.forEach((row, n) => {
    const index = n + 1, date = parseDateCell(cell(row, 'date'), dateFormat);
    if (!date) { refused.push({index, reason: 'The date could not be read in the chosen format.'}); return; }
    let amount: string | null = null, out: boolean | null = null;
    const debit = cell(row, 'debit'), credit = cell(row, 'credit');
    if (mapping.amount !== undefined && cell(row, 'amount')) {
      const read = readAmount(cell(row, 'amount'), numberStyle);
      if (!read) { refused.push({index, reason: 'The amount could not be read.'}); return; }
      amount = read.amount; out = read.negative; anyNegative ||= read.negative;
    } else if (debit || credit) {
      const read = readAmount(debit || credit, numberStyle);
      if (!read) { refused.push({index, reason: 'The amount could not be read.'}); return; }
      amount = read.amount; out = debit ? !read.negative : read.negative;
    }
    if (amount === null || out === null) { refused.push({index, reason: 'This row has no amount.'}); return; }
    if (isZero(amount)) { refused.push({index, reason: 'A zero amount is not kept.'}); return; }
    const direction = cell(row, 'direction');
    if (direction) {
      if (OUT.test(direction)) out = true; else if (IN.test(direction)) out = false;
      else unknownDirection++;
    }
    const code = cell(row, 'currency').toUpperCase() || currency;
    if (!/^[A-Z]{3}$/.test(code)) { refused.push({index, reason: 'The currency could not be read.'}); return; }
    transactions.push({date, amount, currency: code, direction: out ? 'out' : 'in', payee: clean.clean(cell(row, 'payee'), 80), reference: clean.clean(cell(row, 'reference'), 60), description: clean.clean([cell(row, 'note'), cell(row, 'category')].filter(Boolean).join(' · ')), index});
  });
  const warnings = [...flaggedWarning(clean.flagged)];
  if (unknownDirection) warnings.push(`${unknownDirection} ${unknownDirection === 1 ? 'row has' : 'rows have'} an in/out value ZIGoals does not know (such as POS or ATM); the amount's sign decided.`);
  if (transactions.length && mapping.direction === undefined && mapping.debit === undefined && mapping.credit === undefined && !anyNegative) warnings.push('Every amount is positive and no column says in or out, so every row reads as money in. Choose the "In or out" column if the file has one.');
  return {transactions: markDuplicateRows(transactions), refused, warnings};
}
