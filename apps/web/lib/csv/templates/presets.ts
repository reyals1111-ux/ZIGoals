import {HOLDINGS_FIELDS, TRANSACTION_FIELDS, normalizeHeader, type FieldSpec} from '../mapping';
import type {CsvDelimiter} from '../parse';
import type {DateFormat} from '../dates';
import type {NumberStyle} from '../numbers';
import {csvSafeCell} from '../../export/csv-safe';

/**
 * Session AK (7.1): named CSV presets. Each maps a typical file's column names onto the fields ZIGoals' importers
 * already know (TRANSACTION_FIELDS for Portfolio trades, HOLDINGS_FIELDS for holdings) or onto the money log's fields
 * (MONEY_FIELDS below, for spending and income). A preset only names columns; the person still sees the mapping step
 * and can change any column. Each preset also writes a small template file people can fill in themselves.
 */
export type ImportTarget = 'money' | 'transactions' | 'holdings';
export const MONEY_FIELDS: readonly FieldSpec[] = [
  {id: 'date', label: 'Date', synonyms: ['booking date', 'transaction date', 'posted', 'date posted', 'datum', 'boekdatum', 'value date'], required: true},
  {id: 'amount', label: 'Amount', synonyms: ['bedrag', 'betrag', 'value', 'transaction amount', 'trnamt']},
  {id: 'debit', label: 'Money out', synonyms: ['withdrawal', 'withdrawals', 'paid out', 'out', 'af', 'debit amount']},
  {id: 'credit', label: 'Money in', synonyms: ['deposit', 'deposits', 'paid in', 'in', 'bij', 'credit amount']},
  {id: 'direction', label: 'In or out', synonyms: ['debit/credit', 'credit/debit', 'af bij', 'af/bij', 'dc', 'type', 'credit debit indicator', 'cdtdbtind', 'trntype']},
  {id: 'currency', label: 'Currency', synonyms: ['ccy', 'valuta', 'munt', 'currency code', 'cursym']},
  {id: 'payee', label: 'Payee', synonyms: ['name', 'counterparty', 'counterparty name', 'description', 'naam', 'naam omschrijving', 'merchant', 'beneficiary']},
  {id: 'note', label: 'Note', synonyms: ['memo', 'details', 'remittance information', 'mededelingen', 'omschrijving', 'reference text', 'notes']},
  {id: 'category', label: 'Category', synonyms: ['categorie', 'kategorie']},
  {id: 'reference', label: 'Reference', synonyms: ['fitid', 'transaction id', 'end to end id', 'ref', 'referentie']},
];
export const FIELDS_FOR: Record<ImportTarget, readonly FieldSpec[]> = {money: MONEY_FIELDS, transactions: TRANSACTION_FIELDS, holdings: HOLDINGS_FIELDS};
export type CsvTemplate = {
  id: string; name: string; description: string; target: ImportTarget;
  /** field id → the column names this kind of file uses, in order of preference. */
  columns: Readonly<Record<string, readonly string[]>>;
  delimiter: CsvDelimiter; numberStyle: NumberStyle; dateFormat: DateFormat;
  /** The template file: the first name of each mapped column, then fictional example rows (all amounts positive). */
  example: readonly (readonly string[])[];
};
export const CSV_TEMPLATES: readonly CsvTemplate[] = [
  {id: 'eu-bank', name: 'Bank account (Europe)', description: 'Semicolon-separated, day/month/year dates and a decimal comma, with a Debit/Credit column.', target: 'money', delimiter: ';', numberStyle: 'comma', dateFormat: 'dmy',
    columns: {date: ['Date', 'Datum', 'Booking date', 'Boekdatum'], payee: ['Name', 'Naam / Omschrijving', 'Counterparty'], amount: ['Amount', 'Bedrag (EUR)', 'Bedrag', 'Betrag'], direction: ['Debit/Credit', 'Af Bij', 'Af/Bij'], currency: ['Currency', 'Valuta', 'Munt'], note: ['Description', 'Mededelingen', 'Omschrijving']},
    example: [['01/10/2026', 'Example Supermarket', '42,10', 'Debit', 'EUR', 'Weekly shop'], ['25/10/2026', 'Example Employer', '2400,00', 'Credit', 'EUR', 'Salary']]},
  {id: 'us-bank', name: 'Bank account (US)', description: 'Comma-separated, month/day/year dates, money out and money in in their own columns.', target: 'money', delimiter: ',', numberStyle: 'point', dateFormat: 'mdy',
    columns: {date: ['Date', 'Posting Date', 'Transaction Date'], payee: ['Description', 'Payee', 'Merchant'], debit: ['Withdrawals', 'Debit', 'Amount Out'], credit: ['Deposits', 'Credit', 'Amount In'], category: ['Category'], note: ['Memo', 'Details']},
    example: [['10/01/2026', 'Corner Grocery', '42.10', '', 'Groceries', ''], ['10/15/2026', 'Example Payroll', '', '1500.00', 'Salary', 'Paycheck']]},
  {id: 'camt-csv', name: 'CAMT-style columns', description: 'The ISO 20022 statement fields as columns: booking date, amount, currency, credit/debit indicator (CRDT/DBIT), counterparty, remittance text, reference.', target: 'money', delimiter: ',', numberStyle: 'point', dateFormat: 'iso',
    columns: {date: ['BookingDate', 'Booking date', 'BookgDt'], amount: ['Amount', 'Amt'], currency: ['Currency', 'Ccy'], direction: ['CreditDebitIndicator', 'CdtDbtInd', 'Credit/debit indicator'], payee: ['CounterpartyName', 'Counterparty name', 'Nm'], note: ['RemittanceInformation', 'Remittance information', 'Ustrd'], reference: ['AccountServicerReference', 'EndToEndId', 'AcctSvcrRef']},
    example: [['2026-10-03', '12.99', 'EUR', 'DBIT', 'Streaming Service', 'Monthly plan', 'REF-0001'], ['2026-10-25', '2400.00', 'EUR', 'CRDT', 'Example Employer', 'Salary October', 'REF-0002']]},
  {id: 'ofx-csv', name: 'OFX-style columns', description: 'The OFX transaction fields as columns: date posted, amount, type (DEBIT/CREDIT), name, memo, FITID, currency.', target: 'money', delimiter: ',', numberStyle: 'point', dateFormat: 'iso',
    columns: {date: ['DTPOSTED', 'Date posted'], amount: ['TRNAMT', 'Amount'], direction: ['TRNTYPE', 'Type'], payee: ['NAME', 'Name'], note: ['MEMO', 'Memo'], reference: ['FITID'], currency: ['CURRENCY', 'Currency']},
    example: [['2026-10-03', '42.10', 'DEBIT', 'Corner Grocery', 'Card purchase', 'F0001', 'USD'], ['2026-10-15', '1500.00', 'CREDIT', 'Example Payroll', '', 'F0002', 'USD']]},
  {id: 'brokerage', name: 'Brokerage statement (holdings)', description: 'One row per holding: name, symbol, quantity, asset class, market value and its currency.', target: 'holdings', delimiter: ',', numberStyle: 'point', dateFormat: 'iso',
    columns: {name: ['Description', 'Security', 'Name'], asset: ['Symbol', 'Ticker'], quantity: ['Quantity', 'Shares', 'Units'], class: ['Asset class', 'Asset Type'], value: ['Market Value', 'Current Value', 'Value'], currency: ['Currency', 'Ccy'], notes: ['Account', 'Notes']},
    example: [['Example World Index Fund', 'EXWI', '12.5', 'Stocks', '1250.00', 'EUR', 'Fictional example'], ['Cash', '', '', 'Cash', '300.00', 'EUR', '']]},
  {id: 'exchange-trades', name: 'Exchange trade history', description: 'One row per trade: date, asset, side (buy/sell), quantity, price, fee.', target: 'transactions', delimiter: ',', numberStyle: 'point', dateFormat: 'iso',
    columns: {date: ['Date', 'Time', 'Timestamp', 'Date(UTC)'], coin: ['Asset', 'Coin', 'Base Asset', 'Symbol'], kind: ['Side', 'Type', 'Operation'], quantity: ['Quantity', 'Amount', 'Executed', 'Size'], price: ['Price', 'Unit Price'], fee: ['Fee', 'Fees', 'Commission'], note: ['Notes', 'Note']},
    example: [['2026-10-01', 'BTC', 'buy', '0.01', '60000', '1.50', 'Fictional example'], ['2026-10-20', 'BTC', 'sell', '0.005', '62000', '0.80', '']]},
];
/** The column index per field for a header, by the preset's names (each column used once); fields it does not find stay unmapped. */
export function templateMapping(header: readonly string[], template: CsvTemplate): Partial<Record<string, number>> {
  const normalized = header.map(normalizeHeader), used = new Set<number>(), mapping: Partial<Record<string, number>> = {};
  for (const [field, names] of Object.entries(template.columns)) {
    for (const name of names) {
      const index = normalized.findIndex((h, i) => !used.has(i) && h.length > 0 && h === normalizeHeader(name));
      if (index >= 0) { mapping[field] = index; used.add(index); break; }
    }
  }
  return mapping;
}
/** The preset that fits a header best: every required field found, then the most columns; null when none fits. */
export function matchTemplate(header: readonly string[], target?: ImportTarget): CsvTemplate | null {
  let best: {template: CsvTemplate; score: number} | null = null;
  for (const template of CSV_TEMPLATES) {
    if (target && template.target !== target) continue;
    const mapping = templateMapping(header, template), found = Object.keys(mapping).length;
    if (!mappingComplete(mapping, template.target) || found < 2) continue;
    if (!best || found > best.score) best = {template, score: found};
  }
  return best?.template ?? null;
}
/** Whether a mapping has what the target needs: its required fields, and for money an amount (or money out/in). */
export function mappingComplete(mapping: Partial<Record<string, number>>, target: ImportTarget): boolean {
  if (FIELDS_FOR[target].some(f => f.required && mapping[f.id] === undefined)) return false;
  return target !== 'money' || mapping.amount !== undefined || mapping.debit !== undefined || mapping.credit !== undefined;
}
/** The template file a person can download and fill in: every cell through csvSafeCell, the preset's delimiter. */
export function templateCsv(template: CsvTemplate): string {
  const header = Object.values(template.columns).map(names => names[0]!);
  return [header, ...template.example].map(row => row.map(cell => csvSafeCell(cell)).join(template.delimiter)).join('\r\n') + '\r\n';
}
export const templateFileName = (template: CsvTemplate) => `zigoals-template-${template.id}.csv`;
