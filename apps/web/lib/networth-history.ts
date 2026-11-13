import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';
import {balanceOn, moneyText, netWorth} from './accounts/net-worth';
import type {Accounts} from './accounts/schema';
import {coinKey, type PortfolioCurrency, type PortfolioData} from './portfolio/schema';
import {holdings, HoldingsBelowZero, PortfolioDecimal} from './portfolio/math';
import {nameOf, type WalletNames} from './staking/tracked-wallets';

/**
 * Session AO (Part 5, backlog #11; ADR-039 owner rule 2; TIER 3 (stored format), additive): net-worth history by source.
 * `zigoals:networth-history:v1`, a new device record (exported, restored, in the protected copy, erased; never synced:
 * the encrypted extras sections would need a Worker change, so it stays on this device).
 *
 * The owner's rules, as built:
 * - A day is recorded only when the app is opened (Wealth, with its records loaded): one entry per local day, the day's
 *   latest snapshot replacing an earlier one of the same day. Days not opened are never filled in; they stay gaps.
 *   A snapshot is never written for a day before the last one recorded (a clock set back).
 * - An unknown price stays unknown: a series whose items are not all valued has `value: null` and names the items without
 *   a value in `missing` (never "0"). A source with nothing tracked is left out of the day.
 * - Each series is one source in one currency, with its own as-of time (the oldest price or balance it rests on);
 *   currencies are never converted or added together. Amounts are decimal strings, never floats.
 * - The Showcase's example history lives in the Showcase tab's own storage (lib/showcase-data.ts) and carries `example`;
 *   the recorder never runs in the Showcase, and a record marked `example` found outside it (a Showcase file restored)
 *   is never added to: the first real snapshot starts a new, unlabelled record in its place.
 * - At most 1,100 days (about three years): the oldest fall off.
 */
export const NETWORTH_HISTORY_KEY = 'zigoals:networth-history:v1';
export const NETWORTH_HISTORY_MAX_DAYS = 1100;
export const NETWORTH_SOURCES = ['wealth', 'accounts', 'portfolio', 'wallets'] as const;
export type NetworthSource = typeof NETWORTH_SOURCES[number];
export const SOURCE_LABELS: Record<NetworthSource, string> = {wealth: 'Wealth holdings', accounts: 'Accounts and debts', portfolio: 'Portfolio', wallets: 'Tracked wallets'};

const decimal = z.string().regex(/^-?(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/).refine(v => v !== '-0' && !/^-0\.0*$/.test(v), 'No negative zero.');
const currency = z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/);
const asOf = z.union([z.iso.datetime({offset: true}), z.iso.date()]).nullable();
export const seriesSchema = z.looseObject({
  source: z.enum(NETWORTH_SOURCES),
  currency,
  /** The source's total in this currency, or null when an item in it has no value (named in `missing`). */
  value: decimal.nullable(),
  /** The oldest price time or balance date this figure rests on; null when none is known. */
  asOf,
  missing: z.array(z.string().trim().min(1).max(120)).min(1).max(200).optional(),
}).refine(s => s.value === null ? !!s.missing?.length : !s.missing, 'An unknown value names what had no value; a known one names nothing.');
export type NetworthSeries = z.infer<typeof seriesSchema>;
export const daySchema = z.looseObject({
  day: z.iso.date(),
  at: z.iso.datetime({offset: true}),
  sources: z.array(seriesSchema).min(1).max(200),
}).refine(d => new Set(d.sources.map(s => `${s.source}:${s.currency}`)).size === d.sources.length, 'One series per source and currency.');
export type NetworthDay = z.infer<typeof daySchema>;
/**
 * Days are read in day order, one per day; more than the cap (a restore's Merge of two long histories) keeps the latest
 * 1,100. Two entries for one day are refused: a record this app writes never holds them.
 */
export const networthHistorySchema = z.looseObject({
  version: z.literal(1),
  days: z.array(daySchema).max(NETWORTH_HISTORY_MAX_DAYS * 2),
  /** Set only on the Showcase's example history: its label. */
  example: z.string().trim().min(1).max(120).optional(),
}).refine(r => new Set(r.days.map(d => d.day)).size === r.days.length, 'One entry per day.')
  .transform(r => ({...r, days: [...r.days].sort((a, b) => a.day.localeCompare(b.day)).slice(-NETWORTH_HISTORY_MAX_DAYS)}));
export type NetworthHistory = z.infer<typeof networthHistorySchema>;
export const emptyNetworthHistory = (): NetworthHistory => ({version: 1, days: []});
export const NETWORTH_HISTORY: DeviceRecordSpec<NetworthHistory> = {key: NETWORTH_HISTORY_KEY, schema: networthHistorySchema, empty: emptyNetworthHistory};

/** One Wealth row as lib/wealth.ts wealthOverview gives it (value in cents of `currency`). */
export type WealthRowInput = {position: {providerId: string; sourceType: string; network: string; account: string; quoteCurrency?: string}; currency?: string; value?: bigint; valuedAt?: string};
export type SnapshotInput = {
  day: string; at: string;
  /** wealthOverview(...).rows: archived holdings are already left out. */
  wealthRows?: readonly WealthRowInput[];
  accounts?: Accounts;
  /** Real portfolios are counted; hypothetical ones are not money held. */
  portfolios?: PortfolioData;
  /** A coin's price in a portfolio currency, from the prices this page already holds; undefined when unknown. */
  portfolioPrice?: (coinKey: string, currency: PortfolioCurrency) => {value: string; at?: string} | undefined;
  walletNames?: WalletNames;
};

const OBSERVED = 'native-zig';
const rowName = (r: WealthRowInput) => r.position.providerId === OBSERVED ? `ZIG ${r.position.sourceType.replaceAll('_', ' ').toLowerCase()}` : r.position.providerId;
const shortAddress = (a: string) => a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a;
const oldest = (times: readonly string[]): string | null => times.length ? [...times].sort((a, b) => (Date.parse(a) || 0) - (Date.parse(b) || 0))[0]! : null;
const unique = (names: readonly string[]) => [...new Set(names.map(n => n.trim().slice(0, 120)).filter(Boolean))].slice(0, 200);
const cents = (v: bigint) => moneyText({value: v, decimals: 2});

/** Wealth rows by currency: a row without a value counts in the currency Wealth would price it in (its quote currency). */
function rowSeries(source: NetworthSource, rows: readonly WealthRowInput[], name: (r: WealthRowInput) => string): NetworthSeries[] {
  const by = new Map<string, WealthRowInput[]>();
  for (const r of rows) { const c = r.currency ?? r.position.quoteCurrency ?? 'USD'; by.set(c, [...by.get(c) ?? [], r]); }
  return [...by].map(([c, members]): NetworthSeries => {
    const missing = unique(members.filter(r => r.value === undefined || r.currency === undefined).map(name));
    const times = members.flatMap(r => r.valuedAt ? [r.valuedAt] : []);
    return missing.length ? {source, currency: c, value: null, asOf: oldest(times), missing} : {source, currency: c, value: cents(members.reduce((n, r) => n + r.value!, 0n)), asOf: oldest(times)};
  });
}

/**
 * A day's entry from the figures Wealth already works out: Wealth's holdings (overview.subtotals' rows), the accounts' net
 * worth (assets minus debts, lib/accounts/net-worth.ts), the real portfolios valued at the prices held, and the tracked
 * wallets (their observed positions, a part of Wealth's holdings shown on their own). Null when nothing is tracked.
 */
export function snapshotOf(input: SnapshotInput): NetworthDay | null {
  const sources: NetworthSeries[] = [];
  const rows = input.wealthRows ?? [];
  sources.push(...rowSeries('wealth', rows, rowName));
  if (input.accounts) {
    const live = input.accounts.items.filter(a => !a.archivedAt);
    for (const row of netWorth({...input.accounts, items: live}, input.day, []).rows) {
      const members = live.filter(a => a.currency === row.currency), missing = unique(members.filter(a => !balanceOn(a, input.day)).map(a => a.name));
      const dates = members.flatMap(a => { const b = balanceOn(a, input.day); return b ? [b.date] : []; }).sort();
      sources.push(missing.length ? {source: 'accounts', currency: row.currency, value: null, asOf: dates[0] ?? null, missing} : {source: 'accounts', currency: row.currency, value: moneyText(row.net), asOf: dates[0] ?? null});
    }
  }
  if (input.portfolios) {
    const by = new Map<PortfolioCurrency, {total: InstanceType<typeof PortfolioDecimal>; missing: string[]; times: string[]; held: number}>();
    for (const p of input.portfolios.portfolios) {
      if (p.kind !== 'real') continue;
      const acc = by.get(p.currency) ?? {total: new PortfolioDecimal(0), missing: [], times: [], held: 0};
      let held;
      try { held = [...holdings(p).values()].filter(h => !new PortfolioDecimal(h.quantity).isZero()); }
      catch (error) { if (!(error instanceof HoldingsBelowZero)) throw error; acc.missing.push(p.name); acc.held++; by.set(p.currency, acc); continue; }
      for (const h of held) {
        acc.held++;
        const price = input.portfolioPrice?.(h.coin, p.currency), coin = p.coins.find(c => coinKey(c.ref) === h.coin);
        if (!price) { acc.missing.push(`${coin?.symbol ?? h.coin} (${p.name})`); continue; }
        acc.total = acc.total.plus(new PortfolioDecimal(h.quantity).times(price.value));
        if (price.at) acc.times.push(price.at);
      }
      by.set(p.currency, acc);
    }
    for (const [c, acc] of by) {
      if (!acc.held) continue;
      const missing = unique(acc.missing), value = acc.total.toDecimalPlaces(2, PortfolioDecimal.ROUND_HALF_EVEN).toFixed(2);
      sources.push(missing.length ? {source: 'portfolio', currency: c, value: null, asOf: oldest(acc.times), missing} : {source: 'portfolio', currency: c, value, asOf: oldest(acc.times)});
    }
  }
  const wallets = rows.filter(r => r.position.providerId === OBSERVED);
  const walletName = (r: WealthRowInput) => { const named = input.walletNames ? nameOf(input.walletNames, r.position.network, r.position.account) : ''; return `${rowName(r)} · ${named || shortAddress(r.position.account)}`; };
  sources.push(...rowSeries('wallets', wallets, walletName));
  if (!sources.length) return null;
  const order = (s: NetworthSeries) => NETWORTH_SOURCES.indexOf(s.source);
  return daySchema.parse({day: input.day, at: input.at, sources: sources.sort((a, b) => order(a) - order(b) || a.currency.localeCompare(b.currency))});
}

const sameSources = (a: NetworthDay, b: NetworthDay) => JSON.stringify(a.sources) === JSON.stringify(b.sources);
/**
 * Records a day's snapshot: it replaces that day's earlier one, or is added after the last day. Unchanged (the same
 * record back) when it equals what that day already holds, when it is for a day before the last one recorded (never a
 * past day). A Showcase example is never mixed with a real day: the real snapshot starts a new record instead. The oldest
 * days fall off past the cap.
 */
export function withSnapshot(history: NetworthHistory, entry: NetworthDay): NetworthHistory {
  if (history.example) return {version: 1, days: [daySchema.parse(entry)]};
  const last = history.days.at(-1);
  if (last && entry.day < last.day) return history;
  if (last && entry.day === last.day && sameSources(last, entry)) return history;
  const days = [...history.days.filter(d => d.day !== entry.day), daySchema.parse(entry)];
  return {...history, days: days.slice(-NETWORTH_HISTORY_MAX_DAYS)};
}

/** Whether recording `entry` would change the record (so a page writes nothing when it would not). */
export const wouldRecord = (history: NetworthHistory, entry: NetworthDay) => withSnapshot(history, entry) !== history;

export type SeriesPoint = {day: string; value: string | null; asOf: string | null; missing?: string[]};
export type SeriesLine = {source: NetworthSource; currency: string; points: SeriesPoint[]};
/** Each source and currency on its own, oldest day first: only the days recorded (a day not recorded is no point). */
export function seriesLines(history: NetworthHistory): SeriesLine[] {
  const by = new Map<string, SeriesLine>();
  for (const d of history.days) for (const s of d.sources) {
    const k = `${s.source}:${s.currency}`;
    let line = by.get(k);
    if (!line) by.set(k, line = {source: s.source, currency: s.currency, points: []});
    line.points.push({day: d.day, value: s.value, asOf: s.asOf, ...(s.missing ? {missing: s.missing} : {})});
  }
  const order = (l: SeriesLine) => NETWORTH_SOURCES.indexOf(l.source);
  return [...by.values()].sort((a, b) => order(a) - order(b) || a.currency.localeCompare(b.currency));
}

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
/**
 * Runs of consecutive recorded days with a known value, for drawing: a line joins two points only when they are on
 * neighbouring calendar days and both are known, so a day not recorded, or a day without a value, is always a gap.
 */
export function drawnRuns(points: readonly SeriesPoint[]): SeriesPoint[][] {
  const runs: SeriesPoint[][] = [];
  let run: SeriesPoint[] = [];
  for (const p of points) {
    const prev = run.at(-1);
    if (p.value === null) { if (run.length) runs.push(run); run = []; continue; }
    if (prev && dayNumber(p.day) - dayNumber(prev.day) !== 1) { runs.push(run); run = []; }
    run.push(p);
  }
  if (run.length) runs.push(run);
  return runs;
}
/** Calendar days between the first and the last recorded day that were not recorded. */
export function gapDays(history: NetworthHistory): number {
  const first = history.days[0], last = history.days.at(-1);
  return first && last ? dayNumber(last.day) - dayNumber(first.day) + 1 - history.days.length : 0;
}
