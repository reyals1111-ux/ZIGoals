import type {Period} from '../../../ai/local-answers/exact/period';
import {balanceOn, moneyText} from '../../../accounts/net-worth';
import {isDebtKind, type Accounts} from '../../../accounts/schema';
import type {BudgetsRecord} from '../../../budgets/schema';
import type {MoneyEntry} from '../../../money-log/schema';
import type {NetworthHistory} from '../../../networth-history';
import {formatPercent} from '../../../visual-format';
import {budgetsCard, type BudgetsCard} from '../budgets';
import type {NetWorthChange} from '../net-worth';
import {netWorthHistoryCard} from '../net-worth-history';
import {axMoney, axPlain, type MoneyRank} from './money-spend';

/**
 * Session AS (ADR-042 Part 2, Wealth): the figures of three answer widgets that read Wealth's own records — the debts by
 * balance (the accounts the person keeps as debts, lib/accounts), the recorded net worth as a river (the history Wealth
 * records, lib/networth-history.ts through lib/nova/cards/net-worth-history.ts) and each budget as a gauge
 * (lib/nova/cards/budgets.ts). One currency at a time, never converted and never added across; a debt without a balance
 * is "no balance yet" and a day Wealth did not record is a gap, never a zero. Recorded values only: nothing is projected.
 */
export type DebtRanks = {
  /** 'empty': no debt is kept; 'no-balance': debts are kept, none has a balance yet. */
  state: 'empty' | 'no-balance' | 'live';
  currency: string | null; totalCents: number; total: string;
  /** The debts of the leading currency that have a balance, the largest first. */
  rows: (MoneyRank & {date: string})[];
  max: number; count: number;
  /** Debts with no balance entered yet (unknown, never a zero). */
  noBalance: string[];
  others: string[];
  /** The day of the newest balance counted. */
  lastDate: string | null;
};
export function debtRanks(accounts: Accounts, today: string): DebtRanks {
  const debts = accounts.items.filter(a => !a.archivedAt && isDebtKind(a.kind));
  const sized = debts.map(a => { const b = balanceOn(a, today); return {a, date: b?.date ?? null, cents: b ? Math.round(Number(moneyText(b)) * 100) : null}; });
  const per = new Map<string, number>();
  for (const s of sized) if (s.cents !== null) per.set(s.a.currency, (per.get(s.a.currency) ?? 0) + s.cents);
  const ranked = [...per.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])), cur = ranked[0]?.[0] ?? null, total = ranked[0]?.[1] ?? 0;
  const rows = sized.flatMap(s => s.cents === null || s.date === null || s.a.currency !== cur || !cur ? [] : [{key: s.a.id, label: axPlain(s.a.name), cents: s.cents, text: axMoney(s.cents, cur), share: total > 0 ? s.cents / total : 0, percent: formatPercent(total > 0 ? s.cents / total * 100 : 0), date: s.date}])
    .sort((x, y) => y.cents - x.cents || x.label.localeCompare(y.label));
  return {state: !debts.length ? 'empty' : !cur ? 'no-balance' : 'live', currency: cur, totalCents: total, total: cur ? axMoney(total, cur) : '—', rows, max: Math.max(1, ...rows.map(r => r.cents)), count: debts.length,
    noBalance: sized.filter(s => s.cents === null).map(s => axPlain(s.a.name)), others: [...new Set(debts.map(a => a.currency).filter(c => c !== cur))].sort(), lastDate: rows.reduce<string | null>((latest, r) => !latest || r.date > latest ? r.date : latest, null)};
}

export type RiverDay = {day: string; /** Major units, for drawing; null: not recorded that day, or a counted source had no value. */ value: number | null};
export type NetWorthRiver = {
  /** 'empty': no day recorded yet; 'quiet': days recorded, none inside the period. */
  state: 'empty' | 'quiet' | 'live';
  period: Period;
  /** The Showcase's own label when the history is its fictional example. */
  example: string | null;
  currency: string | null; otherCurrencies: string[];
  /** Every calendar day from the first to the last recorded day in the period; a day Wealth did not record is a gap. */
  days: RiverDay[];
  latest: {day: string; cents: bigint | null; missing: string[]} | null; latestKnown: {day: string; cents: bigint} | null;
  /** From the first to the last day with a known net worth in the period. */
  change: NetWorthChange | null;
  high: {day: string; cents: bigint} | null; low: {day: string; cents: bigint} | null;
  recorded: number; notRecorded: number; unknownDays: number;
  since: string | null;
};
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
export function netWorthRiver(history: NetworthHistory, period: Period, today: string): NetWorthRiver {
  // The history card's own points (its lead currency, its counted sources, its gaps) over the last year, cut to the period.
  const card = netWorthHistoryCard(history, today, 'year'), points = card.points.filter(p => p.day >= period.from && p.day <= period.to);
  const known = points.flatMap(p => p.cents === null ? [] : [{day: p.day, cents: p.cents}]), first = known[0], last = known.at(-1), start = points[0], end = points.at(-1);
  const change: NetWorthChange | null = first && last && known.length >= 2 ? (() => {
    const diff = last.cents - first.cents;
    return {cents: diff, direction: diff > 0n ? 'up' as const : diff < 0n ? 'down' as const : 'flat' as const, since: first.day, percent: first.cents > 0n ? Number(diff * 100_000n / first.cents) / 1000 : null};
  })() : null;
  const edge = (better: (a: bigint, b: bigint) => boolean) => known.reduce<{day: string; cents: bigint} | null>((best, p) => !best || better(p.cents, best.cents) ? p : best, null);
  const days: RiverDay[] = start && end ? Array.from({length: dayNumber(end.day) - dayNumber(start.day) + 1}, (_, i) => ({day: new Date((dayNumber(start.day) + i) * 86_400_000).toISOString().slice(0, 10), value: null})) : [];
  if (start) for (const p of known) days[dayNumber(p.day) - dayNumber(start.day)]!.value = Number(p.cents) / 100;
  return {state: card.state === 'empty' ? 'empty' : points.length ? 'live' : 'quiet', period, example: card.example, currency: card.currency, otherCurrencies: card.otherCurrencies, days,
    latest: end ?? null, latestKnown: last ?? null, change, high: edge((a, b) => a > b), low: edge((a, b) => a < b),
    recorded: points.length, notRecorded: days.length - points.length, unknownDays: points.length - known.length, since: card.since};
}

export type BudgetGauge = {id: string; label: string; /** Spent ÷ available, not capped. */ share: number; /** The same as a whole percent ("75%", "120%"). */ percent: string; over: boolean; spent: string; available: string; /** "€62.90 left", "all used", "over by €40.00". */ words: string};
export type BudgetGauges = Pick<BudgetsCard, 'state' | 'month' | 'within' | 'count' | 'daysLeft' | 'lastDate'> & {gauges: BudgetGauge[]; over: BudgetGauge[]};
export function budgetGauges(record: BudgetsRecord, entries: readonly MoneyEntry[], today: string): BudgetGauges {
  const card = budgetsCard(record, entries, today);
  const gauges = card.lines.map(l => ({id: l.id, label: axPlain(l.category), share: l.share, percent: formatPercent(l.share * 100), over: l.over, spent: l.spent, available: l.available, words: l.words}));
  return {state: card.state, month: card.month, within: card.within, count: card.count, daysLeft: card.daysLeft, lastDate: card.lastDate, gauges, over: gauges.filter(g => g.over)};
}
