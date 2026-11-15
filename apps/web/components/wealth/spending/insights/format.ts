import {formatMonth} from '../../../../lib/visual-format';
import {moneyCents} from '../../money-tools/format';

/** Session AP: the insights' money words, through the one format layer (each amount in its own currency, never converted). */
export const money = (cents: number, currency: string) => moneyCents(cents, currency);
/** A signed amount: "+€12.00", "−€3.50", "€0.00". */
export const signed = (cents: number, currency: string) => `${cents < 0 ? '−' : cents > 0 ? '+' : ''}${moneyCents(Math.abs(cents), currency)}`;
/** "Nov 2026". */
export const monthName = (month: string) => formatMonth(month);
