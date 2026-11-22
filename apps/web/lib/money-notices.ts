import {addLocalDays} from './local-date';
import {monthDueDates, nextPayday as nextPaydayOf} from './bills/month';
import type {BillsRecord} from './bills/schema';
import {monthKey, monthView, shiftMonth} from './budgets/engine';
import {MAX_CHALLENGES, MAX_WATCHED, type BudgetsRecord} from './budgets/schema';
import {WATCH_ABOVE_MIN, WATCH_ABOVE_SHARE} from './budgets/watch';
import type {CurrencyForecast} from './cash-forecast/model';
import {isCounted, mineCents, mineParts} from './money-log/counted';
import {cents, monthOf} from './money-log/engine';
import type {MoneyEntry} from './money-log/schema';
import {noteKey, payeePart} from './money-log/suggest';

/**
 * Session AV lane 2 (money; YNAB's Spotlight, Rocket Money's watchlist, challenges, payday view and low-balance alert,
 * Copilot's year in review): the money notices, pure, from the person's own records, per currency, never converted.
 * Nothing is judged or advised; a forecast figure is the 60-day model's (lib/cash-forecast/model.ts), never a promise.
 */
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

// ── A bill's note to self coming due (YNAB's Spotlight) ────────────────────────────────────────────────────────────
export type NoteDue = {billId: string; title: string; note: string; by: string; days: number};
/** Bills whose note to self ("cancel before the trial ends") is due within `days` days, or passed in the last week. */
export function billNotesDue(record: BillsRecord | null | undefined, today: string, days = 3): NoteDue[] {
  return (record?.bills ?? []).flatMap(b => b.cancelNote && b.cancelBy ? [{billId: b.id, title: b.title, note: b.cancelNote, by: b.cancelBy, days: daysBetween(today, b.cancelBy)}] : [])
    .filter(n => n.days <= days && n.days >= -7).sort((a, b) => a.days - b.days || a.title.localeCompare(b.title));
}

// ── Watching a payee (Rocket Money's watchlist) ───────────────────────────────────────────────────────────────────
export type PayeeRow = {payee: string; currency: string; thisMonth: number; lastBySameDay: number | null; lastMonth: number | null; difference: number | null; count: number};
const payeeOf = (e: MoneyEntry) => noteKey(payeePart(e.note ?? ''));
export function withPayee(record: BudgetsRecord, payee: string, currency: string): BudgetsRecord {
  const name = payee.trim().replace(/\s+/g, ' ').slice(0, 60), list = record.payees ?? [];
  if (!name) throw new Error('Type the payee to watch, as it shows in your log.');
  if (list.some(p => same(p.payee, name) && p.currency === currency)) return record;
  if (list.length >= MAX_WATCHED) throw new Error(`Up to ${MAX_WATCHED} payees can be watched.`);
  return {...record, payees: [...list, {payee: name, currency}]};
}
export function withoutPayee(record: BudgetsRecord, payee: string, currency: string): BudgetsRecord {
  const list = (record.payees ?? []).filter(p => !(same(p.payee, payee) && p.currency === currency));
  const {payees: _p, ...rest} = record; void _p;
  return list.length ? {...rest, payees: list} : rest as BudgetsRecord;
}
/** Each watched payee: this month so far, last month by the same day and all of last month (spending only, counted entries). */
export function payeeRows(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): PayeeRow[] {
  const month = monthOf(today), prev = monthOf(`${shiftMonth(monthKey(today), -1)}-01`), day = Number(today.slice(8, 10));
  const sameDay = `${prev.start.slice(0, 8)}${String(Math.min(day, Number(prev.end.slice(8)))).padStart(2, '0')}`;
  return (record.payees ?? []).map(w => {
    const key = noteKey(w.payee);
    let thisMonth = 0, lastBySameDay = 0, lastMonth = 0, count = 0, any = false;
    for (const e of entries) {
      if (e.currency !== w.currency || !isCounted(e)) continue;
      if (e.date >= prev.start && e.date <= today) any = true;
      if (e.kind !== 'expense' || payeeOf(e) !== key) continue;
      const c = mineCents(e); // Review b2a #3: the person's own share of a shared cost, as Wealth → Spending counts it
      if (e.date >= month.start && e.date <= today) { thisMonth += c; count++; }
      else if (e.date >= prev.start && e.date <= prev.end) { lastMonth += c; if (e.date <= sameDay) lastBySameDay += c; }
    }
    return {payee: w.payee, currency: w.currency, thisMonth, count, lastBySameDay: any ? lastBySameDay : null, lastMonth: any ? lastMonth : null, difference: any ? thisMonth - lastBySameDay : null};
  });
}
/** Watched payees well above last month by the same day (the watched categories' rule: a quarter more and 20 more). */
export const payeesAbove = (record: BudgetsRecord, entries: readonly MoneyEntry[], today: string) =>
  payeeRows(record, entries, today).filter(r => r.lastBySameDay !== null && r.difference !== null && r.difference >= WATCH_ABOVE_MIN && r.thisMonth >= r.lastBySameDay * (1 + WATCH_ABOVE_SHARE));

// ── Challenges (Rocket Money) ──────────────────────────────────────────────────────────────────────────────────────
export type ChallengeState = {id: string; category: string; currency: string; month: string; lastMonth: number; spent: number; left: number; state: 'on-track' | 'close' | 'over' | 'won' | 'lost' | 'no-last'; daysLeft: number};
const spentInCategory = (entries: readonly MoneyEntry[], category: string, currency: string, from: string, to: string) => {
  let total = 0;
  for (const e of entries) if (e.kind === 'expense' && e.currency === currency && isCounted(e) && e.date >= from && e.date <= to) for (const p of mineParts(e)) if (same(p.category, category)) total += p.cents; // Review b2a #3: own share
  return total;
};
export function addChallenge(record: BudgetsRecord, category: string, currency: string, month: string, id: string): BudgetsRecord {
  const name = category.trim(), list = record.challenges ?? [];
  if (!name) throw new Error('Choose a category for the challenge.');
  if (list.some(c => c.month === month && same(c.category, name) && c.currency === currency)) throw new Error(`There is already a ${name} challenge this month.`);
  const kept = list.filter(c => c.month >= shiftMonth(month, -3));
  if (kept.length >= MAX_CHALLENGES) throw new Error(`Up to ${MAX_CHALLENGES} challenges at a time.`);
  return {...record, challenges: [...kept, {id, category: name, currency, month}]};
}
export function removeChallenge(record: BudgetsRecord, id: string): BudgetsRecord {
  const list = (record.challenges ?? []).filter(c => c.id !== id);
  const {challenges: _c, ...rest} = record; void _c;
  return list.length ? {...rest, challenges: list} : rest as BudgetsRecord;
}
/** "Spend less than last month in <category>": this month so far against all of last month; close from 90 %; settled after the month. */
export function challengeStates(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): ChallengeState[] {
  return (record.challenges ?? []).map(c => {
    const m = monthOf(`${c.month}-01`), p = monthOf(`${shiftMonth(c.month, -1)}-01`), lastMonth = spentInCategory(entries, c.category, c.currency, p.start, p.end);
    const done = today > m.end, spent = spentInCategory(entries, c.category, c.currency, m.start, done ? m.end : today), left = lastMonth - spent;
    const daysLeft = done ? 0 : Math.max(0, daysBetween(today, m.end) + 1);
    const state: ChallengeState['state'] = lastMonth === 0 ? 'no-last' : done ? (spent < lastMonth ? 'won' : 'lost') : spent >= lastMonth ? 'over' : spent >= lastMonth * 0.9 ? 'close' : 'on-track';
    return {...c, lastMonth, spent, left, state, daysLeft};
  }).sort((a, b) => b.month.localeCompare(a.month) || a.category.localeCompare(b.category));
}

// ── Payday and the low-balance line (Rocket Money), from the 60-day cash forecast ──────────────────────────────────
/** The cash the forecast leaves on the day before payday, after the bills and everyday spending before it, in payday's currency. */
export function paydayCash(rows: readonly CurrencyForecast[], payday: {date: string; currency: string} | null): {date: string; currency: string; cents: bigint} | null {
  if (!payday) return null;
  const row = rows.find(r => r.currency === payday.currency);
  if (!row?.known) return null;
  const eve = addLocalDays(payday.date, -1), point = [...row.points].reverse().find(p => p.date <= eve);
  return point ? {date: point.date, currency: row.currency, cents: point.mid} : null;
}
/** The first day the forecast goes below the person's own line, in that line's currency, or null (never, or no forecast). */
export function lowBalanceCross(rows: readonly CurrencyForecast[], line: {amount: string; currency: string} | null | undefined): {date: string; currency: string; cents: bigint; line: bigint} | null {
  if (!line) return null;
  const row = rows.find(r => r.currency === line.currency), limit = BigInt(Math.round(Number(line.amount) * 100));
  if (!row?.known) return null;
  const hit = row.points.find(p => p.mid < limit);
  return hit ? {date: hit.date, currency: row.currency, cents: hit.mid, line: limit} : null;
}

// ── What is left in each budget (for Today, when the person turns it on) ─────────────────────────────────────────────
export function budgetsLeft(record: BudgetsRecord | null | undefined, entries: readonly MoneyEntry[], today: string): {category: string; currency: string; left: number}[] {
  if (!record?.onToday || !record.budgets.length) return [];
  return monthView(entries, record, monthKey(today), today).rows.map(r => ({category: r.category, currency: r.currency, left: r.left}));
}

// ── A year in review (Copilot) ─────────────────────────────────────────────────────────────────────────────────────
export type YearRecap = {currency: string; year: string; spent: number; income: number; previousSpent: number; months: {month: string; spent: number; income: number}[];
  top: {category: string; cents: number}[]; largest: {note: string; cents: number; date: string} | null; bills: {cents: number; count: number}; busiest: string | null; quietest: string | null};
/** The year so far (or a whole past year), per currency: spent, came in, against the year before, by month, top five categories, the largest expense, the bills due in it. */
export function yearRecap(entries: readonly MoneyEntry[], bills: BillsRecord | null | undefined, year: string, today: string): YearRecap[] {
  const end = `${year}-12-31` < today ? `${year}-12-31` : today, out = new Map<string, YearRecap & {cats: Map<string, number>}>();
  const get = (currency: string) => { let r = out.get(currency); if (!r) { r = {currency, year, spent: 0, income: 0, previousSpent: 0, months: Array.from({length: 12}, (_, i) => ({month: `${year}-${String(i + 1).padStart(2, '0')}`, spent: 0, income: 0})), top: [], largest: null, bills: {cents: 0, count: 0}, busiest: null, quietest: null, cats: new Map()}; out.set(currency, r); } return r; };
  const prev = String(Number(year) - 1);
  for (const e of entries) {
    if (!isCounted(e)) continue;
    // Review b2a #3: an expense counts the person's own share of a shared cost, as Wealth → Spending counts it.
    if (e.date.startsWith(prev) && e.kind === 'expense' && e.date.slice(5) <= end.slice(5)) { get(e.currency).previousSpent += mineCents(e); continue; }
    if (!e.date.startsWith(year) || e.date > end) continue;
    const r = get(e.currency), c = e.kind === 'expense' ? mineCents(e) : cents(e.amount), m = r.months[Number(e.date.slice(5, 7)) - 1]!;
    if (e.kind === 'income') { r.income += c; m.income += c; continue; }
    r.spent += c; m.spent += c;
    if (!r.largest || c > r.largest.cents) r.largest = {note: (payeePart(e.note ?? '') || e.category).slice(0, 80), cents: c, date: e.date};
    for (const p of mineParts(e)) r.cats.set(p.category, (r.cats.get(p.category) ?? 0) + p.cents);
  }
  for (const b of bills?.bills ?? []) {
    const since = b.createdAt.slice(0, 10) > `${year}-01-01` ? b.createdAt.slice(0, 10) : `${year}-01-01`, dates = since > end ? [] : monthDueDates(b.nextDue, b.cadence, since, end, addLocalDays(end, 1));
    if (!dates.length) continue;
    const r = get(b.currency); r.bills.cents += cents(b.amount) * dates.length; r.bills.count += dates.length;
  }
  return [...out.values()].filter(r => r.spent || r.income).map(({cats, ...r}) => {
    const lived = r.months.filter(m => m.month <= end.slice(0, 7) && (m.spent || m.income));
    const byS = [...lived].sort((a, b) => b.spent - a.spent);
    return {...r, top: [...cats].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([category, c]) => ({category, cents: c})), busiest: byS[0]?.month ?? null, quietest: byS.length > 1 ? byS.at(-1)!.month : null};
  }).sort((a, b) => a.currency.localeCompare(b.currency));
}

// ── Device notices (Copilot's custom alerts, Rocket Money): what the notification plan wakes for ──────────────────────
export type MoneyWake = {id: string; date: string; title: string; detail?: string};
const fmt = (c: number | bigint, currency: string) => `${currency} ${(Number(c) / 100).toFixed(2)}`;
/**
 * Stateless, so nothing new is stored: a budget is named the morning after it crossed 80 % (or its amount) — spent up to
 * yesterday at or past the mark, and the day before not yet; payday the morning before it, with what the forecast leaves;
 * the low-balance line 7 days and 1 day before the forecast crosses it. `title` and `detail` are shown only where the
 * person allowed names (the plan drops them otherwise).
 */
export function moneyWakes({entries, budgets, rows, line, today}: {entries: readonly MoneyEntry[]; budgets?: BudgetsRecord | null; rows: readonly CurrencyForecast[]; line?: {amount: string; currency: string} | null; today: string}): MoneyWake[] {
  const out: MoneyWake[] = [], month = monthKey(today), yesterday = addLocalDays(today, -1), before = addLocalDays(today, -2);
  if (budgets?.budgets.length && yesterday.slice(0, 7) === month) {
    const upTo = (day: string) => monthView(entries.filter(e => e.date <= day), budgets, month, day).rows;
    const was = new Map(upTo(before).map(r => [r.id, r])), now = upTo(yesterday);
    for (const r of now) {
      const prev = was.get(r.id), share = (x: {spent: number; available: number}) => x.available > 0 ? x.spent / x.available : 0;
      if (!prev || r.available <= 0) continue;
      if (r.spent > r.available && prev.spent <= prev.available) out.push({id: `money:over:${r.id}:${month}`, date: today, title: `${r.category} is over its budget`, detail: `${fmt(r.spent - r.available, r.currency)} over`});
      else if (share(r) >= 0.8 && share(prev) < 0.8 && r.spent <= r.available) out.push({id: `money:near:${r.id}:${month}`, date: today, title: `${r.category} is near its limit`, detail: `${fmt(r.left, r.currency)} left`});
    }
  }
  const pay = nextPaydayOf(entries, today);
  if (pay) { const left = paydayCash(rows, pay); out.push({id: `money:payday:${pay.date}`, date: addLocalDays(pay.date, -1), title: 'Payday tomorrow', ...(left ? {detail: `about ${fmt(left.cents, left.currency)} left before it`} : {})}); }
  const cross = lowBalanceCross(rows, line);
  if (cross) for (const ahead of [7, 1]) { const date = addLocalDays(cross.date, -ahead); if (date >= today) out.push({id: `money:low:${cross.date}:${ahead}`, date, title: `Cash may go below your line ${ahead === 1 ? 'tomorrow' : 'in a week'}`, detail: `below ${fmt(cross.line, cross.currency)} around ${cross.date}`}); }
  return out;
}
