import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import type {ProviderId} from './providers';
import {AI_USAGE, MAX_USAGE_MONTHS, type AiUsage} from './store/records';

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
export type Tokens = {input: number | null; output: number | null};
/** One route's month: tokens as reported, requests made, and how many of those requests came back without counts. */
export type RouteMonth = {input: number; output: number; requests: number; unreported?: number};
/** The person's local calendar month, "2026-10". */
export const monthKey = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const whole = (n: number | null) => n !== null && Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
/** Adds one reply's tokens (all its requests: a tool loop makes several) to this month; the oldest month goes after 13. */
export function recordUsage(storage: Pick<Storage, 'getItem' | 'setItem'>, route: Route, tokens: Tokens, requests: number, now = new Date()): AiUsage {
  const month = monthKey(now);
  return updateDeviceRecord(storage, AI_USAGE, current => {
    const months = {...(current.months ?? {})}, routes = {...(months[month] ?? {})}, was: RouteMonth = routes[route] ?? {input: 0, output: 0, requests: 0};
    const count = Math.max(1, Math.round(requests)), missing = tokens.input === null && tokens.output === null ? count : 0;
    routes[route] = {...was, input: was.input + whole(tokens.input), output: was.output + whole(tokens.output), requests: was.requests + count, ...(missing || was.unreported ? {unreported: (was.unreported ?? 0) + missing} : {})};
    months[month] = routes;
    const kept = Object.keys(months).sort().slice(-MAX_USAGE_MONTHS);
    return {...current, months: Object.fromEntries(kept.map(m => [m, months[m]!]))};
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
    const amount = (used.input / 1e6) * (input ?? 0) + (used.output / 1e6) * (output ?? 0);
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
export type CapState = {amount: number; cap: number; currency: string; level: 'under' | 'near' | 'reached'; askFirst: boolean};
/** Where this month's estimate stands against the soft cap; null without a cap or without prices in the cap's currency. */
export function capState(usage: AiUsage, month: string): CapState | null {
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
  const where = `${money(state.amount, state.currency)} of your ${money(state.cap, state.currency)} monthly cap, estimated from your prices`;
  return state.level === 'reached' ? `You have reached your monthly cap: ${where}.` : `You are at ${Math.floor((state.amount / state.cap) * 100)} % of your monthly cap: ${where}.`;
}
/** Asks before sending only when the person chose "ask first" and the cap is reached. */
export const needsSpendConfirmation = (state: CapState | null) => !!state && state.askFirst && state.level === 'reached';
