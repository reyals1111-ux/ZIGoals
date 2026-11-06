import {formatCurrencyAmount} from '../../../lib/visual-format';

/**
 * Session AK (lane M): an amount in its own currency for the money tools (never converted).
 * Session AL (PRIMITIVES 3f): through the one format layer, so it follows the display locale like every other money figure:
 * USD and EUR are money ("€1,250.00"); any other code is the amount and the code as typed ("1,250 GBP"); not a number: "—".
 */
export const money = (amount: string | number, currency: string) => formatCurrencyAmount(typeof amount === 'number' ? (Number.isFinite(amount) ? amount.toFixed(2) : '') : amount, currency);
/** Whole cents as an exact decimal ("-1250" → "-12.50"); a bigint never goes through a float. */
export const centsText = (cents: number | bigint) => {
  if (typeof cents === 'number') return Number.isFinite(cents) ? (cents / 100).toFixed(2) : '';
  const negative = cents < 0n, digits = (negative ? -cents : cents).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${digits.slice(0, -2)}.${digits.slice(-2)}`;
};
export const moneyCents = (cents: number | bigint, currency: string) => formatCurrencyAmount(centsText(cents), currency);
/** A rounded figure for a chart or a share line: the money without its minor digits ("€1,235", "1.235 €"). */
export const moneyWhole = (amount: string | number, currency: string) => {
  const n = Number(amount);
  return Number.isFinite(n) ? formatCurrencyAmount(String(Math.round(n)), currency).replace(/[.,]00(?=\D*$)/, '') : '—';
};
