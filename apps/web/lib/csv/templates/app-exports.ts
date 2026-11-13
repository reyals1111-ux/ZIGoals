import {normalizeHeader} from '../mapping';
import type {DateFormat} from '../dates';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-008, C-DVG-51; with GAP-177, C-DVG-83): moving from another money app. A spending
 * export from Mint or Monarch is recognised by its header row (never by the file name) in Wealth's "Import from your bank
 * → CSV", and its columns are pre-matched by their own names; the person still sees the usual mapping step and the preview
 * before anything is added. Neither app publishes its export's columns, so the names below are the ones their exports
 * are widely reported to carry (community-documented, as the meals presets in lib/import/nutrition-presets.ts):
 * - Mint (Intuit, closed in 2024; old exports remain): Date, Description, Original Description, Amount, Transaction Type
 *   (debit/credit), Category, Account Name, Labels, Notes; month/day/year dates, amounts written positive.
 * - Monarch: Date, Merchant, Category, Account, Original Statement, Notes, Amount, Tags; year-month-day dates, spending as a
 *   negative amount.
 * A YNAB register (Outflow and Inflow) is named and pointed to Settings → "Bring your history with you", which reads YNAB
 * with its own categories (lib/import/switch/ynab.ts).
 * Session AO (C-DVG-51): Copilot Money: date, name, amount, status, category, parent category, excluded, tags, type,
 * account, account mask, note, recurring (lower-case names); year-month-day dates; spending written as a positive amount
 * and income or a refund with a minus sign (the opposite of Monarch), so the preset says `positiveIsOut` and the preview
 * shows every row's direction before anything is added. Its type column (regular, income, internal transfer) is not used
 * as the direction: "regular" says neither in nor out.
 */
export type MoneyAppExport = {id: 'mint' | 'monarch' | 'ynab' | 'copilot'; label: string; note: string; mapping: Partial<Record<string, number>>; dateFormat?: DateFormat; positiveIsOut?: boolean};
const find = (header: readonly string[], ...names: string[]) => { const wanted = names.map(normalizeHeader); const i = header.findIndex(h => wanted.includes(normalizeHeader(h))); return i < 0 ? undefined : i; };
const has = (header: readonly string[], ...names: string[]) => names.every(name => find(header, name) !== undefined);
const clean = (mapping: Record<string, number | undefined>) => Object.fromEntries(Object.entries(mapping).filter(([, v]) => v !== undefined)) as Partial<Record<string, number>>;

export function detectMoneyAppExport(header: readonly string[]): MoneyAppExport | null {
  if (has(header, 'Outflow', 'Inflow', 'Payee')) return {id: 'ynab', label: 'YNAB', mapping: {}, note: 'This looks like a YNAB register. Settings → “Bring your history with you” → YNAB reads it with its own categories and leaves out transfers between your accounts; that is the better way in. Here you can still match its columns by hand.'};
  if (has(header, 'Date', 'Description', 'Original Description', 'Amount', 'Transaction Type')) return {id: 'mint', label: 'Mint', dateFormat: 'mdy', mapping: clean({
    date: find(header, 'Date'), payee: find(header, 'Description'), amount: find(header, 'Amount'), direction: find(header, 'Transaction Type'), category: find(header, 'Category'), note: find(header, 'Notes'),
  }), note: 'This looks like a Mint export. Its columns are matched by their own names: Transaction Type says money in or out, since Mint writes every amount as positive. Check them before you go on.'};
  if (has(header, 'Date', 'Merchant', 'Original Statement', 'Amount')) return {id: 'monarch', label: 'Monarch', dateFormat: 'iso', mapping: clean({
    date: find(header, 'Date'), payee: find(header, 'Merchant'), amount: find(header, 'Amount'), category: find(header, 'Category'), note: find(header, 'Notes'),
  }), note: 'This looks like a Monarch export. Its columns are matched by their own names: a minus sign is money out, as Monarch writes spending. Check them before you go on.'};
  if (has(header, 'date', 'name', 'amount', 'parent category', 'excluded', 'account mask')) return {id: 'copilot', label: 'Copilot', dateFormat: 'iso', positiveIsOut: true, mapping: clean({
    date: find(header, 'date'), payee: find(header, 'name'), amount: find(header, 'amount'), category: find(header, 'category'), note: find(header, 'note'),
  }), note: 'This looks like a Copilot export. Its columns are matched by their own names: a positive amount is money out and a minus sign is money in, as Copilot writes them. Check them and the preview before you go on.'};
  return null;
}
