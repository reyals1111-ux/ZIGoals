import {balanceOn, moneyText} from './accounts/net-worth';
import {isDebtKind, type Accounts} from './accounts/schema';
import {addLocalDays} from './local-date';
import {SOURCE_LABELS, type NetworthHistory, type NetworthSource} from './networth-history';

/**
 * Session AV lane 2, round 3 (money; Simplifi's "what moved your net worth this month", LEDGER #298): the accounts and
 * sources that moved net worth most this month, up or down, each with its amount, per currency (never converted).
 * - An account moves by its balance on today against its balance at the end of last month (as net worth counts it: the
 *   latest balance entered on or before each day; a debt that grows moves net worth down). An account with no balance
 *   from before this month is new here: named apart, never counted as a move from zero.
 * - Wealth holdings and Portfolio move by their recorded net-worth history (lib/networth-history.ts): the latest recorded
 *   day with a value up to the end of last month against the latest recorded day this month. A day not recorded is a
 *   gap, never filled in. "Accounts and debts" are listed per account instead, and tracked wallets are already part of
 *   Wealth holdings, so neither series is added again.
 * Facts from the person's records; nothing is a return or advice. Pure.
 */
export type Mover = {kind: 'account' | 'source'; id: string; name: string; cents: number; from: string; to: string; debt?: boolean};
export type MoversRow = {currency: string; month: string; total: number; movers: Mover[]; newThisMonth: string[]};
export const MAX_MOVERS = 5;
const SOURCES: readonly NetworthSource[] = ['wealth', 'portfolio'];
/** A decimal text ("1234.5", "-0.07") in whole cents, rounded half away from zero; exact for any length. */
export function decimalCents(value: string): number {
  const neg = value.startsWith('-'), [whole = '0', frac = ''] = value.replace(/^-/, '').split('.'), f = `${frac}000`;
  const c = Number(whole) * 100 + Number(f.slice(0, 2)) + (Number(f[2]) >= 5 ? 1 : 0);
  return neg ? -c : c;
}
export function networthMovers(accounts: Accounts | null | undefined, history: NetworthHistory | null | undefined, today: string): MoversRow[] {
  const month = today.slice(0, 7), base = addLocalDays(`${month}-01`, -1), rows = new Map<string, MoversRow>();
  const row = (currency: string) => { let r = rows.get(currency); if (!r) { r = {currency, month, total: 0, movers: [], newThisMonth: []}; rows.set(currency, r); } return r; };
  for (const a of accounts?.items ?? []) {
    if (a.archivedAt) continue;
    const then = balanceOn(a, base), now = balanceOn(a, today);
    if (!now) continue;
    if (!then) { if (now.date >= `${month}-01`) row(a.currency).newThisMonth.push(a.name); continue; }
    const sign = isDebtKind(a.kind) ? -1 : 1, cents = sign * (decimalCents(moneyText(now)) - decimalCents(moneyText(then)));
    if (cents) row(a.currency).movers.push({kind: 'account', id: a.id, name: a.name, cents, from: then.date, to: now.date, ...(sign < 0 ? {debt: true} : {})});
  }
  const days = history?.days ?? [];
  for (const source of SOURCES) {
    const currencies = new Set(days.flatMap(d => d.sources.filter(s => s.source === source).map(s => s.currency)));
    for (const currency of currencies) {
      const at = (pick: (day: string) => boolean) => { for (let i = days.length - 1; i >= 0; i--) { const d = days[i]!; if (!pick(d.day)) continue; const s = d.sources.find(x => x.source === source && x.currency === currency); if (s?.value != null) return {day: d.day, value: s.value}; } return null; };
      const then = at(d => d <= base), now = at(d => d > base && d <= today);
      if (!then || !now) continue;
      const cents = decimalCents(now.value) - decimalCents(then.value);
      if (cents) row(currency).movers.push({kind: 'source', id: source, name: SOURCE_LABELS[source], cents, from: then.day, to: now.day});
    }
  }
  return [...rows.values()].map(r => ({...r, total: r.movers.reduce((n, m) => n + m.cents, 0), movers: [...r.movers].sort((x, y) => Math.abs(y.cents) - Math.abs(x.cents) || x.name.localeCompare(y.name))}))
    .filter(r => r.movers.length || r.newThisMonth.length).sort((a, b) => a.currency.localeCompare(b.currency));
}
