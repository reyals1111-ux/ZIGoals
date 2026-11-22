import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, MAX_HISTORY, MAX_OWN_CATEGORIES, type MoneyEntry, type MoneyLog} from './schema';
import {entryParts, minorUnits, type EntryPart} from '../money-split/parts';

/**
 * Session AV lane 2 (money; YNAB's credit-card interest, Rocket Money's "ignore", Monarch's exclude, Copilot's spread):
 * which entries the figures count. An entry marked "not part of my spending" (`excluded`) and both sides of a card
 * payment or a move between accounts (`transfer`) stay in the log, in search and in Export, but no total, budget, pace or
 * insight counts them. Pure.
 */
export const isCounted = (e: Pick<MoneyEntry, 'excluded' | 'transfer'>) => !e.excluded && !e.transfer;
export const countedOnly = <T extends Pick<MoneyEntry, 'excluded' | 'transfer'>>(entries: readonly T[]): T[] => entries.filter(isCounted);

/**
 * Session AV lane 2, round 2 (money; Emma's custom split): the person's own share of a cost paid for others too. The log
 * keeps what was paid (`amount`); spending figures and budgets count `share` (when it is above zero and at most the
 * amount; otherwise the whole amount, as older builds do). Each part is scaled to the share in exact cents (the first
 * parts take the leftover cents, so the parts add up to the share).
 */
export function mineCents(e: Pick<MoneyEntry, 'amount' | 'share'>): number {
  const whole = minorUnits(e.amount), mine = e.share ? minorUnits(e.share) : whole;
  return mine > 0 && mine <= whole ? mine : whole;
}
export function mineParts(e: MoneyEntry): EntryPart[] {
  const parts = entryParts(e), whole = minorUnits(e.amount), mine = mineCents(e);
  if (mine === whole) return parts;
  const scaled = parts.map(p => ({...p, cents: Math.floor(p.cents * mine / whole)}));
  let rest = mine - scaled.reduce((sum, p) => sum + p.cents, 0);
  for (let i = 0; rest > 0 && scaled.length; i = (i + 1) % scaled.length, rest--) scaled[i]!.cents++;
  return scaled;
}
/**
 * Review b2a #1 (one month's spending is one figure everywhere): what one entry adds to a spending or income figure, in
 * cents, by Wealth → Spending's rule (lib/money-log/engine.ts `totals`): nothing for an entry left out of the figures, a
 * Settle-up refund (kept as a left-out income entry) or either side of a transfer; an expense counts the person's own
 * share; income counts whole. NOVA's and ZIGi's money answers and widgets sum through this.
 */
export const countedCents = (e: Pick<MoneyEntry, 'kind' | 'amount' | 'share' | 'excluded' | 'transfer'>): number => !isCounted(e) ? 0 : e.kind === 'expense' ? mineCents(e) : minorUnits(e.amount);
const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
/**
 * What an expense counts in a month's budgets: its parts in its own month, or — spread over `spread` months from its own
 * month — an equal share of each part in each of those months (the first months take the leftover cents, so the shares
 * add up exactly). Nothing for a month outside it, or for an entry that is not counted.
 */
export function budgetMonthParts(e: MoneyEntry, month: string): EntryPart[] {
  if (!isCounted(e)) return [];
  const own = e.date.slice(0, 7), n = e.spread ?? 1, k = monthIndex(month) - monthIndex(own);
  if (k < 0 || k >= n) return [];
  if (n === 1) return mineParts(e);
  return mineParts(e).map(p => { const base = Math.floor(p.cents / n), rest = p.cents - base * n; return {...p, cents: base + (k < rest ? 1 : 0)}; });
}
/**
 * Review b2a #2: what an expense counts in budgets, by day, for a budget period that is not a calendar month (a payday
 * month, a week, two weeks): its parts on its own day, or — spread over `spread` months — each month's share
 * (`budgetMonthParts`) on the same day of that month (the month's last day when it is shorter). So every pay period
 * counts an entry exactly as the month budgets do, and the shares still add up to the person's own share of the cost.
 * Nothing for an entry left out of the figures or a transfer.
 */
export function budgetDayParts(e: MoneyEntry): {date: string; parts: EntryPart[]}[] {
  if (!isCounted(e)) return [];
  const n = e.spread ?? 1;
  if (n === 1) return [{date: e.date, parts: mineParts(e)}];
  const [y, m, d] = e.date.split('-').map(Number) as [number, number, number];
  return Array.from({length: n}, (_, k) => {
    const at = new Date(Date.UTC(y, m - 1 + k, 1)), last = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 0)).getUTCDate();
    const month = at.toISOString().slice(0, 7);
    return {date: `${month}-${String(Math.min(d, last)).padStart(2, '0')}`, parts: budgetMonthParts(e, month)};
  });
}
/**
 * Review b4f #2 (the lead's decision: every figure that shows a month or a day spreads a cost over its months exactly as
 * the budgets do): what one entry counts on which day. An expense goes through `budgetDayParts` (the person's share, a
 * spread cost by its share on its day in each month); income counts whole on its own day, as `totals` counts it (split
 * parts by their categories). Nothing for an entry left out of the figures, a Settle-up refund or a transfer. Over a
 * period that holds every month of a spread, the shares add up to what `totals` counts.
 */
export function countedDayParts(e: MoneyEntry): {date: string; parts: EntryPart[]}[] {
  if (!isCounted(e)) return [];
  return e.kind === 'expense' ? budgetDayParts(e) : [{date: e.date, parts: entryParts(e)}];
}
export type CountedFilter = {kind?: MoneyEntry['kind']; currency?: string; category?: string};
const foldName = (s: string) => s.toLowerCase().normalize('NFKD').replace(/\p{M}+/gu, '').trim();
/**
 * Spending (or income) from `from` to `to` (both included), per currency, by `countedDayParts`. With `category`, only the
 * parts in that category count (a split entry adds just its part there, as This month by category does).
 */
export function countedBetween(entries: readonly MoneyEntry[], from: string, to: string, {kind = 'expense', currency, category}: CountedFilter = {}): Map<string, number> {
  const out = new Map<string, number>(), cat = category ? foldName(category) : '';
  for (const e of entries) {
    if (e.kind !== kind || (currency && e.currency !== currency)) continue;
    for (const d of countedDayParts(e)) {
      if (d.date < from || d.date > to) continue;
      const cents = d.parts.reduce((sum, p) => !cat || foldName(p.category) === cat ? sum + p.cents : sum, 0);
      if (cents) out.set(e.currency, (out.get(e.currency) ?? 0) + cents);
    }
  }
  return out;
}
/** As `byCategory` (lib/money-log/engine.ts), by `countedDayParts`: each part in its category, biggest first. */
export function countedByCategoryBetween(entries: readonly MoneyEntry[], from: string, to: string, kind: MoneyEntry['kind'] = 'expense'): {category: string; currency: string; total: number; count: number}[] {
  const by = new Map<string, {category: string; currency: string; total: number; count: number}>();
  for (const e of entries) {
    if (e.kind !== kind) continue;
    for (const d of countedDayParts(e)) {
      if (d.date < from || d.date > to) continue;
      for (const p of d.parts) { if (!p.cents) continue; const k = `${e.currency}\u0000${p.category}`, row = by.get(k) ?? {category: p.category, currency: e.currency, total: 0, count: 0}; row.total += p.cents; row.count++; by.set(k, row); }
    }
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}
/** Whether a currency has a counted figure from `from` to `to`: a counted entry of its own, or a spread share placed there. */
export const countedIn = (entries: readonly MoneyEntry[], currency: string, from: string, to: string) => entries.some(e => e.currency === currency && countedDayParts(e).some(d => d.date >= from && d.date <= to));
/** Whether an entry can reach a month's budgets (its own month, or a later one it is spread into). */
export const reachesMonth = (e: MoneyEntry, month: string) => { const k = monthIndex(month) - monthIndex(e.date.slice(0, 7)); return k >= 0 && k < (e.spread ?? 1); };

/** Every category of a kind, archived ones included: the usual ones, then the person's own (as they typed them). */
export function allCategories(log: Pick<MoneyLog, 'own'>, kind: MoneyEntry['kind']): readonly string[] {
  const base: readonly string[] = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES, own = (kind === 'expense' ? log.own?.expense : log.own?.income) ?? [];
  return [...base, ...own.filter(c => !base.some(b => b.toLowerCase() === c.toLowerCase()))];
}
/**
 * The categories offered for a kind: the usual ones, then the person's own (A to Z as they typed them). Session AV lane 2,
 * round 4 (money; Lunch Money's archive, LEDGER #342): an archived category is not offered (lib/money-log/category.ts);
 * its entries keep it, and reports and search still show it.
 */
export function categoryChoices(log: Pick<MoneyLog, 'own'> & Partial<Pick<MoneyLog, 'archived'>>, kind: MoneyEntry['kind']): readonly string[] {
  const hidden = new Set(((kind === 'expense' ? log.archived?.expense : log.archived?.income) ?? []).map(c => c.toLowerCase()));
  return allCategories(log, kind).filter(c => !hidden.has(c.toLowerCase()));
}
/** Adds one of the person's own categories (trimmed, at most 40 characters, once, at most 30 of a kind). */
export function addOwnCategory(log: MoneyLog, kind: MoneyEntry['kind'], name: string): MoneyLog {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Type a name for the category.');
  if (clean.length > 40) throw new Error('A category has at most 40 characters.');
  const twin = allCategories(log, kind).find(c => c.toLowerCase() === clean.toLowerCase());
  if (twin && ((kind === 'expense' ? log.archived?.expense : log.archived?.income) ?? []).some(c => c.toLowerCase() === twin.toLowerCase())) throw new Error(`${twin} is archived: bring it back under Archived categories.`);
  if (twin) throw new Error(`${twin} is already a category.`);
  const list = (kind === 'expense' ? log.own?.expense : log.own?.income) ?? [];
  if (list.length >= MAX_OWN_CATEGORIES) throw new Error(`Up to ${MAX_OWN_CATEGORIES} of your own categories.`);
  return {...log, own: {...log.own, [kind]: [...list, clean]}};
}
/** Removes one of the person's own categories from the choices; entries that use it keep it. */
export function removeOwnCategory(log: MoneyLog, kind: MoneyEntry['kind'], name: string): MoneyLog {
  const list = ((kind === 'expense' ? log.own?.expense : log.own?.income) ?? []).filter(c => c !== name);
  return {...log, own: {...log.own, [kind]: list}};
}

export type Change = NonNullable<MoneyEntry['history']>[number];
export type ChangeInput = {by: Change['by']; field: Change['field']; from?: string; to?: string};
/** The entry with one change added to its history (the newest last; the last 20 kept). Unchanged values add nothing. */
export function withChange(e: MoneyEntry, change: ChangeInput, at: string): MoneyEntry {
  if ((change.from ?? '') === (change.to ?? '')) return e;
  return {...e, history: [...(e.history ?? []), {at, ...change, ...(change.from !== undefined ? {from: change.from.slice(0, 200)} : {}), ...(change.to !== undefined ? {to: change.to.slice(0, 200)} : {})}].slice(-MAX_HISTORY)};
}
/** Each field that differs between two versions of one entry, as history (category, amount, date, note, left out, spread). */
export function changesBetween(before: MoneyEntry, after: MoneyEntry, by: Change['by'], at: string): MoneyEntry {
  let next = after;
  const pairs: [Change['field'], string | undefined, string | undefined][] = [['category', before.category, after.category], ['amount', before.amount, after.amount], ['date', before.date, after.date], ['note', before.note, after.note], ['excluded', before.excluded ? 'left out' : 'counted', after.excluded ? 'left out' : 'counted'], ['spread', before.spread ? `${before.spread} months` : 'one month', after.spread ? `${after.spread} months` : 'one month']];
  for (const [field, from, to] of pairs) if ((from ?? '') !== (to ?? '')) next = withChange(next, {by, field, ...(from !== undefined ? {from} : {}), ...(to !== undefined ? {to} : {})}, at);
  return next;
}

/** Session AV lane 2 (money; Copilot's multi-select, Monarch's bulk edit): one category for several entries at once, with history. */
export function bulkCategory(log: MoneyLog, ids: ReadonlySet<string>, category: string, at: string): MoneyLog {
  const name = category.trim().slice(0, 40);
  if (!name) throw new Error('Choose a category.');
  return {...log, entries: log.entries.map(e => ids.has(e.id) && e.category !== name ? withChange({...e, category: name}, {by: 'bulk', field: 'category', from: e.category, to: name}, at) : e)};
}
/** Leaves several entries out of the figures (or counts them again), with history. */
export function bulkExcluded(log: MoneyLog, ids: ReadonlySet<string>, out: boolean, at: string): MoneyLog {
  return {...log, entries: log.entries.map(e => {
    if (!ids.has(e.id) || !!e.excluded === out) return e;
    const {excluded: _x, ...rest} = e; void _x;
    return withChange(out ? {...rest, excluded: true} : rest, {by: 'bulk', field: 'excluded', from: out ? 'counted' : 'left out', to: out ? 'left out' : 'counted'}, at);
  })};
}
/** Sets or clears one entry's own marks (left out, tax-deductible, spread), returning the entry with its history. */
export function withMarks(e: MoneyEntry, marks: {excluded?: boolean; taxDeductible?: boolean; spread?: number | null}, at: string): MoneyEntry {
  const {excluded: _x, taxDeductible: _t, spread: _s, ...rest} = e; void _x; void _t; void _s;
  const excluded = marks.excluded ?? !!e.excluded, tax = marks.taxDeductible ?? !!e.taxDeductible, spread = marks.spread === undefined ? e.spread : marks.spread && marks.spread >= 2 ? Math.min(24, Math.floor(marks.spread)) : undefined;
  const after: MoneyEntry = {...rest, ...(excluded ? {excluded: true as const} : {}), ...(tax ? {taxDeductible: true as const} : {}), ...(spread ? {spread} : {})};
  return changesBetween(e, after, 'you', at);
}

/**
 * Session AV lane 2 (money; Monarch's account notes and custom order): the accounts record is strict in every release,
 * so an account's note and the list's order live on the money log's loose record (`accounts`). Pure.
 */
export function withAccountNote(log: MoneyLog, accountId: string, note: string): MoneyLog {
  const clean = note.trim().slice(0, 300), notes = {...log.accounts?.notes};
  if (clean) notes[accountId] = clean; else delete notes[accountId];
  return {...log, accounts: {...log.accounts, notes}};
}
/** The accounts in the person's order (those not in it keep their own order, after the ordered ones). */
export function inOrder<T extends {id: string}>(items: readonly T[], order: readonly string[] | undefined): T[] {
  if (!order?.length) return [...items];
  const at = new Map(order.map((id, i) => [id, i]));
  return [...items].map((a, i) => ({a, i})).sort((x, y) => (at.get(x.a.id) ?? 1e6 + x.i) - (at.get(y.a.id) ?? 1e6 + y.i)).map(x => x.a);
}
/** Moves one account up (-1) or down (+1) among `ids` (the list as shown), and keeps that order. */
export function moveAccount(log: MoneyLog, ids: readonly string[], id: string, by: -1 | 1): MoneyLog {
  const list = [...ids], i = list.indexOf(id), j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return log;
  [list[i], list[j]] = [list[j]!, list[i]!];
  const rest = (log.accounts?.order ?? []).filter(x => !list.includes(x));
  return {...log, accounts: {...log.accounts, order: [...list, ...rest].slice(0, 200)}};
}
