import type {Platform} from './positions';

/**
 * Session AB-Design Phase 2 closing pass (design critique): the unit a contribution is shown in. A custom asset's code is
 * the generic "CUSTOM", which read like placeholder text ("1 CUSTOM"); when the contribution names its position, that
 * position's own name is shown instead. Every other asset keeps its code.
 */
export function assetUnit(platform: Pick<Platform, 'positions'>, asset: string, positionId?: string): string {
  if (asset !== 'CUSTOM' || !positionId) return asset;
  return platform.positions.find(p => p.id === positionId)?.providerId ?? asset;
}
