import {z} from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {Platform} from '../positions';

/**
 * Session AL (BN-085, BN-112, BN-079): the public wallets a person tracks (read-only, watch-only), listed with a name of
 * their own and a way to stop tracking one. A tracked wallet is the set of observed "native-zig" positions for one
 * network and address in the finance record; nothing here signs, holds keys or builds a transaction.
 *
 * - Names live on this device only (`zigoals:wallet-names:v1`), so a wallet can read "Savings wallet" instead of
 *   "zig1abc…". Unknown entries are kept; a damaged record reads as no names.
 * - Removing a wallet removes its observed positions, their quantity history, its APR assumption and the chosen scope.
 *   It refuses (and says why) while any Goal holds an allocation from that wallet, so no Goal loses money silently.
 * - Addresses are compared without case: a bech32 address is one address in upper or lower case (BN-079).
 */
export const WALLET_NAMES_KEY = 'zigoals:wallet-names:v1';
export const WALLET_NAME_MAX = 40;
const nameSchema = z.object({network: z.string().min(1).max(100), account: z.string().min(1).max(200), name: z.string().trim().min(1).max(WALLET_NAME_MAX)}).strict();
const namesSchema = z.object({version: z.literal(1), names: z.array(nameSchema).max(500)}).loose();
export type WalletNames = z.infer<typeof namesSchema>;
export const WALLET_NAMES: DeviceRecordSpec<WalletNames> = {key: WALLET_NAMES_KEY, schema: namesSchema, empty: () => ({version: 1 as const, names: []})};

export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** The address as stored from now on: bech32 is case-insensitive, so lower case (BN-079). */
export const canonicalAddress = (address: string) => address.trim().toLowerCase();

export type TrackedWallet = {network: string; account: string; positions: number};
const OBSERVED = 'native-zig';
/** Each tracked wallet once, per network, in the order first seen. */
export function trackedWallets(s: Pick<Platform, 'positions'>): TrackedWallet[] {
  const out: TrackedWallet[] = [];
  for (const p of s.positions) {
    if (p.providerId !== OBSERVED) continue;
    const found = out.find(w => w.network === p.network && w.account === p.account);
    if (found) found.positions++; else out.push({network: p.network, account: p.account, positions: 1});
  }
  return out;
}

export function nameOf(names: WalletNames, network: string, account: string): string {
  return names.names.find(n => n.network === network && sameAddress(n.account, account))?.name ?? '';
}
/** A name check as typed: '' clears the name; otherwise 1 to 40 characters after trimming. */
export function checkWalletName(raw: string): {ok: true; name: string} | {ok: false; error: string} {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length > WALLET_NAME_MAX) return {ok: false, error: `A wallet name can be at most ${WALLET_NAME_MAX} characters (this one has ${name.length}).`};
  return {ok: true, name};
}
export function withName(names: WalletNames, network: string, account: string, name: string): WalletNames {
  const rest = names.names.filter(n => !(n.network === network && sameAddress(n.account, account)));
  return {...names, names: name ? [...rest, {network, account: canonicalAddress(account), name}] : rest};
}

export type RemoveOutcome = {ok: true; next: Platform; removed: number} | {ok: false; reason: string};
/** Stops tracking one wallet; refuses while a Goal holds an allocation from it. */
export function removeTrackedWallet(s: Platform, network: string, account: string): RemoveOutcome {
  const ids = new Set(s.positions.filter(p => p.providerId === OBSERVED && p.network === network && p.account === account).map(p => p.id));
  if (!ids.size) return {ok: false, reason: 'This wallet is no longer tracked.'};
  const held = s.allocations.filter(a => ids.has(a.positionId));
  if (held.length) {
    const goals = [...new Set(held.map(a => s.goals.find(g => g.id === a.goalId)?.name).filter(Boolean))];
    return {ok: false, reason: `This wallet still funds ${goals.length === 1 ? `the Goal "${goals[0]}"` : `${goals.length} Goals`}. Remove its allocations on the Goal first (Manage allocation), then remove the wallet. Nothing was changed.`};
  }
  const next: Platform = {
    ...s,
    positions: s.positions.filter(p => !ids.has(p.id)),
    snapshots: s.snapshots.filter(x => !ids.has(x.positionId)),
    ...(s.aprAssumptions ? {aprAssumptions: s.aprAssumptions.filter(a => !(a.network === network && a.account === account))} : {}),
  };
  if (s.watchScope && s.watchScope.network === network && s.watchScope.account === account) delete (next as {watchScope?: unknown}).watchScope;
  return {ok: true, next, removed: ids.size};
}
/** Undo of a removal: the wallet's own items go back into the latest record, unless they came back meanwhile. */
export function restoreTrackedWallet(latest: Platform, before: Platform, network: string, account: string): Platform {
  const ids = new Set(before.positions.filter(p => p.providerId === OBSERVED && p.network === network && p.account === account).map(p => p.id));
  const has = new Set(latest.positions.map(p => p.id));
  const back = before.positions.filter(p => ids.has(p.id) && !has.has(p.id));
  const apr = before.aprAssumptions?.find(a => a.network === network && a.account === account);
  return {
    ...latest,
    positions: [...latest.positions, ...back],
    snapshots: [...latest.snapshots, ...before.snapshots.filter(x => back.some(p => p.id === x.positionId))],
    ...(apr && !latest.aprAssumptions?.some(a => a.network === network && a.account === account) ? {aprAssumptions: [...(latest.aprAssumptions ?? []), apr]} : {}),
    ...(!latest.watchScope && before.watchScope?.network === network && before.watchScope.account === account ? {watchScope: before.watchScope} : {}),
  };
}
