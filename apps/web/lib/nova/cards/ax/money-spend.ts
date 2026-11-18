import {ledger} from '../../../ai/local-answers/exact/money';
import {previousPeriod, type Period} from '../../../ai/local-answers/exact/period';
import type {Track} from '../../../ai/local-answers/exact/track';
import {daysBetween, weekStart} from '../../../ai/tools/range';
import {addLocalDays} from '../../../local-date';
import {byCategory, cents, fromCents} from '../../../money-log/engine';
import type {MoneyEntry} from '../../../money-log/schema';
import {formatCurrencyAmount, formatDate, formatMonth, formatPercent} from '../../../visual-format';

/**
 * Session AS (ADR-042 Part 2, Wealth): the figures of the answer widgets that read the money log — ranked categories, the
 * radar, the days with spending, the heat of thirteen weeks, the river of income and spending, the share of income not
 * spent and one period beside the one before. All of them count through the exact layer's own `ledger`
 * (lib/ai/local-answers/exact/money.ts) and the log's own `byCategory`, so a widget and the sentence it was made for
 * cannot disagree.
 *
 * The rules they share: an amount stays in its own currency (never converted, never added across); the currency with the
 * most logged in the period leads and the others are named beside it. Only what was logged counts: a day, a week or a
 * period with nothing logged is "nothing logged" (null), never a zero. Nothing here moves money, and nothing is projected.
 */
export type FlowKind = 'expense' | 'income';
export const axMoney = (amountCents: number, currency: string): string => formatCurrencyAmount(fromCents(amountCents), currency);
/** The Showcase's label stands on the stage once: a name does not repeat it ("Rent · SHOWCASE DATA" is "Rent"). */
export const axPlain = (name: string): string => name.replace(/\s*[·:•|–-]?\s*\(?SHOWCASE DATA\)?.*$/i, '').replace(/^Example · /, '').trim() || name.trim();
const wholeShare = (part: number, whole: number): string => formatPercent(whole > 0 ? part / whole * 100 : 0);
const newest = (entries: readonly MoneyEntry[]): string | null => entries.reduce((latest, e) => e.date > latest ? e.date : latest, '') || null;
const short = (day: string) => formatDate(day, {year: false});
/** A span of days in words: "Oct 1 – Oct 17", or one day. */
export const spanWords = (from: string, to: string): string => from === to ? short(from) : `${short(from)} – ${short(to)}`;
const inPeriod = (e: MoneyEntry, p: Period) => e.date >= p.from && e.date <= p.to && (p.weekday === null || p.days.includes(e.date));

// ---- Ranked bars: categories by amount ----
export type MoneyRank = {key: string; label: string; cents: number; text: string; share: number; /** The share of the total as a whole percent ("43%"). */ percent: string};
export type MoneyRanks = {
  /** 'empty': the log holds no entry of this kind at all; 'quiet': none in this period. */
  state: 'empty' | 'quiet' | 'live';
  kind: FlowKind; period: Period;
  currency: string | null; totalCents: number; total: string; entries: number;
  /** Every category of the leading currency, the largest first. */
  rows: MoneyRank[];
  /** The longest bar, for the scale. */
  max: number;
  /** What was logged in other currencies, each on its own. */
  others: {currency: string; text: string}[];
  /** The day of the newest entry counted (in the period; else of this kind at all). */
  lastDate: string | null;
};
export function categoryRanks(entries: readonly MoneyEntry[], kind: FlowKind, period: Period): MoneyRanks {
  const all = entries.filter(e => e.kind === kind), now = ledger(entries, kind, period), cur = now.currency;
  const blank = {kind, period, currency: null, totalCents: 0, total: '—', entries: 0, rows: [], max: 1, others: [], lastDate: newest(all)};
  if (!all.length) return {state: 'empty', ...blank};
  if (!cur) return {state: 'quiet', ...blank};
  const rows = byCategory(now.own, period.from, period.to, kind).filter(c => c.currency === cur)
    .map(c => ({key: c.category, label: axPlain(c.category), cents: c.total, text: axMoney(c.total, cur), share: now.total > 0 ? c.total / now.total : 0, percent: wholeShare(c.total, now.total)}));
  return {state: 'live', kind, period, currency: cur, totalCents: now.total, total: axMoney(now.total, cur), entries: now.own.length, rows, max: Math.max(1, ...rows.map(r => r.cents)),
    others: now.others.map(o => ({currency: o.currency, text: o.text})), lastDate: newest(all.filter(e => inPeriod(e, period)))};
}

// ---- The radar: categories as spokes, this period over the one before ----
export const RADAR_SPOKES = 8;
export type RadarSpoke = {key: string; label: string; now: number; /** null: nothing at all was logged in the period before (unknown, never a zero). */ before: number | null; nowText: string; beforeText: string; percent: string};
export type SpendingRadar = {
  state: 'empty' | 'quiet' | 'live';
  period: Period; before: Period | null;
  currency: string | null; totalCents: number; total: string; entries: number;
  beforeCents: number | null; beforeTotal: string | null;
  /** Eight at most: this period's categories by size, then those only the period before had; the rest summed as "Other". */
  spokes: RadarSpoke[];
  /** How many categories "Other" holds (0: no such spoke). */
  folded: number;
  max: number;
  others: {currency: string; text: string}[]; lastDate: string | null;
};
export function spendingRadar(entries: readonly MoneyEntry[], period: Period, today: string): SpendingRadar {
  const ranks = categoryRanks(entries, 'expense', period), before = previousPeriod(period, today), cur = ranks.currency;
  const base = {period, before, currency: cur, totalCents: ranks.totalCents, total: ranks.total, entries: ranks.entries, others: ranks.others, lastDate: ranks.lastDate};
  if (ranks.state !== 'live' || !cur) return {state: ranks.state === 'live' ? 'quiet' : ranks.state, ...base, beforeCents: null, beforeTotal: null, spokes: [], folded: 0, max: 1};
  const past = before ? ledger(entries.filter(e => e.currency === cur), 'expense', before) : null, known = !!past?.currency;
  const pastBy = new Map(known && before ? byCategory(past!.own, before.from, before.to, 'expense').map(c => [c.category, c.total] as const) : []);
  const nowBy = new Map(ranks.rows.map(r => [r.key, r.cents] as const));
  const keys = [...nowBy.keys(), ...[...pastBy.keys()].filter(k => !nowBy.has(k))];
  const spoke = (key: string, label: string, now: number, was: number): RadarSpoke => ({key, label, now, before: known ? was : null, nowText: now ? axMoney(now, cur) : 'nothing logged', beforeText: known && was ? axMoney(was, cur) : 'nothing logged', percent: wholeShare(now, ranks.totalCents)});
  const all = keys.map(k => spoke(k, axPlain(k), nowBy.get(k) ?? 0, pastBy.get(k) ?? 0));
  const head = all.length > RADAR_SPOKES ? all.slice(0, RADAR_SPOKES - 1) : all, rest = all.slice(head.length);
  const spokes = rest.length ? [...head, spoke('\u0000other', 'Other', rest.reduce((n, s) => n + s.now, 0), rest.reduce((n, s) => n + (s.before ?? 0), 0))] : head;
  return {state: 'live', ...base, beforeCents: known ? past!.total : null, beforeTotal: known ? axMoney(past!.total, cur) : null, spokes, folded: rest.length, max: Math.max(1, ...spokes.flatMap(s => [s.now, s.before ?? 0]))};
}

// ---- Twins: this period beside the one before ----
export type SpendingCompare = {
  /** 'empty': no entry of this kind at all; 'quiet': none in this period nor in the one before. */
  state: 'empty' | 'quiet' | 'live';
  kind: FlowKind; period: Period; before: Period | null;
  currency: string | null;
  /** null: nothing logged in that period (unknown, never a zero). */
  nowCents: number | null; beforeCents: number | null;
  now: string; was: string;
  /** The period before in words: "Oct 1 – Oct 17". */
  beforeWords: string | null;
  diffCents: number | null;
  /** "€529.59 more than the period before", "the same as the period before", "nothing logged the period before". */
  delta: string;
  others: {currency: string; text: string}[]; lastDate: string | null;
};
export function spendingCompare(entries: readonly MoneyEntry[], kind: FlowKind, period: Period, today: string): SpendingCompare {
  const all = entries.filter(e => e.kind === kind), now = ledger(entries, kind, period), before = previousPeriod(period, today);
  const cur = now.currency ?? (before ? ledger(entries, kind, before).currency : null);
  const past = before && cur ? ledger(entries.filter(e => e.currency === cur), kind, before) : null;
  const nowCents = now.currency ? now.total : null, beforeCents = past?.currency ? past.total : null, diff = nowCents !== null && beforeCents !== null ? nowCents - beforeCents : null;
  const text = (value: number | null) => value === null || !cur ? 'nothing logged' : axMoney(value, cur);
  const delta = diff === null ? (beforeCents === null ? 'Nothing logged the period before, so no difference to state' : 'Nothing logged in this period')
    : diff === 0 ? 'The same as the period before' : `${axMoney(Math.abs(diff), cur!)} ${diff > 0 ? 'more' : 'less'} than the period before`;
  return {state: !all.length ? 'empty' : nowCents === null && beforeCents === null ? 'quiet' : 'live', kind, period, before, currency: cur, nowCents, beforeCents, now: text(nowCents), was: text(beforeCents),
    beforeWords: before ? spanWords(before.from, before.to) : null, diffCents: diff, delta, others: now.others.map(o => ({currency: o.currency, text: o.text})), lastDate: newest(all.filter(e => e.date <= period.to))};
}

// ---- The gauge: the share of the logged income that was not spent ----
export type SavingsRate = {
  /** 'empty': nothing logged at all; 'no-income': no income logged in the period; 'no-spending': income, and nothing logged as spent. */
  state: 'empty' | 'no-income' | 'no-spending' | 'live';
  period: Period; currency: string | null;
  incomeCents: number | null; spendingCents: number | null; income: string; spending: string;
  /** Income minus spending (negative: more was spent than came in), and its size as money. */
  keptCents: number | null; kept: string;
  /** The whole percent of the income that was not spent; negative when more went out than came in. Null without both figures. */
  rate: number | null; percent: string;
  others: string[]; lastDate: string | null;
};
export function savingsRate(entries: readonly MoneyEntry[], period: Period): SavingsRate {
  const income = ledger(entries, 'income', period), cur = income.currency, spent = ledger(cur ? entries.filter(e => e.currency === cur) : entries, 'expense', period);
  const others = [...new Set(entries.filter(e => inPeriod(e, period) && e.currency !== (cur ?? spent.currency)).map(e => e.currency))].sort();
  const lastDate = newest(entries.filter(e => inPeriod(e, period))), none = 'nothing logged';
  const blank = {period, incomeCents: null, keptCents: null, kept: '—', rate: null, percent: '—', others, lastDate, income: none};
  if (!entries.length) return {state: 'empty', ...blank, currency: null, spendingCents: null, spending: none};
  if (!cur) return {state: 'no-income', ...blank, currency: spent.currency, spendingCents: spent.currency ? spent.total : null, spending: spent.currency ? axMoney(spent.total, spent.currency) : none};
  if (!spent.currency) return {state: 'no-spending', ...blank, currency: cur, incomeCents: income.total, income: axMoney(income.total, cur), spendingCents: null, spending: none};
  const kept = income.total - spent.total, rate = income.total > 0 ? Math.round(kept / income.total * 100) : null;
  return {state: 'live', period, currency: cur, incomeCents: income.total, spendingCents: spent.total, income: axMoney(income.total, cur), spending: axMoney(spent.total, cur), keptCents: kept, kept: axMoney(Math.abs(kept), cur),
    rate, percent: rate === null ? '—' : formatPercent(rate), others, lastDate};
}

// ---- The calendar: the days with spending, as a track ----
/**
 * Spending as a track of days (the calendar family reads tracks): a past day counts when something was logged as spent on
 * it, in any currency; its value is what was spent in the leading currency, in cents. Today is still open (the day is
 * not over), so it is neither a day with spending nor one without; a past day with nothing logged is unknown.
 */
export function spendTrack(entries: readonly MoneyEntry[], today: string, currency: string | null): Track {
  const any = new Set<string>(), by = new Map<string, number>();
  for (const e of entries) { if (e.kind !== 'expense') continue; any.add(e.date); if (e.currency === currency) by.set(e.date, (by.get(e.date) ?? 0) + cents(e.amount)); }
  return {key: 'spending', domain: 'spending', name: 'Spending', kind: 'event', did: ['spent', 'uitgegeven'], not: ['nothing logged', 'niets gelogd'], source: ['Your money log', 'Je geldlog'],
    points: days => days.map(date => ({date, value: by.get(date) ?? null, state: date === today ? 'open' : any.has(date) ? 'done' : 'none'})),
    measure: currency ? {text: value => axMoney(Math.round(value), currency), kind: 'sum', target: null} : null,
    widgets: (_ask, period) => [{id: 'spending-days', period: period.token, fallback: 'spending'}]};
}

// ---- Heat: thirteen weeks, a cell a day ----
export const HEAT_WEEKS = 13;
export type HeatCell = {date: string; /** null: nothing logged as spent that day (unknown, never a zero). */ cents: number | null; level: 0 | 1 | 2 | 3 | 4; ahead: boolean; today: boolean; words: string};
export type SpendingHeat = {
  state: 'empty' | 'quiet' | 'live';
  from: string; to: string;
  currency: string | null; totalCents: number; total: string;
  /** Thirteen weeks, Monday first, the newest last; days after today are still to come. */
  weeks: HeatCell[][];
  /** The week a month's name stands over. */
  months: {week: number; label: string}[];
  /** Days with something logged as spent, of the days so far. */
  daysWith: number; days: number;
  peak: {date: string; cents: number; text: string} | null;
  others: string[]; lastDate: string | null;
};
export function spendingHeat(entries: readonly MoneyEntry[], today: string): SpendingHeat {
  const from = addLocalDays(weekStart(today), -7 * (HEAT_WEEKS - 1)), expenses = entries.filter(e => e.kind === 'expense'), inRange = expenses.filter(e => e.date >= from && e.date <= today);
  const per = new Map<string, number>();
  for (const e of inRange) per.set(e.currency, (per.get(e.currency) ?? 0) + cents(e.amount));
  const ranked = [...per.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), cur = ranked[0]?.[0] ?? null, total = ranked[0]?.[1] ?? 0;
  const by = new Map<string, number>();
  for (const e of inRange) if (e.currency === cur) by.set(e.date, (by.get(e.date) ?? 0) + cents(e.amount));
  const top = [...by.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0], max = top?.[1] ?? 0;
  const weeks: HeatCell[][] = [], months: SpendingHeat['months'] = [];
  for (let w = 0; w < HEAT_WEEKS; w++) {
    const monday = addLocalDays(from, w * 7), last = addLocalDays(monday, 6);
    if (w === 0 || last.slice(0, 7) !== addLocalDays(monday, -1).slice(0, 7)) months.push({week: w, label: formatMonth(last.slice(0, 7), {year: false})});
    weeks.push(Array.from({length: 7}, (_, d) => {
      const date = addLocalDays(monday, d), value = by.get(date) ?? null, ahead = date > today;
      const level = value === null || max <= 0 ? 0 : (1 + Math.min(3, Math.floor(value / max * 4))) as 1 | 2 | 3 | 4;
      return {date, cents: value, level, ahead, today: date === today, words: `${formatDate(date, {weekday: true, year: false})}: ${ahead ? 'still to come' : value === null || !cur ? 'nothing logged' : axMoney(value, cur)}`};
    }));
  }
  return {state: !expenses.length ? 'empty' : !cur ? 'quiet' : 'live', from, to: today, currency: cur, totalCents: total, total: cur ? axMoney(total, cur) : '—', weeks, months,
    daysWith: by.size, days: daysBetween(from, today) + 1, peak: top && cur ? {date: top[0], cents: top[1], text: axMoney(top[1], cur)} : null, others: ranked.slice(1).map(r => r[0]), lastDate: newest(inRange)};
}

// ---- The river: income and spending over time ----
export type RiverBucket = {from: string; to: string; label: string; /** null: nothing of that kind was logged in the bucket. */ income: number | null; spending: number | null};
export type CashRiver = {
  state: 'empty' | 'quiet' | 'live';
  period: Period;
  /** A bucket is a day (a month or less), a week (half a year or less) or a month. */
  step: 'day' | 'week' | 'month';
  currency: string | null;
  buckets: RiverBucket[];
  /** The widest band, for the scale. */
  max: number;
  incomeCents: number | null; spendingCents: number | null; income: string; spending: string;
  netCents: number | null;
  /** The gap in words: "€1,938.01 more in than out", "as much in as out", "no income logged". */
  gap: string;
  others: string[]; lastDate: string | null;
};
export function cashRiver(entries: readonly MoneyEntry[], period: Period): CashRiver {
  const inRange = entries.filter(e => inPeriod(e, period)), per = new Map<string, number>();
  for (const e of inRange) per.set(e.currency, (per.get(e.currency) ?? 0) + cents(e.amount));
  const ranked = [...per.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), cur = ranked[0]?.[0] ?? null, own = inRange.filter(e => e.currency === cur);
  const span = daysBetween(period.from, period.to) + 1, step: CashRiver['step'] = span <= 31 ? 'day' : span <= 182 ? 'week' : 'month';
  const buckets: RiverBucket[] = [];
  for (let d = period.from; d <= period.to;) {
    const end = step === 'day' ? d : step === 'week' ? addLocalDays(weekStart(d), 6) : addLocalDays(`${addLocalDays(`${d.slice(0, 8)}28`, 4).slice(0, 8)}01`, -1), to = end > period.to ? period.to : end;
    const of = (kind: FlowKind) => { const hit = own.filter(e => e.kind === kind && e.date >= d && e.date <= to); return hit.length ? hit.reduce((n, e) => n + cents(e.amount), 0) : null; };
    buckets.push({from: d, to, label: step === 'day' ? short(d) : step === 'week' ? spanWords(d, to) : formatMonth(d.slice(0, 7), {year: period.from.slice(0, 4) !== period.to.slice(0, 4)}), income: of('income'), spending: of('expense')});
    d = addLocalDays(to, 1);
  }
  const sum = (kind: FlowKind) => { const hit = own.filter(e => e.kind === kind); return hit.length ? hit.reduce((n, e) => n + cents(e.amount), 0) : null; };
  const income = sum('income'), spending = sum('expense'), net = income !== null && spending !== null ? income - spending : null, text = (value: number | null) => value === null || !cur ? 'nothing logged' : axMoney(value, cur);
  const gap = net === null ? (income === null ? 'no income logged' : 'no spending logged') : net === 0 ? 'as much in as out' : `${axMoney(Math.abs(net), cur!)} more ${net > 0 ? 'in than out' : 'out than in'}`;
  return {state: !entries.length ? 'empty' : !cur ? 'quiet' : 'live', period, step, currency: cur, buckets, max: Math.max(1, ...buckets.flatMap(b => [b.income ?? 0, b.spending ?? 0])),
    incomeCents: income, spendingCents: spending, income: text(income), spending: text(spending), netCents: net, gap, others: ranked.slice(1).map(r => r[0]), lastDate: newest(inRange)};
}
