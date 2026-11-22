import {isDebtKind, type Account, type Accounts} from '../accounts/schema';
import {balanceOn, owedAfterPayments} from '../accounts/net-worth';
import {addLocalDays} from '../local-date';
import {toCents} from '../debt-planner/plan';
import {MAX_FLOWS, MAX_RATES, wealthSheetSchema, type WealthSheet} from './schema';

/**
 * Session AV lane 2 (money; Kubera's net-worth sheet): pure, in cents per currency, never converted unless the person
 * typed the rate (and then said so). A model of the person's own figures; nothing is fetched or advised.
 */
type Id = string;
const nowCents = (a: Account, today: string): bigint | null => {
  const b = isDebtKind(a.kind) ? owedAfterPayments(a, today) : balanceOn(a, today);
  return b ? toCents(b.value, b.decimals) : null;
};
const put = <K extends 'secures' | 'share' | 'group' | 'every'>(sheet: WealthSheet, key: K, id: Id, value: NonNullable<WealthSheet[K]>[string] | null): WealthSheet => {
  const map = {...(sheet[key] ?? {})} as Record<string, unknown>;
  if (value === null || value === '') delete map[id]; else map[id] = value;
  const {[key]: _old, ...rest} = sheet; void _old;
  return wealthSheetSchema.parse(Object.keys(map).length ? {...rest, [key]: map} : rest);
};
/** A mortgage or loan secured on a property (null unlinks it). */
export const linkMortgage = (s: WealthSheet, debtId: Id, propertyId: Id | null) => put(s, 'secures', debtId, propertyId);
/** The person's share of an account, 1–100 % (null or 100: all of it). */
export const setShare = (s: WealthSheet, id: Id, pct: number | null) => { if (pct !== null && !(pct >= 1 && pct <= 100)) throw new Error('A share is from 1 to 100 %.'); return put(s, 'share', id, pct === null || pct === 100 ? null : Math.round(pct * 100) / 100); };
export const setGroup = (s: WealthSheet, id: Id, name: string | null) => put(s, 'group', id, name ? name.trim().replace(/\s+/g, ' ').slice(0, 40) : null);
export const setEvery = (s: WealthSheet, id: Id, every: 'month' | 'quarter' | null) => put(s, 'every', id, every);

/** A property's equity: its value less what the linked mortgages owe now (same currency only). */
export type Equity = {propertyId: Id; currency: string; value: bigint; owed: bigint; equity: bigint; mortgages: {id: Id; name: string; owed: bigint}[]};
export function equityOf(accounts: Accounts, sheet: WealthSheet, propertyId: Id, today: string): Equity | null {
  const p = accounts.items.find(a => a.id === propertyId); if (!p) return null;
  const value = nowCents(p, today); if (value === null) return null;
  const mortgages = accounts.items.filter(a => !a.archivedAt && sheet.secures?.[a.id] === propertyId && a.currency === p.currency && isDebtKind(a.kind)).map(a => ({id: a.id, name: a.name, owed: nowCents(a, today) ?? 0n}));
  if (!mortgages.length) return null;
  const owed = mortgages.reduce((t, m) => t + m.owed, 0n);
  return {propertyId, currency: p.currency, value, owed, equity: value - owed, mortgages};
}
/** What an account counts at the person's share (all of it without one). */
export const shareOf = (sheet: WealthSheet, id: Id) => (sheet.share?.[id] ?? 100) / 100;
export type SheetTotal = {currency: string; net: bigint; whole: bigint; shared: number};
/** Net worth of the accounts at the person's shares, per currency, beside the whole figure. */
export function shareTotals(accounts: Accounts, sheet: WealthSheet, today: string): SheetTotal[] {
  const by = new Map<string, SheetTotal>();
  for (const a of accounts.items) {
    if (a.archivedAt) continue;
    const c = nowCents(a, today); if (c === null) continue;
    const sign = isDebtKind(a.kind) ? -1n : 1n, share = shareOf(sheet, a.id), part = BigInt(Math.round(Number(c) * share));
    const t = by.get(a.currency) ?? {currency: a.currency, net: 0n, whole: 0n, shared: 0};
    t.net += sign * part; t.whole += sign * c; if (share < 1) t.shared++; by.set(a.currency, t);
  }
  return [...by.values()].sort((x, y) => x.currency.localeCompare(y.currency));
}
export type GroupTotal = {group: string; currency: string; net: bigint; accounts: number};
/** The person's own groups (a sheet section each), with a subtotal per currency at their shares; ungrouped last. */
export function groupTotals(accounts: Accounts, sheet: WealthSheet, today: string): GroupTotal[] {
  const by = new Map<string, GroupTotal>();
  for (const a of accounts.items) {
    if (a.archivedAt) continue;
    const c = nowCents(a, today); if (c === null) continue;
    const group = sheet.group?.[a.id] ?? '', k = `${group}\u0000${a.currency}`, t = by.get(k) ?? {group, currency: a.currency, net: 0n, accounts: 0};
    t.net += (isDebtKind(a.kind) ? -1n : 1n) * BigInt(Math.round(Number(c) * shareOf(sheet, a.id))); t.accounts++; by.set(k, t);
  }
  return [...by.values()].sort((x, y) => (x.group ? 0 : 1) - (y.group ? 0 : 1) || x.group.localeCompare(y.group) || x.currency.localeCompare(y.currency));
}
export type Stale = {id: Id; name: string; every: 'month' | 'quarter'; last: string | null; due: string};
/** Accounts whose latest balance is older than the person's own "update every" (31 or 92 days), oldest first. */
export function staleAccounts(accounts: Accounts | null | undefined, sheet: WealthSheet | null | undefined, today: string): Stale[] {
  return (accounts?.items ?? []).flatMap(a => {
    const every = sheet?.every?.[a.id]; if (!every || a.archivedAt) return [];
    const last = [...a.snapshots].filter(s => s.date <= today).sort((x, y) => y.date.localeCompare(x.date))[0]?.date ?? null;
    const due = last ? addLocalDays(last, every === 'month' ? 31 : 92) : today;
    return due <= today ? [{id: a.id, name: a.name, every, last, due}] : [];
  }).sort((x, y) => (x.last ?? '').localeCompare(y.last ?? ''));
}

/** Adds or replaces the person's own rate for a pair (1 `from` = `rate` `to`, on a day); null removes it. */
export function setRate(sheet: WealthSheet, from: string, to: string, rate: string | null, on: string): WealthSheet {
  if (from === to) throw new Error('Choose two different currencies.');
  const list = (sheet.rates ?? []).filter(r => !((r.from === from && r.to === to) || (r.from === to && r.to === from)));
  if (rate !== null) { if (!/^\d{1,9}(\.\d{1,8})?$/.test(rate) || Number(rate) <= 0) throw new Error('Enter the rate as a number above zero, for example 0.92.'); list.push({from, to, rate, on}); }
  if (list.length > MAX_RATES) throw new Error(`Up to ${MAX_RATES} rates.`);
  const {rates: _r, ...rest} = sheet; void _r;
  return wealthSheetSchema.parse(list.length ? {...rest, rates: list} : rest);
}
export type OneTotal = {currency: string; cents: bigint; used: {from: string; rate: string; on: string; inverse: boolean}[]; missing: string[]};
/** One total in `currency` from per-currency figures, each converted only with a rate the person typed (direct or its inverse). */
export function oneTotal(rows: readonly {currency: string; cents: bigint}[], rates: WealthSheet['rates'], currency: string): OneTotal {
  let cents = 0n; const used: OneTotal['used'] = [], missing: string[] = [];
  for (const r of rows) {
    if (r.currency === currency) { cents += r.cents; continue; }
    const direct = rates?.find(x => x.from === r.currency && x.to === currency), inverse = rates?.find(x => x.from === currency && x.to === r.currency);
    if (direct) { cents += BigInt(Math.round(Number(r.cents) * Number(direct.rate))); used.push({from: r.currency, rate: direct.rate, on: direct.on, inverse: false}); }
    else if (inverse) { cents += BigInt(Math.round(Number(r.cents) / Number(inverse.rate))); used.push({from: r.currency, rate: inverse.rate, on: inverse.on, inverse: true}); }
    else missing.push(r.currency);
  }
  return {currency, cents, used, missing};
}

/** Adds money in or out of an account on a day (at most 200), newest kept. */
export function addFlow(sheet: WealthSheet, id: Id, flow: {date: string; amount: string; kind: 'in' | 'out'}): WealthSheet {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(flow.date)) throw new Error('Choose the day.');
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(flow.amount) || Number(flow.amount) <= 0) throw new Error('Enter an amount above zero, with at most two decimals.');
  const list = [...(sheet.flows?.[id] ?? []), flow].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_FLOWS);
  return wealthSheetSchema.parse({...sheet, flows: {...(sheet.flows ?? {}), [id]: list}});
}
export function removeFlow(sheet: WealthSheet, id: Id, index: number): WealthSheet {
  const list = (sheet.flows?.[id] ?? []).filter((_, i) => i !== index), flows = {...(sheet.flows ?? {})};
  if (list.length) flows[id] = list; else delete flows[id];
  const {flows: _f, ...rest} = sheet; void _f;
  return wealthSheetSchema.parse(Object.keys(flows).length ? {...rest, flows} : rest);
}
/**
 * The annual return (IRR, the money-weighted return) of an account from the money put in and taken out and what it is
 * worth today: the yearly rate at which they balance (found by halving, from −99 % to +1,000 % a year). Null without
 * money in, without a value today, or when no rate in that range balances them. A result, not advice.
 */
export function irr(flows: readonly {date: string; amount: string; kind: 'in' | 'out'}[], valueNow: bigint | null, today: string): number | null {
  if (valueNow === null || !flows.some(f => f.kind === 'in')) return null;
  const t0 = Date.parse(`${flows.map(f => f.date).sort()[0]}T12:00:00Z`), year = 365.25 * 86_400_000;
  const cash = [...flows.map(f => ({t: (Date.parse(`${f.date}T12:00:00Z`) - t0) / year, v: (f.kind === 'in' ? -1 : 1) * Number(f.amount)})), {t: (Date.parse(`${today}T12:00:00Z`) - t0) / year, v: Number(valueNow) / 100}];
  if (cash.at(-1)!.t <= 0) return null;
  const npv = (r: number) => cash.reduce((s, c) => s + c.v / Math.pow(1 + r, c.t), 0);
  let lo = -0.99, hi = 10, flo = npv(lo);
  const fhi = npv(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2, f = npv(mid); if (Math.abs(f) < 1e-7) return mid; if (f * flo > 0) { lo = mid; flo = f; } else hi = mid; }
  return (lo + hi) / 2;
}
export const accountValueNow = nowCents;
