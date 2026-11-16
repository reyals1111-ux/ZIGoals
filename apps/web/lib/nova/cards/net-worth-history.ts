import {addLocalDays} from '../../local-date';
import {formatCurrencyAmount} from '../../visual-format';
import {SOURCE_LABELS, type NetworthHistory, type NetworthSource} from '../../networth-history';
import {RANGE_DAYS, RANGE_WORDS, type WidgetRange} from '../stage/record';
import type {NetWorthChange} from './net-worth';

/**
 * Session AM-2 (step 3, "NOVA connected"): the "Net worth over time" widget's figures, pure, from the net-worth history
 * Wealth records (lib/networth-history.ts, `zigoals:networth-history:v1`; read only, never written here).
 *
 * - The line is a true net worth, as Wealth states it (lib/accounts/net-worth.ts netWorthTotal): Wealth's holdings plus
 *   the accounts' balances minus debts, in ONE currency, on each day that was recorded. The Portfolio and the tracked
 *   wallets are listed apart and never added (the wallets are already part of the holdings).
 * - Unknown is not zero: a day on which a counted source had no value is a gap with the names that had no value; a day
 *   Wealth was not opened is a gap too (the history never fills days in).
 * - Currencies are never converted or added; the currency with the most recorded days leads, the others are named.
 * - The change is between the first and the last known day in the range. Nothing is projected.
 */
export const NET_WORTH_HISTORY_RANGE: WidgetRange = 'quarter';
const COUNTED: readonly NetworthSource[] = ['wealth', 'accounts'];
export type HistoryPoint = {day: string; /** null: a counted source had no value that day. */ cents: bigint | null; missing: string[]};
export type HistoryPart = {source: NetworthSource; label: string; cents: bigint | null; counted: boolean};
export type NetWorthHistoryCard = {
  /** 'empty': no day recorded yet; 'quiet': days recorded, none inside the range. */
  state: 'empty' | 'quiet' | 'live';
  range: WidgetRange; rangeWords: string;
  /** The Showcase's own label when the history is its fictional example. */
  example: string | null;
  currency: string | null; otherCurrencies: string[];
  /** The recorded days inside the range, oldest first. */
  points: HistoryPoint[];
  /** The newest recorded day in the range, and the newest one with a known net worth. */
  latest: HistoryPoint | null; latestKnown: {day: string; cents: bigint} | null;
  change: NetWorthChange | null;
  high: {day: string; cents: bigint} | null; low: {day: string; cents: bigint} | null;
  /** The newest recorded day's sources in the lead currency: what is counted, and what stands apart. */
  parts: HistoryPart[];
  /** One value per calendar day from the first to the last recorded day in the range (major units, for drawing); a gap is null. */
  series: (number | null)[];
  recorded: number; notOpened: number; unknownDays: number;
  /** The first day ever recorded (the history starts there). */
  since: string | null;
};
/** A decimal string ("-1234.5", up to 18 decimals) in exact cents, rounded half away from zero. */
export function decimalCents(value: string): bigint {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) throw Error('Not a decimal amount.');
  const frac = (m[3] ?? '').padEnd(3, '0'), base = BigInt(m[2]!) * 100n + BigInt(frac.slice(0, 2)), up = frac.charCodeAt(2) >= 53 ? 1n : 0n;
  return (m[1] ? -1n : 1n) * (base + up);
}
/** Exact cents as money in the app's own format (the widget and NOVA's line use this one). */
export function historyMoney(cents: bigint, currency: string): string {
  const size = cents < 0n ? -cents : cents;
  return formatCurrencyAmount(`${cents < 0n ? '-' : ''}${size / 100n}.${String(size % 100n).padStart(2, '0')}`, currency);
}
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

export function netWorthHistoryCard(history: NetworthHistory, today: string, range: WidgetRange = NET_WORTH_HISTORY_RANGE): NetWorthHistoryCard {
  const days = history.days.filter(d => d.day <= today), from = addLocalDays(today, -RANGE_DAYS[range]);
  // The lead currency: the one whose counted sources were recorded on the most days (then the one with more sources, then by name).
  const seen = new Map<string, {days: number; sources: Set<string>}>();
  for (const d of days) for (const c of new Set(d.sources.filter(s => COUNTED.includes(s.source)).map(s => s.currency))) {
    const row = seen.get(c) ?? {days: 0, sources: new Set<string>()};
    row.days++; for (const s of d.sources) if (s.currency === c && COUNTED.includes(s.source)) row.sources.add(s.source);
    seen.set(c, row);
  }
  const ranked = [...seen].sort((a, b) => b[1].days - a[1].days || b[1].sources.size - a[1].sources.size || a[0].localeCompare(b[0]));
  const currency = ranked[0]?.[0] ?? null;
  const pointOf = (d: NetworthHistory['days'][number]): HistoryPoint | null => {
    const own = d.sources.filter(s => s.currency === currency && COUNTED.includes(s.source));
    if (!own.length) return null;
    const missing = own.flatMap(s => s.value === null ? s.missing ?? [SOURCE_LABELS[s.source]] : []);
    return {day: d.day, cents: missing.length ? null : own.reduce((n, s) => n + decimalCents(s.value!), 0n), missing};
  };
  const all = currency ? days.flatMap(d => { const p = pointOf(d); return p ? [p] : []; }) : [];
  const points = all.filter(p => p.day >= from), known = points.flatMap(p => p.cents === null ? [] : [{day: p.day, cents: p.cents}]);
  const first = known[0], last = known.at(-1);
  const change: NetWorthChange | null = first && last && known.length >= 2 ? (() => {
    const diff = last.cents - first.cents;
    return {cents: diff, direction: diff > 0n ? 'up' as const : diff < 0n ? 'down' as const : 'flat' as const, since: first.day, percent: first.cents > 0n ? Number(diff * 100_000n / first.cents) / 1000 : null};
  })() : null;
  const edge = (better: (a: bigint, b: bigint) => boolean) => known.reduce<{day: string; cents: bigint} | null>((best, p) => !best || better(p.cents, best.cents) ? p : best, null);
  const start = points[0], end = points.at(-1);
  const series: (number | null)[] = start && end ? Array.from({length: dayNumber(end.day) - dayNumber(start.day) + 1}, () => null) : [];
  if (start) for (const p of known) series[dayNumber(p.day) - dayNumber(start.day)] = Number(p.cents) / 100;
  const newest = end ? days.find(d => d.day === end.day) : undefined;
  const parts: HistoryPart[] = (newest?.sources ?? []).filter(s => s.currency === currency).map(s => ({source: s.source, label: SOURCE_LABELS[s.source], cents: s.value === null ? null : decimalCents(s.value), counted: COUNTED.includes(s.source)}));
  return {
    state: !all.length ? 'empty' : !points.length ? 'quiet' : 'live', range, rangeWords: RANGE_WORDS[range], example: history.example ?? null,
    currency, otherCurrencies: ranked.slice(1).map(r => r[0]),
    points, latest: end ?? null, latestKnown: last ?? null, change, high: edge((a, b) => a > b), low: edge((a, b) => a < b), parts, series,
    recorded: points.length, notOpened: start && end ? dayNumber(end.day) - dayNumber(start.day) + 1 - points.length : 0, unknownDays: points.length - known.length,
    since: all[0]?.day ?? null,
  };
}
/** The foot's time: the newest recorded day ("last recorded Nov 12"). */
export const netWorthHistoryAsOf = (card: NetWorthHistoryCard, day: (at: string) => string): string | null => card.latest ? `last recorded ${day(card.latest.day)}` : null;
/** The widget's table for assistive technology: the same figures as text. */
export function netWorthHistoryRows(card: NetWorthHistoryCard, money: (cents: bigint) => string, change: (c: NetWorthChange) => string, day: (at: string) => string): [string, string][] {
  const rows: [string, string][] = [];
  if (card.latest) rows.push([`Net worth on ${day(card.latest.day)}`, card.latest.cents === null ? `Not known: no value for ${card.latest.missing.join(', ')}` : money(card.latest.cents)]);
  if (card.latest && card.latest.cents === null && card.latestKnown) rows.push([`Last known, ${day(card.latestKnown.day)}`, money(card.latestKnown.cents)]);
  rows.push([`Change over ${card.rangeWords}`, card.change ? change(card.change) : 'Fewer than two days with a known net worth, so no change to state']);
  if (card.high && card.low && card.high.day !== card.low.day) rows.push(['Highest', `${money(card.high.cents)} on ${day(card.high.day)}`], ['Lowest', `${money(card.low.cents)} on ${day(card.low.day)}`]);
  for (const p of card.parts) rows.push([`${p.label}${p.counted ? '' : ', not added'}`, p.cents === null ? 'No value that day' : money(p.cents)]);
  rows.push(['Days recorded', `${card.recorded}${card.notOpened ? `; ${card.notOpened} not opened, shown as gaps` : ''}${card.unknownDays ? `; ${card.unknownDays} without a known value` : ''}`]);
  if (card.otherCurrencies.length) rows.push(['Other currencies', `${card.otherCurrencies.join(', ')}, never converted`]);
  return rows;
}
