/**
 * Session AF (`TIER 3 (data formats)`): fixed-point decimals for the Earn figures, in BigInt with 18 decimals, so a chain
 * amount of 27 digits and a rate of 18 decimals are never rounded through a float. Inputs are the chain's decimal strings
 * ("24438956915109763956579028.034717945559164322", "0.020000000000000000"); digits past the 18th are cut, never rounded
 * up. Negative values, exponents and anything else that is not a plain decimal string throw.
 */
export const DIGITS = 18;
export const ONE = 10n ** 18n;
const PLAIN = /^(\d{1,60})(?:\.(\d{1,60}))?$/;
export function fixed(text: string): bigint {
  const m = PLAIN.exec(text);
  if (!m) throw new Error('Not a plain non-negative decimal.');
  return BigInt(m[1]!) * ONE + BigInt((m[2] ?? '').slice(0, DIGITS).padEnd(DIGITS, '0'));
}
/** Integer base units with `decimals` places (6 for stZIG and USDC, 18 for azig) as a fixed-point value. */
export function units(text: string, decimals: number): bigint {
  if (!/^\d{1,80}$/.test(text) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error('Not integer base units.');
  return decimals <= DIGITS ? BigInt(text) * 10n ** BigInt(DIGITS - decimals) : BigInt(text) / 10n ** BigInt(decimals - DIGITS);
}
export const mul = (a: bigint, b: bigint) => a * b / ONE;
export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new Error('Division by zero.');
  return a * ONE / b;
}
/** The plain decimal string of a fixed-point value, trailing zeros removed ("0.0574301", "12"). */
export function text(value: bigint): string {
  const negative = value < 0n, abs = negative ? -value : value;
  const whole = abs / ONE, part = (abs % ONE).toString().padStart(DIGITS, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${part ? `.${part}` : ''}`;
}
/** Rounded half up to `places` decimals, as text with exactly that many decimals. */
export function rounded(value: bigint, places: number): string {
  const step = 10n ** BigInt(DIGITS - places), negative = value < 0n, abs = negative ? -value : value;
  const r = (abs + step / 2n) / step, s = r.toString().padStart(places + 1, '0');
  const out = places ? `${s.slice(0, -places)}.${s.slice(-places)}` : s;
  return negative && r !== 0n ? `-${out}` : out;
}
/** A fraction as a percentage with `places` decimals: 0.0574301 → "5.74". */
export const percent = (fraction: bigint, places = 2) => rounded(fraction * 100n, places);
/** For range checks only (never for a shown figure). */
export const approx = (value: bigint) => Number(text(value));
