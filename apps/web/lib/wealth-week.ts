/**
 * Session AL (RR-14): the ONE way tracked wealth's change over a period is worked out, for Today's line ("+$120 this
 * week") and the Life review's Wealth chapter, so the two never show different figures for the same week.
 *
 * - The start is Wealth's own recorded history in ONE currency (never converted): the last reading on or before `before`
 *   (the day just ahead of the period). With `firstInside`, a series that only begins inside the period starts at its
 *   first reading there (the review shows both figures, so the reader sees where it starts); otherwise it is unknown.
 * - The end is the figure shown beside the change. For a period that ends now that is today's live total (`now`), the
 *   same total Wealth and Today show; for a past period it is the last reading on or before `end`.
 * - Unknown is never zero: while any holding has no value right now (`now.complete` false, for example while automatic
 *   prices are unavailable), today's total is only a part of what was recorded, so the change is unknown ('incomplete')
 *   rather than a fall that never happened. No reading to start from is 'no-start'.
 *
 * Exact: minor units as bigint; pure.
 */
import {addLocalDays} from './local-date';

type Series = {currency: string; points: readonly {at: string; value: string}[]};
export type WealthChange = {currency: string; start: bigint | null; end: bigint | null; change: bigint | null; unknown?: 'no-start' | 'no-end' | 'incomplete'};

export function wealthChange({history, currency, before, end, now, firstInside = false}: {
  history: readonly Series[]; currency: string;
  /** The day whose last reading starts the period (the day before its first day). */ before: string;
  /** The period's last day. */ end: string;
  /** Today's live total in this currency, when the period ends today; `complete` is false while a holding has no value. */
  now?: {value: bigint; complete: boolean};
  firstInside?: boolean;
}): WealthChange {
  const series = history.find(h => h.currency === currency);
  const sorted = series ? [...series.points].filter(p => /^-?\d+$/.test(p.value)).sort((a, b) => a.at.localeCompare(b.at)) : [];
  const valueOn = (day: string) => { let v: bigint | null = null; for (const p of sorted) { if (p.at.slice(0, 10) <= day) v = BigInt(p.value); else break; } return v; };
  const inside = firstInside ? sorted.find(p => p.at.slice(0, 10) > before && p.at.slice(0, 10) <= end) : undefined;
  const start = valueOn(before) ?? (inside ? BigInt(inside.value) : null);
  if (now && !now.complete) return {currency, start, end: now.value, change: null, unknown: 'incomplete'};
  const last = now ? now.value : valueOn(end);
  if (start === null) return {currency, start, end: last, change: null, unknown: 'no-start'};
  if (last === null) return {currency, start, end: last, change: null, unknown: 'no-end'};
  return {currency, start, end: last, change: last - start};
}

/** Today's "this week": the seven days to today, ending at the total the line shows. */
export const weekWealthChange = (history: readonly Series[], currency: string, today: string, now: {value: bigint; complete: boolean}) =>
  wealthChange({history, currency, before: addLocalDays(today, -7), end: today, now});
