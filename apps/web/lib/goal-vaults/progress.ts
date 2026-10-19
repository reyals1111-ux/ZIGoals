import type {Observation} from '../wallets/balances/store';
import {chainById} from '../wallets/balances/chains';
import {partsOf, type Baseline, type VaultLink} from './store';

/**
 * Session AF (L2b, Part 6, ADR-028 H8, H11, H44; P6.3): a Goal Vault's progress, exact integer arithmetic on base units.
 * - The stake is read from the wallet's ZIGChain observation (lib/wallets/balances: ZIGoals' read-only relay, mainnet only;
 *   practice stake never counts, H11): staked ZIG (every delegation), the rewards waiting to be claimed, and Valdora stZIG.
 * - stZIG counts in ZIG only at the H44 two-source rate (Valdora's rate when OroSwap's pool agrees within 2 %, read through
 *   ZIGoals' /api/earn/valdora); when the sources disagree it counts in stZIG units with "value unavailable".
 * - Progress = staked now + rewards waiting (+ stZIG's ZIG value when known). "Since you linked" = now − the baseline stored
 *   at link time, part by part; rewards claimed and moved out since then are not reconstructed (the card says so).
 */
export type StakeReading = {stakedAzig: bigint; rewardsAzig: bigint; stzigUnits: bigint; at: string; height?: string};
const STZIG = chainById('zigchain-1')!.tokens[0]!.id;
/** The stake parts of a ZIGChain observation, or null when the wallet has no good reading yet. */
export function stakeOf(o: Observation | null): StakeReading | null {
  if (!o?.assets || !o.at) return null;
  const sum = (id: string) => o.assets!.filter(a => a.id === id).reduce((n, a) => n + BigInt(a.amount), 0n);
  return {stakedAzig: sum('azig:staked'), rewardsAzig: sum('azig:rewards'), stzigUnits: sum(STZIG), at: o.at, ...(o.height ? {height: o.height} : {})};
}
/** stZIG units (6 decimals) in azig (18 decimals) at a decimal rate ("1.0728" ZIG per stZIG), cut, never rounded up. */
export function stzigInAzig(units: bigint, rate: string): bigint {
  const m = /^(\d{1,6})(?:\.(\d{1,18}))?$/.exec(rate);
  if (!m) throw Error('Not a rate.');
  const fraction = m[2] ?? '', scale = 10n ** BigInt(fraction.length);
  return units * 10n ** 12n * BigInt(m[1]! + fraction) / scale;
}
export type Progress = {
  parts: ('delegations' | 'stzig')[];
  stakedAzig: bigint; rewardsAzig: bigint;
  stzig: {units: bigint; valueAzig: bigint | null} | null;
  /** The parts whose ZIG value is known, added. */
  totalAzig: bigint; complete: boolean;
  since: {azig: bigint; stzigUnits: bigint | null; complete: boolean};
};
export function progressOf(link: Pick<VaultLink, 'parts' | 'baseline'>, now: StakeReading, rate: string | null): Progress {
  const parts = partsOf(link), b: Baseline = link.baseline, delegations = parts.includes('delegations'), withStzig = parts.includes('stzig');
  const stakedAzig = delegations ? now.stakedAzig : 0n, rewardsAzig = delegations ? now.rewardsAzig : 0n;
  const stzigValue = withStzig && rate ? stzigInAzig(now.stzigUnits, rate) : null;
  const totalAzig = stakedAzig + rewardsAzig + (stzigValue ?? 0n);
  let sinceAzig = delegations ? (now.stakedAzig + now.rewardsAzig) - (BigInt(b.stakedAzig) + BigInt(b.rewardsAzig)) : 0n, sinceComplete = true;
  if (withStzig) {
    if (stzigValue !== null && b.zigPerStZig) sinceAzig += stzigValue - stzigInAzig(BigInt(b.stzigUnits), b.zigPerStZig);
    else sinceComplete = false;
  }
  return {parts, stakedAzig, rewardsAzig, stzig: withStzig ? {units: now.stzigUnits, valueAzig: stzigValue} : null, totalAzig, complete: !withStzig || stzigValue !== null,
    since: {azig: sinceAzig, stzigUnits: withStzig ? now.stzigUnits - BigInt(b.stzigUnits) : null, complete: sinceComplete}};
}
/** A Goal's share of a vault in percent (two decimals, cut), when the Goal is counted in ZIG; null otherwise. */
export function shareOfGoal(goal: {asset: string; decimals: number; target: string}, totalAzig: bigint): number | null {
  if (goal.asset !== 'ZIG' || !/^\d+$/.test(goal.target) || goal.decimals > 18) return null;
  const target = BigInt(goal.target) * 10n ** BigInt(18 - goal.decimals);
  if (target <= 0n) return null;
  return Number(totalAzig * 10_000n / target) / 100;
}
/** The baseline to store at link time, from the same reading (and the rate when the two sources agreed). */
export const baselineOf = (now: StakeReading, rate: string | null): Baseline => ({stakedAzig: now.stakedAzig.toString(), rewardsAzig: now.rewardsAzig.toString(), stzigUnits: now.stzigUnits.toString(), ...(rate ? {zigPerStZig: rate} : {}), ...(now.height ? {height: now.height} : {})});
