import {withChange} from '../money-log/counted';
import type {MoneyEntry, MoneyLog} from '../money-log/schema';
import type {RuleChange} from '../money-rules/engine';
import {alreadyLogged, noteOf} from './index';
import type {BankTransaction} from './types';

/**
 * Session AV lane 2 (money; Monarch's re-import and activity log, YNAB's credit-card payment match): what an import
 * remembers about each row, so a later import of the same statement can update a row the bank changed, and so a card
 * payment that leaves one account and arrives in another (two files) can be marked a transfer. Pure; the person decides.
 */
/** The row's own reference key: direction, currency and the bank's reference (empty reference: no key). */
export const refKey = (t: Pick<BankTransaction, 'direction' | 'currency' | 'reference'>) => t.reference.trim() ? `${t.direction}|${t.currency}|${t.reference.trim()}`.slice(0, 140) : null;
/** Whether a row's reference is already on an entry of the log (then the row is that entry, never a second one). */
export const refInLog = (t: Pick<BankTransaction, 'direction' | 'currency' | 'reference'>, log: Pick<MoneyLog, 'entries'>) => { const k = refKey(t); return !!k && log.entries.some(e => e.ref === k); };
/** The entries an import made, with the file's account and each row's reference key. `indexes[i]` is the file row of `entries[i]`. */
export function withImportMarks(entries: readonly MoneyEntry[], indexes: readonly number[], rows: readonly BankTransaction[], account?: string): MoneyEntry[] {
  const byIndex = new Map(rows.map(t => [t.index, t])), label = account?.trim().slice(0, 40);
  return entries.map((e, i) => { const t = byIndex.get(indexes[i]!), ref = t ? refKey(t) : null; return {...e, ...(label ? {account: label} : {}), ...(ref ? {ref} : {})}; });
}
/** A rule's change on an imported entry, written into its history (by "rule"). */
export function withRuleHistory(entries: readonly MoneyEntry[], changes: readonly RuleChange[], at: string): MoneyEntry[] {
  const by = new Map(changes.map(c => [c.id, c]));
  return entries.map(e => { const c = by.get(e.id); return c && c.before.category !== e.category ? withChange(e, {by: 'rule', field: 'category', from: c.before.category, to: e.category}, at) : e; });
}
export type Changed = {t: BankTransaction; entry: MoneyEntry; amount?: string; date?: string; note?: string};
/** Rows of a re-imported file whose reference is already in the log but whose amount, date or note the bank changed. */
export function changedOnReimport(rows: readonly BankTransaction[], log: Pick<MoneyLog, 'entries'>): Changed[] {
  const byRef = new Map<string, MoneyEntry>();
  for (const e of log.entries) if (e.ref) byRef.set(e.ref, e);
  const out: Changed[] = [];
  for (const t of rows) {
    const key = refKey(t), entry = key ? byRef.get(key) : undefined;
    if (!entry || !/^\d{1,10}(\.\d{1,2})?$/.test(t.amount) || Number(t.amount) <= 0) continue;
    const amount = Number(t.amount).toFixed(2), note = noteOf(t);
    const diff: Changed = {t, entry, ...(amount !== entry.amount && !entry.parts?.length ? {amount} : {}), ...(t.date !== entry.date ? {date: t.date} : {}), ...(note && note !== (entry.note ?? '') ? {note} : {})};
    if (diff.amount || diff.date || diff.note) out.push(diff);
  }
  return out;
}
/** Updates the changed rows in place (the same ids), each change in the entry's history (by "import"). */
export function applyReimport(log: MoneyLog, changed: readonly Changed[], at: string): MoneyLog {
  const by = new Map(changed.map(c => [c.entry.id, c]));
  return {...log, entries: log.entries.map(e => {
    const c = by.get(e.id); if (!c) return e;
    let next: MoneyEntry = e;
    if (c.amount) next = withChange({...next, amount: c.amount}, {by: 'import', field: 'amount', from: e.amount, to: c.amount}, at);
    if (c.date) next = withChange({...next, date: c.date}, {by: 'import', field: 'date', from: e.date, to: c.date}, at);
    if (c.note) next = withChange({...next, note: c.note}, {by: 'import', field: 'note', ...(e.note ? {from: e.note} : {}), to: c.note}, at);
    return next;
  })};
}

/**
 * Session AV lane 2 (rest, LEDGER #142; Monarch's re-import): a CSV carries no bank reference, so a row the bank changed
 * since the last import (a tip added, a pending amount settled, a payee renamed) is recognised by its shape: the same
 * date, direction and currency as an entry already in the log, an amount within the tolerance (at most 2.00 or a fifth
 * of the entry's, whichever is more), and a similar payee (the words of one inside the other, or half their words
 * shared). An entry already matched exactly by a row of the file, a split entry or a transfer is never taken; each entry
 * is taken once, by the closest amount. The person sees each in the preview and the import updates it (same id, its
 * history kept) instead of adding a second one.
 */
export const CSV_TOLERANCE = {absolute: 2, share: 0.2} as const;
const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 3);
/** Whether two payee texts name the same payee (the bank's spelling can change between files). */
export function similarPayee(a: string, b: string): boolean {
  const x = words(a), y = words(b);
  if (!x.length || !y.length) return false;
  const sx = new Set(x), sy = new Set(y), shared = [...sx].filter(w => sy.has(w)).length;
  return shared === sx.size || shared === sy.size || shared / Math.max(sx.size, sy.size) >= 0.5;
}
const within = (a: number, b: number) => Math.abs(a - b) <= Math.max(CSV_TOLERANCE.absolute, Math.abs(b) * CSV_TOLERANCE.share) + 1e-9;
/** The rows of a CSV re-import that are an entry of the log, changed at the bank (`skip`: rows not to match, e.g. repeats in the file). */
export function changedCsvRows(rows: readonly BankTransaction[], log: Pick<MoneyLog, 'entries'>, skip: ReadonlySet<number> = new Set()): Changed[] {
  const exact = new Set<string>();
  for (const t of rows) { const kind = t.direction === 'out' ? 'expense' : 'income', note = noteOf(t), amount = Number(t.amount); const e = log.entries.find(x => x.date === t.date && x.kind === kind && x.currency === t.currency && Number(x.amount) === amount && (x.note ?? '') === note); if (e) exact.add(e.id); }
  // Every possible pairing, then the closest amounts first: each row and each entry is taken once.
  const pairs: {t: BankTransaction; e: MoneyEntry; gap: number}[] = [];
  for (const t of rows) {
    if (skip.has(t.index) || t.duplicate || alreadyLogged(t, log) || !/^\d{1,10}(\.\d{1,2})?$/.test(t.amount) || Number(t.amount) <= 0) continue;
    const kind = t.direction === 'out' ? 'expense' : 'income', note = noteOf(t), amount = Number(t.amount);
    for (const e of log.entries) if (!exact.has(e.id) && !e.parts?.length && !e.transfer && e.date === t.date && e.kind === kind && e.currency === t.currency && within(amount, Number(e.amount)) && similarPayee(note, e.note ?? '')) pairs.push({t, e, gap: Math.abs(Number(e.amount) - amount)});
  }
  const rowsTaken = new Set<number>(), taken = new Set<string>(), out: Changed[] = [];
  for (const {t, e} of pairs.sort((a, b) => a.gap - b.gap || a.t.index - b.t.index)) {
    if (rowsTaken.has(t.index) || taken.has(e.id)) continue;
    const note = noteOf(t), fixed = Number(t.amount).toFixed(2), diff: Changed = {t, entry: e, ...(fixed !== e.amount ? {amount: fixed} : {}), ...(note && note !== (e.note ?? '') ? {note} : {})};
    if (diff.amount || diff.note) { rowsTaken.add(t.index); taken.add(e.id); out.push(diff); }
  }
  return out.sort((a, b) => a.t.index - b.t.index);
}
/** Undo of an update: the entries back exactly as they were before it (by id); anything else kept. */
export function putBackEntries(log: MoneyLog, before: readonly MoneyEntry[]): MoneyLog {
  const by = new Map(before.map(e => [e.id, e]));
  return {...log, entries: log.entries.map(e => by.get(e.id) ?? e)};
}

/** A card payment or a move between accounts: the same amount leaving one account and arriving in another within 5 days. */
export type TransferPair = {out: MoneyEntry; in: MoneyEntry; days: number};
const DAY = 86_400_000, WINDOW = 5;
export function transferPairs(entries: readonly MoneyEntry[], among?: ReadonlySet<string>): TransferPair[] {
  const open = entries.filter(e => e.account && !e.transfer && !e.excluded && !e.parts?.length);
  const ins = open.filter(e => e.kind === 'income'), used = new Set<string>(), pairs: TransferPair[] = [];
  for (const out of open.filter(e => e.kind === 'expense').sort((a, b) => a.date.localeCompare(b.date))) {
    const days = (x: MoneyEntry) => Math.abs(Date.parse(`${x.date}T12:00:00Z`) - Date.parse(`${out.date}T12:00:00Z`)) / DAY;
    const match = ins.filter(i => !used.has(i.id) && i.account !== out.account && i.currency === out.currency && i.amount === out.amount && days(i) <= WINDOW && (!among || among.has(i.id) || among.has(out.id)))
      .sort((a, b) => days(a) - days(b))[0];
    if (match) { used.add(match.id); pairs.push({out, in: match, days: Math.round(days(match))}); }
  }
  return pairs;
}
/** Marks (or, with `on` false, unmarks) both sides of a transfer, each naming the other, with history. */
export function setTransfer(log: MoneyLog, outId: string, inId: string, on: boolean, at: string): MoneyLog {
  const other = (id: string) => id === outId ? inId : outId;
  return {...log, entries: log.entries.map(e => {
    if (e.id !== outId && e.id !== inId) return e;
    const {transfer: _t, ...rest} = e; void _t;
    return withChange(on ? {...rest, transfer: other(e.id)} : rest, {by: 'you', field: 'transfer', from: e.transfer ? 'a transfer' : 'counted', to: on ? 'a transfer' : 'counted'}, at);
  })};
}
