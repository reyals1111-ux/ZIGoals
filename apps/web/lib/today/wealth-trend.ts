import {addLocalDays} from '../local-date';

/**
 * Session AL (GAP-040, P-TK-98): Today's small wealth trend, from Wealth's own recorded history in ONE currency (the one
 * the headline shows; never converted). `points` is the value on each of the last `days` days (that day's last reading,
 * or the latest before it; null before the first reading, never zero); `sinceYesterday` is today's value less
 * yesterday's, null when either is unknown. Exact minor units (bigint) in and out. Pure. It is the person's recorded
 * values, not a market chart: the caller says so.
 */
type History = readonly {currency: string; points: readonly {at: string; value: string}[]}[];
export type WealthTrend = {points: (bigint | null)[]; sinceYesterday: bigint | null; known: number};
export function wealthTrend(history: History, currency: string, today: string, days = 30): WealthTrend | null {
  const series = history.find(h => h.currency === currency);
  if (!series || !series.points.length || days < 2) return null;
  const sorted = [...series.points].filter(p => /^-?\d+$/.test(p.value)).sort((a, b) => a.at.localeCompare(b.at));
  const valueOn = (day: string) => { let v: bigint | null = null; for (const p of sorted) { if (p.at.slice(0, 10) <= day) v = BigInt(p.value); else break; } return v; };
  const points = Array.from({length: days}, (_, i) => valueOn(addLocalDays(today, i - days + 1)));
  const known = points.filter(p => p !== null).length;
  if (known < 2) return null;
  const now = points[days - 1] ?? null, before = points[days - 2] ?? null;
  return {points, sinceYesterday: now === null || before === null ? null : now - before, known};
}
/** The polyline for a trend in a `width` × `height` box (unknown days are skipped; a flat line sits in the middle). */
export function trendPath(points: readonly (bigint | null)[], width: number, height: number): string {
  const known = points.map((v, i) => ({v, i})).filter((p): p is {v: bigint; i: number} => p.v !== null);
  if (known.length < 2) return '';
  const lo = known.reduce((m, p) => p.v < m ? p.v : m, known[0]!.v), hi = known.reduce((m, p) => p.v > m ? p.v : m, known[0]!.v), span = hi - lo;
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * width;
  const y = (v: bigint) => span === 0n ? height / 2 : height - Number(((v - lo) * 1000n) / span) / 1000 * height;
  return known.map((p, n) => `${n ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
}
