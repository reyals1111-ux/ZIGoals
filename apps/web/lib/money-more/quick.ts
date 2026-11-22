import {MAX_SUBS, PAID_WITH, type MoneyEntry, type MoneyLog, type PaidWith} from '../money-log/schema';
import {isSpending, mineCents} from '../money-log/counted';
import {MAX_SAVED, type MoneyMore, type SavedEntry} from './schema';

/**
 * Session AV lane 2, round 2 (money; Wallet's record templates and payment types, Emma's subcategories): quick logging,
 * pure. A saved entry is one tap in the money form (an ordinary entry, with Undo, dated today); "paid with" is the
 * person's own mark on an entry, with the month's spending by method; subcategories are the person's own, under one
 * main category, rolled up into it everywhere and shown apart where the category is opened. Exact cents, per currency,
 * never converted.
 */
export const PAID_WITH_WORDS: Record<PaidWith, {en: string; nl: string}> = {
  cash: {en: 'Cash', nl: 'Contant'}, debit: {en: 'Debit card', nl: 'Pinpas'}, credit: {en: 'Credit card', nl: 'Creditcard'},
  transfer: {en: 'Bank transfer', nl: 'Overboeking'}, other: {en: 'Other', nl: 'Anders'},
};
export {PAID_WITH};
const fold = (s: string) => s.trim().replace(/\s+/g, ' ');
export type SavedInput = {name: string; kind: MoneyEntry['kind']; amount: string; currency: string; category: string; sub?: string; note?: string; paidWith?: PaidWith};
/** Keeps an entry as a saved entry (a new name, or the same name replaced), at most 20. */
export function withSaved(more: MoneyMore, input: SavedInput, id: string): MoneyMore {
  const name = fold(input.name).slice(0, 40);
  if (!name) throw new Error('Give the saved entry a name, for example Coffee.');
  const list = more.saved ?? [], same = list.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (!same && list.length >= MAX_SAVED) throw new Error(`Up to ${MAX_SAVED} saved entries: remove one first.`);
  const next: SavedEntry = {id: same?.id ?? id, name, kind: input.kind, amount: input.amount, currency: input.currency, category: input.category,
    ...(input.sub ? {sub: input.sub} : {}), ...(input.note?.trim() ? {note: input.note.trim().slice(0, 200)} : {}), ...(input.paidWith ? {paidWith: input.paidWith} : {})};
  return {...more, saved: same ? list.map(s => s.id === same.id ? next : s) : [...list, next]};
}
export function withoutSaved(more: MoneyMore, id: string): MoneyMore {
  const list = (more.saved ?? []).filter(s => s.id !== id);
  const {saved: _s, ...rest} = more; void _s;
  return list.length ? {...rest, saved: list} : rest;
}
/** Moves a saved entry one place earlier (-1) or later (+1). */
export function moveSaved(more: MoneyMore, id: string, by: -1 | 1): MoneyMore {
  const list = [...(more.saved ?? [])], i = list.findIndex(s => s.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return more;
  [list[i], list[j]] = [list[j]!, list[i]!];
  return {...more, saved: list};
}
/** The ordinary entry one tap on a saved entry adds: its amount, category and marks, dated today. */
export function entryFromSaved(s: SavedEntry, today: string, id: string, now: string): MoneyEntry {
  return {id, kind: s.kind, amount: s.amount, currency: s.currency, category: s.category, ...(s.note ? {note: s.note} : {}), date: today, createdAt: now, source: 'form',
    ...(s.sub ? {sub: s.sub} : {}), ...(s.paidWith ? {paidWith: s.paidWith} : {})};
}
/** The chip's words: "Coffee €3.20". */
export const savedLabel = (s: SavedEntry, money: (cents: number, currency: string) => string) => `${s.name} ${s.kind === 'income' ? '+' : ''}${money(Math.round(Number(s.amount) * 100), s.currency)}`;

export type MethodTotal = {method: PaidWith | 'unmarked'; currency: string; cents: number; count: number};
/** Spending from `from` to `to` by how it was paid (counted entries, the person's own share), per currency; unmarked apart. */
export function byPaidWith(entries: readonly MoneyEntry[], from: string, to: string): MethodTotal[] {
  const by = new Map<string, MethodTotal>();
  for (const e of entries) {
    if (!isSpending(e) || e.date < from || e.date > to) continue; // Round 6 (#425): a refund lowers its method
    const method = e.paidWith ?? 'unmarked', k = `${e.currency}|${method}`, row = by.get(k) ?? {method, currency: e.currency, cents: 0, count: 0};
    row.cents += mineCents(e); row.count++; by.set(k, row);
  }
  return [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency) || (a.method === 'unmarked' ? 1 : 0) - (b.method === 'unmarked' ? 1 : 0) || b.cents - a.cents);
}

// ── Subcategories ────────────────────────────────────────────────────────────────────────────────────────────────
const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const subsOf = (log: Pick<MoneyLog, 'subs'>, category: string): readonly string[] => {
  const key = Object.keys(log.subs ?? {}).find(k => sameName(k, category));
  return key ? log.subs![key]! : [];
};
/** Adds one of the person's own subcategories under a category (trimmed, at most 40 characters, at most 20 each). */
export function addSub(log: MoneyLog, category: string, name: string): MoneyLog {
  const clean = fold(name);
  if (!clean) throw new Error('Type a name for the subcategory.');
  if (clean.length > 40) throw new Error('A subcategory has at most 40 characters.');
  if (sameName(clean, category)) throw new Error(`${clean} is the category itself: choose another name.`);
  const key = Object.keys(log.subs ?? {}).find(k => sameName(k, category)) ?? category, list = log.subs?.[key] ?? [];
  if (list.some(s => sameName(s, clean))) throw new Error(`${clean} is already under ${key}.`);
  if (list.length >= MAX_SUBS) throw new Error(`Up to ${MAX_SUBS} subcategories under one category.`);
  if (!log.subs?.[key] && Object.keys(log.subs ?? {}).length >= 40) throw new Error('Up to 40 categories can have subcategories.');
  return {...log, subs: {...log.subs, [key]: [...list, clean]}};
}
/** Removes a subcategory from the choices; entries that carry it keep it (and still count in the main category). */
export function removeSub(log: MoneyLog, category: string, name: string): MoneyLog {
  const key = Object.keys(log.subs ?? {}).find(k => sameName(k, category));
  if (!key) return log;
  const subs = {...log.subs}, list = subs[key]!.filter(s => s !== name);
  if (list.length) subs[key] = list; else delete subs[key];
  return {...log, subs};
}
export type SubTotal = {sub: string | null; currency: string; cents: number; count: number};
/**
 * One category's spending from `from` to `to`, by subcategory (null: the entries without one), per currency, counted
 * entries only, each its own share; a split entry's part in this category takes the entry's subcategory.
 */
export function bySub(entries: readonly MoneyEntry[], category: string, from: string, to: string, partsOf: (e: MoneyEntry) => {cents: number; category: string}[]): SubTotal[] {
  const by = new Map<string, SubTotal>();
  for (const e of entries) {
    if (!isSpending(e) || e.date < from || e.date > to) continue; // Round 6 (#425): a refund lowers its category
    for (const p of partsOf(e)) {
      if (!sameName(p.category, category)) continue;
      const sub = e.sub && sameName(e.category, category) ? e.sub : null, k = `${e.currency}|${sub ?? ''}`, row = by.get(k) ?? {sub, currency: e.currency, cents: 0, count: 0};
      row.cents += p.cents; row.count++; by.set(k, row);
    }
  }
  return [...by.values()].sort((a, b) => a.currency.localeCompare(b.currency) || (a.sub === null ? 1 : 0) - (b.sub === null ? 1 : 0) || b.cents - a.cents);
}
/** "Food & drink › Coffee" (the main category alone without one). */
export const categoryPath = (e: Pick<MoneyEntry, 'category' | 'sub'>) => e.sub ? `${e.category} › ${e.sub}` : e.category;
