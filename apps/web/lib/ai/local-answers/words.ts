import {isUnitWord, unitAmount} from '../../goals/goal-units';
import {formatGoalAmount} from '../../goals/goal-amount-text';
import type {DayRange} from '../tools/range';
import {formatDate, formatExactNumber, formatTime} from '../../visual-format';
import {nlDay} from './exact/period';

/**
 * How local answers say things (Session V Part 3): plain English (S8), numbers grouped the same way everywhere, days as
 * the app's one date format ("Mon, Oct 5" in en-US, "Mon, 5 Oct" in en-GB; lib/visual-format.ts), money with its own
 * currency and two decimals, never converted. No judgement words: a figure is a figure.
 */
/** The label every local answer carries (the brief's exact words). */
export const LOCAL_LABEL = 'Answered on your device · no AI used';
/** "Mon, Oct 5" (with the year when it is not `thisYear`: "Mon, Oct 5, 2025"). */
export function dayText(iso: string, thisYear?: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(`${iso}T12:00:00Z`))) return iso;
  return formatDate(iso, {weekday: true, year: !!thisYear && iso.slice(0, 4) !== thisYear});
}
/** Session AV lane 2 (Dutch dates, R5): `dayText` for a Dutch answer, "ma 5 okt" (with the year when it is not `thisYear`: "ma 5 okt 2025"). */
export function nlDayText(iso: string, thisYear?: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(`${iso}T12:00:00Z`))) return iso;
  return nlDay(iso, thisYear ?? iso);
}
/** "this month (Thu, Oct 1 to Mon, Oct 5)", "yesterday (Sun, Oct 4)", "on Mon, Oct 5", "in September 2026 (…)", "since Mon, Sep 14". */
export function span(range: DayRange, today: string): string {
  const year = today.slice(0, 4), short = (iso: string) => dayText(iso, year), label = range.label;
  if (/^[A-Z][a-z]+day \d{4}-\d{2}-\d{2}$/.test(label) || /^\d{4}-\d{2}-\d{2}$/.test(label)) return `on ${short(range.from)}`;
  if (/^since \d{4}-\d{2}-\d{2}$/.test(label)) return `since ${short(range.from)}`;
  if (/^\d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}$/.test(label)) return range.from === range.to ? `on ${short(range.from)}` : `from ${short(range.from)} to ${short(range.to)}`;
  const prefix = /^[A-Z][a-z]+ \d{4}$/.test(label) ? 'in ' : '';
  return range.from === range.to ? `${prefix}${label} (${short(range.from)})` : `${prefix}${label} (${short(range.from)} to ${short(range.to)})`;
}
/**
 * Session AV lane 2 (fr-answers; FR-S-1): `span` for a Dutch answer: "vandaag (zo 29 nov)", "deze week (ma 23 nov t/m
 * zo 29 nov)", "op wo 25 nov", "de afgelopen 7 dagen (…)". A label it does not know is written with its dates only.
 */
const NL_LABELS: Record<string, string> = {today: 'vandaag', yesterday: 'gisteren', 'this week': 'deze week', 'last week': 'vorige week', 'this month': 'deze maand', 'last month': 'vorige maand', 'this year': 'dit jaar', 'last year': 'vorig jaar',
  'the same days last week': 'dezelfde dagen vorige week', 'the same days last month': 'dezelfde dagen vorige maand', 'the same days last year': 'dezelfde dagen vorig jaar', 'the day before': 'de dag ervoor', 'the week before': 'de week ervoor', 'the month before': 'de maand ervoor'};
const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
export function nlSpan(range: DayRange, today: string): string {
  const short = (iso: string) => nlDay(iso, today), label = range.label, dates = range.from === range.to ? short(range.from) : `${short(range.from)} t/m ${short(range.to)}`;
  if (/^since \d{4}-\d{2}-\d{2}$/.test(label)) return `sinds ${short(range.from)}`;
  const last = /^the (last|next) (\d+) (day|week|month)s?$/.exec(label);
  if (last) { const k = Number(last[2]), unit = ({day: ['dag', 'dagen'], week: ['week', 'weken'], month: ['maand', 'maanden']} as Record<string, [string, string]>)[last[3]!]!; return `${last[1] === 'last' ? 'de afgelopen' : 'de komende'} ${k === 1 ? unit[0] : `${k} ${unit[1]}`} (${dates})`; }
  const month = /^([A-Z][a-z]+) (\d{4})$/.exec(label), mi = month ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month[1]!) : -1;
  if (month && mi >= 0) return `in ${NL_MONTHS[mi]} ${month[2]} (${dates})`;
  const word = NL_LABELS[label];
  return word ? `${word} (${dates})` : range.from === range.to ? `op ${dates}` : `van ${dates}`;
}
/** "Mon, Oct 5, 6:55 PM UTC" for an instant (the time in the locale's hour cycle, in UTC as the records say it). */
export function instantText(iso: string, today: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${dayText(d.toISOString().slice(0, 10), today.slice(0, 4))}, ${formatTime(d, {timeZone: 'UTC'})} UTC`;
}
/** Numbers of 1,000 and more that stand before a unit are grouped; dates, years and times are left alone. */
export function groupUnits(text: string): string {
  return text.replace(/(?<![\d.,:-])(\d{4,})(\.\d+)?( (?:kcal|g|mg|mL|steps|minutes|active minutes|glasses|times|reps|check-ins|lb|kg|US fl oz|[A-Z]{3,10}\b))/g, (_m, whole: string, fraction: string | undefined, rest: string) => `${grouped(`${whole}${fraction ?? ''}`)}${rest}`);
}
/** Groups the whole part of a plain decimal text with commas, exactly (no float rounding): "12345.5" → "12,345.5". */
export function grouped(text: string, minFraction = 0, maxFraction = 20): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!m) return text;
  let fraction = (m[3] ?? '').slice(0, maxFraction);
  if (m[3] && m[3].length > maxFraction) { const rounded = Number(`0.${m[3]}`).toFixed(maxFraction); fraction = rounded.slice(2); }
  fraction = fraction.replace(/0+$/, '');
  while (fraction.length < minFraction) fraction += '0';
  // Session AV lane 2 (fr-answers; FR-TJ-4): in the app's display locale (lib/visual-format.ts, the one rule: numbers follow
  // the browser's locale), "1,234.5" in en-US and "1.234,5" in nl-NL or en-NL, so an answer writes its figures as the page does.
  return formatExactNumber(`${m[1]}${m[2]}${fraction ? `.${fraction}` : ''}`);
}
/**
 * Session AV lane 2 (fr-answers; FR-TJ-4): a tool's figure as a sentence writes it. The tools keep their figures exact
 * and plain for a model ("435.59 EUR", "73.5 kg", "120.00 EUR"); an answer writes the same figure in its number locale
 * ("435,59 EUR" in a Dutch answer), every decimal kept. Anything that is not "<number>" or "<number> <unit>" is unchanged.
 */
export function localQty(value: unknown): string {
  const text = String(value ?? ''), m = /^([+-]?)(\d+(?:\.(\d+))?)((?:\s.*)?)$/s.exec(text.trim());
  if (!m) return text;
  return `${m[1] === '+' ? '+' : ''}${grouped(`${m[1] === '-' ? '-' : ''}${m[2]}`, m[3]?.length ?? 0)}${m[4]}`;
}
/** A number for a sentence: whole numbers grouped, at most `digits` decimals. */
export function n(value: number, digits = 1): string {
  return Number.isFinite(value) ? grouped(Number(value.toFixed(digits)).toString(), 0, digits) : 'unknown';
}
const MONEY = new Set(['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK']);
/** "2,100.00 USD" for money, "0.25 BTC" for anything else; "unknown" stays unknown. */
export function amount(value: string, unit: string): string {
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim())) return value;
  // Session AL (L4's request, DV-014, DV-078): a count goal's own word reads "20 books", never "20 BOOKS".
  if (!MONEY.has(unit) && isUnitWord(unit)) return unitAmount(value, unit);
  return MONEY.has(unit) ? `${grouped(value, 2, 2)} ${unit}` : `${grouped(value)} ${unit}`;
}
/**
 * Session AL final pass (DV:Z-003, DV:N-004): a goal's amount in every ZIGi and NOVA answer, in the app's shared goal format
 * (formatGoalAmount, as the Goals page; ".00" dropped): "$0 of $500" in the one-goal answer and in "list my goals" alike.
 * A count goal's own word keeps `amount` ("20 books"). `text` is "500.00 USD" as the goal tools write it.
 */
export function goalMoney(text: unknown): string {
  const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(String(text ?? '').trim());
  if (!m) return localQty(text); // fr-answers (FR-TJ-4): "1.9 h a day" in the display locale too
  return m[2] === 'USD' || m[2] === 'EUR' ? formatGoalAmount(m[1]!, m[2]).replace(/\.00(?!\d)/, '') : amount(m[1]!, m[2]!);
}
/**
 * Session AL third pass (NB-114: "van 30 minutes"): a habit target's English unit in a Dutch answer ("30 minuten", "1 keer").
 * Only the units the app offers; a word the person typed stays as typed.
 */
const NL_UNITS: Record<string, string> = {minutes: 'minuten', minute: 'minuut', hours: 'uur', hour: 'uur', times: 'keer', time: 'keer', glasses: 'glazen', glass: 'glas', pages: 'pagina’s', page: 'pagina', steps: 'stappen', step: 'stap', sessions: 'sessies', session: 'sessie'};
export const nlUnits = (text: string): string => text.replace(/^(\S+) (minutes?|hours?|times?|glass(?:es)?|pages?|steps?|sessions?)$/, (_m, num: string, unit: string) => `${num} ${NL_UNITS[unit] ?? unit}`);
export const plural = (count: number, one: string, many = `${one}s`) => `${n(count, 0)} ${count === 1 ? one : many}`;
/** The words a local answer may never use (no shame, guilt, urgency or persuasion; ADR-011's tone rules). */
export const TONE_FORBIDDEN = /\b(only|failed|failure|missed|lazy|should|must|need to|have to|hurry|don't break|shame|guilt|disappoint|bad|terrible|behind|streak is at risk|you broke|again\?)\b/i;
