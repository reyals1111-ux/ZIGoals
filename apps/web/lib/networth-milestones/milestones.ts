import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {Money} from '../accounts/net-worth';

/**
 * Session AK (F5a, item 3): net-worth milestones with a calm, one-time celebration. Off by default. The person turns it
 * on, picks the currency (net worth is per currency, never converted) and the round amounts that mean something to them,
 * or the usual round numbers. The amounts the tracked net worth (THE net worth, lib/accounts/net-worth.ts
 * `netWorthTotal`) has already passed when it is turned on, or when an amount is added, are remembered quietly, never
 * celebrated. From then on, the first time it passes an amount, that is remembered with the day and celebrated once.
 * Passing it again after a dip is not a second celebration. Nothing here is advice; nothing moves money.
 *
 * A NEW device-only key `zigoals:networth-milestones:v1`, loose and versioned, every field optional or defaulted, bounded.
 */
export const NETWORTH_MILESTONES_KEY = 'zigoals:networth-milestones:v1';
export const MAX_AMOUNTS = 20, MAX_REACHED = 300, MAX_AMOUNT = 1_000_000_000_000n;
/** The usual round numbers, used only when the person ticks "Use the usual round numbers" (off by default). */
export const DEFAULT_MILESTONES: readonly string[] = ['0', '1000', '5000', '10000', '25000', '50000', '100000', '250000', '500000', '1000000'];
const whole = z.string().regex(/^(0|[1-9]\d{0,12})$/);
const currency = z.string().regex(/^[A-Z]{3}$/);
export const reachedSchema = z.looseObject({
  currency, amount: whole,
  /** The day it was first seen passed. */
  on: z.iso.date(),
  /** Already passed when turned on or added: remembered, never celebrated. */
  quiet: z.boolean().optional(),
  /** When the celebration was seen (Thanks). */
  shownAt: z.iso.datetime().optional(),
});
export type Reached = z.infer<typeof reachedSchema>;
export const networthMilestonesSchema = z.looseObject({
  version: z.literal(1),
  enabled: z.boolean().default(false),
  currency: currency.optional(),
  amounts: z.array(whole).max(MAX_AMOUNTS).optional(),
  useDefaults: z.boolean().optional(),
  reached: z.array(reachedSchema).max(MAX_REACHED).optional(),
  note: z.string().max(200).optional(),
});
export type NetworthMilestones = z.infer<typeof networthMilestonesSchema>;
export const emptyNetworthMilestones = (): NetworthMilestones => ({version: 1, enabled: false});
export const NETWORTH_MILESTONES: DeviceRecordSpec<NetworthMilestones> = {key: NETWORTH_MILESTONES_KEY, schema: networthMilestonesSchema, empty: emptyNetworthMilestones};

/** Net worth per currency, as Wealth shows it. */
export type NetRow = {currency: string; net: Money};
/** Whole units typed ("25,000", "25 000", "25000") → canonical text, or null. */
export function parseMilestone(text: string): string | null {
  const t = text.trim().replace(/[\s,'’_]/g, '');
  if (!/^\d{1,13}$/.test(t)) return null;
  const v = BigInt(t);
  return v <= MAX_AMOUNT ? v.toString() : null;
}
/** The amounts in play, smallest first, without repeats. */
export function milestoneAmounts(r: NetworthMilestones): string[] {
  const all = new Set([...(r.amounts ?? []), ...(r.useDefaults ? DEFAULT_MILESTONES : [])]);
  return [...all].sort((a, b) => { const x = BigInt(a), y = BigInt(b); return x < y ? -1 : x > y ? 1 : 0; });
}
const passed = (net: Money, amount: string) => net.value >= BigInt(amount) * 10n ** BigInt(net.decimals);
const netFor = (rows: readonly NetRow[], c?: string) => c ? rows.find(r => r.currency === c)?.net : undefined;
const isReached = (r: NetworthMilestones, c: string, amount: string) => (r.reached ?? []).some(x => x.currency === c && x.amount === amount);
/** Everything already passed, remembered quietly (on turning on, a currency change or a new amount). */
export function rememberQuietly(r: NetworthMilestones, rows: readonly NetRow[], today: string): NetworthMilestones {
  const net = netFor(rows, r.currency); if (!net || !r.currency) return r;
  const add = milestoneAmounts(r).filter(a => passed(net, a) && !isReached(r, r.currency!, a)).map(a => ({currency: r.currency!, amount: a, on: today, quiet: true}));
  return add.length ? {...r, reached: [...(r.reached ?? []), ...add].slice(-MAX_REACHED)} : r;
}
/** Turns it on for a currency, remembering what is already passed. Throws when that currency has no net worth yet. */
export function turnOn(r: NetworthMilestones, currency: string, rows: readonly NetRow[], today: string): NetworthMilestones {
  if (!netFor(rows, currency)) throw Error(`There is no net worth in ${currency} yet. Add an account with a balance in ${currency} first.`);
  return networthMilestonesSchema.parse(rememberQuietly({...r, enabled: true, currency}, rows, today));
}
export const turnOff = (r: NetworthMilestones): NetworthMilestones => ({...r, enabled: false});
export function addAmount(r: NetworthMilestones, text: string, rows: readonly NetRow[], today: string): NetworthMilestones {
  const amount = parseMilestone(text);
  if (amount === null) throw Error('Enter a whole amount, for example 25000.');
  if ((r.amounts ?? []).includes(amount)) return r;
  if ((r.amounts ?? []).length >= MAX_AMOUNTS) throw Error(`Up to ${MAX_AMOUNTS} milestones.`);
  return networthMilestonesSchema.parse(rememberQuietly({...r, amounts: [...(r.amounts ?? []), amount]}, rows, today));
}
export const removeAmount = (r: NetworthMilestones, amount: string): NetworthMilestones => ({...r, amounts: (r.amounts ?? []).filter(a => a !== amount)});
export function setDefaults(r: NetworthMilestones, on: boolean, rows: readonly NetRow[], today: string): NetworthMilestones {
  return networthMilestonesSchema.parse(on ? rememberQuietly({...r, useDefaults: true}, rows, today) : {...r, useDefaults: false});
}
/**
 * On a look at Wealth: the amounts first passed since the last look. Only the highest one celebrates; any lower ones
 * passed at the same time are remembered quietly (one calm moment, not a queue). Returns the record unchanged (the same
 * object) when nothing is new, so the caller writes only when something is.
 */
export function checkCrossings(r: NetworthMilestones, rows: readonly NetRow[], today: string): NetworthMilestones {
  if (!r.enabled || !r.currency) return r;
  const net = netFor(rows, r.currency); if (!net) return r;
  const fresh = milestoneAmounts(r).filter(a => passed(net, a) && !isReached(r, r.currency!, a));
  if (!fresh.length) return r;
  const top = fresh.at(-1)!;
  return {...r, reached: [...(r.reached ?? []), ...fresh.map(a => ({currency: r.currency!, amount: a, on: today, ...(a === top ? {} : {quiet: true})}))].slice(-MAX_REACHED)};
}
/** The celebration waiting to be seen, if any (in the chosen currency). */
export const pendingCelebration = (r: NetworthMilestones): Reached | null => r.enabled ? (r.reached ?? []).find(x => x.currency === r.currency && !x.quiet && !x.shownAt) ?? null : null;
export const markShown = (r: NetworthMilestones, x: Pick<Reached, 'currency' | 'amount'>, at: string): NetworthMilestones => ({...r, reached: (r.reached ?? []).map(y => y.currency === x.currency && y.amount === x.amount ? {...y, shownAt: at} : y)});
/** The next amount ahead of today's net worth, or null. */
export function nextMilestone(r: NetworthMilestones, rows: readonly NetRow[]): string | null {
  const net = netFor(rows, r.currency); if (!net) return null;
  return milestoneAmounts(r).find(a => !passed(net, a)) ?? null;
}
