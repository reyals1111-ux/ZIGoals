import {addLocalDays} from '../../local-date';
import type {WealthHud} from '../holo/wealth';
import {RANGE_DAYS, RANGE_WORDS, type WidgetRange} from '../stage/record';

/**
 * Session AM (ADR-038; art direction §4, Wealth): the "Net worth" widget's figures, pure. They are the wealth HUD's own
 * (lib/nova/holo/wealth.ts wealthHud over the Wealth page's overview): the tracked wealth of the headline currency, known
 * so far when a holding has no value yet, and that currency's recorded valuations. Currencies are never converted or
 * added together; a holding without a value is "not valued", never 0. The line is the recorded valuations inside the
 * range and ends on today's total, so the change is from the first recorded valuation in the range to today's total (the
 * hero), in exact cents (BigInt); with no valuation before today there is no change to state. Nothing here projects
 * anything. Session AM (design review AM-D13): the widget is titled "Tracked wealth", what it counts — the holdings on
 * Wealth. Accounts and debts are not in it, so it is not called net worth (Wealth's own net worth adds and subtracts them).
 */
export const NET_WORTH_RANGE: WidgetRange = 'quarter';
export type RecordedPoint = {at: string; cents: bigint};
export type NetWorthChange = {cents: bigint; direction: 'up' | 'down' | 'flat'; since: string; /** Percent of the first valuation; null when that was not above zero. */ percent: number | null};
export type NetWorthCard = {
  /** 'empty': nothing is tracked on this device yet. */
  state: 'empty' | 'live';
  range: WidgetRange; rangeWords: string;
  currency: string | null;
  /** The headline currency's known total in cents; null: holdings exist, none has a value yet (not valued, never 0). */
  total: bigint | null;
  /** Some holding has no value yet: the total is what is known so far. */
  knownSoFar: boolean;
  /** Other currencies held, each apart (never converted, never added). */
  otherCurrencies: string[];
  /** The line's points, oldest first: the recorded valuations inside the range and, last, today's total (the hero's figure) when it is known. */
  points: RecordedPoint[];
  /** How many valuations were recorded inside the range (today's total is not one of them). */
  recorded: number;
  change: NetWorthChange | null;
  high: RecordedPoint | null; low: RecordedPoint | null;
  /** The newest recorded valuation of the headline currency (inside the range or not), for the foot. */
  lastAt: string | null;
  /** The line's values by calendar day from the first to the last valuation in the range (major units, for drawing only); a day without a record is a gap. */
  series: (number | null)[];
};
const cents = (value: number) => BigInt(Math.round(value * 100));
const dayOf = (at: string) => /^\d{4}-\d{2}-\d{2}/.test(at) ? at.slice(0, 10) : '';
const daysApart = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export function netWorthCard(hud: Pick<WealthHud, 'primary' | 'otherCurrencies' | 'line' | 'incomplete' | 'missingValue' | 'holdings'>, today: string, range: WidgetRange = NET_WORTH_RANGE): NetWorthCard {
  const from = addLocalDays(today, -RANGE_DAYS[range]);
  const all = hud.line.filter(p => dayOf(p.at) && Number.isFinite(p.value)).map(p => ({at: p.at, cents: cents(p.value)}));
  const recorded = all.filter(p => dayOf(p.at) >= from && dayOf(p.at) <= today);
  // Session AM (design review AM-D13): the line ends on today's total, the hero's own figure, so the hero, the line's last
  // point, the change and every size say one amount. A valuation recorded earlier today gives way to it (the total is the
  // newer reading of the same day); with no known total the line is the recorded valuations alone.
  const total = hud.primary ? hud.primary.value : null;
  const points = total === null ? recorded : [...recorded.filter(p => dayOf(p.at) < today), {at: today, cents: total}];
  const first = points[0], last = points.at(-1);
  const change: NetWorthChange | null = first && last && points.length >= 2 ? (() => {
    const diff = last.cents - first.cents;
    return {cents: diff, direction: diff > 0n ? 'up' as const : diff < 0n ? 'down' as const : 'flat' as const, since: first.at, percent: first.cents > 0n ? Number(diff * 100_000n / first.cents) / 1000 : null};
  })() : null;
  const high = points.reduce<RecordedPoint | null>((best, p) => !best || p.cents > best.cents ? p : best, null);
  const low = points.reduce<RecordedPoint | null>((best, p) => !best || p.cents < best.cents ? p : best, null);
  const series: (number | null)[] = first && last ? Array.from({length: daysApart(dayOf(first.at), dayOf(last.at)) + 1}, () => null) : [];
  // A day with more than one record keeps its last (the points are in time order).
  if (first) for (const p of points) series[daysApart(dayOf(first.at), dayOf(p.at))] = Number(p.cents) / 100;
  return {
    state: hud.holdings > 0 ? 'live' : 'empty', range, rangeWords: RANGE_WORDS[range],
    currency: hud.primary?.currency ?? null, total,
    knownSoFar: hud.incomplete && !!hud.primary, otherCurrencies: [...hud.otherCurrencies],
    points, recorded: recorded.length, change, high, low, lastAt: all.at(-1)?.at ?? null, series,
  };
}

/** The change in words: "+$1,200.00 (+2.4%) since Aug 14"; the sign is written, never left to colour. */
export function changeWords(change: NetWorthChange, money: (cents: bigint) => string, percent: (value: number) => string, day: (at: string) => string): string {
  const size = change.cents < 0n ? -change.cents : change.cents, sign = change.direction === 'up' ? '+' : change.direction === 'down' ? '−' : '';
  if (change.direction === 'flat') return `No change since ${day(change.since)}`;
  return `${sign}${money(size)}${change.percent === null ? '' : ` (${percent(change.percent)})`} since ${day(change.since)}`;
}
/** The foot's time: the newest recorded valuation, and the market prices' time when the total follows them. */
export function netWorthAsOf(lastAt: string | null, prices: {kind: 'market'; at: string} | {kind: 'own' | 'none'} | undefined, day: (at: string) => string, time: (at: string) => string): string {
  const valuation = lastAt ? `last valuation ${day(lastAt)}` : 'no valuation recorded yet';
  return prices?.kind === 'market' ? `${valuation} · market prices as of ${time(prices.at)}` : valuation;
}
/** The widget's table for assistive technology: the same figures as text. */
export function netWorthRows(card: NetWorthCard, money: (cents: bigint) => string, percent: (value: number) => string, day: (at: string) => string): [string, string][] {
  const rows: [string, string][] = [[card.knownSoFar ? 'Tracked wealth, known so far' : 'Tracked wealth', card.total === null ? 'Not valued yet' : money(card.total)]];
  if (card.change) rows.push([`Change over ${card.rangeWords}`, changeWords(card.change, money, percent, day)]);
  else rows.push([`Change over ${card.rangeWords}`, card.recorded >= 1 ? 'One valuation recorded, so no change to state yet' : 'No valuation recorded in this range']);
  if (card.points.length > 1) rows.push(['Recorded valuations', `${card.recorded}, from ${money(card.points[0]!.cents)} on ${day(card.points[0]!.at)} to ${money(card.points.at(-1)!.cents)} on ${day(card.points.at(-1)!.at)}`]);
  if (card.high && card.low && card.points.length > 1) rows.push(['Highest', `${money(card.high.cents)} on ${day(card.high.at)}`], ['Lowest', `${money(card.low.cents)} on ${day(card.low.at)}`]);
  if (card.otherCurrencies.length) rows.push(['Other currencies', `${card.otherCurrencies.join(', ')}, never converted`]);
  return rows;
}
