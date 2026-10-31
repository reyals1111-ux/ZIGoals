import {addLocalDays} from '../local-date';

/**
 * Session AK F0 (M42, ADR-033: "Net worth this week" waited for a weekly wealth reading on Today; Session AI's N37 built
 * that reading for the week grid): how tracked wealth changed over the last seven days, from Wealth's own recorded
 * history in ONE currency — the one Today's line names (never converted). The value on a day is that day's last reading
 * or the latest before it; with no reading on or before the day a week ago (or none by today) the change is unknown and
 * null, never zero. Exact: minor units as bigint strings in, a signed bigint out. Pure.
 */
type History = readonly {currency: string; points: readonly {at: string; value: string}[]}[];
export function weekWealthNet(history: History, currency: string, today: string): {change: bigint; from: string} | null {
  const series = history.find(h => h.currency === currency);
  if (!series || series.points.length < 2) return null;
  const sorted = [...series.points].filter(p => /^-?\d+$/.test(p.value)).sort((a, b) => a.at.localeCompare(b.at));
  const valueOn = (day: string) => { let v: bigint | null = null; for (const p of sorted) { if (p.at.slice(0, 10) <= day) v = BigInt(p.value); else break; } return v; };
  const from = addLocalDays(today, -7), before = valueOn(from), now = valueOn(today);
  return before === null || now === null ? null : {change: now - before, from};
}
