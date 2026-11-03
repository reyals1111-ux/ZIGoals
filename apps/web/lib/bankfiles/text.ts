import {MAX_TEXT} from './types';

/**
 * Session AK (A14): text from a bank file made safe to keep and show. Control and bidirectional-override characters go
 * (a payee cannot reorder what is shown), runs of white space become one space, the length is capped, and a leading
 * formula sign (= + - @, a tab, or their full-width forms) is removed and flagged, so a payee can never become a
 * spreadsheet formula when the log is exported again (OWASP "CSV Injection"; csvSafeCell guards the export too).
 */
const CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩﻿]/g;
const FORMULA = /^[=+\-@\t\r\n＝＋－＠]+/;
export function cleanText(raw: string | undefined | null, max = MAX_TEXT): {text: string; flagged: boolean} {
  let text = (raw ?? '').replace(CONTROLS, '').replace(/\s+/g, ' ').trim();
  const flagged = FORMULA.test(text);
  if (flagged) text = text.replace(FORMULA, '').trim();
  return {text: text.slice(0, max), flagged};
}
/** A counter of flagged texts, for one warning per file. */
export function textCleaner() {
  let flagged = 0;
  return {clean(raw: string | undefined | null, max = MAX_TEXT) { const r = cleanText(raw, max); if (r.flagged) flagged++; return r.text; }, get flagged() { return flagged; }};
}
export const flaggedWarning = (n: number) => n ? [`${n} ${n === 1 ? 'text started' : 'texts started'} with a formula sign (= + - @); the sign was removed.`] : [];

/**
 * A bank amount as a positive decimal string and its sign: "1.234,56", "-12.50", "12,", "(3.00)" and "12.50-" read;
 * anything else is null. `style` says which mark is the decimal one; 'auto' takes the last of "." and ",".
 */
export function readAmount(raw: string, style: 'point' | 'comma' | 'auto' = 'auto'): {amount: string; negative: boolean} | null {
  let cell = raw.trim().replace(/[\s ']/g, '');
  let negative = false;
  if (/^\(.*\)$/.test(cell)) { negative = true; cell = cell.slice(1, -1); }
  if (/^[-−]/.test(cell)) { negative = !negative; cell = cell.slice(1); } else if (cell.startsWith('+')) cell = cell.slice(1);
  if (/[-−]$/.test(cell)) { negative = !negative; cell = cell.slice(0, -1); }
  if (!/^[\d.,]+$/.test(cell) || !/\d/.test(cell)) return null;
  const mark = style === 'point' ? '.' : style === 'comma' ? ',' : cell.lastIndexOf(',') > cell.lastIndexOf('.') ? ',' : '.';
  const other = mark === '.' ? ',' : '.';
  const parts = cell.split(mark);
  if (parts.length > 2) return null;
  const whole = parts[0]!.split(other).join(''), fraction = parts[1] ?? '';
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction) || (!whole && !fraction)) return null;
  const w = whole.replace(/^0+(?=\d)/, '') || '0', f = fraction.replace(/0+$/, '');
  if (w.length > 15 || f.length > 8) return null;
  return {amount: f ? `${w}.${f}` : w, negative};
}
export const isZero = (amount: string) => /^0(\.0*)?$/.test(amount);
/** Exact decimal arithmetic on the strings (two's places at most matter here): a + b, signed, in hundred-millionths. */
const SCALE = 100_000_000n;
export const toUnits = (amount: string, negative = false) => { const [w, f = ''] = amount.split('.'); const v = BigInt(w!) * SCALE + BigInt((f + '00000000').slice(0, 8)); return negative ? -v : v; };
export function fromUnits(v: bigint): string {
  const neg = v < 0n, a = neg ? -v : v, w = a / SCALE, f = (a % SCALE).toString().padStart(8, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${w}${f ? `.${f}` : ''}`;
}
/** YYYY-MM-DD when it is a real calendar day, else null. */
export function isoDay(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || y < 1900 || y > 2199 || m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
