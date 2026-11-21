import {addLocalDays} from '../local-date';

/**
 * Session AV (owner follow-up 1, F-NUTRIENT-RANGE; Cronometer's chosen range): the days the nutrient report averages —
 * 7, 30 or 90 days up to the day shown, or From–To of the person's choosing (at most a year, never past the day shown).
 * The averages themselves are lib/health-aa/nutrient-report.ts nutrientAverages (a day without a value is never zero). Pure.
 */
export const MAX_RANGE_DAYS = 366;
const dayNo = (d: string) => Math.round(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
export type ReportSpan = 'day' | 'week' | 30 | 90 | 'custom';
export function rangeOf(span: ReportSpan, date: string, from: string, to: string): {start: string; end: string; days: number; capped: boolean} {
  if (span !== 'custom') { const days = span === 'week' || span === 'day' ? 7 : span; return {start: addLocalDays(date, -(days - 1)), end: date, days, capped: false}; }
  const end = to > date ? date : to, start = from > end ? end : from, span_ = dayNo(end) - dayNo(start) + 1, days = Math.min(MAX_RANGE_DAYS, Math.max(1, span_));
  return {start: addLocalDays(end, -(days - 1)), end, days, capped: span_ > MAX_RANGE_DAYS};
}
