import {PositionReadRefused, readPublicPositions} from '../../position-reader';
import type {Position} from '../../positions';
import type {TrackedChain} from './chains';
import {BalanceReadError} from './http';
import type {ChainRead} from './evm';
import type {ObservedAsset} from './store';

/**
 * Session AF (L2b, Part 3, ADR-028 H16 (a), H63): a linked ZIGChain address's ZIG, staking positions and stZIG, read only
 * through ZIGoals' read-only relay `/api/positions` (one block height, 60 s cache, no address logged; lane L2a lifts its
 * mainnet refusal for public builds). The relay's own sentence is kept as the reason when it refuses. Staked, rewards
 * waiting and unbonding are separate assets of the same coin, so the page can show the staking positions apart; stZIG
 * stays in stZIG units (its ZIG value needs the two-source rate, H44). Never browser-direct (H16 (a)).
 */
export const ZIG_PARTS = {WALLET_LIQUID: 'azig', NATIVE_STAKING: 'azig:staked', NATIVE_REWARDS: 'azig:rewards', NATIVE_UNBONDING: 'azig:unbonding'} as const;
export type ZigPart = keyof typeof ZIG_PARTS;
const toAzig = (p: Position) => BigInt(p.quantity) * 10n ** BigInt(18 - Math.min(18, p.decimals));
export function zigAssets(positions: readonly Position[], chain: TrackedChain): ObservedAsset[] {
  const sums = new Map<string, bigint>();
  for (const p of positions) {
    if (p.network !== 'zigchain-1') continue;
    if (p.asset === 'ZIG' && p.sourceType in ZIG_PARTS) { const id = ZIG_PARTS[p.sourceType as ZigPart]; sums.set(id, (sums.get(id) ?? 0n) + toAzig(p)); }
    else if (p.sourceType === 'LIQUID_STAKING' && p.denom === chain.tokens[0]?.id) sums.set(p.denom, (sums.get(p.denom) ?? 0n) + BigInt(p.quantity));
  }
  // The liquid ZIG line is always there (a read that found none says 0 ZIG, which is a reading, not a failure).
  if (!sums.has('azig')) sums.set('azig', 0n);
  return [...sums].map(([id, amount]) => id === chain.tokens[0]?.id ? {id, symbol: 'stZIG', decimals: 6, amount: amount.toString()} : {id, symbol: 'ZIG', decimals: 18, amount: amount.toString()});
}
export async function readZigchainBalances(chain: TrackedChain, address: string, read: typeof readPublicPositions = readPublicPositions, now = () => new Date()): Promise<ChainRead> {
  if (chain.kind !== 'zigchain') throw new BalanceReadError('Not ZIGChain.');
  try {
    return {at: now().toISOString(), assets: zigAssets(await read('MAINNET_READ_ONLY', address), chain), missing: []};
  } catch (error) {
    throw new BalanceReadError(error instanceof PositionReadRefused ? error.message : 'ZIGoals’ read-only relay could not read a coherent snapshot of this wallet just now.');
  }
}
