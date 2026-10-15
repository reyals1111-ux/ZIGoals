import {metalUnitOf} from '../../lib/asset-management';
import type {Position} from '../../lib/positions';

/**
 * Session AB-Design (owner request 38): a position's quantity in words. A precious metal reads "2 troy ounces of Gold"
 * and "1 gram of Gold" (singular at exactly one), instead of the stored name order "2 Gold troy ounces". Every other
 * asset keeps "quantity asset". Nothing stored changes.
 */
export function assetQuantity(amount: string, p: Position): string {
  const metal = metalUnitOf(p);
  if (!metal) return `${amount} ${p.asset}`;
  const one = /^[1１]([.,]0+)?$/.test(amount.trim());
  const unit = one ? metal.unit.replace(/s$/, '') : metal.unit;
  return `${amount} ${unit} of ${metal.metal}`;
}
