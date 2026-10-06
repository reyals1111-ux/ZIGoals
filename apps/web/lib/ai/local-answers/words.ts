import type {DayRange} from '../tools/range';

/**
 * How local answers say things (Session V Part 3): plain English (S8), numbers grouped the same way everywhere, days as
 * "Mon 5 Oct", money with its own currency and two decimals, never converted. No judgement words: a figure is a figure.
 */
/** The label every local answer carries (the brief's exact words). */
export const LOCAL_LABEL = 'Answered on your device · no AI used';
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Mon 5 Oct" (with the year when it is not `thisYear`). */
export function dayText(iso: string, thisYear?: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const year = iso.slice(0, 4);
  return `${WEEKDAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}${thisYear && year !== thisYear ? ` ${year}` : ''}`;
}
/** "this month (Thu 1 Oct to Mon 5 Oct)", "yesterday (Sun 4 Oct)", "on Mon 5 Oct", "in September 2026 (…)", "since Mon 14 Sep". */
export function span(range: DayRange, today: string): string {
  const year = today.slice(0, 4), short = (iso: string) => dayText(iso, year), label = range.label;
  if (/^[A-Z][a-z]+day \d{4}-\d{2}-\d{2}$/.test(label) || /^\d{4}-\d{2}-\d{2}$/.test(label)) return `on ${short(range.from)}`;
  if (/^since \d{4}-\d{2}-\d{2}$/.test(label)) return `since ${short(range.from)}`;
  if (/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(label)) return range.from === range.to ? `on ${short(range.from)}` : `from ${short(range.from)} to ${short(range.to)}`;
  const prefix = /^[A-Z][a-z]+ \d{4}$/.test(label) ? 'in ' : '';
  return range.from === range.to ? `${prefix}${label} (${short(range.from)})` : `${prefix}${label} (${short(range.from)} to ${short(range.to)})`;
}
/** "Mon 5 Oct, 18:55 UTC" for an instant. */
export function instantText(iso: string, today: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${dayText(d.toISOString().slice(0, 10), today.slice(0, 4))}, ${d.toISOString().slice(11, 16)} UTC`;
}
/** Numbers of 1,000 and more that stand before a unit are grouped; dates, years and times are left alone. */
export function groupUnits(text: string): string {
  return text.replace(/(?<![\d.,:-])(\d{4,})((?:\.\d+)? (?:kcal|g|mg|mL|steps|minutes|active minutes|glasses|times|reps|check-ins|lb|kg|US fl oz|[A-Z]{3,10}\b))/g, (_m, whole: string, rest: string) => `${grouped(whole)}${rest}`);
}
/** Groups the whole part of a plain decimal text with commas, exactly (no float rounding): "12345.5" → "12,345.5". */
export function grouped(text: string, minFraction = 0, maxFraction = 20): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!m) return text;
  let fraction = (m[3] ?? '').slice(0, maxFraction);
  if (m[3] && m[3].length > maxFraction) { const rounded = Number(`0.${m[3]}`).toFixed(maxFraction); fraction = rounded.slice(2); }
  fraction = fraction.replace(/0+$/, '');
  while (fraction.length < minFraction) fraction += '0';
  return `${m[1]}${m[2]!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}
/** A number for a sentence: whole numbers grouped, at most `digits` decimals. */
export function n(value: number, digits = 1): string {
  return Number.isFinite(value) ? grouped(Number(value.toFixed(digits)).toString(), 0, digits) : 'unknown';
}
const MONEY = new Set(['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK']);
/** "2,100.00 USD" for money, "0.25 BTC" for anything else; "unknown" stays unknown. */
export function amount(value: string, unit: string): string {
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim())) return value;
  return MONEY.has(unit) ? `${grouped(value, 2, 2)} ${unit}` : `${grouped(value)} ${unit}`;
}
export const plural = (count: number, one: string, many = `${one}s`) => `${n(count, 0)} ${count === 1 ? one : many}`;
/** The words a local answer may never use (no shame, guilt, urgency or persuasion; ADR-011's tone rules). */
export const TONE_FORBIDDEN = /\b(only|failed|failure|missed|lazy|should|must|need to|have to|hurry|don't break|shame|guilt|disappoint|bad|terrible|behind|streak is at risk|you broke|again\?)\b/i;
