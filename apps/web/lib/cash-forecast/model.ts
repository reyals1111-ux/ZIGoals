import {addLocalDays} from '../local-date';
import {balanceOn} from '../accounts/net-worth';
import type {Accounts} from '../accounts/schema';
import {CASH_LIKE} from '../buffer-days/buffer';
import {addMonths, dueDatesBetween} from '../bills/cadence';
import {detectBills, normalisePayee, openCandidates, type BillCandidate} from '../bills/detect';
import type {BillsRecord} from '../bills/schema';
import {billOccurrences} from '../bills/store';
import type {BudgetsRecord} from '../budgets/schema';
import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import {isMoneyCurrency} from '../visual-format';

/**
 * Session AK (BUILD list 2 #11, COMPETITORS_2: Actual Balance Forecast, Monarch Forecasting): cash, the next 60 days.
 * A model from the person's own records, not a promise. Per currency, never converted:
 * - it starts from the latest balances of the cash and savings accounts (lib/buffer-days CASH_LIKE); a currency with no
 *   such balance has no line at all (unknown is not zero), and an account without a balance is named, not counted as 0;
 * - it takes away each known bill on its due date (lib/bills), each repeating payment the money log shows that is not a
 *   bill yet (lib/bills/detect, medium confidence or better), and each planned Goal contribution paid in that currency
 *   (the Goal's plan: weekly, monthly or yearly; the money leaves cash, even when it lands in savings);
 * - it adds repeating income the log shows (a salary) on its expected dates;
 * - everything else is the everyday average of the last 90 days of the log (at least 14 days of history; the bills and
 *   repeats above are left out of it, so nothing is counted twice). With less history, a monthly budget in that
 *   currency stands in for the everyday spending ("from your budgets"); with neither, the line holds the dated items
 *   only and says the everyday part is not known.
 * - With 60 days of history or more there is a range: the line again at the highest and the lowest 30-day pace of the
 *   last 90 days (a range from the person's own months, not a probability).
 * Exact: cents as BigInt; the everyday part is a fraction rounded once per day. Pure: nothing stored, nothing sent.
 */
export const FORECAST_DAYS = 60, HISTORY_DAYS = 90, MIN_HISTORY = 14, RANGE_HISTORY = 60, WINDOW = 30, MIN_CONFIDENCE = 0.5;
export type ForecastEventKind = 'bill' | 'repeat-out' | 'repeat-in' | 'contribution';
export type ForecastEvent = {date: string; title: string; cents: bigint; kind: ForecastEventKind};
export type ForecastPoint = {date: string; mid: bigint; low?: bigint; high?: bigint};
export type Everyday = {source: 'log' | 'budgets' | 'none'; days: number; outCents: bigint; inCents: bigint};
export type KnownForecast = {
  currency: string; known: true; startCents: bigint; oldestBalance: string; missingBalances: number;
  points: ForecastPoint[]; lowest: {date: string; cents: bigint}; lowestLow: {date: string; cents: bigint} | null;
  events: ForecastEvent[]; everyday: Everyday; range: boolean;
};
export type UnknownForecast = {currency: string; known: false; reason: 'no-balance'; missingBalances: number};
export type CurrencyForecast = KnownForecast | UnknownForecast;
export type PlannedContribution = {goalName: string; amount: string; asset: string; decimals: number; cadence: 'weekly' | 'monthly' | 'yearly' | 'irregular'; nextDate: string; endDate?: string; active: boolean};
export type ForecastInput = {accounts: Accounts; bills: BillsRecord; entries: readonly MoneyEntry[]; budgets?: BudgetsRecord; contributions?: readonly PlannedContribution[]; today: string; days?: number};

const toCents = (value: bigint, decimals: number) => decimals >= 2 ? value / 10n ** BigInt(decimals - 2) : value * 10n ** BigInt(2 - decimals);
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** a × k ÷ d, rounded half away from zero. */
const share = (a: bigint, k: number, d: number): bigint => { const n = a * BigInt(k), q = n / BigInt(d), r = n % BigInt(d), half = 2n * (r < 0n ? -r : r) >= BigInt(d); return half ? q + (n < 0n ? -1n : 1n) : q; };
const entryKey = (e: MoneyEntry) => `${e.currency}|${e.category}|${normalisePayee(e.note) || normalisePayee(e.category)}`;

/** The dates a Goal's plan falls on from `from` to `to` (both included), stepping from its next date; none when irregular or off. */
export function contributionDates(plan: Pick<PlannedContribution, 'cadence' | 'nextDate' | 'endDate' | 'active'>, from: string, to: string): string[] {
  if (!plan.active || plan.cadence === 'irregular') return [];
  const out: string[] = [];
  for (let k = 0; k < 800; k++) {
    const day = plan.cadence === 'weekly' ? addLocalDays(plan.nextDate, 7 * k) : addMonths(plan.nextDate, (plan.cadence === 'yearly' ? 12 : 1) * k);
    if (day > to || (plan.endDate && day > plan.endDate)) break;
    if (day >= from) out.push(day);
  }
  return out;
}

/** The income series the log repeats (a salary): the bill detector, run on income. */
function repeatingIncome(entries: readonly MoneyEntry[], today: string): BillCandidate[] {
  return detectBills(entries.filter(e => e.kind === 'income').map(e => ({...e, kind: 'expense' as const})), today);
}

function forCurrency(input: ForecastInput, currency: string, days: number): CurrencyForecast {
  const {accounts, bills, today} = input;
  let start = 0n, withBalance = 0, missing = 0, oldest = today;
  for (const a of accounts.items) {
    if (a.archivedAt || a.currency !== currency || !CASH_LIKE.includes(a.kind)) continue;
    const b = balanceOn(a, today);
    if (!b) { missing++; continue; }
    start += toCents(b.value, b.decimals); withBalance++; if (b.date < oldest) oldest = b.date;
  }
  if (!withBalance) return {currency, known: false, reason: 'no-balance', missingBalances: missing};
  const from = addLocalDays(today, 1), to = addLocalDays(today, days), entries = input.entries.filter(e => e.currency === currency);
  const events: ForecastEvent[] = [];
  // Known bills on their due dates.
  for (const o of billOccurrences(bills, from, days - 1)) if (o.currency === currency) events.push({date: o.due, title: o.title, cents: -BigInt(o.amountCents), kind: 'bill'});
  // Repeats the log shows that are not bills yet, and repeating income; their entries leave the everyday average.
  const repeated = new Set<string>();
  const outs = openCandidates(detectBills(entries, today), bills).filter(c => c.confidence >= MIN_CONFIDENCE);
  for (const c of outs) { c.entryIds.forEach(id => repeated.add(id)); for (const due of dueDatesBetween(c.nextDue, c.cadence, from, to)) events.push({date: due, title: c.title, cents: -BigInt(c.amountCents), kind: 'repeat-out'}); }
  for (const c of repeatingIncome(entries, today).filter(x => x.confidence >= MIN_CONFIDENCE)) { c.entryIds.forEach(id => repeated.add(id)); for (const due of dueDatesBetween(c.nextDue, c.cadence, from, to)) events.push({date: due, title: c.title, cents: BigInt(c.amountCents), kind: 'repeat-in'}); }
  // Planned Goal contributions paid in this currency.
  for (const p of input.contributions ?? []) {
    if (p.asset !== currency || !/^[1-9]\d{0,29}$/.test(p.amount)) continue;
    const cents = toCents(BigInt(p.amount), p.decimals);
    if (cents <= 0n) continue;
    for (const day of contributionDates(p, from, to)) events.push({date: day, title: p.goalName, cents: -cents, kind: 'contribution'});
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  // The everyday part: the log's last 90 days without bills and repeats.
  const billKeys = bills.bills.filter(b => b.currency === currency);
  const isBill = (e: MoneyEntry) => e.kind === 'expense' && billKeys.some(b => b.matchKey ? b.matchKey.startsWith(`${entryKey(e)}|`) : !!normalisePayee(b.title) && normalisePayee(b.title) === normalisePayee(e.note));
  const histFrom = addLocalDays(today, -(HISTORY_DAYS - 1)), inWindow = entries.filter(e => e.date <= today && e.date >= histFrom);
  const first = entries.filter(e => e.date <= today).reduce<string | null>((m, e) => m === null || e.date < m ? e.date : m, null);
  const histDays = first ? dayDiff(first > histFrom ? first : histFrom, today) + 1 : 0;
  const everydayEntries = inWindow.filter(e => !repeated.has(e.id) && !isBill(e));
  const sum = (list: readonly MoneyEntry[], kind: 'expense' | 'income') => list.reduce((s, e) => e.kind === kind ? s + BigInt(minorUnits(e.amount)) : s, 0n);
  let everyday: Everyday;
  if (histDays >= MIN_HISTORY) everyday = {source: 'log', days: histDays, outCents: sum(everydayEntries, 'expense'), inCents: sum(everydayEntries, 'income')};
  else {
    const monthly = (input.budgets?.budgets ?? []).filter(b => b.currency === currency).reduce((s, b) => s + BigInt(minorUnits(b.monthly)), 0n);
    // A month of budgets as 365 ÷ 12 days: 12 months over 365 days.
    everyday = monthly > 0n ? {source: 'budgets', days: 365, outCents: monthly * 12n, inCents: 0n} : {source: 'none', days: 1, outCents: 0n, inCents: 0n};
  }
  // A range from the 30-day windows of the last 90 days, when there are at least two.
  const windows: {in: bigint; out: bigint}[] = [];
  if (everyday.source === 'log' && histDays >= RANGE_HISTORY) {
    for (let w = 0; w * WINDOW + WINDOW <= histDays && w < HISTORY_DAYS / WINDOW; w++) {
      const end = addLocalDays(today, -w * WINDOW), begin = addLocalDays(end, -(WINDOW - 1)), list = everydayEntries.filter(e => e.date >= begin && e.date <= end);
      windows.push({in: sum(list, 'income'), out: sum(list, 'expense')});
    }
  }
  const nets = windows.map(w => w.in - w.out), range = nets.length >= 2;
  const lowNet = range ? nets.reduce((m, v) => v < m ? v : m) : 0n, highNet = range ? nets.reduce((m, v) => v > m ? v : m) : 0n;
  const points: ForecastPoint[] = [];
  let dated = 0n, i = 0;
  for (let k = 0; k <= days; k++) {
    const date = addLocalDays(today, k);
    while (i < events.length && events[i]!.date <= date) dated += events[i++]!.cents;
    const base = start + dated, mid = base + share(everyday.inCents - everyday.outCents, k, everyday.days);
    if (!range) { points.push({date, mid}); continue; }
    // The range always holds the middle line (a partial first window can put the average a little outside it).
    const low = base + share(lowNet, k, WINDOW), high = base + share(highNet, k, WINDOW);
    points.push({date, mid, low: low < mid ? low : mid, high: high > mid ? high : mid});
  }
  const lowestOf = (pick: (p: ForecastPoint) => bigint) => points.reduce((m, p) => pick(p) < m.cents ? {date: p.date, cents: pick(p)} : m, {date: points[0]!.date, cents: pick(points[0]!)});
  return {currency, known: true, startCents: start, oldestBalance: oldest, missingBalances: missing, points, lowest: lowestOf(p => p.mid), lowestLow: range ? lowestOf(p => p.low!) : null, events, everyday, range};
}

/**
 * One forecast per currency that has a cash or savings account (the one with the most cash first), and the currencies
 * whose bills or planned contributions have no cash account to come out of (named, never drawn).
 */
export function cashForecast(input: ForecastInput): {rows: CurrencyForecast[]; unplaced: string[]} {
  const days = Math.max(1, Math.min(366, Math.floor(input.days ?? FORECAST_DAYS)));
  const currencies = [...new Set(input.accounts.items.filter(a => !a.archivedAt && CASH_LIKE.includes(a.kind)).map(a => a.currency))];
  const rows = currencies.map(c => forCurrency(input, c, days))
    .sort((a, b) => Number((b.known ? b.startCents : -1n) - (a.known ? a.startCents : -1n)) || a.currency.localeCompare(b.currency));
  const placed = new Set(currencies);
  const unplaced = [...new Set([...input.bills.bills.map(b => b.currency), ...(input.contributions ?? []).filter(p => p.active && p.cadence !== 'irregular' && isMoneyCurrency(p.asset)).map(p => p.asset)])].filter(c => !placed.has(c)).sort();
  return {rows, unplaced};
}

/** The Goals' plans as the forecast reads them (active Goals only). */
export function plannedContributions(goals: readonly {name: string; status: string; plan?: Omit<PlannedContribution, 'goalName'> & Record<string, unknown>}[]): PlannedContribution[] {
  return goals.flatMap(g => g.status === 'active' && g.plan ? [{goalName: g.name, amount: g.plan.amount, asset: g.plan.asset, decimals: g.plan.decimals, cadence: g.plan.cadence, nextDate: g.plan.nextDate, ...(g.plan.endDate ? {endDate: g.plan.endDate} : {}), active: g.plan.active}] : []);
}
