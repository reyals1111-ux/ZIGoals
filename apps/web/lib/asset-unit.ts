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

/**
 * Session AC (leftover from AB-Design's critique: "1 CUSTOM" where a contribution names no position): an amount with
 * its unit. A custom asset whose contribution names no position (or a position no longer here) reads honestly as units
 * of a custom asset ("1 unit of a custom asset"), never as the bare code; every other case is `assetUnit`'s.
 */
export function amountWithUnit(platform: Pick<Platform, 'positions'>, quantity: string, asset: string, positionId?: string): string {
  const unit = assetUnit(platform, asset, positionId);
  if (unit !== 'CUSTOM') return `${quantity} ${unit}`;
  return `${quantity} ${quantity === '1' ? 'unit' : 'units'} of a custom asset`;
}
