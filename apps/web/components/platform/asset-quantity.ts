import {METAL_UNITS, metalUnitOf, type MetalUnit} from '../../lib/asset-management';
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
 * Session AL fifth pass (N-MO-17): a metal's weight unit as Wealth shows it. A hand-added metal keeps it in its stored code
 * ("Gold troy ounces", lib/asset-management.ts metalUnitOf); a metal linked to its market reference keeps the market's code
 * ("GOLD") and names its unit in its name, "Gold · troy ounces" (the Showcase's and Portfolio's wording). Both read
 * "10 troy ounces of Gold", never "10 GOLD". Display only: nothing stored changes, and the unit stays fixed for a linked one.
 */
export function metalUnitShown(p: Position): {metal: string; unit: MetalUnit} | null {
  const stored = metalUnitOf(p);
  if (stored || p.assetClass !== 'Precious Metals') return stored;
  const named = /^(.+?)\s*·\s*(.+)$/.exec(p.providerId.trim()), unit = METAL_UNITS.find(u => u === named?.[2]?.trim().toLowerCase());
  return named && unit ? {metal: named[1]!.trim(), unit} : null;
}
/** The word one unit of this asset is priced by ("per troy ounce", "per item", "per BTC"). */
export function unitWord(p: Position): string {
  const metal = metalUnitShown(p);
  return metal ? metal.unit.replace(/s$/, '') : plainUnit(p) ?? p.asset;
}
/**
 * Session AB-Design (owner request 38): a position's quantity in words. A precious metal reads "2 troy ounces of Gold"
 * and "1 gram of Gold" (singular at exactly one), instead of the stored name order "2 Gold troy ounces". A property or a
 * custom asset reads in plain words ("1 property", "3 items"); every other asset keeps "quantity asset".
 */
export function assetQuantity(amount: string, p: Position): string {
  const metal = metalUnitShown(p);
  const one = /^[1１]([.,]0+)?$/.test(amount.trim());
  if (!metal) return `${amount} ${plainUnit(p, !one) ?? p.asset}`;
  const unit = one ? metal.unit.replace(/s$/, '') : metal.unit;
  return `${amount} ${unit} of ${metal.metal}`;
}
/**
 * Session AL fifth pass (N-MO-17): what one unit of a holding is worth at its own value ("US$4,400.00 per troy ounce"),
 * in whole numbers: `cents` is the holding's value in hundredths (as Wealth's rows carry it), `quantity` the stored integer
 * with its `decimals`. Rounded half away from zero to the cent; null for no quantity.
 */
export function perUnitCents(cents: bigint, quantity: string, decimals: number): bigint | null {
  if (!/^\d+$/.test(quantity) || BigInt(quantity) === 0n) return null;
  const num = (cents < 0n ? -cents : cents) * 10n ** BigInt(decimals), den = BigInt(quantity), rounded = (num * 2n + den) / (den * 2n);
  return cents < 0n ? -rounded : rounded;
}
