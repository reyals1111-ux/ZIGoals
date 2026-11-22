import {addLocalDays} from '../local-date';
import type {Accounts} from '../accounts/schema';
import {balanceOn, moneyText} from '../accounts/net-worth';
import {amountText, type MoneyEntry, type MoneyLog} from '../money-log/schema';
import {isCounted, mineCents} from '../money-log/counted';
import {noteKey, payeePart} from '../money-log/suggest';
import type {WealthSheet} from '../wealth-sheet/schema';
import type {BillsRecord} from '../bills/schema';
import {billsThisMonth, type MonthBill} from '../bills/month';

/**
 * Session AV lane 2, round 2 (money; Emma's unusual-transaction alerts, Wallet's balance-limit notifications and planned
 * payments): pure, from the person's own records only; nothing is judged or advised, and nothing is ever written by
 * itself.
 * - An unusual entry: spending in the last 14 days well above the usual for its payee (or, with no payee history, its
 *   category) — more than twice the median of the last ten before it (at least three of them), and at least 20 more in
 *   that currency. "That's fine" (`fine` on the entry) stops it being named again.
 * - A balance limit per account: its latest balance below or above the person's own line.
 * - A planned payment: a bill whose day has come (today or the last three days) and that the money log does not show yet,
 *   offered with one tap to record it (lib/bills/tracker.ts paidEntry). The tracker's rule holds: every mark is the
 *   person's own record — a bill is never recorded without that tap (an automatic "record it on its day" is left for the
 *   owner's decision, LEDGER #245).
 */
export const UNUSUAL_DAYS = 14, UNUSUAL_FACTOR = 2, UNUSUAL_MIN = 2000, UNUSUAL_HISTORY = 10, UNUSUAL_SEEN = 3;
export type Unusual = {entry: MoneyEntry; basis: 'payee' | 'category'; name: string; usual: number; cents: number; seen: number};
const median = (list: number[]) => { const s = [...list].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2); };
const earlier = (a: MoneyEntry, b: MoneyEntry) => a.date < b.date || (a.date === b.date && a.createdAt < b.createdAt);
export function unusualEntries(entries: readonly MoneyEntry[], today: string): Unusual[] {
  const from = addLocalDays(today, -(UNUSUAL_DAYS - 1)), spent = entries.filter(e => e.kind === 'expense' && isCounted(e));
  const out: Unusual[] = [];
  for (const e of spent) {
    if (e.fine || e.date < from || e.date > today) continue;
    const payee = noteKey(payeePart(e.note ?? '')), cents = mineCents(e);
    const pick = (same: (x: MoneyEntry) => boolean) => spent.filter(x => x.id !== e.id && x.currency === e.currency && earlier(x, e) && same(x)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, UNUSUAL_HISTORY).map(mineCents);
    const byPayee = payee ? pick(x => noteKey(payeePart(x.note ?? '')) === payee) : [];
    const [basis, history] = byPayee.length >= UNUSUAL_SEEN ? ['payee' as const, byPayee] : ['category' as const, pick(x => x.category.toLowerCase() === e.category.toLowerCase())];
    if (history.length < UNUSUAL_SEEN) continue;
    const usual = median(history);
    if (cents > usual * UNUSUAL_FACTOR && cents - usual >= UNUSUAL_MIN) out.push({entry: e, basis, name: basis === 'payee' ? payeePart(e.note ?? '') : e.category, usual, cents, seen: history.length});
  }
  return out.sort((a, b) => b.entry.date.localeCompare(a.entry.date));
}
/** "That's fine": the entry is not named again (Undo takes the mark off). */
export function markFine(log: MoneyLog, id: string, fine = true): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (e.id !== id) return e; const {fine: _f, ...rest} = e; void _f; return fine ? {...rest, fine: true as const} : rest; })};
}

// ── Balance limits per account ─────────────────────────────────────────────────────────────────────────────────────
export type LimitState = {id: string; name: string; currency: string; balance: string; date: string; line: string; side: 'below' | 'above'};
export function withLimit(sheet: WealthSheet, accountId: string, limit: {below?: string | null; above?: string | null}): WealthSheet {
  for (const v of [limit.below, limit.above]) if (v && !amountText.safeParse(v).success) throw new Error('Enter a limit above zero, with at most two decimals.');
  if (limit.below && limit.above && Number(limit.below) >= Number(limit.above)) throw new Error('The low line comes below the high line.');
  const limits = {...sheet.limits}, next = {...(limit.below ? {below: limit.below} : {}), ...(limit.above ? {above: limit.above} : {})};
  if (Object.keys(next).length) limits[accountId] = next; else delete limits[accountId];
  const {limits: _l, ...rest} = sheet; void _l;
  return Object.keys(limits).length ? {...rest, limits} : rest;
}
/** Accounts whose latest balance is below or above the person's own line (archived accounts left out). */
export function limitStates(accounts: Accounts | null | undefined, sheet: WealthSheet | null | undefined): LimitState[] {
  const out: LimitState[] = [];
  for (const a of accounts?.items ?? []) {
    const l = sheet?.limits?.[a.id], b = l && !a.archivedAt ? balanceOn(a) : null;
    if (!l || !b) continue;
    const value = Number(moneyText(b));
    if (l.below && value < Number(l.below)) out.push({id: a.id, name: a.name, currency: a.currency, balance: moneyText(b), date: b.date, line: l.below, side: 'below'});
    else if (l.above && value > Number(l.above)) out.push({id: a.id, name: a.name, currency: a.currency, balance: moneyText(b), date: b.date, line: l.above, side: 'above'});
  }
  return out;
}

// ── Planned payments: due now, not yet in the money log ─────────────────────────────────────────────────────────────
export const RECORD_WINDOW_DAYS = 3;
/** This month's bill dates from three days ago to today that the money log does not show yet (each with one tap to record). */
export function billsToRecord(bills: BillsRecord | null | undefined, entries: readonly MoneyEntry[], today: string): MonthBill[] {
  if (!bills?.bills.length) return [];
  const from = addLocalDays(today, -RECORD_WINDOW_DAYS);
  return billsThisMonth(bills, entries, today).lines.filter(l => l.state === 'passed' && l.due >= from && l.due <= today);
}
