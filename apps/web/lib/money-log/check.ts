import {minorUnits} from '../money-split/parts';
import type {BudgetsRecord} from '../budgets/schema';
import {budgetsSchema} from '../budgets/schema';
import {allCategories, categoryChoices, countedKind, withChange} from './counted';
import {MAX_SUBS, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';

/**
 * Session AV lane 2, round 6 (money; Banktivity's Check Ledger Health, LEDGER #430): "Check my money records" — a read-only
 * report of what looks wrong in the money records, each with the repairs the person can choose (every one with Undo in
 * the page); nothing changes without a tap. It finds: entries that look like the same entry twice; entries in a category
 * that is no longer one of yours; subcategories whose list no longer has them; splits whose parts do not add up (they
 * count whole); a transfer whose other side is gone; a refund naming a purchase that is gone; notes, order or checked days
 * kept for an account that is gone; and budgets of a category no longer offered. Pure.
 */
export type CheckIssue =
  | {kind: 'duplicate'; key: string; entries: MoneyEntry[]}
  | {kind: 'category'; key: string; category: string; entryKind: MoneyEntry['kind']; entries: MoneyEntry[]}
  | {kind: 'sub'; key: string; category: string; sub: string; entries: MoneyEntry[]}
  | {kind: 'split'; key: string; entry: MoneyEntry}
  | {kind: 'transfer'; key: string; entry: MoneyEntry}
  | {kind: 'refund-link'; key: string; entry: MoneyEntry}
  | {kind: 'account'; key: string; accountId: string}
  | {kind: 'budget'; key: string; budgetId: string; category: string; currency: string; archived: boolean};
const fold = (s: string) => s.trim().toLowerCase();
const payee = (e: MoneyEntry) => fold((e.note ?? '').split(' · ')[0] ?? '');
const partsOff = (e: MoneyEntry) => !!e.parts?.length && e.parts.reduce((s, p) => s + (/^\d{1,10}(\.\d{1,2})?$/.test(p.amount) ? minorUnits(p.amount) : NaN), 0) !== minorUnits(e.amount);

export function checkRecords(log: MoneyLog, {budgets = null, accountIds = null}: {budgets?: BudgetsRecord | null; accountIds?: ReadonlySet<string> | null} = {}): CheckIssue[] {
  const out: CheckIssue[] = [], byId = new Map(log.entries.map(e => [e.id, e]));
  // The same entry twice: the same bank reference, or the same day, kind, amount, currency, category and payee.
  const twins = new Map<string, MoneyEntry[]>();
  for (const e of log.entries) {
    if (e.transfer) continue;
    const k = e.ref ? `ref|${e.currency}|${e.ref}` : `same|${e.date}|${e.kind}|${e.amount}|${e.currency}|${fold(e.category)}|${payee(e)}`;
    twins.set(k, [...(twins.get(k) ?? []), e]);
  }
  for (const [key, list] of twins) if (list.length > 1) out.push({kind: 'duplicate', key: `dup:${key}`, entries: [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))});
  // A category that is no longer one of the person's (an own category removed since).
  const known = {expense: new Set(allCategories(log, 'expense').map(fold)), income: new Set(allCategories(log, 'income').map(fold))}, lost = new Map<string, MoneyEntry[]>();
  for (const e of log.entries) { const k = countedKind(e); if (!known[k].has(fold(e.category))) lost.set(`${k}|${e.category}`, [...(lost.get(`${k}|${e.category}`) ?? []), e]); }
  for (const [k, list] of lost) { const [entryKind, ...rest] = k.split('|'); out.push({kind: 'category', key: `cat:${k}`, category: rest.join('|'), entryKind: entryKind as MoneyEntry['kind'], entries: list}); }
  // A subcategory its category's list no longer has.
  const subs = new Map<string, MoneyEntry[]>();
  for (const e of log.entries) if (e.sub && !(log.subs?.[e.category] ?? []).some(s => fold(s) === fold(e.sub!))) subs.set(`${e.category}|${e.sub}`, [...(subs.get(`${e.category}|${e.sub}`) ?? []), e]);
  for (const [k, list] of subs) out.push({kind: 'sub', key: `sub:${k}`, category: list[0]!.category, sub: list[0]!.sub!, entries: list});
  for (const e of log.entries) {
    if (partsOff(e)) out.push({kind: 'split', key: `split:${e.id}`, entry: e});
    if (e.transfer) { const other = byId.get(e.transfer); if (!other || other.transfer !== e.id) out.push({kind: 'transfer', key: `transfer:${e.id}`, entry: e}); }
    if (e.refundOf && !byId.has(e.refundOf) && !putAwayIds(log).has(e.refundOf)) out.push({kind: 'refund-link', key: `refund:${e.id}`, entry: e});
  }
  if (accountIds) {
    const named = new Set([...Object.keys(log.accounts?.notes ?? {}), ...Object.keys(log.accounts?.checked ?? {}), ...(log.accounts?.order ?? [])]);
    for (const accountId of named) if (!accountIds.has(accountId)) out.push({kind: 'account', key: `account:${accountId}`, accountId});
  }
  if (budgets) {
    const offered = new Set(categoryChoices(log, 'expense').map(fold));
    for (const b of budgets.budgets) if (!offered.has(fold(b.category))) out.push({kind: 'budget', key: `budget:${b.id}`, budgetId: b.id, category: b.category, currency: b.currency, archived: known.expense.has(fold(b.category))});
  }
  return out;
}
let cache: {log: MoneyLog; ids: Set<string>} | null = null;
function putAwayIds(log: MoneyLog): Set<string> {
  if (cache?.log === log) return cache.ids;
  const ids = new Set<string>();
  for (const y of log.putAway?.years ?? []) for (const raw of y.entries) { const id = (raw as {id?: unknown} | null)?.id; if (typeof id === 'string') ids.add(id); }
  cache = {log, ids};
  return ids;
}

// ── Repairs (each a normal write; the page offers Undo) ──────────────────────────────────────────────────────────────
const AT = () => new Date().toISOString();
/** Removes the later copies, keeping the first one written. */
export function keepFirst(log: MoneyLog, ids: readonly string[]): MoneyLog {
  const gone = new Set(ids.slice(1));
  return {...log, entries: log.entries.filter(e => !gone.has(e.id))};
}
/** Moves entries to another category, with history. */
export function moveCategory(log: MoneyLog, ids: ReadonlySet<string>, category: string, at = AT()): MoneyLog {
  const name = category.trim().slice(0, 40);
  if (!name) throw new Error('Choose a category.');
  return {...log, entries: log.entries.map(e => ids.has(e.id) && e.category !== name ? withChange({...e, category: name}, {by: 'you', field: 'category', from: e.category, to: name}, at) : e)};
}
/** Adds a category back as one of the person's own. */
export function addBackCategory(log: MoneyLog, kind: MoneyEntry['kind'], category: string): MoneyLog {
  const list = (kind === 'expense' ? log.own?.expense : log.own?.income) ?? [];
  if (list.some(c => fold(c) === fold(category))) return log;
  return moneyLogSchema.parse({...log, own: {...log.own, [kind]: [...list, category.trim().slice(0, 40)]}});
}
/** Adds a subcategory back to its category's list. */
export function addBackSub(log: MoneyLog, category: string, sub: string): MoneyLog {
  const list = log.subs?.[category] ?? [];
  if (list.length >= MAX_SUBS) throw new Error(`${category} already has ${MAX_SUBS} subcategories.`);
  return moneyLogSchema.parse({...log, subs: {...log.subs, [category]: [...list, sub]}});
}
/** Takes the subcategory off these entries (they count in their main category, as before). */
export function clearSub(log: MoneyLog, ids: ReadonlySet<string>): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (!ids.has(e.id) || !e.sub) return e; const {sub: _s, ...rest} = e; void _s; return rest; })};
}
/** Removes a split whose parts do not add up (the entry counts whole, as it already does). */
export function dropSplit(log: MoneyLog, id: string): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (e.id !== id) return e; const {parts: _p, ...rest} = e; void _p; return rest; })};
}
/** Counts a lone transfer side again (its other side is gone), with history. */
export function untransfer(log: MoneyLog, id: string, at = AT()): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (e.id !== id || !e.transfer) return e; const {transfer: _t, ...rest} = e; void _t; return withChange(rest, {by: 'you', field: 'transfer', from: 'a transfer', to: 'counted'}, at); })};
}
/** Takes away a refund's link to a purchase that is gone (it still lowers its category). */
export function unlinkRefund(log: MoneyLog, id: string): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (e.id !== id || !e.refundOf) return e; const {refundOf: _o, ...rest} = e; void _o; return rest; })};
}
/** Forgets the note, place in the order and checked day kept for an account that is gone. */
export function forgetAccount(log: MoneyLog, accountId: string): MoneyLog {
  if (!log.accounts) return log;
  const notes = {...log.accounts.notes}, checked = {...log.accounts.checked};
  delete notes[accountId]; delete checked[accountId];
  return moneyLogSchema.parse({...log, accounts: {...log.accounts, notes, checked, ...(log.accounts.order ? {order: log.accounts.order.filter(x => x !== accountId)} : {})}});
}
/**
 * Review B6O-6: Undo for the repairs that change no listed entry (so the shared item Undo cannot offer one). Each puts
 * back only what its repair changed, into the latest record, and keeps anything changed since.
 * - "Forget it": the account's note, checked day and place in the order come back, unless the account has a note,
 *   checked day or place of its own again by now.
 */
export function unforgetAccount(latest: MoneyLog, before: MoneyLog, accountId: string): MoneyLog {
  const was = before.accounts;
  if (!was) return latest;
  const now = latest.accounts ?? {}, note = was.notes?.[accountId], day = was.checked?.[accountId], at = was.order?.indexOf(accountId) ?? -1;
  const notes = note !== undefined && now.notes?.[accountId] === undefined ? {...now.notes, [accountId]: note} : now.notes;
  const checked = day !== undefined && now.checked?.[accountId] === undefined ? {...now.checked, [accountId]: day} : now.checked;
  let order = now.order;
  if (at >= 0 && !(order ?? []).includes(accountId)) { const list = [...(order ?? [])], after = was.order!.slice(at + 1).find(x => list.includes(x)); list.splice(after === undefined ? list.length : list.indexOf(after), 0, accountId); order = list.slice(0, 200); }
  return moneyLogSchema.parse({...latest, accounts: {...now, ...(notes ? {notes} : {}), ...(checked ? {checked} : {}), ...(order ? {order} : {})}});
}
/** "Add … back" (a category): takes that one category off the person's own list again, if it is still there. */
export function undoAddBackCategory(latest: MoneyLog, before: MoneyLog, kind: MoneyEntry['kind'], category: string): MoneyLog {
  const had = ((kind === 'expense' ? before.own?.expense : before.own?.income) ?? []).some(c => fold(c) === fold(category)), list = (kind === 'expense' ? latest.own?.expense : latest.own?.income) ?? [];
  if (had || !list.some(c => fold(c) === fold(category))) return latest;
  return moneyLogSchema.parse({...latest, own: {...latest.own, [kind]: list.filter(c => fold(c) !== fold(category))}});
}
/** "Add … back" (a subcategory): takes that subcategory off its category's list again, if it is still there. */
export function undoAddBackSub(latest: MoneyLog, before: MoneyLog, category: string, sub: string): MoneyLog {
  const had = (before.subs?.[category] ?? []).length, list = latest.subs?.[category];
  if (!list) return latest;
  const at = list.lastIndexOf(sub);
  if (at < 0 || (before.subs?.[category] ?? []).filter(x => x === sub).length >= list.filter(x => x === sub).length) return latest;
  const rest = list.filter((_, i) => i !== at), subs = {...latest.subs};
  if (rest.length || had) subs[category] = rest; else delete subs[category];
  return moneyLogSchema.parse({...latest, subs});
}
/** Removes a budget of a category no longer offered. */
export const dropBudget = (budgets: BudgetsRecord, id: string): BudgetsRecord => budgetsSchema.parse({...budgets, budgets: budgets.budgets.filter(b => b.id !== id)});
