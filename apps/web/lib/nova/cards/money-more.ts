import {formatUnits} from '@zigoals/chain-config';
import {balanceOn, moneyText, netWorth, type Money} from '../../accounts/net-worth';
import {isDebtKind, type Accounts} from '../../accounts/schema';
import {parseAmountInput} from '../../amount-input';
import {monthKey, shiftMonth} from '../../budgets/engine';
import {centsText, comparePlans, comparisonWords, parseCents, payoffMonth, planIssue, rateE4, toCents, type PlanDebt, type PlanResult} from '../../debt-planner/plan';
import type {DebtPlannerRecord} from '../../debt-planner/store';
import {eventValueForGoal} from '../../goal-intelligence';
import {formatGoalAmount} from '../../goal-summary';
import {cashFlow, currenciesOf, topPayees} from '../../money-insights/cash-flow';
import {weekOf} from '../../money-log/engine';
import type {MoneyLog} from '../../money-log/schema';
import type {Platform} from '../../positions';
import {alertLine} from '../../price-alerts/engine';
import type {PriceAlerts} from '../../price-alerts/schema';
import {WEEKS, fiftyTwoWeek, noSpend, recordedSince, roundUps, type ChallengeKind, type GoalAmount, type SavingsChallenges} from '../../savings-challenges/challenges';
import {calendarDay, formatCurrencyAmount, formatMonth, isMoneyCurrency} from '../../visual-format';
import {cardMoney} from './spending';

/**
 * Session AM-2 (step 3, round 2, "NOVA connected"): the figures of five more Wealth widgets NOVA makes on request, pure
 * and read only, each from its page's own engine: "Cash flow" (month by month and this month's payees,
 * lib/money-insights/cash-flow.ts), "Accounts and debts" (lib/accounts/net-worth.ts), the "Debt payoff plan"
 * (lib/debt-planner/plan.ts over the figures the person kept), "Savings challenges" (lib/savings-challenges) and "Price
 * alerts" (lib/price-alerts).
 *
 * The rules they share: exact amounts in each record's own currency, never converted and never added across; a month
 * without a record is a gap, an account without a balance is "no balance yet", never a zero. The payoff plan is a model
 * of the person's own figures: a projection, never a promise, and it says so. Nothing here pays, moves, sells or sets
 * anything: money stays the person's own to move.
 */
type Log = Pick<MoneyLog, 'entries'> & {currency?: string; weekStartsOn?: 'monday' | 'sunday'};
const money = (m: Money, currency: string) => formatCurrencyAmount(moneyText(m), currency);

/* ---- Cash flow and payees ---- */
export type FlowMonth = {key: string; label: string; name: string; /** null: no record that month (a gap, never a zero). */ income: number | null; spending: number | null; net: number | null};
export type FlowPayee = {key: string; name: string; text: string; cents: number; share: number; last: string | null; count: number};
export type CashFlowCard = {
  /** 'empty': the log holds nothing; 'quiet': nothing logged this month in the lead currency. */
  state: 'empty' | 'quiet' | 'live';
  currency: string | null; others: string[]; monthName: string;
  income: string | null; spending: string | null; netCents: number | null; net: string | null; netWords: string | null; entries: number;
  /** The last six calendar months, oldest first. */
  months: FlowMonth[];
  /** Who this month's spending went to, most first, each beside last month (null: last month holds no record). */
  payees: FlowPayee[];
};
export function cashFlowCard(log: Log, today: string): CashFlowCard {
  const currencies = currenciesOf(log.entries, today), currency = (log.currency && currencies.includes(log.currency) ? log.currency : currencies[0]) ?? null, month = monthKey(today);
  const base = {currency, others: currencies.filter(c => c !== currency), monthName: formatMonth(month)};
  if (!currency) return {...base, state: 'empty', income: null, spending: null, netCents: null, net: null, netWords: null, entries: 0, months: [], payees: []};
  const flow = cashFlow(log.entries, currency, today), by = new Map(flow.months.map(m => [m.month, m])), now = by.get(month);
  const months = Array.from({length: 6}, (_, i) => shiftMonth(month, i - 5)).map((key): FlowMonth => { const m = by.get(key); return {key, label: formatMonth(key, {year: false}).slice(0, 3), name: formatMonth(key), income: m ? m.income : null, spending: m ? m.spending : null, net: m ? m.net : null}; });
  const view = topPayees(log.entries, currency, today), top = Math.max(1, ...view.payees.map(p => p.thisMonth));
  return {
    ...base, state: now ? 'live' : 'quiet',
    income: now ? cardMoney(now.income, currency) : null, spending: now ? cardMoney(now.spending, currency) : null, netCents: now ? now.net : null, net: now ? cardMoney(Math.abs(now.net), currency) : null,
    netWords: !now ? null : now.net === 0 ? 'as much in as out' : `${cardMoney(Math.abs(now.net), currency)} more ${now.net > 0 ? 'in than out' : 'out than in'}`, entries: now?.count ?? 0, months,
    payees: view.payees.map(p => ({key: p.key, name: p.name, text: cardMoney(p.thisMonth, currency), cents: p.thisMonth, share: p.thisMonth / top, last: p.lastMonth === null ? null : cardMoney(p.lastMonth, currency), count: p.count})),
  };
}
export function cashFlowRows(card: CashFlowCard): [string, string][] {
  if (card.state === 'empty') return [['Cash flow', 'Nothing logged yet']];
  return [
    [`${card.monthName}, in ${card.currency}`, card.state === 'quiet' ? 'Nothing logged this month' : `${card.income} in, ${card.spending} out: ${card.netWords}`],
    ...card.months.map(m => [m.name, m.income === null || m.spending === null ? 'No record' : `${cardMoney(m.income, card.currency!)} in, ${cardMoney(m.spending, card.currency!)} out`] as [string, string]),
    ...card.payees.map(p => [`Paid to ${p.name}`, `${p.text} this month${p.last === null ? '; last month holds no record' : `; ${p.last} last month`}`] as [string, string]),
    ...(card.others.length ? [['Other currencies', `${card.others.join(', ')}, never converted`] as [string, string]] : []),
  ];
}

/* ---- Accounts and debts ---- */
export type AccountLine = {id: string; name: string; kind: string; debt: boolean; /** The latest balance on or before today; null: no balance yet. */ balance: string | null; date: string | null; rate: string | null};
export type AccountsCard = {
  state: 'empty' | 'live';
  currency: string | null; others: string[];
  assets: string | null; debts: string | null; net: string | null; netNegative: boolean;
  /** What is owed against what the accounts hold (0–1, capped; null without assets). */
  owedShare: number | null;
  count: number; noBalance: number;
  /** The lead currency's accounts first, then its debts, each largest first; an account without a balance last. */
  lines: AccountLine[];
  /** The newest balance date among them. */
  lastDate: string | null;
};
const KIND_WORDS: Readonly<Record<string, string>> = {cash: 'Cash', savings: 'Savings', investment: 'Investment', pension: 'Pension', property: 'Property', vehicle: 'Vehicle', 'other-asset': 'Asset', loan: 'Loan', mortgage: 'Mortgage', 'credit-card': 'Credit card', 'other-debt': 'Debt'};
export function accountsCard(accounts: Accounts, today: string): AccountsCard {
  const live = accounts.items.filter(a => !a.archivedAt), rows = netWorth({...accounts, items: live}, today, []).rows;
  const lead = [...rows].sort((a, b) => b.accounts - a.accounts || a.currency.localeCompare(b.currency))[0];
  if (!lead) return {state: 'empty', currency: null, others: [], assets: null, debts: null, net: null, netNegative: false, owedShare: null, count: 0, noBalance: 0, lines: [], lastDate: null};
  const cur = lead.currency, own = live.filter(a => a.currency === cur);
  const sized = own.map(a => { const b = balanceOn(a, today); return {a, b, size: b ? Number(moneyText(b)) : -1}; }).sort((x, y) => Number(isDebtKind(x.a.kind)) - Number(isDebtKind(y.a.kind)) || y.size - x.size || x.a.name.localeCompare(y.a.name));
  const assets = Number(moneyText(lead.assets)), debts = Number(moneyText(lead.debts));
  return {
    state: 'live', currency: cur, others: rows.filter(r => r !== lead).map(r => r.currency),
    assets: money(lead.assets, cur), debts: money(lead.debts, cur), net: money(lead.net.value < 0n ? {value: -lead.net.value, decimals: lead.net.decimals} : lead.net, cur), netNegative: lead.net.value < 0n,
    owedShare: assets > 0 ? Math.min(1, debts / assets) : null, count: own.length, noBalance: lead.noBalance,
    lines: sized.map(({a, b}) => ({id: a.id, name: a.name, kind: KIND_WORDS[a.kind] ?? 'Account', debt: isDebtKind(a.kind), balance: b ? money(b, cur) : null, date: b?.date ?? null, rate: a.ratePercent ?? null})),
    lastDate: sized.reduce<string | null>((latest, s) => s.b && (!latest || s.b.date > latest) ? s.b.date : latest, null),
  };
}
export function accountsRows(card: AccountsCard, day: (date: string) => string, shown = card.lines.length): [string, string][] {
  if (card.state === 'empty') return [['Accounts and debts', 'None kept yet']];
  return [
    [`In accounts, in ${card.currency}`, card.assets ?? '—'], ['Owed', card.debts ?? '—'], ['Accounts minus debts', `${card.netNegative ? 'minus ' : ''}${card.net}; Wealth’s holdings are not in this figure`],
    ...card.lines.slice(0, shown).map(l => [`${l.name} (${l.kind})`, l.balance ? `${l.debt ? 'owed ' : ''}${l.balance}, balance of ${day(l.date!)}` : 'No balance yet'] as [string, string]),
    ...(card.lines.length > shown ? [['More', `${card.lines.length - shown} more on Wealth`] as [string, string]] : []),
    ...(card.others.length ? [['Other currencies', `${card.others.join(', ')}, never converted`] as [string, string]] : []),
  ];
}

/* ---- Debt payoff plan (a projection of the person's own kept figures) ---- */
export type PlanLine = {strategy: 'avalanche' | 'snowball' | 'minimums'; title: string; months: number | null; /** The month it would clear ("2029-02"), or null: not within 100 years. */ month: string | null; monthName: string | null; interest: string};
export type DebtPlanCard = {
  /** 'empty': no debt with a balance; 'unkept': debts, but no figures kept for the planner; 'needs': a figure is missing; 'live'. */
  state: 'empty' | 'unkept' | 'needs' | 'live';
  currency: string | null; debts: number; owed: string | null; extra: string | null;
  /** What is missing, in the planner's own words (unknown is never zero). */
  issue: string | null;
  plans: PlanLine[];
  /** The first debt cleared, highest rate first. */
  first: {name: string; monthName: string} | null;
  /** The planner's own comparison in words. */
  words: string | null;
  /** The Showcase's or the person's label on the kept figures. */
  note: string | null;
};
export const PLAN_RULE = 'A projection from your own figures: it assumes the rates and payments stay the same and nothing new is borrowed. Not a promise, not advice.';
const TITLES = {avalanche: 'Highest rate first', snowball: 'Smallest balance first', minimums: 'Minimums only'} as const;
export function debtPlanCard(accounts: Accounts, planner: DebtPlannerRecord, today: string): DebtPlanCard {
  const by = new Map<string, {id: string; name: string; owed: bigint; rate?: string}[]>();
  for (const a of accounts.items) {
    if (a.archivedAt || !isDebtKind(a.kind)) continue;
    const b = balanceOn(a, today); if (!b || b.value <= 0n) continue;
    by.set(a.currency, [...by.get(a.currency) ?? [], {id: a.id, name: a.name, owed: toCents(b.value, b.decimals), ...(a.ratePercent ? {rate: a.ratePercent} : {})}]);
  }
  const currencies = [...by.keys()].sort(), currency = (planner.currency && by.has(planner.currency) ? planner.currency : currencies[0]) ?? null, rows = currency ? by.get(currency) ?? [] : [];
  const cash = (cents: bigint) => formatCurrencyAmount(centsText(cents), currency), note = planner.note ?? null;
  const base = {currency, debts: rows.length, owed: currency ? cash(rows.reduce((n, r) => n + r.owed, 0n)) : null, extra: null, plans: [], first: null, words: null, note};
  if (!rows.length || !currency) return {...base, state: 'empty', issue: null};
  if (!planner.debts && planner.extra === undefined) return {...base, state: 'unkept', issue: 'No figures are kept for the payoff planner yet.'};
  const extraCents = planner.extra ? parseCents(planner.extra) : 0n, debts: PlanDebt[] = [];
  let issue: string | null = extraCents === null ? 'The extra amount a month is not a number.' : null;
  for (const r of rows) {
    if (issue) break;
    const kept = planner.debts?.[r.id], rate = r.rate ?? kept?.ratePercent ?? '', minimum = kept?.minimum ? parseCents(kept.minimum) : null;
    if (!rate || rateE4(rate) === null) issue = `The yearly rate for ${r.name} is not kept yet.`;
    else if (minimum === null || minimum <= 0n) issue = `The minimum monthly payment for ${r.name} is not kept yet.`;
    else debts.push({id: r.id, name: r.name, balance: r.owed, ratePercent: rate, minimum});
  }
  issue ??= planIssue(debts, extraCents ?? 0n);
  if (issue) return {...base, state: 'needs', issue};
  const c = comparePlans(debts, extraCents ?? 0n);
  const line = (r: PlanResult): PlanLine => { const month = payoffMonth(today, r.months); return {strategy: r.strategy, title: TITLES[r.strategy], months: r.months, month, monthName: month ? formatMonth(month) : null, interest: cash(r.totalInterest)}; };
  const firstOff = c.avalanche.payoffs[0], firstMonth = firstOff ? payoffMonth(today, firstOff.month) : null;
  return {...base, state: 'live', issue: null, extra: cash(extraCents ?? 0n), plans: [line(c.avalanche), line(c.snowball), line(c.minimums)],
    first: firstOff && firstMonth ? {name: firstOff.name, monthName: formatMonth(firstMonth)} : null, words: comparisonWords(c, cash)};
}
export function debtPlanRows(card: DebtPlanCard): [string, string][] {
  if (card.state !== 'live') return [['Debt payoff plan', card.state === 'empty' ? 'No debt with a balance is kept' : card.issue ?? 'A figure is missing']];
  return [
    [`Owed today, in ${card.currency}`, `${card.owed} across ${card.debts} ${card.debts === 1 ? 'debt' : 'debts'}; ${card.extra} extra a month`],
    ...card.plans.map(p => [p.title, p.monthName ? `Cleared by ${p.monthName} (${p.months} ${p.months === 1 ? 'month' : 'months'}), ${p.interest} interest: a projection` : 'Not cleared within 100 years'] as [string, string]),
    ...(card.words ? [['In words', card.words] as [string, string]] : []),
    ['How to read this', PLAN_RULE],
  ];
}

/* ---- Savings challenges ---- */
export type ChallengeLine = {goalId: string; goal: string; kind: ChallengeKind; title: string; words: string; /** How far along (0–1), or null where the challenge has no end to measure against. */ share: number | null; note: string | null};
export type SavingsChallengesCard = {state: 'empty' | 'live'; lines: ChallengeLine[]; /** Challenges whose goal is no longer on this device. */ orphaned: number};
const CHALLENGE_TITLE: Readonly<Record<ChallengeKind, string>> = {'52-week': '52-week challenge', 'no-spend': 'No-spend days', 'round-up': 'Round-ups by hand'};
export function savingsChallengesCard(record: SavingsChallenges, platform: Pick<Platform, 'goals' | 'contributions'>, log: Log, today: string): SavingsChallengesCard {
  const lines: ChallengeLine[] = [], startsOn = log.weekStartsOn ?? 'monday';
  let orphaned = 0;
  for (const [goalId, c] of Object.entries(record.goals)) {
    const goal = platform.goals.find(g => g.id === goalId);
    if (!goal) { orphaned++; continue; }
    const cash = (units: bigint) => formatGoalAmount(formatUnits((units < 0n ? -units : units).toString(), goal.decimals), goal.asset);
    const amounts: GoalAmount[] = (platform.contributions ?? []).filter(e => e.goalId === goal.id && e.goalScope === 'private' && e.provenance !== 'REWARD_INCOME').flatMap(e => { const u = eventValueForGoal(e, goal); return u === null ? [] : [{day: calendarDay(e.occurredAt), units: e.direction === 'IN' ? u : -u}]; });
    const recorded = recordedSince(amounts, c.startedOn, today), base = {goalId, goal: goal.name, kind: c.kind, title: CHALLENGE_TITLE[c.kind], note: c.note ?? null};
    if (c.kind === '52-week') {
      let step = 0n; try { step = parseAmountInput(c.step ?? '', goal.decimals); } catch { step = 0n; }
      if (step <= 0n) { lines.push({...base, words: 'No step set yet', share: null}); continue; }
      const p = fiftyTwoWeek(c.startedOn, today, step, c.order ?? 'up', recorded);
      lines.push({...base, share: p.covered / WEEKS, words: p.week === 0 ? 'Not started yet' : p.week > WEEKS ? `The 52 weeks are over; ${p.covered} of 52 covered` : `Week ${p.week} of 52, this week ${cash(p.thisWeek)}; ${p.covered} of 52 covered`});
    } else if (c.kind === 'no-spend') {
      const p = noSpend(c, log.entries, today, weekOf(today, startsOn).start);
      lines.push({...base, share: p.target > 0 ? Math.min(1, p.counted / p.target) : null, words: `${p.counted} of ${p.target} no-spend days${p.conflicts.length ? `; ${p.conflicts.length} marked ${p.conflicts.length === 1 ? 'day has' : 'days have'} a logged purchase` : ''}`});
    } else {
      if (!isMoneyCurrency(goal.asset)) { lines.push({...base, words: 'Counts purchases in a money currency only', share: null}); continue; }
      const p = roundUps(log.entries, goal.asset, c.roundTo ?? 1, c.startedOn, today, d => weekOf(d, startsOn).start);
      lines.push({...base, share: null, words: `${formatCurrencyAmount(centsText(p.total), goal.asset)} of round-ups from ${p.counted} ${p.counted === 1 ? 'purchase' : 'purchases'}; ${formatCurrencyAmount(centsText(p.thisWeek), goal.asset)} this week`});
    }
  }
  return {state: lines.length ? 'live' : 'empty', lines, orphaned};
}
export const savingsChallengesRows = (card: SavingsChallengesCard): [string, string][] => card.lines.length ? card.lines.map(l => [`${l.goal}: ${l.title}`, l.words]) : [['Savings challenges', 'None running']];

/* ---- Price alerts (a read-only list) ---- */
export type AlertLine = {id: string; words: string; state: 'waiting' | 'fired' | 'off'; stateWords: string; /** When it fired. */ at: string | null};
export type PriceAlertsCard = {state: 'empty' | 'live'; waiting: number; fired: number; unseen: number; lines: AlertLine[]; /** The newest alert that fired, in the alert's own words. */ last: {text: string; at: string} | null};
export function priceAlertsCard(record: PriceAlerts): PriceAlertsCard {
  const lines = record.alerts.map((a): AlertLine => { const state = a.firedAt ? 'fired' : a.active ? 'waiting' : 'off'; return {id: a.id, words: alertLine(a), state, stateWords: state === 'fired' ? (a.seenAt ? 'Fired' : 'Fired · not seen yet') : state === 'waiting' ? 'Waiting' : 'Off', at: a.firedAt ?? null}; })
    .sort((a, b) => ({waiting: 0, fired: 1, off: 2}[a.state] - {waiting: 0, fired: 1, off: 2}[b.state]) || (b.at ?? '').localeCompare(a.at ?? '') || a.words.localeCompare(b.words));
  const last = [...record.fired].sort((a, b) => b.at.localeCompare(a.at))[0];
  return {state: record.alerts.length ? 'live' : 'empty', waiting: lines.filter(l => l.state === 'waiting').length, fired: lines.filter(l => l.state === 'fired').length, unseen: record.alerts.filter(a => a.firedAt && !a.seenAt).length, lines, last: last ? {text: last.text, at: last.at} : null};
}
export const priceAlertsRows = (card: PriceAlertsCard, day: (at: string) => string, shown = card.lines.length): [string, string][] => card.lines.length ? [
  ...card.lines.slice(0, shown).map(l => [l.words, l.at ? `${l.stateWords}, ${day(l.at)}` : l.stateWords] as [string, string]),
  ...(card.lines.length > shown ? [['More alerts', `${card.lines.length - shown} more on Markets`] as [string, string]] : []),
] : [['Price alerts', 'None yet']];
