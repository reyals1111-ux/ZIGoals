import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {GOAL_VAULTS_KEY} from '../af-wallet-keys';

/**
 * Session AF (L2b, Part 6, ADR-028 H8, H10, H11; `TIER 3 (storage)`): Goal Vaults, `{version: 1, links?: [{id, goalId,
 * walletId, parts, linkedAt, baseline: {stakedAzig, rewardsAzig, stzigUnits, zigPerStZig?, height?}}]}`.
 * - **What a link is:** "this linked ZIGChain wallet's stake works toward this Goal". It names the wallet by its local id
 *   (the address stays in the linked-wallets record) and which parts count: its delegations (staked ZIG and the rewards
 *   waiting) and/or its Valdora stZIG. Nothing moves and no message is ever built: the stake stays in the person's wallet.
 * - **The baseline** is the stake read at link time (azig and stZIG integer strings, the stZIG→ZIG rate when the two
 *   sources agreed, the block), so "since you linked" = now − then (H8). Rewards claimed and moved out since linking are not
 *   reconstructed (no indexer), and the card says so.
 * - **Real money only (H11):** a link is to a mainnet wallet the person linked; practice (testnet) stake never counts.
 * - **Device-only and personal:** never synced, never restored, in Export everything, erased with the account; loose and
 *   versioned (unknown fields kept); at most 50 links, one per Goal and wallet; unreadable bytes are never overwritten.
 */
export {GOAL_VAULTS_KEY};
export const MAX_VAULT_LINKS = 50;
export const VAULT_PARTS = ['delegations', 'stzig'] as const;
export type VaultPart = typeof VAULT_PARTS[number];
const units = z.string().regex(/^\d{1,40}$/);
const linkSchema = z.looseObject({
  id: z.string().min(1).max(64), goalId: z.string().min(1).max(80), walletId: z.string().min(1).max(64),
  parts: z.array(z.string().max(24)).max(4),
  linkedAt: z.string().max(40),
  baseline: z.looseObject({stakedAzig: units, rewardsAzig: units, stzigUnits: units, zigPerStZig: z.string().regex(/^\d{1,6}(\.\d{1,18})?$/).optional(), height: z.string().regex(/^\d{1,20}$/).optional()}),
});
export const goalVaultsSchema = z.looseObject({version: z.literal(1), links: z.array(linkSchema).max(MAX_VAULT_LINKS).optional()});
export type GoalVaults = z.infer<typeof goalVaultsSchema>;
export type VaultLink = z.infer<typeof linkSchema>;
export type Baseline = VaultLink['baseline'];
export const GOAL_VAULTS: DeviceRecordSpec<GoalVaults> = {key: GOAL_VAULTS_KEY, schema: goalVaultsSchema, empty: () => ({version: 1})};
export class GoalVaultError extends Error {}
/** The parts of a link this build counts (unknown names a newer build may add are kept and ignored). */
export const partsOf = (link: Pick<VaultLink, 'parts'>): VaultPart[] => VAULT_PARTS.filter(p => link.parts.includes(p));
export const linksFor = (record: GoalVaults, goalId: string): VaultLink[] => (record.links ?? []).filter(l => l.goalId === goalId && !Number.isNaN(Date.parse(l.linkedAt)) && partsOf(l).length > 0);
export function withLink(record: GoalVaults, input: {goalId: string; walletId: string; parts: readonly VaultPart[]; baseline: Baseline}, now = new Date(), id: string = crypto.randomUUID()): GoalVaults {
  const links = record.links ?? [], parts = VAULT_PARTS.filter(p => input.parts.includes(p));
  if (!parts.length) throw new GoalVaultError('Choose what counts: the staked ZIG, the stZIG, or both.');
  if (links.some(l => l.goalId === input.goalId && l.walletId === input.walletId)) throw new GoalVaultError('That wallet is already linked to this Goal.');
  if (links.length >= MAX_VAULT_LINKS) throw new GoalVaultError(`At most ${MAX_VAULT_LINKS} Goal Vault links are kept on this device. Remove one first.`);
  return {...record, links: [...links, {id, goalId: input.goalId, walletId: input.walletId, parts, linkedAt: now.toISOString(), baseline: input.baseline}]};
}
export const withoutLink = (record: GoalVaults, id: string): GoalVaults => ({...record, links: (record.links ?? []).filter(l => l.id !== id)});
/** The one write: refused while the stored record cannot be read (it is never replaced by an empty one). */
export function writeGoalVaults(storage: Pick<Storage, 'getItem' | 'setItem'>, change: (current: GoalVaults) => GoalVaults): GoalVaults {
  if (readDeviceRecord(storage, GOAL_VAULTS).unreadable) throw new GoalVaultError('Your Goal Vaults could not be read on this device, so nothing was changed.');
  return updateDeviceRecord(storage, GOAL_VAULTS, change);
}
