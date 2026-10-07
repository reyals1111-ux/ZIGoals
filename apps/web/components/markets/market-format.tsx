import {formatNumber} from '../../lib/visual-format';

/** Session W Parts 15–16: how Portfolio and Markets write a change and a large figure. Unknown reads "Not provided". */
export const percent = (value: string) => `${value.startsWith('-') ? '−' : '+'}${formatNumber(Math.abs(Number(value)), {maximumFractionDigits: 2})}%`;
export const direction = (value: string | null | undefined) => value == null ? 'unknown' : Number(value) > 0 ? 'up' : Number(value) < 0 ? 'down' : 'flat';
/** Large figures in short form ("$1.2T"); callers keep the exact figure in a title or a table. Display only. */
export const compactMoney = (value: string, currency: string) => formatNumber(Number(value), {style: 'currency', currency, notation: 'compact', maximumFractionDigits: 2});
export const compactAmount = (value: string) => formatNumber(Number(value), {notation: 'compact', maximumFractionDigits: 2});
/** A change with its sign (never a colour alone) and, for screen readers, its period. */
export function Change({value, label}: {value: string | null; label: string}) {
  return <span className="data-change" data-direction={direction(value)}>{value === null ? <span className="data-unknown">Not provided</span> : percent(value)}<span className="sr-only"> {label}</span></span>;
}
