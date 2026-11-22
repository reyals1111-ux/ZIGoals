import {monthView} from '../budgets/engine';
import type {BudgetsRecord} from '../budgets/schema';
import {countedBetween} from './counted';
import {MAX_ENTRIES, MAX_PUT_AWAY_YEARS, moneyEntrySchema, moneyLogSchema, type MoneyEntry, type MoneyLog} from './schema';
import {sheetCsv, sheetRows} from './sheet';

/**
 * Session AV lane 2, round 6 (money; Banktivity's Remove Historical Data, LEDGER #431): "Put old entries away", a year at a
 * time. A past year's entries leave the money log's lists, search and figures and are kept, exactly as they were, in the
 * same record (`putAway`), so nothing is deleted: "Bring back" returns them, and Export everything, the backup and restore
 * carry them. Read first: the plan says how many entries go, what that year counted (by the shared rule), which entries
 * stay because a later entry or month still needs them, and what changes in this month's budgets. Account balances in
 * ZIGoals come from each account's own balances (Wealth → Accounts), never from summed entries, so no balance changes and
 * no opening line is needed. Pure.
 */
export type PutAwayYear = NonNullable<MoneyLog['putAway']>['years'][number];
export type YearSummary = {year: string; count: number; byCurrency: {currency: string; spent: number; received: number}[]};
const yearOf = (e: Pick<MoneyEntry, 'date'>) => e.date.slice(0, 4);
const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
/** The past years the log holds (before this one), newest first, with their entry count and what they counted. */
export function pastYears(log: Pick<MoneyLog, 'entries'>, today: string): YearSummary[] {
  const years = [...new Set(log.entries.map(yearOf))].filter(y => y < today.slice(0, 4)).sort().reverse();
  return years.map(year => summary(log.entries, year));
}
function summary(entries: readonly MoneyEntry[], year: string): YearSummary {
  const from = `${year}-01-01`, to = `${year}-12-31`, spent = countedBetween(entries, from, to), received = countedBetween(entries, from, to, {kind: 'income'});
  return {year, count: entries.filter(e => yearOf(e) === year).length, byCurrency: [...new Set([...spent.keys(), ...received.keys()])].sort().map(currency => ({currency, spent: spent.get(currency) ?? 0, received: received.get(currency) ?? 0}))};
}
export type KeptWhy = 'spread' | 'transfer' | 'refund';
export type PutAwayPlan = YearSummary & {moving: MoneyEntry[]; kept: {entry: MoneyEntry; why: KeptWhy}[]; carry: {category: string; currency: string; now: number; after: number}[]};
/**
 * What putting `year` away would do. An entry stays when a later month still counts it (spread past the year), when its
 * transfer's other side stays, or when a refund that stays names it; everything else of that year moves.
 */
export function putAwayPlan(log: Pick<MoneyLog, 'entries'>, budgets: BudgetsRecord | null | undefined, year: string, today: string): PutAwayPlan {
  if (!/^\d{4}$/.test(year) || year >= today.slice(0, 4)) throw new Error('Only a year before this one can be put away.');
  const of = log.entries.filter(e => yearOf(e) === year), staying = new Set(log.entries.filter(e => yearOf(e) !== year).map(e => e.id)), kept = new Map<string, KeptWhy>();
  const end = monthIndex(`${year}-12`), refunders = new Map<string, string[]>();
  for (const x of log.entries) if (x.refundOf && x.refund) refunders.set(x.refundOf, [...(refunders.get(x.refundOf) ?? []), x.id]);
  for (const e of of) if (e.spread && monthIndex(e.date.slice(0, 7)) + e.spread - 1 > end) kept.set(e.id, 'spread');
  // Links: keep both sides of a transfer and a refund's purchase while either one stays (repeat until nothing changes).
  for (let changed = true, guard = 0; changed && guard < 20; guard++) {
    changed = false;
    for (const e of of) {
      const stays = (id: string | undefined) => !!id && (staying.has(id) || kept.has(id));
      if (kept.has(e.id)) continue;
      if (e.transfer && stays(e.transfer)) { kept.set(e.id, 'transfer'); changed = true; continue; }
      if ((refunders.get(e.id) ?? []).some(x => stays(x))) { kept.set(e.id, 'refund'); changed = true; continue; }
      if (e.refundOf && stays(e.refundOf) && e.refund) { kept.set(e.id, 'refund'); changed = true; }
    }
  }
  const moving = of.filter(e => !kept.has(e.id)), gone = new Set(moving.map(e => e.id)), left = log.entries.filter(e => !gone.has(e.id));
  const month = today.slice(0, 7), carry: PutAwayPlan['carry'] = [];
  if (budgets?.budgets.some(b => b.rollover)) {
    const before = monthView(log.entries, budgets, month, today).rows, after = new Map(monthView(left, budgets, month, today).rows.map(r => [r.id, r]));
    for (const r of before) { const a = after.get(r.id); if (a && a.carried !== r.carried) carry.push({category: r.category, currency: r.currency, now: r.carried, after: a.carried}); }
  }
  return {...summary(moving, year), moving, kept: [...kept].map(([id, why]) => ({entry: of.find(e => e.id === id)!, why})), carry};
}
/** Puts `year` away as the plan says: its moving entries leave `entries` and are kept under `putAway`. */
export function putAwayYear(log: MoneyLog, budgets: BudgetsRecord | null | undefined, year: string, today: string, at: string, id: string): MoneyLog {
  const plan = putAwayPlan(log, budgets, year, today);
  if (!plan.moving.length) throw new Error(`Nothing of ${year} can be put away.`);
  const years = log.putAway?.years ?? [], same = years.find(y => y.year === year);
  if (!same && years.length >= MAX_PUT_AWAY_YEARS) throw new Error(`Up to ${MAX_PUT_AWAY_YEARS} years can be put away.`);
  if ((same?.entries.length ?? 0) + plan.moving.length > MAX_ENTRIES) throw new Error('That year holds too many entries to put away at once.');
  const ids = new Set(plan.moving.map(e => e.id)), item: PutAwayYear = same ? {...same, at, entries: [...same.entries, ...plan.moving]} : {id, year, at, entries: plan.moving};
  return moneyLogSchema.parse({...log, entries: log.entries.filter(e => !ids.has(e.id)), putAway: {...log.putAway, years: same ? years.map(y => y.id === same.id ? item : y) : [...years, item].sort((a, b) => a.year.localeCompare(b.year))}});
}
/** The entries of a year put away that this build can read (the rest stay put away, as they were). */
export function readable(year: PutAwayYear): {entries: MoneyEntry[]; unreadable: number} {
  const entries: MoneyEntry[] = [];
  let unreadable = 0;
  for (const raw of year.entries) { const r = moneyEntrySchema.safeParse(raw); if (r.success) entries.push(r.data); else unreadable++; }
  return {entries, unreadable};
}
/**
 * Review B6O-9: the entries of a put-away year that stay put away when it is brought back — those this build cannot read,
 * and those whose id is already in the log (after a restore or a merge added it again): neither is lost.
 */
export function staysPutAway(log: Pick<MoneyLog, 'entries'>, year: PutAwayYear): unknown[] {
  const have = new Set(log.entries.map(e => e.id));
  return year.entries.filter(raw => { const r = moneyEntrySchema.safeParse(raw); return !r.success || have.has(r.data.id); });
}
/** Brings a year back: its readable entries return to the log, before the others (ids already there stay put away, with the unreadable ones). */
export function bringBack(log: MoneyLog, yearId: string): MoneyLog {
  const years = log.putAway?.years ?? [], year = years.find(y => y.id === yearId);
  if (!year) throw new Error('That year is no longer put away.');
  const {entries} = readable(year), have = new Set(log.entries.map(e => e.id)), back = entries.filter(e => !have.has(e.id));
  if (log.entries.length + back.length > MAX_ENTRIES) throw new Error(`Your money log holds up to ${MAX_ENTRIES.toLocaleString('en')} entries; put another year away first.`);
  const rest = staysPutAway(log, year), others = years.filter(y => y.id !== yearId), nextYears = rest.length ? [...others, {...year, entries: rest}] : others;
  const next: Record<string, unknown> = {...log, entries: [...back, ...log.entries]};
  if (nextYears.length) next.putAway = {...log.putAway, years: nextYears}; else delete next.putAway;
  return moneyLogSchema.parse(next);
}
/** A put-away year as the spreadsheet's CSV (lib/money-log/sheet.ts), to keep as a file. */
export const yearCsv = (year: PutAwayYear) => sheetCsv(sheetRows(readable(year).entries, `${year.year}-01-01`, `${year.year}-12-31`));
