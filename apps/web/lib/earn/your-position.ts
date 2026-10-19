import type {Position} from '../positions';

/**
 * Session AF (L1c, ledger P1.23; ADR-028 H11, H16): the person's own position in one way to earn — bonded stake and the
 * rewards waiting for native staking, the stZIG held for Valdora — from the positions ZIGoals' read-only relay already
 * answered for the Earn page (components/earn/use-earn-positions.ts). Nothing here reads anything: it only adds up what
 * that one read returned, in base units, and says which block it came from. Practice positions stay apart (H11).
 */
const whole = (p: Position) => /^\d+$/.test(p.quantity);
const azig = (p: Position) => BigInt(p.quantity) * 10n ** BigInt(18 - Math.min(18, p.decimals));
export type NativeOwn = {staked: string; rewards: string};
/** Bonded ZIG and the ZIG rewards waiting, in azig. */
export function nativeOwn(positions: readonly Position[]): NativeOwn {
  let staked = 0n, rewards = 0n;
  for (const p of positions) {
    if (p.asset !== 'ZIG' || !whole(p)) continue;
    if (p.sourceType === 'NATIVE_STAKING') staked += azig(p);
    if (p.sourceType === 'NATIVE_REWARDS') rewards += azig(p);
  }
  return {staked: staked.toString(), rewards: rewards.toString()};
}
export type ValdoraOwn = {units: string; decimals: number};
/** The stZIG held, in its own units, or null when the rows disagree on its decimals (then it is said to be unreadable). */
export function valdoraOwn(positions: readonly Position[]): ValdoraOwn | null {
  const rows = positions.filter(p => p.sourceType === 'LIQUID_STAKING' && p.asset === 'stZIG' && whole(p));
  if (!rows.length) return {units: '0', decimals: 6};
  const decimals = rows[0]!.decimals;
  if (rows.some(p => p.decimals !== decimals)) return null;
  return {units: rows.reduce((n, p) => n + BigInt(p.quantity), 0n).toString(), decimals};
}
/** The block time the relay read at (the newest observation), else the time of the read. */
export const ownAsOf = (positions: readonly Position[], at: string) => positions.map(p => p.observedAt).filter((t): t is string => !!t).sort().at(-1) ?? at;
