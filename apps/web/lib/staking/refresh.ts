import type {StakingNetwork} from '@zigoals/chain-config/networks';
import {readPublicPositions, type ReadMode} from '../position-reader';
import {replaceObservation, type Platform, type Position} from '../positions';

/**
 * Session AF (ADR-028 H16, H63): after a confirmed staking action, the person's positions are read again through the
 * existing read-only relay (`/api/positions`) with the confirmed block height, so the answer is never an older cached one,
 * and written into the platform record through the tracker's own path (replaceObservation + watchScope). Staking, Today's
 * staking card, Wealth and Portfolio then update as they do for a tracked wallet. The relay's answer carries its block in
 * each position's provenance ("… · block N"); a node still behind the confirmed block is asked again, at most three times.
 */
export const READ_MODE: Readonly<Record<StakingNetwork, ReadMode>> = Object.freeze({practice: 'TESTNET_READ_ONLY', real: 'MAINNET_READ_ONLY'});
export const REFRESH_ATTEMPTS = 3, REFRESH_GAP_MS = 2_500;
export function observedHeight(positions: readonly Position[]): bigint | undefined {
  let best: bigint | undefined;
  for (const p of positions) { const m = / · block ([1-9]\d{0,19})$/.exec(p.provenance ?? ''); if (m) { const h = BigInt(m[1]!); best = best === undefined || h > best ? h : best; } }
  return best;
}
export async function readPositionsAfter(network: StakingNetwork, address: string, height: number, read = readPublicPositions, wait = (ms: number) => new Promise(r => setTimeout(r, ms))): Promise<{positions: Position[]; height: string}> {
  if (!Number.isSafeInteger(height) || height <= 0) throw Error('Unsupported block height.');
  const minHeight = String(height);
  let last: Position[] = [];
  for (let attempt = 1; attempt <= REFRESH_ATTEMPTS; attempt++) {
    last = await read(READ_MODE[network], address, {minHeight});
    const seen = observedHeight(last);
    if (seen !== undefined && seen >= BigInt(height)) return {positions: last, height: seen.toString()};
    if (attempt < REFRESH_ATTEMPTS) await wait(REFRESH_GAP_MS);
  }
  throw Error('The chain relay has not reached your transaction\'s block yet. Your positions will update on the next refresh.');
}
/** The platform record with the new observation, scoped to the wallet that signed (the tracker's own path). */
export function withStakingObservation(data: Platform, chainId: string, address: string, positions: Position[]): Platform {
  return {...replaceObservation(data, chainId, address, positions), watchScope: {network: chainId, account: address}};
}
