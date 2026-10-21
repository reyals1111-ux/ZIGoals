import {fixed, rounded, text, units} from './decimal';
import {formatNumber} from '../visual-format';

/**
 * Session AF (L1): how the Earn page writes its live figures. Amounts come in as base-unit strings and are shown in the
 * display locale; a rate is a decimal fraction shown as a percentage. Nothing here invents a value: a missing input
 * throws, and the page shows "unavailable" instead.
 */
/** crit2: a number and its unit never part at a line end (a no-break space; it reads as the plain space it replaces). */
export const NB = '\u00a0';
/** A token amount from base units: "425.6M ZIG" (compact) or "50 ZIG". */
export function tokenAmount(baseUnits: string, decimals: number, symbol: string, {compact = false, digits = 2}: {compact?: boolean; digits?: number} = {}): string {
  // Chain amounts can carry decimals of a base unit (annual provisions do): only whole base units are shown.
  const n = Number(text(units(baseUnits.split('.')[0]!, decimals)));
  return `${compact ? large(n, digits) : formatNumber(n, {maximumFractionDigits: n >= 1000 ? 0 : digits})}${NB}${symbol}`;
}
/** 425,559,497 → "425.6 million"; below a million the whole number, grouped. */
export function large(n: number, digits = 2): string {
  if (n >= 1e9) return `${formatNumber(n / 1e9, {maximumFractionDigits: 1})}${NB}billion`;
  if (n >= 1e6) return `${formatNumber(n / 1e6, {maximumFractionDigits: 1})}${NB}million`;
  return formatNumber(n, {maximumFractionDigits: n >= 1000 ? 0 : digits});
}
export const zig = (azig: string, options?: {compact?: boolean; digits?: number}) => tokenAmount(azig, 18, 'ZIG', options);
/**
 * Session AF Gate C (design critique, copy): a source's name in plain words on the page. "LCD" (the chain's public web
 * service) is jargon, so "ZIGChain mainnet LCD (official)" reads "ZIGChain’s official mainnet server" and Polkachu's
 * fallback "Polkachu’s ZIGChain mainnet server". The answers keep their own names (ZIGi and the exports quote those).
 */
export function plainSource(name: string): string {
  const m = /^ZIGChain (mainnet|testnet) LCD(?: \((official|Polkachu)\))?$/.exec(name);
  if (!m) return name;
  return m[2] === 'official' ? `ZIGChain’s official ${m[1]} server` : m[2] === 'Polkachu' ? `Polkachu’s ZIGChain ${m[1]} server` : `a ZIGChain ${m[1]} server`;
}
/** A decimal fraction as a percentage: "0.057427" → "5.74 %". */
export function pct(fraction: string, places = 2): string {
  return `${formatNumber(Number(rounded(fixed(fraction) * 100n, places)), {minimumFractionDigits: places, maximumFractionDigits: places})}${NB}%`;
}
/** A percentage without trailing zeros: "0.05" → "5 %", "0.075" → "7.5 %". */
export const pctShort = (fraction: string, places = 2) => `${formatNumber(Number(rounded(fixed(fraction) * 100n, places)), {maximumFractionDigits: places})}${NB}%`;
/** Basis points as a percentage: 25 → "0.25 %". */
export const bps = (value: number) => `${formatNumber(value / 100, {maximumFractionDigits: 2})}${NB}%`;
/** A plain decimal with at most `places` decimals in the display locale. */
export const decimal = (value: string, places = 4) => formatNumber(Number(rounded(fixed(value), places)), {maximumFractionDigits: places});
export const usd = (value: number) => `$${large(value, 0)}`;
/** "21 days", "10 minutes". */
export function duration(seconds: number): string {
  if (seconds >= 86_400 && seconds % 86_400 === 0) return `${formatNumber(seconds / 86_400)} ${seconds === 86_400 ? 'day' : 'days'}`;
  if (seconds >= 3600 && seconds % 3600 === 0) return `${formatNumber(seconds / 3600)} ${seconds === 3600 ? 'hour' : 'hours'}`;
  return `${formatNumber(Math.round(seconds / 60))} minutes`;
}
/** "updated just now", "updated 3 min ago", "updated 2 h ago" — the age of a read, not a date. */
export function updatedAgo(fetchedAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(fetchedAt)) / 60_000));
  if (!Number.isFinite(minutes)) return 'updated at an unknown time';
  if (minutes < 1) return 'updated just now';
  if (minutes < 120) return `updated ${minutes} min ago`;
  return `updated ${Math.floor(minutes / 60)} h ago`;
}
/** A figure read longer ago than this wears the stale ring. */
export const STALE_AFTER_MS = 15 * 60_000;
