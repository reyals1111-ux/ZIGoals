import * as z from 'zod';
import {accountsSchema, type Account, type Accounts} from '../accounts/schema';
import {milestoneDatesSchema, type MilestoneDates} from '../goals/milestone-dates';
import {platformSchema, type Platform} from '../positions';
import {recordDigest} from './sync-homes';

/**
 * Session AB-Cloud Part 1 ([TIER 3] (data formats / sync), ADR-023 C6; docs/product/SYNC_HOMES.md "The finance-homes
 * switch"): accounts and debts (`zigoals:accounts:v1`) and milestone target dates (`zigoals:milestone-dates:v1`) get
 * their synced homes in finance v5 (`accounts`, a milestone's `targetDate`), read since Session W (#32).
 *
 * Unlike Session P's homes, the device keys stay what every page reads and writes (Wealth, a Goal's milestones, ZIGi),
 * and they are kept in step with finance in both directions by a three-way reconcile against the last state both held
 * (the marker below, on this device only):
 * - only the device key changed since → finance takes it (and becomes v5 when it first holds an account or a date);
 * - only finance changed since (another device, through sync) → the device key takes it;
 * - both changed → an account settles by its later `updatedAt` (equal: a fixed order of the two texts, so two devices
 *   agree); an account edited on one side and removed on the other is kept (an edit beats a removal, nothing is lost);
 *   a date both sides changed settles by the later date (the same on every device).
 * A rollback to #32–#39 therefore finds the device keys current; what such a build edits there is a device-side change
 * the next reconcile carries into finance. Finance is never lowered from v5, and nothing is ever written below it.
 */
export const FINANCE_HOMES_KEY = 'zigoals:finance-homes:v1';
const digest = z.string().regex(/^[0-9a-f]{8}$/);
export const financeHomesMarkerSchema = z.strictObject({
  version: z.literal(1),
  /** Each account's digest as both sides last held it. */
  accounts: z.record(z.string().max(250), digest),
  /** Each milestone date ("goalId/milestoneId") as both sides last held it. */
  dates: z.record(z.string().max(340), z.iso.date()),
});
export type FinanceHomesMarker = z.infer<typeof financeHomesMarkerSchema>;
export const emptyFinanceHomesMarker = (): FinanceHomesMarker => ({version: 1, accounts: {}, dates: {}});

type V5 = Extract<Platform, {schemaVersion: 5}>;
const isV5 = (p: Platform): p is V5 => p.schemaVersion === 5;
/** Accounts and debts as finance holds them (none below v5). */
export const accountsIn = (platform: Platform): Account[] => isV5(platform) ? platform.accounts?.items ?? [] : [];
const dateKey = (goalId: string, milestoneId: string) => `${goalId}/${milestoneId}`;
/** Every milestone target date finance holds, by "goalId/milestoneId". */
export function datesIn(platform: Platform): Map<string, string> {
  const out = new Map<string, string>();
  if (!isV5(platform)) return out;
  for (const goal of platform.goals) for (const m of goal.milestones) if (m.targetDate) out.set(dateKey(goal.id, m.id), m.targetDate);
  return out;
}
/** The milestones finance holds, so a date is only ever placed on a milestone that exists. */
function milestoneKeys(platform: Platform): Set<string> {
  return new Set(platform.goals.flatMap(goal => goal.milestones.map(m => dateKey(goal.id, m.id))));
}

/** One three-way choice. `undefined` is "not held". */
function choose<T>(device: T | undefined, finance: T | undefined, base: string | undefined, digestOf: (v: T) => string, settle: (d: T, f: T) => T): T | undefined {
  const dd = device === undefined ? undefined : digestOf(device), fd = finance === undefined ? undefined : digestOf(finance);
  if (dd === fd) return device;
  if (fd === base) return device; // only the device changed (or the record is new here)
  if (dd === base) return finance; // only finance changed
  if (device === undefined) return finance; // removed here, edited there: the edit is kept
  if (finance === undefined) return device;
  return settle(device, finance);
}
const laterAccount = (d: Account, f: Account): Account => d.updatedAt !== f.updatedAt ? (d.updatedAt > f.updatedAt ? d : f) : (JSON.stringify(d) >= JSON.stringify(f) ? d : f);
const laterDate = (d: string, f: string) => d >= f ? d : f;

export type DeviceHomes = {
  /** The device key's record; null when the key holds unreadable bytes (then it is left alone, on both sides). */
  accounts: Accounts | null;
  dates: MilestoneDates | null;
};
export type Reconciled = {platform: Platform; accounts?: Accounts; dates?: MilestoneDates; marker: FinanceHomesMarker; changed: boolean};

/**
 * The reconcile. Returns the same platform object when finance does not change, `accounts`/`dates` only when the device
 * key must change, and the marker both sides now share.
 */
export function reconcileFinanceHomes(platform: Platform, device: DeviceHomes, marker: FinanceHomesMarker): Reconciled {
  const nextMarker: FinanceHomesMarker = {version: 1, accounts: {...marker.accounts}, dates: {...marker.dates}};
  let platformNext = platform, deviceAccounts: Accounts | undefined, deviceDates: MilestoneDates | undefined;

  if (device.accounts) {
    const deviceById = new Map(device.accounts.items.map(a => [a.id, a] as const));
    const financeById = new Map(accountsIn(platform).map(a => [a.id, a] as const));
    const ids = [...new Set([...deviceById.keys(), ...financeById.keys(), ...Object.keys(marker.accounts)])];
    const result: Account[] = [];
    for (const id of ids) {
      const chosen = choose(deviceById.get(id), financeById.get(id), marker.accounts[id], recordDigest, laterAccount);
      if (chosen) { result.push(chosen); nextMarker.accounts[id] = recordDigest(chosen); } else delete nextMarker.accounts[id];
    }
    const next = accountsSchema.parse({version: 1, items: result});
    if (recordDigest(next.items) !== recordDigest(device.accounts.items)) deviceAccounts = {...device.accounts, items: next.items};
    platformNext = withAccounts(platformNext, next);
  }

  if (device.dates) {
    const held = new Map<string, string>();
    for (const [goalId, goal] of Object.entries(device.dates.dates)) for (const [mId, date] of Object.entries(goal)) held.set(dateKey(goalId, mId), date);
    const finance = datesIn(platformNext), exists = milestoneKeys(platformNext);
    const keys = [...new Set([...held.keys(), ...finance.keys(), ...Object.keys(marker.dates)])];
    const result = new Map<string, string>();
    for (const key of keys) {
      // A date for a milestone finance does not hold (yet) stays on this device as it is, outside the reconcile.
      if (!exists.has(key)) { const d = held.get(key); if (d) result.set(key, d); delete nextMarker.dates[key]; continue; }
      const chosen = choose(held.get(key), finance.get(key), marker.dates[key], v => v, laterDate);
      if (chosen) { result.set(key, chosen); nextMarker.dates[key] = chosen; } else delete nextMarker.dates[key];
    }
    const dates: MilestoneDates['dates'] = {};
    for (const [key, date] of result) { const at = key.indexOf('/'), goalId = key.slice(0, at), mId = key.slice(at + 1); (dates[goalId] ??= {})[mId] = date; }
    const nextDates = milestoneDatesSchema.parse({version: 1, dates});
    if (recordDigest(sortedDates(nextDates)) !== recordDigest(sortedDates(device.dates))) deviceDates = nextDates;
    platformNext = withDates(platformNext, new Map([...result].filter(([key]) => exists.has(key))));
  }
  const changed = platformNext !== platform;
  return {platform: changed ? platformSchema.parse(platformNext) : platform, accounts: deviceAccounts, dates: deviceDates, marker: nextMarker, changed};
}
const sortedDates = (m: MilestoneDates) => Object.keys(m.dates).sort().map(g => [g, Object.keys(m.dates[g]!).sort().map(k => [k, m.dates[g]![k]])]);

/** Finance as v5 (never lower) when it holds an account or a date; the same object when nothing changes. */
function raised(platform: Platform): V5 {
  return isV5(platform) ? platform : {...platform, schemaVersion: 5} as V5;
}
export function withAccounts(platform: Platform, accounts: Accounts): Platform {
  const held = isV5(platform) ? platform.accounts : undefined;
  if (held === undefined && !accounts.items.length) return platform;
  if (held !== undefined && recordDigest(held.items) === recordDigest(accounts.items)) return platform;
  return {...raised(platform), accounts};
}
export function withDates(platform: Platform, dates: ReadonlyMap<string, string>): Platform {
  const current = datesIn(platform);
  if (current.size === dates.size && [...dates].every(([k, v]) => current.get(k) === v)) return platform;
  const base = dates.size ? raised(platform) : platform;
  return {...base, goals: base.goals.map(goal => ({...goal, milestones: goal.milestones.map(m => {
    const date = dates.get(dateKey(goal.id, m.id));
    const {targetDate: _old, ...rest} = m as typeof m & {targetDate?: string}; void _old;
    return date ? {...rest, targetDate: date} : rest;
  })}))} as Platform;
}

/**
 * Account sync's merge for finance when both devices changed it (lib/vault/cloud-sync.ts `mergePrivateData`). Finance
 * otherwise merges as one record and refuses a both-sides change ("Conflicting financial changes"); its two v5 homes
 * are Session W's stamped groups, so, like Health v4's and settings v3's groups (Session W S4), they settle on their own:
 * the record without its homes (and its version) must still have changed on one side only, or the refusal stands; the
 * homes then merge by item against the base with the rules above (an account by its later `updatedAt`, a date by the
 * later date, an edit beating a removal), the version is the higher of the two. Returns null for a real conflict.
 */
export function mergeFinanceTexts(baseText: string, localText: string, remoteText: string): string | null {
  const parse = (text: string) => platformSchema.parse(JSON.parse(text));
  let base: Platform, local: Platform, remote: Platform;
  try { base = parse(baseText); local = parse(localText); remote = parse(remoteText); } catch { return null; }
  const rest = (p: Platform) => JSON.stringify({...withoutHomes(p), schemaVersion: 0});
  const b = rest(base), l = rest(local), r = rest(remote);
  if (l !== b && r !== b && l !== r) return null;
  const winner = l === b ? remote : local;
  // Accounts: three-way by id.
  const by = (p: Platform) => new Map(accountsIn(p).map(a => [a.id, a] as const));
  const ba = by(base), la = by(local), ra = by(remote), items: Account[] = [];
  for (const id of new Set([...la.keys(), ...ra.keys(), ...ba.keys()])) {
    const baseItem = ba.get(id), chosen = choose(la.get(id), ra.get(id), baseItem === undefined ? undefined : recordDigest(baseItem), recordDigest, laterAccount);
    if (chosen) items.push(chosen);
  }
  // Dates: three-way per milestone the winning record holds.
  const bd = datesIn(base), ld = datesIn(local), rd = datesIn(remote), exists = milestoneKeys(winner), dates = new Map<string, string>();
  for (const key of exists) { const chosen = choose(ld.get(key), rd.get(key), bd.get(key), v => v, laterDate); if (chosen) dates.set(key, chosen); }
  const version = Math.max(local.schemaVersion, remote.schemaVersion);
  let merged: Platform = version === 5 ? raised(winner) : winner;
  merged = withDates(withAccounts(stripAccounts(merged), accountsSchema.parse({version: 1, items})), dates);
  if (version === 5 && !isV5(merged)) merged = raised(merged);
  return JSON.stringify(platformSchema.parse(merged));
}
function stripAccounts(p: Platform): Platform {
  if (!isV5(p) || p.accounts === undefined) return p;
  const {accounts: _a, ...rest} = p; void _a; return rest as Platform;
}
function withoutHomes(p: Platform): Platform {
  const plain = stripAccounts(p);
  return {...plain, goals: plain.goals.map(g => ({...g, milestones: g.milestones.map(m => { const {targetDate: _t, ...rest} = m as typeof m & {targetDate?: string}; void _t; return rest; })}))} as Platform;
}
