import {accountsSchema, type Account, type Accounts} from '../accounts/schema';
import {platformSchema, type Platform} from '../positions';

/**
 * Session AB-Cloud Part 1 ([TIER 3] (data formats / sync), ADR-023 C6, C9): the finance homes' pure parts that account
 * sync's merge needs (lib/vault/cloud-sync.ts loads with every page, so this module imports only what the four synced
 * modules already carry). The reconcile with the device keys is lib/vault/finance-homes.ts.
 */
/** FNV-1a (32 bits) over the record's JSON (the digest lib/vault/sync-homes.ts uses): it tells a changed record apart, nothing more. */
export function recordDigest(value: unknown): string {
  const text = JSON.stringify(value) ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16).padStart(8, '0');
}

type V5 = Extract<Platform, {schemaVersion: 5}>;
export const isV5 = (p: Platform): p is V5 => p.schemaVersion === 5;
/** Accounts and debts as finance holds them (none below v5). */
export const accountsIn = (platform: Platform): Account[] => isV5(platform) ? platform.accounts?.items ?? [] : [];
export const dateKey = (goalId: string, milestoneId: string) => `${goalId}/${milestoneId}`;
/** Every milestone target date finance holds, by "goalId/milestoneId". */
export function datesIn(platform: Platform): Map<string, string> {
  const out = new Map<string, string>();
  if (!isV5(platform)) return out;
  for (const goal of platform.goals) for (const m of goal.milestones) if (m.targetDate) out.set(dateKey(goal.id, m.id), m.targetDate);
  return out;
}
/** The milestones finance holds, so a date is only ever placed on a milestone that exists. */
export function milestoneKeys(platform: Platform): Set<string> {
  return new Set(platform.goals.flatMap(goal => goal.milestones.map(m => dateKey(goal.id, m.id))));
}

/** One three-way choice. `undefined` is "not held". */
export function choose<T>(device: T | undefined, finance: T | undefined, base: string | undefined, digestOf: (v: T) => string, settle: (d: T, f: T) => T): T | undefined {
  const dd = device === undefined ? undefined : digestOf(device), fd = finance === undefined ? undefined : digestOf(finance);
  if (dd === fd) return device;
  if (fd === base) return device; // only the device changed (or the record is new here)
  if (dd === base) return finance; // only finance changed
  if (device === undefined) return finance; // removed here, edited there: the edit is kept
  if (finance === undefined) return device;
  return settle(device, finance);
}
export const laterAccount = (d: Account, f: Account): Account => d.updatedAt !== f.updatedAt ? (d.updatedAt > f.updatedAt ? d : f) : (JSON.stringify(d) >= JSON.stringify(f) ? d : f);
export const laterDate = (d: string, f: string) => d >= f ? d : f;


/** Finance as v5 (never lower) when it holds an account or a date; the same object when nothing changes. */
export function raised(platform: Platform): V5 {
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
