import {formatNumber} from '../../lib/visual-format';

/** Session W Parts 15–16: how Portfolio and Markets write a change and a large figure. Unknown reads "Not provided". */
// Session AL (TK-170): a change that rounds to zero reads "0%", never "−0%" beside "+0%".
export const percent = (value: string) => { const size = Math.abs(Number(value)); return Math.round(size * 100) === 0 ? `${formatNumber(0)}%` : `${value.startsWith('-') ? '−' : '+'}${formatNumber(size, {maximumFractionDigits: 2})}%`; };
export const direction = (value: string | null | undefined) => { if (value == null) return 'unknown'; const shown = Math.round(Number(value) * 100); return shown > 0 ? 'up' : shown < 0 ? 'down' : 'flat'; };
/** Large figures in short form ("$1.2T"); callers keep the exact figure in a title or a table. Display only. */
export const compactMoney = (value: string, currency: string) => formatNumber(Number(value), {style: 'currency', currency, notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 2});
export const compactAmount = (value: string) => formatNumber(Number(value), {notation: 'compact', maximumFractionDigits: 2});
/** A change with its sign (never a colour alone) and, for screen readers, its period. */
/** Session AL (TK-044, P16, N-TK-23): while the figures are still loading a missing value reads "Loading…", not "Not provided". */
export function Change({value, label, loading = false}: {value: string | null; label: string; loading?: boolean}) {
  return <span className="data-change" data-direction={direction(value)}>{value === null ? <span className="data-unknown">{loading ? 'Loading…' : 'Not provided'}</span> : percent(value)}<span className="sr-only"> {label}</span></span>;
}
