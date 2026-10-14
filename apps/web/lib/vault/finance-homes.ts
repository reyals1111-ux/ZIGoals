import * as z from 'zod';
import {accountsSchema, type Account, type Accounts} from '../accounts/schema';
import {milestoneDatesSchema, type MilestoneDates} from '../goals/milestone-dates';
import {platformSchema, type Platform} from '../positions';
import {accountsIn, choose, dateKey, datesIn, laterAccount, laterDate, milestoneKeys, recordDigest, withAccounts, withDates} from './finance-homes-core';
export {accountsIn, datesIn, mergeFinanceTexts, withAccounts, withDates} from './finance-homes-core';

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
