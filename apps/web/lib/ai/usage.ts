import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import type {ProviderId} from './providers';
import {AI_USAGE, MAX_USAGE_DAYS, MAX_USAGE_MONTHS, type AiUsage} from './store/records';
import {PUBLISHED_AS_OF, estimatePublished} from './pricing';

/**
 * The usage meter (Session V Part 6, ADR-014; supersedes ADR-012's "token counts, never money" in part): tokens per
 * route per month, exactly as the provider reported them, on this device only (`zigoals:ai-usage:v1`, in Export, never
 * synced). Money appears only when the person types their own prices per million tokens, and then only as "an estimate
 * from your prices": ZIGoals never fetches, guesses or bills a price. Unknown token counts stay unknown (a request whose
 * counts were not reported is counted as a request, not as zero tokens). A soft monthly cap gives notes at 80 % and
 * 100 %, and asks before sending only when the person chose "ask first". Amounts in different currencies are never
 * added together or converted.
 */
export type Route = ProviderId | 'hosted' | 'on-device';
/** Session Z-Local Part 3: the prompt-cache counts a wire reports beside `input` (absent where a wire has none). */
export type Tokens = {input: number | null; output: number | null; cacheWrite?: number | null; cacheRead?: number | null};
/**
 * One route's month: tokens as reported, requests made, and how many of those requests came back without counts.
 * `cacheWrite` / `cacheRead` (Session Z-Local Part 3) are kept beside `input`, never added into it: on Anthropic the
 * prompt is input + cacheWrite + cacheRead; on OpenAI the cached part is already inside `input`. Older builds read the
 * record as before (the fields are optional and loose).
 */
export type RouteMonth = {input: number; output: number; requests: number; unreported?: number; cacheWrite?: number; cacheRead?: number};
/** The person's local calendar month, "2026-10". */
export const monthKey = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const whole = (n: number | null) => n !== null && Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
/** Adds one reply's tokens (all its requests: a tool loop makes several) to this month; the oldest month goes after 13. */
export function recordUsage(storage: Pick<Storage, 'getItem' | 'setItem'>, route: Route, tokens: Tokens, requests: number, now = new Date()): AiUsage {
  const month = monthKey(now);
  return updateDeviceRecord(storage, AI_USAGE, current => {
    const months = {...(current.months ?? {})}, routes = {...(months[month] ?? {})}, was: RouteMonth = routes[route] ?? {input: 0, output: 0, requests: 0};
    const count = Math.max(1, Math.round(requests)), missing = tokens.input === null && tokens.output === null ? count : 0;
    const cacheWrite = (was.cacheWrite ?? 0) + whole(tokens.cacheWrite ?? null), cacheRead = (was.cacheRead ?? 0) + whole(tokens.cacheRead ?? null);
    routes[route] = {...was, input: was.input + whole(tokens.input), output: was.output + whole(tokens.output), requests: was.requests + count, ...(missing || was.unreported ? {unreported: (was.unreported ?? 0) + missing} : {}), ...(cacheWrite ? {cacheWrite} : {}), ...(cacheRead ? {cacheRead} : {})};
    months[month] = routes;
    const kept = Object.keys(months).sort().slice(-MAX_USAGE_MONTHS);
    // Session AK (NOVA cost meter): per local day too, only once the person set a daily cap (nothing new is kept before).
    const days = current.dailyCap ? countDay(current.days ?? {}, dayKey(now), route, tokens, count) : current.days;
    return {...current, months: Object.fromEntries(kept.map(m => [m, months[m]!])), ...(days ? {days} : {})};
  });
}
export const readUsage = (storage: Pick<Storage, 'getItem'>) => readDeviceRecord(storage, AI_USAGE);
export type Estimate = {amounts: {currency: string; amount: number}[]; unpriced: string[]};
/** This month's estimate from the person's own prices: one amount per currency, and the routes that have no price. */
export function estimate(usage: AiUsage, month: string): Estimate {
  const totals = new Map<string, number>(), unpriced: string[] = [];
  for (const [route, used] of Object.entries(usage.months?.[month] ?? {})) {
    const price = usage.prices?.[route as ProviderId];
    const input = price?.input !== undefined ? Number(price.input) : null, output = price?.output !== undefined ? Number(price.output) : null;
    if (!price || (input === null && output === null)) { if (used.input || used.output) unpriced.push(route); continue; }
    // Session Z-Local Part 3 (ADR-020 L9): cached prompt tokens are counted at the person's input price, a ceiling (a
    // cache read costs the provider less); the exact figure from the published table is the ledger's, never the app's.
    const amount = ((used.input + (used.cacheWrite ?? 0) + (used.cacheRead ?? 0)) / 1e6) * (input ?? 0) + (used.output / 1e6) * (output ?? 0);
    if ((input === null && used.input) || (output === null && used.output)) unpriced.push(route);
    totals.set(price.currency, (totals.get(price.currency) ?? 0) + amount);
  }
  return {amounts: [...totals].map(([currency, amount]) => ({currency, amount})), unpriced};
}
/** "about 1.24 USD", or "under 0.01 USD"; an estimate, never a bill. */
export function money(amount: number, currency: string): string {
  if (amount > 0 && amount < 0.01) return `under 0.01 ${currency}`;
  return `${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency}`;
}
export type CapState = {amount: number; cap: number; currency: string; level: 'under' | 'near' | 'reached'; askFirst: boolean;
  /** Session AK (NOVA cost meter): 'day' when the daily cap is the one that stands out; absent for the monthly cap. */
  period?: 'day'};
const LEVEL_RANK = {under: 0, near: 1, reached: 2} as const;
/**
 * Where this month's estimate stands against the soft cap; null without a cap or without prices in the cap's currency.
 * Session AK (NOVA cost meter): with a daily cap set, today's estimate (cloud routes) is checked too and the stronger of
 * the two is returned (the monthly one on a tie), so the chat's existing note and "ask first" follow the daily cap
 * without a second path. Without a daily cap, exactly as before.
 */
export function capState(usage: AiUsage, month: string, now = new Date()): CapState | null {
  const monthly = monthlyCapState(usage, month), daily = dailyCapState(usage, dayKey(now));
  if (!daily) return monthly;
  if (!monthly) return daily.level === 'under' ? null : daily;
  return LEVEL_RANK[daily.level] > LEVEL_RANK[monthly.level] ? daily : monthly;
}
function monthlyCapState(usage: AiUsage, month: string): CapState | null {
  const cap = usage.softCap; if (!cap) return null;
  const limit = Number(cap.amount); if (!(limit > 0)) return null;
  const spent = estimate(usage, month).amounts.find(a => a.currency === cap.currency);
  if (!spent) return null;
  const ratio = spent.amount / limit;
  return {amount: spent.amount, cap: limit, currency: cap.currency, level: ratio >= 1 ? 'reached' : ratio >= 0.8 ? 'near' : 'under', askFirst: !!usage.askFirst};
}
/** The plain note for the chat and Settings, or null below 80 %. Never urgent, never a nudge to spend or to stop. */
export function capNote(state: CapState | null): string | null {
  if (!state || state.level === 'under') return null;
  if (state.period === 'day') {
    const where = `${money(state.amount, state.currency)} of your ${money(state.cap, state.currency)} daily cap, estimated from your prices`;
    return state.level === 'reached' ? `You have reached your daily cap: ${where}.` : `You are at ${Math.floor((state.amount / state.cap) * 100)} % of your daily cap: ${where}.`;
  }
  const where = `${money(state.amount, state.currency)} of your ${money(state.cap, state.currency)} monthly cap, estimated from your prices`;
  return state.level === 'reached' ? `You have reached your monthly cap: ${where}.` : `You are at ${Math.floor((state.amount / state.cap) * 100)} % of your monthly cap: ${where}.`;
}
/** Asks before sending only when the person chose "ask first" and the cap is reached. */
export const needsSpendConfirmation = (state: CapState | null) => !!state && state.askFirst && state.level === 'reached';

/**
 * Session AK (NOVA cost meter, owner follow-up 2 N2): the local calendar day, "2026-11-01", for the per-day counts.
 * A local model and Chrome's on-device model cost nothing here ("free, on your device"); every other route is a cloud one.
 */
export const dayKey = (now: Date) => `${monthKey(now)}-${String(now.getDate()).padStart(2, '0')}`;
export const FREE_ROUTES: readonly string[] = ['local', 'on-device'];
export const isFreeRoute = (route: string) => FREE_ROUTES.includes(route);
type DayCounts = NonNullable<AiUsage['days']>;
function countDay(days: DayCounts, day: string, route: Route, tokens: Tokens, requests: number): DayCounts {
  const next = {...days}, routes = {...(next[day] ?? {})}, was = routes[route] ?? {input: 0, output: 0, requests: 0};
  routes[route] = {...was, input: was.input + whole(tokens.input) + whole(tokens.cacheWrite ?? null) + whole(tokens.cacheRead ?? null), output: was.output + whole(tokens.output), requests: was.requests + requests};
  next[day] = routes;
  return Object.fromEntries(Object.keys(next).sort().slice(-MAX_USAGE_DAYS).map(d => [d, next[d]!]));
}
/** Today's estimate in one currency from the person's own prices, cloud routes only (prompt tokens counted at the input price, a ceiling). */
export function dayEstimate(usage: AiUsage, day: string, currency: string): {amount: number; unpriced: string[]} {
  let amount = 0; const unpriced: string[] = [];
  for (const [route, used] of Object.entries(usage.days?.[day] ?? {})) {
    if (isFreeRoute(route)) continue;
    const price = usage.prices?.[route as ProviderId];
    if (!price || price.currency !== currency || (price.input === undefined && price.output === undefined)) { if (used.input || used.output) unpriced.push(route); continue; }
    amount += (used.input / 1e6) * Number(price.input ?? 0) + (used.output / 1e6) * Number(price.output ?? 0);
  }
  return {amount, unpriced};
}
/** The daily cap against today's estimate; null without a daily cap. */
export function dailyCapState(usage: AiUsage, day: string): CapState | null {
  const cap = usage.dailyCap; if (!cap) return null;
  const limit = Number(cap.amount); if (!(limit > 0)) return null;
  const {amount} = dayEstimate(usage, day, cap.currency), ratio = amount / limit;
  return {amount, cap: limit, currency: cap.currency, level: ratio >= 1 ? 'reached' : ratio >= 0.8 ? 'near' : 'under', askFirst: cap.mode === 'ask', period: 'day'};
}
/**
 * One row of the cost meter per route this month: tokens as reported, today's tokens while per-day counting is on, and an
 * estimate labelled with where its price came from — the person's own prices first; else, for a model in the published
 * table (pricing.ts `PUBLISHED_PRICES`, dated), that table; else none: "price unknown", never zero. A local or on-device route is free. Never a bill.
 */
export type CostRow = {
  route: string; free: boolean; month: RouteMonth; today: {input: number; output: number; requests: number} | null;
  estimate: {amount: number; currency: string; basis: 'your-prices' | 'published'; asOf?: string} | null;
};
export function costRows(usage: AiUsage, month: string, day: string, models: Partial<Record<string, string | null>> = {}): CostRow[] {
  return Object.entries(usage.months?.[month] ?? {}).map(([route, used]) => {
    const free = isFreeRoute(route), today = usage.days?.[day]?.[route] ?? null;
    if (free) return {route, free, month: used, today, estimate: null};
    const price = usage.prices?.[route as ProviderId];
    if (price && (price.input !== undefined || price.output !== undefined)) {
      const amount = ((used.input + (used.cacheWrite ?? 0) + (used.cacheRead ?? 0)) / 1e6) * Number(price.input ?? 0) + (used.output / 1e6) * Number(price.output ?? 0);
      return {route, free, month: used, today, estimate: {amount, currency: price.currency, basis: 'your-prices' as const}};
    }
    const model = models[route] ?? null, published = model ? estimatePublished(route, model, {input: used.input, output: used.output, cacheWrite: used.cacheWrite ?? 0, cacheRead: used.cacheRead ?? 0}, day) : null;
    return {route, free, month: used, today, estimate: published !== null ? {amount: published, currency: 'USD', basis: 'published' as const, asOf: PUBLISHED_AS_OF} : null};
  }).sort((a, b) => Number(a.free) - Number(b.free) || a.route.localeCompare(b.route));
}
