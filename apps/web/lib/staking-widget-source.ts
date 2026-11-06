import type {Position} from './positions';

/** A Position a Staking widget can show: a native staking, rewards or unbonding source read from the chain (lib/dashboard-metrics.ts re-exports this). */
export function stakingWidgetSource(p: Position) {
  return ['NATIVE_STAKING', 'NATIVE_REWARDS', 'NATIVE_UNBONDING'].includes(p.sourceType) && p.verification === 'VERIFIED_READ_ONLY';
}
