import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK Part 8 (COMPETITORS item 19, H3): the custom rewards shelf, an opt-in part of the game layer. The person lists
 * treats with a point price; the points are the XP the game layer already derives from their records (lib/game/xp.ts),
 * never stored here; "Claim" marks a treat as enjoyed. Calm rules R2/R5: no penalties, no negative points, nothing ever
 * taken away — spending is only ever what the person claimed, and what is left never shows below zero (if Undo lowers the
 * XP under what was spent, the shelf shows 0 and waits).
 *
 * Its own device key `zigoals:rewards-shelf:v1` (loose, versioned, every field but the version optional), not a field of
 * the game record, so the game record keeps holding only the switch and what was seen. Bounded: 50 treats, 500 claims.
 */
export const REWARDS_SHELF_KEY = 'zigoals:rewards-shelf:v1';
export const MAX_REWARDS = 50, MAX_CLAIMS = 500, MAX_PRICE = 100_000, MAX_NAME = 60;
const id = z.string().min(1).max(64);
export const rewardSchema = z.looseObject({id, name: z.string().trim().min(1).max(MAX_NAME), price: z.number().int().min(1).max(MAX_PRICE), createdAt: z.iso.datetime()});
export const claimSchema = z.looseObject({id, rewardId: id, price: z.number().int().min(1).max(MAX_PRICE), at: z.iso.datetime()});
export const rewardsShelfSchema = z.looseObject({
  version: z.literal(1),
  /** The shelf is shown only when the person turned it on (and the game layer is on). */
  on: z.boolean().optional(),
  rewards: z.array(rewardSchema).max(MAX_REWARDS).optional(),
  claims: z.array(claimSchema).max(MAX_CLAIMS).optional(),
});
export type Reward = z.infer<typeof rewardSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type RewardsShelf = z.infer<typeof rewardsShelfSchema>;
export const emptyRewardsShelf = (): RewardsShelf => ({version: 1});
export const REWARDS_SHELF: DeviceRecordSpec<RewardsShelf> = {key: REWARDS_SHELF_KEY, schema: rewardsShelfSchema, empty: emptyRewardsShelf};

export const setShelfOn = (s: RewardsShelf, on: boolean): RewardsShelf => rewardsShelfSchema.parse({...s, on});
/** Adds a treat; refuses an empty name, a price outside 1–100,000 whole points, or a 51st treat. */
export function addReward(s: RewardsShelf, input: {id: string; name: string; price: number; at: string}): RewardsShelf {
  const rewards = s.rewards ?? [];
  if (rewards.length >= MAX_REWARDS) throw Error(`Up to ${MAX_REWARDS} treats fit on the shelf.`);
  const name = input.name.trim();
  if (!name) throw Error('Give the treat a name.');
  if (!Number.isInteger(input.price) || input.price < 1 || input.price > MAX_PRICE) throw Error(`A price is a whole number of points from 1 to 100,000.`);
  return rewardsShelfSchema.parse({...s, rewards: [...rewards, {id: input.id, name: name.slice(0, MAX_NAME), price: input.price, createdAt: input.at}]});
}
/** Takes a treat off the shelf; its past claims stay (what was enjoyed is never taken away). */
export const removeReward = (s: RewardsShelf, rewardId: string): RewardsShelf => rewardsShelfSchema.parse({...s, rewards: (s.rewards ?? []).filter(r => r.id !== rewardId)});

/** Points spent on claims; never more than the claims themselves. */
export const pointsSpent = (s: RewardsShelf): number => (s.claims ?? []).reduce((n, c) => n + c.price, 0);
/** Points to spend: the game layer's XP minus what was claimed, never below zero. */
export const pointsAvailable = (s: RewardsShelf, xpTotal: number): number => Math.max(0, Math.floor(Number.isFinite(xpTotal) ? xpTotal : 0) - pointsSpent(s));
export const canClaim = (s: RewardsShelf, reward: Pick<Reward, 'price'>, xpTotal: number): boolean => pointsAvailable(s, xpTotal) >= reward.price;
/** How many points a treat still needs (0 when it can be claimed). */
export const pointsToGo = (s: RewardsShelf, reward: Pick<Reward, 'price'>, xpTotal: number): number => Math.max(0, reward.price - pointsAvailable(s, xpTotal));

/** Marks a treat as enjoyed at its current price; refused when the points are not there yet (no debt, ever). */
export function claimReward(s: RewardsShelf, rewardId: string, xpTotal: number, input: {id: string; at: string}): RewardsShelf {
  const reward = (s.rewards ?? []).find(r => r.id === rewardId);
  if (!reward) throw Error('That treat is no longer on the shelf.');
  if (!canClaim(s, reward, xpTotal)) throw Error(`${pointsToGo(s, reward, xpTotal)} more points to go for this one.`);
  const claims = [...(s.claims ?? []), {id: input.id, rewardId, price: reward.price, at: input.at}];
  // Spending must stay counted, so the cap refuses instead of dropping an old claim (500 claims is years of treats).
  if (claims.length > MAX_CLAIMS) throw Error(`The shelf keeps up to ${MAX_CLAIMS} claims.`);
  return rewardsShelfSchema.parse({...s, claims});
}
/** Undo of a claim just made: the claim leaves and its points come back. */
export const undoClaim = (s: RewardsShelf, claimId: string): RewardsShelf => rewardsShelfSchema.parse({...s, claims: (s.claims ?? []).filter(c => c.id !== claimId)});
/** How many times each treat was enjoyed. */
export const timesClaimed = (s: RewardsShelf, rewardId: string): number => (s.claims ?? []).filter(c => c.rewardId === rewardId).length;
