import {flaggedWarning, fromUnits, isoDay, readAmount, textCleaner, toUnits} from './text';
import {BANK_FILE_TOO_MANY, BankFileError, MAX_BANK_TRANSACTIONS, type BankStatement, type BankTransaction, type RefusedRow} from './types';

/**
 * Session AK (A14, FORMATS.md (h)): SWIFT MT940, line based. A tag starts a line (`:20:`, `:25:`, `:60F:`, `:61:`,
 * `:86:` …) and runs over the following lines until the next tag; a file may hold several statements and SWIFT block
 * wrappers (`{1:…}{2:…}{4:` … `-}`). `:60F:`/`:60M:` give the statement's currency and opening balance, `:62F:`/`:62M:`
 * the closing one. A `:61:` line is one transaction — value date YYMMDD, optional entry date MMDD (used as the booking
 * date), D/C (RD/RC reversals), optional funds code, amount with a decimal comma, type code, reference, `//` bank
 * reference — and the `:86:` after it holds the counterparty and remittance text: ING-style code words (`/NAME/`,
 * `/CNTP/…/…/name/`, `/REMI/USTD//…/`, `/EREF/`), German `?20`–`?33` subfields, or free text.
 */
const TAG = /^:(\d{2}[A-Z]?):/;
const LINE61 = /^(\d{2})(\d{2})(\d{2})(\d{4})?(RC|RD|C|D)([A-Z])?(\d[\d,]{0,15})([A-Z][A-Z0-9]{3})([^\n]*?)(?:\/\/([^\n]*))?(?:\n([\s\S]*))?$/;
const year = (yy: number) => (yy <= 79 ? 2000 : 1900) + yy;
const CODE_WORDS = new Set(['EREF', 'CNTP', 'REMI', 'NAME', 'IBAN', 'BIC', 'MARF', 'CSID', 'BENM', 'ORDP', 'ADDR', 'PURP', 'RTRN', 'ISDT', 'PREF', 'ULTC', 'ULTD', 'ULTB', 'CDTRREFTP', 'CDTRREF', 'TRCD', 'SVCL', 'BUSP', 'FX', 'NAMB', 'ACCW', 'IREF', 'OCMT', 'CHGS', 'EXCH', 'BYOR', 'CLID', 'MDID']);
/** The counterparty name, the description and a reference from the `:86:` text. */
export function readInfo(raw: string): {payee: string; description: string; reference: string} {
  const text = raw.replace(/\r?\n/g, '');
  // German GVC style: "166?00SEPA-UEBERWEISUNG?20EREF+…?21…?32Name?33more"
  if (/^\d{3}\?\d{2}/.test(text)) {
    const fields = new Map<string, string>();
    for (const m of text.slice(3).matchAll(/\?(\d{2})([^?]*)/g)) fields.set(m[1]!, (fields.get(m[1]!) ?? '') + m[2]!);
    const description = [...fields].filter(([k]) => k >= '20' && k <= '29' || k >= '60' && k <= '63').map(([, v]) => v).join(' ');
    const eref = /EREF\+(\S+)/.exec(description)?.[1] ?? '';
    return {payee: `${fields.get('32') ?? ''}${fields.get('33') ?? ''}` || fields.get('00') || '', description, reference: eref};
  }
  if (text.startsWith('/')) {
    const tokens = text.split('/'), fields = new Map<string, string[]>();
    let key: string | null = null;
    for (const t of tokens.slice(1)) {
      if (CODE_WORDS.has(t)) { key = t; if (!fields.has(t)) fields.set(t, []); continue; }
      if (key) fields.get(key)!.push(t);
    }
    const join = (k: string) => (fields.get(k) ?? []).join('/').replace(/\/+$/, '');
    const cntp = fields.get('CNTP') ?? [], remi = join('REMI').replace(/^(USTD|STRD)\/+(CUR\/+)?/, '');
    return {payee: join('NAME') || cntp[2] || join('BENM') || join('ORDP'), description: remi || text, reference: join('EREF') === 'NOTPROVIDED' ? '' : join('EREF')};
  }
  return {payee: text.split(/\s{2,}/)[0]!.slice(0, 80), description: text, reference: ''};
}

export function parseMt940(source: string): BankStatement {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const fields: {tag: string; value: string; line: number}[] = [];
  lines.forEach((line, n) => {
    const stripped = line.replace(/^\{[1-5]:[^}]*\}+/g, '').replace(/^\{4:/, '');
    if (/^-\}?\s*$/.test(stripped)) return;
    const m = TAG.exec(stripped);
    if (m) fields.push({tag: m[1]!, value: stripped.slice(m[0].length), line: n + 1});
    else if (fields.length && stripped.trim()) fields[fields.length - 1]!.value += `\n${stripped}`;
  });
  if (!fields.some(f => f.tag === '61') && !fields.some(f => f.tag === '25')) throw new BankFileError('This file is not an MT940 statement (no :25: or :61: lines). Nothing was read.');
  const clean = textCleaner(), transactions: BankTransaction[] = [], refused: RefusedRow[] = [], balances: BankStatement['balances'] = [];
  let currency = '', account: string | undefined, running: bigint | undefined, index = 0;
  for (let k = 0; k < fields.length; k++) {
    const {tag, value} = fields[k]!;
    if (tag === '20') { currency = ''; running = undefined; continue; }
    if (tag === '25') { account ??= clean.clean(value, 40) || undefined; continue; }
    if (tag === '60F' || tag === '60M' || tag === '62F' || tag === '62M') {
      const m = /^([CD])(\d{2})(\d{2})(\d{2})([A-Z]{3})([\d,]+)/.exec(value.trim()), read = m && readAmount(m[6]!, 'comma');
      if (!m || !read) continue;
      const signed = toUnits(read.amount, m[1] === 'D'), date = isoDay(year(Number(m[2])), Number(m[3]), Number(m[4])) ?? undefined;
      if (tag.startsWith('60')) { currency = m[5]!; running = signed; balances.push({kind: 'opening', ...(date ? {date} : {}), amount: fromUnits(signed), currency}); }
      else balances.push({kind: 'closing', ...(date ? {date} : {}), amount: fromUnits(signed), currency: m[5]!});
      continue;
    }
    if (tag !== '61') continue;
    index++;
    if (transactions.length >= MAX_BANK_TRANSACTIONS) throw new BankFileError(BANK_FILE_TOO_MANY);
    const m = LINE61.exec(value);
    if (!m) { refused.push({index, reason: 'The :61: line could not be read.'}); running = undefined; continue; }
    const valueYear = year(Number(m[1])), valueMonth = Number(m[2]);
    let date = isoDay(valueYear, valueMonth, Number(m[3]));
    if (m[4]) {
      const em = Number(m[4].slice(0, 2)), ed = Number(m[4].slice(2));
      // The entry date has no year: the value date's, or the next/previous one across New Year.
      const ey = em === 1 && valueMonth === 12 ? valueYear + 1 : em === 12 && valueMonth === 1 ? valueYear - 1 : valueYear;
      date = isoDay(ey, em, ed) ?? date;
    }
    if (!date) { refused.push({index, reason: 'The date could not be read.'}); running = undefined; continue; }
    const read = readAmount(m[7]!, 'comma');
    if (!read) { refused.push({index, reason: 'The amount could not be read.'}); running = undefined; continue; }
    if (!currency) { refused.push({index, reason: 'The statement has no opening balance line (:60F:), so its currency is unknown.'}); continue; }
    // RD (reversal of a debit) brings money back in; RC (reversal of a credit) takes it out.
    const out = m[5] === 'D' || m[5] === 'RC';
    const info = fields[k + 1]?.tag === '86' ? readInfo(fields[k + 1]!.value) : {payee: '', description: m[11] ?? '', reference: ''};
    const ownRef = (m[9] ?? '').trim(), bankRef = (m[10] ?? '').trim();
    const reference = clean.clean(bankRef || (ownRef && ownRef !== 'NONREF' ? ownRef : '') || info.reference, 60);
    let balance: string | undefined;
    if (running !== undefined) { running += toUnits(read.amount, out); balance = fromUnits(running); }
    transactions.push({date, amount: read.amount, currency, direction: out ? 'out' : 'in', payee: clean.clean(info.payee, 80), reference, description: clean.clean(info.description), ...(balance !== undefined ? {balance} : {}), index});
  }
  return {format: 'mt940', ...(account ? {account} : {}), transactions, refused, warnings: flaggedWarning(clean.flagged), balances};
}
