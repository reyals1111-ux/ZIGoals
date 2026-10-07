import {accountSchema, accountsSchema, isDebtKind, type Account, type AccountKind, type Accounts} from './schema';
import type {Position} from '../positions';

/**
 * Net worth from the person's own accounts and debts (Session W Part 12), per currency and never converted: assets
 * minus debts, from each account's latest balance on or before the day. An account without a balance yet is counted
 * as "no balance yet", never as zero. Wealth's own holdings with a known value in a currency are their own line
 * (they are not accounts, so they are never added twice); a holding without a value is counted, not zeroed.
 */
export type Money = {value: bigint; decimals: number};
const scale = (m: Money, decimals: number): bigint => m.value * 10n ** BigInt(decimals - m.decimals);
export const add = (a: Money, b: Money): Money => { const d = Math.max(a.decimals, b.decimals); return {value: scale(a, d) + scale(b, d), decimals: d}; };
export const ZERO: Money = {value: 0n, decimals: 0};
export const sub = (a: Money, b: Money): Money => add(a, {value: -b.value, decimals: b.decimals});
export const moneyText = (m: Money): string => { const neg = m.value < 0n, v = neg ? -m.value : m.value, s = v.toString().padStart(m.decimals + 1, '0'); const whole = s.slice(0, s.length - m.decimals), frac = m.decimals ? s.slice(-m.decimals) : ''; return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`; };
/** The account's latest balance on or before `day` (all of them when no day), or null. */
export function balanceOn(account: Account, day?: string): (Money & {date: string}) | null {
  const s = account.snapshots.filter(x => !day || x.date <= day).sort((a, b) => b.date.localeCompare(a.date))[0];
  return s ? {value: BigInt(s.value), decimals: s.decimals, date: s.date} : null;
}
export type CurrencyWorth = {currency: string; assets: Money; debts: Money; net: Money; holdings: Money; accounts: number; noBalance: number};
/** Net worth per currency on a day: the accounts' latest balances, and Wealth's valued holdings as their own line. */
export function netWorth(accounts: Accounts, day: string, positions: readonly Position[] = []): {rows: CurrencyWorth[]; unvaluedHoldings: number} {
  const by = new Map<string, CurrencyWorth>();
  const row = (currency: string) => { let r = by.get(currency); if (!r) by.set(currency, r = {currency, assets: ZERO, debts: ZERO, net: ZERO, holdings: ZERO, accounts: 0, noBalance: 0}); return r; };
  for (const account of accounts.items) {
    if (account.archivedAt) continue;
    const r = row(account.currency), b = balanceOn(account, day);
    r.accounts++;
    if (!b) { r.noBalance++; continue; }
    if (isDebtKind(account.kind)) r.debts = add(r.debts, b); else r.assets = add(r.assets, b);
  }
  let unvalued = 0;
  for (const p of positions) {
    if (p.archivedAt) continue;
    if (!p.valuation) { unvalued++; continue; }
    const r = row(p.valuation.currency); r.holdings = add(r.holdings, {value: BigInt(p.valuation.value), decimals: p.valuation.decimals});
  }
  const rows = [...by.values()].map(r => ({...r, net: sub(add(r.assets, r.holdings), r.debts)})).sort((a, b) => a.currency.localeCompare(b.currency));
  return {rows, unvaluedHoldings: unvalued};
}
/** Net worth from accounts only at the end of each of the last `months` months (and today), per currency, oldest first. */
export function netWorthHistory(accounts: Accounts, today: string, months = 12): {date: string; currency: string; net: Money; counted: number}[] {
  const [y, m] = today.split('-').map(Number);
  const ends = Array.from({length: months}, (_, i) => new Date(Date.UTC(y!, m! - 1 - (months - 1 - i), 0)).toISOString().slice(0, 10)).concat(today);
  const out: {date: string; currency: string; net: Money; counted: number}[] = [];
  for (const date of ends) {
    const sums = new Map<string, {net: Money; counted: number}>();
    for (const a of accounts.items) {
      if (a.archivedAt && a.archivedAt.slice(0, 10) <= date) continue;
      const b = balanceOn(a, date); if (!b) continue;
      const s = sums.get(a.currency) ?? {net: ZERO, counted: 0};
      sums.set(a.currency, {net: isDebtKind(a.kind) ? sub(s.net, b) : add(s.net, b), counted: s.counted + 1});
    }
    for (const [currency, s] of sums) out.push({date, currency, ...s});
  }
  return out;
}
/** A new account or debt (its opening balance is its first snapshot). */
export function addAccount(group: Accounts, input: {id: string; kind: AccountKind; name: string; currency: string; institution?: string; ratePercent?: string; balance?: Money & {date: string}}, at: string): Accounts {
  const account = accountSchema.parse({id: input.id, kind: input.kind, name: input.name, currency: input.currency, ...(input.institution?.trim() ? {institution: input.institution.trim()} : {}), ...(input.ratePercent ? {ratePercent: input.ratePercent} : {}),
    snapshots: input.balance ? [{id: crypto.randomUUID(), date: input.balance.date, value: input.balance.value.toString(), decimals: input.balance.decimals}] : [], payments: [], createdAt: at, updatedAt: at});
  return accountsSchema.parse({...group, items: [...group.items, account]});
}
/** Records a balance on a date (the same date replaces that day's balance). */
export function recordBalance(group: Accounts, id: string, balance: Money & {date: string}, at: string): Accounts {
  return accountsSchema.parse({...group, items: group.items.map(a => a.id !== id ? a : {...a, snapshots: [...a.snapshots.filter(s => s.date !== balance.date), {id: crypto.randomUUID(), date: balance.date, value: balance.value.toString(), decimals: balance.decimals}], updatedAt: at})});
}
/** Records a payment made on a debt (it does not change the balance: the next balance the person enters does). */
export function recordPayment(group: Accounts, id: string, payment: Money & {date: string}, at: string): Accounts {
  return accountsSchema.parse({...group, items: group.items.map(a => a.id !== id ? a : {...a, payments: [...a.payments, {id: crypto.randomUUID(), date: payment.date, value: payment.value.toString(), decimals: payment.decimals}], updatedAt: at})});
}
export function editAccount(group: Accounts, id: string, patch: {name?: string; institution?: string | null; ratePercent?: string | null; archived?: boolean}, at: string): Accounts {
  return accountsSchema.parse({...group, items: group.items.map(a => {
    if (a.id !== id) return a;
    const {institution: _i, ratePercent: _r, archivedAt: _a, ...rest} = a; void _i; void _r; void _a;
    const institution = patch.institution === undefined ? a.institution : patch.institution ?? undefined, ratePercent = patch.ratePercent === undefined ? a.ratePercent : patch.ratePercent ?? undefined;
    const archivedAt = patch.archived === undefined ? a.archivedAt : patch.archived ? at : undefined;
    return {...rest, ...(patch.name ? {name: patch.name} : {}), ...(institution ? {institution} : {}), ...(ratePercent ? {ratePercent} : {}), ...(archivedAt ? {archivedAt} : {}), updatedAt: at};
  })});
}
export const removeAccount = (group: Accounts, id: string): Accounts => accountsSchema.parse({...group, items: group.items.filter(a => a.id !== id)});
/**
 * When a debt would be paid off, from its latest balance, the person's own yearly rate (monthly interest = rate / 12)
 * and a monthly payment: the month it reaches zero, or null when the payment does not cover the interest or it would
 * take more than 100 years. Their figures, not a quote from a lender.
 */
export function payoffMonths(balance: number, ratePercent: number, monthly: number): number | null {
  if (!(balance > 0) || !(monthly > 0) || !(ratePercent >= 0)) return null;
  const r = ratePercent / 100 / 12;
  if (monthly <= balance * r) return null;
  let left = balance;
  for (let month = 1; month <= 1200; month++) { left = left * (1 + r) - monthly; if (left <= 0) return month; }
  return null;
}
/** The usual monthly payment: the average of the payments of the last 90 days, when there are at least two. */
export function usualPayment(account: Account, today: string): Money | null {
  const from = new Date(Date.parse(`${today}T12:00:00Z`) - 89 * 86_400_000).toISOString().slice(0, 10);
  const recent = account.payments.filter(p => p.date >= from && p.date <= today);
  if (recent.length < 2) return null;
  const d = Math.max(...recent.map(p => p.decimals)), total = recent.reduce((t, p) => t + BigInt(p.value) * 10n ** BigInt(d - p.decimals), 0n);
  return {value: total * 30n / 90n, decimals: d};
}
