import {flaggedWarning, fromUnits, isoDay, readAmount, textCleaner, toUnits} from './text';
import {BANK_FILE_TOO_MANY, BankFileError, MAX_BANK_TRANSACTIONS, type BankStatement, type BankTransaction, type RefusedRow} from './types';

/**
 * Session AK (A14, FORMATS.md (h)): OFX and QFX, version 1 (SGML: a plain-text header, then tags whose leaf elements
 * need no closing tag) and version 2 (well-formed XML), read by one small tokenizer: no DTD is ever read, no entity
 * beyond the five standard ones and character references is expanded, a processing instruction or comment is skipped.
 * A tag with text after it is a value of the aggregate it sits in; a tag with none opens an aggregate (except the few
 * value tags that may be empty). Each `STMTTRN` is a transaction: `TRNAMT` is signed from the customer's side, the
 * date is `DTPOSTED` (its first eight digits), the currency is the transaction's own `CURRENCY/CURSYM` or the
 * statement's `CURDEF`, the payee `NAME` (or `PAYEE/NAME`), the reference `FITID`.
 */
type Node = {name: string; values: Map<string, string>; children: Node[]; parent?: Node};
/** Value tags that may be written empty in SGML (so they never open an aggregate). */
const VALUE_TAGS = new Set(['NAME', 'MEMO', 'PAYEEID', 'CHECKNUM', 'REFNUM', 'SIC', 'EXTDNAME', 'SRVRTID', 'CORRECTFITID', 'CORRECTACTION', 'INV401KSOURCE', 'BANKID', 'BRANCHID', 'ACCTID', 'ACCTKEY', 'DTUSER', 'DTAVAIL', 'MESSAGE', 'ADDR1', 'ADDR2', 'ADDR3', 'CITY', 'STATE', 'POSTALCODE', 'COUNTRY', 'PHONE']);
const MAX_DEPTH = 64;
function decode(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos|nbsp|#\d{1,7}|#x[0-9a-fA-F]{1,6});/g, (_, e: string) => {
    if (e === 'lt') return '<'; if (e === 'gt') return '>'; if (e === 'amp') return '&'; if (e === 'quot') return '"'; if (e === 'apos') return "'"; if (e === 'nbsp') return ' ';
    const code = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
  });
}
export function tokenizeOfx(source: string): Node {
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new BankFileError('This file declares a document type, which ZIGoals does not read. Nothing was read.');
  const start = source.search(/<OFX>/i);
  if (start < 0) throw new BankFileError('This file is not OFX (no <OFX> element). Nothing was read.');
  const root: Node = {name: '#root', values: new Map(), children: []};
  const stack: Node[] = [root];
  let i = start, lastLeaf: string | null = null;
  while (i < source.length) {
    const lt = source.indexOf('<', i);
    if (lt < 0) break;
    if (source.startsWith('<?', lt)) { const end = source.indexOf('?>', lt); if (end < 0) break; i = end + 2; continue; }
    if (source.startsWith('<!--', lt)) { const end = source.indexOf('-->', lt); if (end < 0) break; i = end + 3; continue; }
    if (source.startsWith('<!', lt)) throw new BankFileError('This file holds a declaration ZIGoals does not read. Nothing was read.');
    const gt = source.indexOf('>', lt);
    if (gt < 0) break; // a cut-off last tag: what came before stays
    const tag = source.slice(lt + 1, gt).trim(), next = source.indexOf('<', gt + 1), raw = source.slice(gt + 1, next < 0 ? source.length : next);
    i = next < 0 ? source.length : next;
    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim().toUpperCase();
      if (name === lastLeaf) { lastLeaf = null; continue; }
      const at = stack.map(n => n.name).lastIndexOf(name);
      if (at > 0) stack.length = at; // closes it and any aggregate SGML left open inside it
      lastLeaf = null; continue;
    }
    const name = tag.split(/\s/)[0]!.replace(/\/$/, '').toUpperCase();
    if (!/^[A-Z0-9_.]{1,40}$/.test(name)) throw new BankFileError('A tag in this file could not be read. Nothing was read.');
    const value = decode(raw).trim(), top = stack[stack.length - 1]!;
    if (value || VALUE_TAGS.has(name) || tag.endsWith('/')) { if (!top.values.has(name)) top.values.set(name, value); lastLeaf = name; continue; }
    if (stack.length > MAX_DEPTH) throw new BankFileError('This file nests too deeply to be a statement. Nothing was read.');
    const node: Node = {name, values: new Map(), children: [], parent: top};
    top.children.push(node); stack.push(node); lastLeaf = null;
  }
  return root;
}
function* walk(node: Node, name: string): Generator<Node> { for (const c of node.children) { if (c.name === name) yield c; yield* walk(c, name); } }
const up = (node: Node | undefined, key: string): string | undefined => { for (let n = node; n; n = n.parent) { const v = n.values.get(key); if (v !== undefined) return v; } return undefined; };
const child = (node: Node, name: string) => node.children.find(c => c.name === name);
function ofxDay(raw: string | undefined): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec((raw ?? '').trim());
  return m ? isoDay(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

export function parseOfx(source: string): BankStatement {
  const root = tokenizeOfx(source), clean = textCleaner(), transactions: BankTransaction[] = [], refused: RefusedRow[] = [], balances: BankStatement['balances'] = [];
  let index = 0, account: string | undefined;
  const statements = [...walk(root, 'STMTRS'), ...walk(root, 'CCSTMTRS')];
  for (const stmt of statements) {
    const acct = child(stmt, 'BANKACCTFROM') ?? child(stmt, 'CCACCTFROM');
    account ??= acct?.values.get('ACCTID') ? clean.clean(acct.values.get('ACCTID'), 40) : undefined;
    const ledger = child(stmt, 'LEDGERBAL'), curdef = stmt.values.get('CURDEF')?.toUpperCase();
    const bal = ledger && readAmount(ledger.values.get('BALAMT') ?? '');
    if (bal && curdef && /^[A-Z]{3}$/.test(curdef)) { const when = ofxDay(ledger.values.get('DTASOF')); balances.push({kind: 'closing', ...(when ? {date: when} : {}), amount: fromUnits(toUnits(bal.amount, bal.negative)), currency: curdef}); }
  }
  for (const t of walk(root, 'STMTTRN')) {
    index++;
    if (transactions.length >= MAX_BANK_TRANSACTIONS) throw new BankFileError(BANK_FILE_TOO_MANY);
    const v = t.values, read = readAmount(v.get('TRNAMT') ?? '');
    if (!read) { refused.push({index, reason: 'The amount could not be read.'}); continue; }
    const own = child(t, 'CURRENCY') ?? child(t, 'ORIGCURRENCY');
    const currency = (own?.values.get('CURSYM') ?? up(t, 'CURDEF') ?? '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) { refused.push({index, reason: 'The currency could not be read.'}); continue; }
    const date = ofxDay(v.get('DTPOSTED')) ?? ofxDay(v.get('DTUSER'));
    if (!date) { refused.push({index, reason: 'The posting date could not be read.'}); continue; }
    if (v.get('CORRECTACTION') === 'DELETE') { refused.push({index, reason: 'The bank marked this as deleting an earlier transaction.'}); continue; }
    const payee = clean.clean(v.get('NAME') || child(t, 'PAYEE')?.values.get('NAME') || v.get('EXTDNAME') || v.get('MEMO'), 80);
    transactions.push({date, amount: read.amount, currency, direction: read.negative ? 'out' : 'in', payee, reference: clean.clean(v.get('FITID') || v.get('REFNUM') || v.get('CHECKNUM'), 60), description: clean.clean(v.get('MEMO')), index});
  }
  if (!statements.length && !index) throw new BankFileError('This OFX file holds no bank or card statement. Nothing was read.');
  return {format: 'ofx', ...(account ? {account} : {}), transactions, refused, warnings: flaggedWarning(clean.flagged), balances};
}
