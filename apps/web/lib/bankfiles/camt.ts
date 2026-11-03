import {parseXml, type MiniElement} from '../workouts/mini-xml';
import {flaggedWarning, fromUnits, isoDay, readAmount, textCleaner, toUnits} from './text';
import {BANK_FILE_TOO_MANY, BankFileError, MAX_BANK_TRANSACTIONS, type BankStatement, type BankTransaction, type RefusedRow} from './types';

/**
 * Session AK (A14, FORMATS.md (h)): CAMT.053 (ISO 20022 BkToCstmrStmt, versions .02 to .08), read with the strict
 * mini XML reader of lib/workouts/mini-xml.ts: no document type at all (refused here before parsing, so no DTD, no
 * external entity and no entity expansion beyond the five standard ones and character references). Names are matched
 * by local name, so every version's namespace reads. Each `Stmt/Ntry` is one transaction: `Amt` (always positive) with
 * `@Ccy`, `CdtDbtInd` CRDT/DBIT, `BookgDt/Dt` (or `DtTm`, else `ValDt`), the counterparty from `RltdPties`, the
 * reference from `AcctSvcrRef` or the end-to-end id, and the remittance text. A pending entry (`Sts` PDNG) is refused.
 */
const kids = (el: MiniElement | undefined, name: string) => el ? el.children.filter(c => c.localName === name) : [];
const kid = (el: MiniElement | undefined, name: string) => el?.children.find(c => c.localName === name);
const path = (el: MiniElement | undefined, ...names: string[]) => names.reduce<MiniElement | undefined>((at, n) => kid(at, n), el);
const text = (el: MiniElement | undefined) => el?.textContent.trim() ?? '';
function day(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  return m ? isoDay(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}
/** The party's name across versions: `Nm` directly, or `Pty/Nm` (camt.053.001.08). */
const partyName = (party: MiniElement | undefined) => text(kid(party, 'Nm')) || text(path(party, 'Pty', 'Nm'));

export function parseCamt(source: string): BankStatement {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new BankFileError('This XML file declares a document type, which ZIGoals does not read. Nothing was read.');
  let doc;
  try { doc = parseXml(source); } catch { throw new BankFileError('This XML file could not be read (it may be cut off or damaged). Nothing was read.'); }
  const root = doc.documentElement;
  const container = root.localName === 'BkToCstmrStmt' ? root : kid(root, 'BkToCstmrStmt');
  if (!container) throw new BankFileError('This XML file is not a CAMT.053 bank statement (no BkToCstmrStmt). Nothing was read.');
  const clean = textCleaner(), transactions: BankTransaction[] = [], refused: RefusedRow[] = [], balances: BankStatement['balances'] = [], warnings: string[] = [];
  let index = 0, account: string | undefined;
  const statements = kids(container, 'Stmt');
  if (!statements.length) throw new BankFileError('This CAMT file holds no statement. Nothing was read.');
  for (const stmt of statements) {
    const acct = kid(stmt, 'Acct');
    account ??= clean.clean(text(path(acct, 'Id', 'IBAN')) || text(path(acct, 'Id', 'Othr', 'Id')), 40) || undefined;
    let opening: {amount: bigint; currency: string} | undefined;
    for (const bal of kids(stmt, 'Bal')) {
      const code = text(path(bal, 'Tp', 'CdOrPrtry', 'Cd')), amt = kid(bal, 'Amt'), read = readAmount(text(amt), 'point'), currency = amt?.getAttribute('Ccy') ?? '';
      if (!read || !/^[A-Z]{3}$/.test(currency)) continue;
      const negative = text(kid(bal, 'CdtDbtInd')) === 'DBIT', when = day(text(path(bal, 'Dt', 'Dt')) || text(path(bal, 'Dt', 'DtTm'))) ?? undefined;
      const kind = code === 'OPBD' || code === 'PRCD' ? 'opening' : code === 'CLBD' ? 'closing' : null;
      if (!kind) continue;
      balances.push({kind, ...(when ? {date: when} : {}), amount: fromUnits(toUnits(read.amount, negative)), currency});
      if (kind === 'opening' && !opening) opening = {amount: toUnits(read.amount, negative), currency};
    }
    let running = opening?.amount;
    for (const entry of kids(stmt, 'Ntry')) {
      index++;
      if (transactions.length >= MAX_BANK_TRANSACTIONS) throw new BankFileError(BANK_FILE_TOO_MANY);
      const status = text(kid(entry, 'Sts')) || text(path(entry, 'Sts', 'Cd'));
      if (status === 'PDNG' || status === 'INFO') { refused.push({index, reason: 'Pending at the bank, not booked yet.'}); continue; }
      const amt = kid(entry, 'Amt'), read = readAmount(text(amt), 'point'), currency = amt?.getAttribute('Ccy') ?? '';
      if (!read) { refused.push({index, reason: 'The amount could not be read.'}); continue; }
      if (!/^[A-Z]{3}$/.test(currency)) { refused.push({index, reason: 'The currency could not be read.'}); continue; }
      const indicator = text(kid(entry, 'CdtDbtInd'));
      if (indicator !== 'CRDT' && indicator !== 'DBIT') { refused.push({index, reason: 'It does not say whether money came in or went out.'}); continue; }
      const date = day(text(path(entry, 'BookgDt', 'Dt')) || text(path(entry, 'BookgDt', 'DtTm')) || text(path(entry, 'ValDt', 'Dt')) || text(path(entry, 'ValDt', 'DtTm')));
      if (!date) { refused.push({index, reason: 'The booking date could not be read.'}); continue; }
      const tx = kid(kid(entry, 'NtryDtls'), 'TxDtls'), parties = kid(tx, 'RltdPties'), out = indicator === 'DBIT';
      const payee = clean.clean(partyName(kid(parties, out ? 'Cdtr' : 'Dbtr')) || partyName(kid(parties, out ? 'UltmtCdtr' : 'UltmtDbtr')) || text(kid(entry, 'AddtlNtryInf')), 80);
      const e2e = text(path(tx, 'Refs', 'EndToEndId'));
      const reference = clean.clean(text(kid(entry, 'AcctSvcrRef')) || text(path(tx, 'Refs', 'AcctSvcrRef')) || (e2e && e2e !== 'NOTPROVIDED' ? e2e : '') || text(kid(entry, 'NtryRef')), 60);
      const remittance = kid(tx, 'RmtInf');
      const description = clean.clean([...kids(remittance, 'Ustrd').map(text), text(path(remittance, 'Strd', 'CdtrRefInf', 'Ref')), text(kid(entry, 'AddtlNtryInf'))].filter(Boolean).join(' '));
      if (text(kid(entry, 'RvslInd')) === 'true') warnings.push(`Row ${index} is a reversal at the bank; it is kept with its own direction.`);
      let balance: string | undefined;
      if (running !== undefined && opening?.currency === currency) { running += toUnits(read.amount, out); balance = fromUnits(running); } else running = undefined;
      transactions.push({date, amount: read.amount, currency, direction: out ? 'out' : 'in', payee, reference, description, ...(balance !== undefined ? {balance} : {}), index});
    }
  }
  return {format: 'camt053', ...(account ? {account} : {}), transactions, refused, warnings: [...warnings.slice(0, 20), ...flaggedWarning(clean.flagged)], balances};
}
