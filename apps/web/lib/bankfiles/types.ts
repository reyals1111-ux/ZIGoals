/**
 * Session AK (A14, FORMATS.md (h)): one normalised transaction list from a bank statement file the person chose
 * (CAMT.053, OFX/QFX or MT940), read on the device only: no bank connection, nothing uploaded. Amounts are positive
 * decimal strings with the direction apart; text is cleaned (no control characters, no leading formula sign).
 */
export type BankFormat = 'camt053' | 'ofx' | 'mt940';
export const FORMAT_LABELS: Record<BankFormat, string> = {camt053: 'CAMT.053 (ISO 20022 XML)', ofx: 'OFX / QFX', mt940: 'MT940'};
export type BankTransaction = {
  /** The booking date, YYYY-MM-DD. */
  date: string;
  /** Positive, a decimal string ("12.5", "1200"). */
  amount: string;
  currency: string;
  direction: 'in' | 'out';
  payee: string;
  /** The bank's reference (AcctSvcrRef, FITID, the :61: bank reference) or the end-to-end id; may be empty. */
  reference: string;
  description: string;
  /** The running balance after this transaction, only where the file gives an opening balance; otherwise unknown. */
  balance?: string;
  /** Where it was in the file (1-based), for the preview and the refused list. */
  index: number;
  /** A possible repeat of an earlier row in the same file (same date, amount, payee and reference). */
  duplicate?: boolean;
};
export type RefusedRow = {index: number; reason: string};
export type BankStatement = {
  format: BankFormat; account?: string;
  transactions: BankTransaction[]; refused: RefusedRow[]; warnings: string[];
  /** Opening and closing balances the file states, signed, per currency. */
  balances: {kind: 'opening' | 'closing'; date?: string; amount: string; currency: string}[];
};
export const MAX_BANK_FILE_BYTES = 5_000_000, MAX_BANK_TRANSACTIONS = 20_000, MAX_TEXT = 140;
export const BANK_FILE_TOO_LARGE = 'This file is larger than 5 MB. Nothing was read.';
export const BANK_FILE_TOO_MANY = 'This file has more than 20,000 transactions. Nothing was read; export a shorter period.';
export class BankFileError extends Error {}
