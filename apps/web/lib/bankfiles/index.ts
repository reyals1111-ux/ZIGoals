import {expenseCategory, incomeCategory} from '../money-log/category';
import {AMOUNT_MAX, MAX_ENTRIES, moneyEntrySchema, type MoneyEntry, type MoneyLog} from '../money-log/schema';
import {parseCamt} from './camt';
import {parseMt940} from './mt940';
import {parseOfx} from './ofx';
import {normalisePayee} from '../bills/detect';
import {BANK_FILE_TOO_LARGE, BankFileError, MAX_BANK_FILE_BYTES, type BankFormat, type BankStatement, type BankTransaction, type RefusedRow} from './types';

export * from './types';
/**
 * Session AK (A14): a bank statement file → one preview, on the device. The bytes are decoded (UTF-8, else UTF-16 with
 * its byte-order mark, else Windows-1252, which MT940 often is), the format is recognised from the content (never the
 * file name alone), parsed with its own capped reader, repeats are marked, and the rows become money-log entries only
 * when the person confirms. Nothing is sent anywhere.
 */
export function decodeBankFile(bytes: Uint8Array): string {
  if (bytes.length > MAX_BANK_FILE_BYTES) throw new BankFileError(BANK_FILE_TOO_LARGE);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  try { return new TextDecoder('utf-8', {fatal: true}).decode(bytes).replace(/^﻿/, ''); }
  catch { return new TextDecoder('windows-1252').decode(bytes); }
}
export function sniffFormat(text: string): BankFormat | null {
  const head = text.slice(0, 4096);
  if (/BkToCstmrStmt|camt\.053/.test(head) || /<(?:\w+:)?BkToCstmrStmt[\s>]/.test(text.slice(0, 65536))) return 'camt053';
  if (/OFXHEADER|<OFX>/i.test(head)) return 'ofx';
  if (/(^|\n|\{4:\s*\n?):(20|25|28C|60F):/.test(head)) return 'mt940';
  return null;
}
export type BankParseResult = ({ok: true} & BankStatement) | {ok: false; error: string};
/** Reads the text as a bank file; every failure is a plain reason (an unexpected one too), never a throw. */
export function parseBankFile(text: string): BankParseResult {
  try {
    if (text.length > MAX_BANK_FILE_BYTES) throw new BankFileError(BANK_FILE_TOO_LARGE);
    if (/\u0000/.test(text.slice(0, 4096))) throw new BankFileError('This is not a text file (a spreadsheet, PDF or another binary file). Export the statement as CAMT.053, OFX or MT940 and choose it again.');
    const format = sniffFormat(text);
    if (!format) throw new BankFileError('This file is not a CAMT.053, OFX/QFX or MT940 statement. For a CSV, use the CSV import.');
    const statement = format === 'camt053' ? parseCamt(text) : format === 'ofx' ? parseOfx(text) : parseMt940(text);
    return {ok: true, ...markDuplicates(statement)};
  } catch (cause) {
    return {ok: false, error: cause instanceof BankFileError ? cause.message : 'This file could not be read. Nothing was read.'};
  }
}
/** The duplicate key the brief names: date, amount, direction, currency, payee and reference. */
export const duplicateKey = (t: Pick<BankTransaction, 'date' | 'amount' | 'currency' | 'direction' | 'payee' | 'reference'>) => [t.date, t.amount, t.currency, t.direction, normalisePayee(t.payee) || t.payee.toLowerCase(), t.reference.toLowerCase()].join('|');
/** A later row with the same key as an earlier one is a possible duplicate (two real coffees can look the same: the person decides). */
export function markDuplicateRows(list: readonly BankTransaction[]): BankTransaction[] {
  const seen = new Set<string>();
  return list.map(t => { const k = duplicateKey(t); const dup = seen.has(k); seen.add(k); return dup ? {...t, duplicate: true} : t; });
}
export const markDuplicates = (statement: BankStatement): BankStatement => ({...statement, transactions: markDuplicateRows(statement.transactions)});
/** The note a bank row becomes: "payee · description", short. */
export const noteOf = (t: Pick<BankTransaction, 'payee' | 'description' | 'reference'>) => [t.payee, t.description && t.description !== t.payee ? t.description : ''].filter(Boolean).join(' · ').slice(0, 200) || t.reference.slice(0, 200);
/** Already in the money log: the same date, kind, amount, currency and note. */
export function alreadyLogged(t: BankTransaction, log: Pick<MoneyLog, 'entries'>): boolean {
  const kind = t.direction === 'out' ? 'expense' : 'income', note = noteOf(t), amount = Number(t.amount);
  return log.entries.some(e => e.date === t.date && e.kind === kind && e.currency === t.currency && Number(e.amount) === amount && (e.note ?? '') === note);
}
/**
 * The rows the person chose, as money-log entries: amounts with more than two decimals, zero or above a billion are
 * refused with a reason (never rounded), the category comes from the person's words as the log's own form does.
 */
export function toMoneyEntries(rows: readonly BankTransaction[], log: Pick<MoneyLog, 'entries'>, now: Date, newId: () => string): {entries: MoneyEntry[]; refused: RefusedRow[]} {
  const entries: MoneyEntry[] = [], refused: RefusedRow[] = [], room = Math.max(0, MAX_ENTRIES - log.entries.length);
  for (const t of rows) {
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(t.amount)) { refused.push({index: t.index, reason: 'The amount has more than two decimals or is too large.'}); continue; }
    if (Number(t.amount) <= 0 || Number(t.amount) > AMOUNT_MAX) { refused.push({index: t.index, reason: Number(t.amount) <= 0 ? 'A zero amount is not kept.' : 'The amount is above a billion.'}); continue; }
    const kind = t.direction === 'out' ? 'expense' as const : 'income' as const, note = noteOf(t);
    const words = `${t.payee} ${t.description}`;
    const entry = {id: newId(), kind, amount: Number(t.amount).toFixed(2), currency: t.currency, category: kind === 'expense' ? expenseCategory(undefined, words) : incomeCategory(undefined, words), ...(note ? {note} : {}), date: t.date, createdAt: now.toISOString()};
    const parsed = moneyEntrySchema.safeParse(entry);
    if (!parsed.success) { refused.push({index: t.index, reason: 'This row does not fit the money log.'}); continue; }
    if (entries.length >= room) { refused.push({index: t.index, reason: 'The money log keeps at most 10,000 entries.'}); continue; }
    entries.push(parsed.data);
  }
  return {entries, refused};
}
/** Adds entries to the log, keeping its own currency choice (unlike a single entry from the form). */
export function addEntries(log: MoneyLog, entries: readonly MoneyEntry[]): MoneyLog {
  if (log.entries.length + entries.length > MAX_ENTRIES) throw Error(`The money log keeps at most ${MAX_ENTRIES} entries.`);
  return {...log, entries: [...log.entries, ...entries]};
}
export const removeEntries = (log: MoneyLog, ids: ReadonlySet<string>): MoneyLog => ({...log, entries: log.entries.filter(e => !ids.has(e.id))});
