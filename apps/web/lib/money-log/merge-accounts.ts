import {accountsSchema, isDebtKind, MAX_SNAPSHOTS, type Account, type Accounts} from '../accounts/schema';
import {bankAccountNames} from './reconcile';
import type {MoneyEntry, MoneyLog} from './schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Data Cleanup, LEDGER #387): "Merge two accounts" — after a bank changed its
 * name, or a file named an account differently, one account's history goes into another and nothing is lost:
 * - the balances of the one merged go to the other on every day it has none (the other's own balance stays on a day both
 *   have); a debt's payments go with them; the one merged is archived, its own history kept on it;
 * - its note joins the other's, the other takes the earlier place in the person's order, and the later of the two "last
 *   checked against the bank" days is kept (lib/money-log/reconcile.ts, round 4's #340);
 * - the money-log entries of the bank-file account names chosen (by default the one merged's own name) take the other's
 *   name, and exact doubles that this brings together — the same day, kind, amount, currency and bank reference — are
 *   offered for removal.
 * Undo (`undoMerge`) puts back exactly what the merge took or changed; anything changed since is kept. Accounts keep no
 * spending figure, so nothing here counts spending. Pure.
 */
export type MergeChoice = {fromId: string; intoId: string; names: readonly string[]; asName: string; removeDoubles: ReadonlySet<string>};
/**
 * Review b5k #2: two copies of one bank move. `differs` names what differs beyond the matched day, kind, amount, currency
 * and reference (category, subcategory, note, split parts, tags, marks, history); the copy kept is the one holding more of
 * the person's own edits, and `edited` says the copy offered for removal holds edits of its own, so it is never ticked by
 * default.
 */
export type Double = {keep: MoneyEntry; remove: MoneyEntry; differs: string[]; edited: boolean};
type Tags = Readonly<Record<string, readonly string[]>>;
const EDIT_FIELDS: readonly [keyof MoneyEntry, string][] = [['category', 'category'], ['sub', 'subcategory'], ['note', 'note'], ['parts', 'split parts'], ['share', 'your share'], ['paidWith', 'paid with'],
  ['excluded', 'left out'], ['taxDeductible', 'tax mark'], ['spread', 'spread over months'], ['checked', 'checked against the bank'], ['group', 'group'], ['fine', '“that’s fine”'], ['history', 'changes']];
const MARKS: readonly (keyof MoneyEntry)[] = ['sub', 'parts', 'share', 'paidWith', 'excluded', 'taxDeductible', 'spread', 'checked', 'group', 'fine'];
/** How much of the person's own work a copy holds: its changes, its marks and its tags. */
export const editWeight = (e: MoneyEntry, tags: Tags = {}) => (e.history?.length ?? 0) * 2 + MARKS.filter(k => e[k] !== undefined).length + (tags[e.id]?.length ? 1 : 0);
export function doubleOf(into: MoneyEntry, from: MoneyEntry, tags: Tags = {}): Double {
  const differs = EDIT_FIELDS.filter(([k]) => JSON.stringify(into[k] ?? null) !== JSON.stringify(from[k] ?? null)).map(([, w]) => w);
  if (JSON.stringify(tags[into.id] ?? []) !== JSON.stringify(tags[from.id] ?? [])) differs.push('tags');
  const keepFrom = editWeight(from, tags) > editWeight(into, tags), keep = keepFrom ? from : into, remove = keepFrom ? into : from;
  return {keep, remove, differs, edited: editWeight(remove, tags) > 0 || differs.length > 0};
}
export type MergePlan = {from: Account; into: Account; balances: {moved: number; kept: number}; payments: number; entries: MoneyEntry[]; doubles: Double[]; names: string[]; note: string | null};
const fold = (s: string) => s.trim().toLowerCase();
/** Why these two cannot be merged, in words, or null. */
export function mergeProblem(accounts: Accounts, fromId: string, intoId: string): string | null {
  const from = accounts.items.find(a => a.id === fromId), into = accounts.items.find(a => a.id === intoId);
  if (!from || !into) return 'Choose the two accounts.';
  if (from.id === into.id) return 'Choose two different accounts.';
  if (from.archivedAt || into.archivedAt) return 'Bring the account back from Archived first.';
  if (from.currency !== into.currency) return `${from.name} is in ${from.currency} and ${into.name} in ${into.currency}: only accounts in the same currency can be merged.`;
  if (isDebtKind(from.kind) !== isDebtKind(into.kind)) return 'An account you own and a debt cannot be merged.';
  return null;
}
/** The accounts another can be merged into: active, the same currency, both owned or both owed. */
export const mergeTargets = (accounts: Accounts, fromId: string) => accounts.items.filter(a => a.id !== fromId && !mergeProblem(accounts, fromId, a.id));
/** The bank-file account names in the log for that currency, and which match the account's own name. */
export const bankNamesFor = (log: Pick<MoneyLog, 'entries'>, account: Account) => bankAccountNames(log.entries, account.currency).map(name => ({name, own: fold(name) === fold(account.name)}));
/** The name merged entries take: a bank-file name of the other account when the log has one, else its name (≤ 40). */
export const defaultAsName = (log: Pick<MoneyLog, 'entries'>, into: Account) => bankNamesFor(log, into).find(n => n.own)?.name ?? into.name.slice(0, 40);
const sameMove = (a: MoneyEntry, b: MoneyEntry) => !!a.ref && a.ref === b.ref && a.date === b.date && a.kind === b.kind && a.amount === b.amount && a.currency === b.currency;
export function planMerge(accounts: Accounts, log: MoneyLog, fromId: string, intoId: string, names: readonly string[], asName: string, tags: Tags = {}): MergePlan {
  const problem = mergeProblem(accounts, fromId, intoId); if (problem) throw new Error(problem);
  const from = accounts.items.find(a => a.id === fromId)!, into = accounts.items.find(a => a.id === intoId)!;
  const days = new Set(into.snapshots.map(s => s.date)), kept = from.snapshots.filter(s => days.has(s.date)).length;
  const chosen = new Set(names.map(fold)), as = fold(asName);
  const entries = log.entries.filter(e => e.currency === from.currency && e.account && chosen.has(fold(e.account)) && fold(e.account) !== as);
  const already = log.entries.filter(e => e.currency === from.currency && e.account && fold(e.account) === as), doubles: Double[] = [];
  const taken = new Set<string>();
  for (const e of entries) { const twin = already.find(x => !taken.has(x.id) && sameMove(x, e)); if (twin) { taken.add(twin.id); doubles.push(doubleOf(twin, e, tags)); } }
  const notes = log.accounts?.notes ?? {};
  return {from, into, balances: {moved: from.snapshots.length - kept, kept}, payments: isDebtKind(into.kind) ? from.payments.length : 0, entries, doubles, names: [...names], note: notes[from.id] ?? null};
}
export type MergeUndo = {fromBefore: Account; intoBefore: Account; renamed: {id: string; account: string}[]; asName: string; removed: {entry: MoneyEntry; index: number}[];
  notes: {from: string | null; into: string | null}; order: string[] | null; checked: {from: string | null; into: string | null}};
/** The accounts record after the merge: the other with the merged history, the one merged archived. */
export function mergeAccountsRecord(accounts: Accounts, fromId: string, intoId: string, at: string): Accounts {
  const problem = mergeProblem(accounts, fromId, intoId); if (problem) throw new Error(problem);
  const from = accounts.items.find(a => a.id === fromId)!, days = new Set(accounts.items.find(a => a.id === intoId)!.snapshots.map(s => s.date));
  return accountsSchema.parse({...accounts, items: accounts.items.map(a => {
    if (a.id === intoId) {
      const ids = new Set(a.snapshots.map(s => s.id)), payIds = new Set(a.payments.map(p => p.id));
      const snapshots = [...a.snapshots, ...from.snapshots.filter(s => !days.has(s.date)).map(s => ids.has(s.id) ? {...s, id: crypto.randomUUID()} : s)].sort((x, y) => x.date.localeCompare(y.date)).slice(-MAX_SNAPSHOTS);
      const payments = isDebtKind(a.kind) ? [...a.payments, ...from.payments.map(p => payIds.has(p.id) ? {...p, id: crypto.randomUUID()} : p)].sort((x, y) => x.date.localeCompare(y.date)) : a.payments;
      return {...a, snapshots, payments, updatedAt: at};
    }
    return a.id === fromId ? {...a, archivedAt: at, updatedAt: at} : a;
  })});
}
/** The money log after the merge, and what Undo needs. */
export function mergeLog(log: MoneyLog, plan: MergePlan, asName: string, removeDoubles: ReadonlySet<string>, accountsOrder: readonly string[]): {log: MoneyLog; renamed: MergeUndo['renamed']; removed: MergeUndo['removed']; before: Pick<MergeUndo, 'notes' | 'order' | 'checked'>} {
  const name = asName.trim().slice(0, 40);
  if (!name) throw new Error('Type the name their entries take.');
  const move = new Set(plan.entries.map(e => e.id)), drop = new Set(plan.doubles.filter(d => removeDoubles.has(d.remove.id)).map(d => d.remove.id));
  const renamed: MergeUndo['renamed'] = [], removed: MergeUndo['removed'] = [];
  const entries: MoneyEntry[] = [];
  log.entries.forEach((e, index) => {
    if (drop.has(e.id)) { removed.push({entry: e, index}); return; }
    if (move.has(e.id)) { renamed.push({id: e.id, account: e.account!}); entries.push({...e, account: name}); return; }
    entries.push(e);
  });
  const {from, into} = plan, notes = {...log.accounts?.notes}, checked = {...log.accounts?.checked};
  const before = {notes: {from: notes[from.id] ?? null, into: notes[into.id] ?? null}, order: log.accounts?.order ? [...log.accounts.order] : null, checked: {from: checked[from.id] ?? null, into: checked[into.id] ?? null}};
  const joined = [before.notes.into, before.notes.from].filter(Boolean).join(' · ').slice(0, 300);
  if (joined) notes[into.id] = joined;
  const later = [before.checked.from, before.checked.into].filter((d): d is string => !!d).sort().at(-1);
  if (later) checked[into.id] = later;
  // The other takes the earlier of the two places in the person's order (the order as shown when none is kept).
  const order = [...(log.accounts?.order?.length ? log.accounts.order : accountsOrder)];
  const fi = order.indexOf(from.id), ii = order.indexOf(into.id);
  if (fi >= 0 && (ii < 0 || fi < ii)) { if (ii >= 0) order.splice(ii, 1); order.splice(order.indexOf(from.id), 0, into.id); }
  const accounts = {...log.accounts, notes, ...(Object.keys(checked).length ? {checked} : {}), ...(order.length ? {order: order.slice(0, 200)} : {})};
  return {log: {...log, entries, accounts}, renamed, removed, before};
}
/** Undo of the accounts part: the two accounts as they were (if they are still there). */
export function undoMergeAccounts(accounts: Accounts, undo: Pick<MergeUndo, 'fromBefore' | 'intoBefore'>): Accounts {
  return accountsSchema.parse({...accounts, items: accounts.items.map(a => a.id === undo.fromBefore.id ? undo.fromBefore : a.id === undo.intoBefore.id ? undo.intoBefore : a)});
}
/** Undo of the money-log part: names back on the entries still carrying the merged name, doubles back in place, notes, order and last checks as they were. */
export function undoMergeLog(log: MoneyLog, undo: MergeUndo): MoneyLog {
  const back = new Map(undo.renamed.map(r => [r.id, r.account]));
  const entries = log.entries.map(e => back.has(e.id) && e.account === undo.asName ? {...e, account: back.get(e.id)!} : e);
  for (const r of [...undo.removed].sort((a, b) => a.index - b.index)) if (!entries.some(e => e.id === r.entry.id)) entries.splice(Math.min(r.index, entries.length), 0, r.entry);
  const notes = {...log.accounts?.notes}, checked = {...log.accounts?.checked}, from = undo.fromBefore.id, into = undo.intoBefore.id;
  for (const [id, v] of [[from, undo.notes.from], [into, undo.notes.into]] as const) { if (v) notes[id] = v; else delete notes[id]; }
  for (const [id, v] of [[from, undo.checked.from], [into, undo.checked.into]] as const) { if (v) checked[id] = v; else delete checked[id]; }
  const {order: _o, checked: _c, ...rest} = log.accounts ?? {}; void _o; void _c;
  return {...log, entries, accounts: {...rest, notes, ...(Object.keys(checked).length ? {checked} : {}), ...(undo.order ? {order: undo.order} : {})}};
}
