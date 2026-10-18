import {formatExactNumber} from '../../visual-format';

/**
 * Session AF (L2b, Part 3): a base-unit amount as the person reads it: exact integer arithmetic, at most `maxFraction`
 * decimals, cut (never rounded up, so a balance never reads as more than it is), grouped in the display locale. An amount
 * so small that it cuts to nothing reads "< 0.000001" rather than 0.
 */
export function unitsText(amount: string, decimals: number, maxFraction = 6): string {
  if (!/^\d{1,78}$/.test(amount) || !Number.isInteger(decimals) || decimals < 0 || decimals > 30) return 'unavailable';
  const n = BigInt(amount), scale = 10n ** BigInt(decimals), whole = n / scale;
  const keep = Math.min(maxFraction, decimals);
  const fraction = keep ? (n % scale).toString().padStart(decimals, '0').slice(0, keep).replace(/0+$/, '') : '';
  if (n > 0n && whole === 0n && !fraction) return `< 0.${'0'.repeat(Math.max(0, keep - 1))}1`;
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
export const shownUnits = (amount: string, decimals: number, maxFraction = 6): string => {
  const text = unitsText(amount, decimals, maxFraction);
  return /^\d+(\.\d+)?$/.test(text) ? formatExactNumber(text) : text;
};
