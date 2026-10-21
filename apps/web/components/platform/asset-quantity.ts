import {metalUnitOf} from '../../lib/asset-management';
import type {Position} from '../../lib/positions';
import {assetClassOf} from '../../lib/wealth';

/**
 * Session AF Gate C (design critique, Wealth's units): a property or a custom asset has no ticker. Its stored code ("HOME",
 * "CUSTOM", "UNIT") read as placeholder text ("1 HOME", "per CUSTOM"), so it is counted in plain words: "1 property",
 * "2 items". Every other asset has no plain unit here (null): its code is its unit. Nothing stored changes.
 */
export function plainUnit(p: Position, plural = false): string | null {
  if (p.marketRef) return null;
  const assetClass = assetClassOf(p);
  if (assetClass === 'Property') return plural ? 'properties' : 'property';
  if (assetClass === 'Custom') return plural ? 'items' : 'item';
  return null;
}
/**
 * Session AB-Design (owner request 38): a position's quantity in words. A precious metal reads "2 troy ounces of Gold"
 * and "1 gram of Gold" (singular at exactly one), instead of the stored name order "2 Gold troy ounces". A property or a
 * custom asset reads in plain words ("1 property", "3 items"); every other asset keeps "quantity asset".
 */
export function assetQuantity(amount: string, p: Position): string {
  const metal = metalUnitOf(p);
  const one = /^[1１]([.,]0+)?$/.test(amount.trim());
  if (!metal) return `${amount} ${plainUnit(p, !one) ?? p.asset}`;
  const unit = one ? metal.unit.replace(/s$/, '') : metal.unit;
  return `${amount} ${unit} of ${metal.metal}`;
}
