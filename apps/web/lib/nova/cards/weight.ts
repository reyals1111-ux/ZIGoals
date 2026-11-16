import type {HealthData} from '../../health';
import {dailyData} from '../../health-daily';
import {weightTrend} from '../../health-aa/trend';
import {GRAMS_PER_LB, weightReadingText, weightReadingsText, weightText, type WeightUnit} from '../../health-units';
import {addLocalDays} from '../../local-date';
import {formatDate, formatNumber} from '../../visual-format';
import {RANGE_DAYS, RANGE_WORDS, type WidgetRange} from '../stage/record';
import {daysBetween} from '../widgets/words';

/**
 * Session AM (ADR-038): the figures of the "Weight" widget NOVA makes on request ("What's my weight progress this
 * month?"), read with the Health page's own functions: the daily readings and the weight goal through the weight trend
 * (lib/health-aa/trend.ts weightTrend, as the Weight view and its trend card read them), written in the person's weight
 * unit as the Weight view writes a reading, a change and an average (lib/health-units.ts). Nothing is recomputed another
 * way, and nothing is judged: whether a change is good is only said when the person set a weight goal (toward it is good).
 *
 * Unknown is not zero: a day without a reading is a gap (null) in the line, never a 0; one reading has no change; a
 * range without readings says so and still shows the latest reading there is, with its date.
 */
export type CardRange = {range: WidgetRange; days: number; from: string; to: string; words: string};
/** The days a widget's range covers, ending on `day` (the Health journal's day): 'month' is the 30 days to today. */
export function rangeOf(range: WidgetRange | undefined, day: string, fallback: WidgetRange = 'month'): CardRange {
  const key = range && Object.hasOwn(RANGE_DAYS, range) ? range : fallback, days = RANGE_DAYS[key];
  return {range: key, days, from: addLocalDays(day, -(days - 1)), to: day, words: RANGE_WORDS[key]};
}
/** A record's day in words beside "latest log": "today", "yesterday", "9 Nov", and with its year when that is another year. */
export function logDayWords(date: string, day: string): string {
  const apart = daysBetween(date, day);
  return apart === 0 ? 'today' : apart === 1 ? 'yesterday' : shortDate(date, day);
}
/** A day as "9 Nov", with its year when that is not the year of `day` ("9 Nov 2025"). */
export const shortDate = (date: string, day: string): string => date.slice(0, 4) === day.slice(0, 4) ? formatDate(date, {year: false}) : formatDate(date);
/** The foot's as-of words: the day of the newest record a widget used. */
export const asOfWords = (date: string | null, day: string): string | null => date ? `latest log ${logDayWords(date, day)}` : null;

export type WeightReading = {date: string; grams: number; text: string};
export type WeightChange = {
  grams: number; direction: 'up' | 'down' | 'flat'; since: string;
  /** "down 1.2 kg since 12 Oct", "no change since 12 Oct". */
  text: string;
  /** Toward the person's own weight goal (true), away from it (false); null without a goal or when no nearer or farther. */
  good: boolean | null;
};
export type WeightCard = {
  window: CardRange; unit: WeightUnit;
  /** The newest reading on or before the day, whenever it was logged; null when nothing was ever logged. */
  latest: WeightReading | null;
  /** The newest reading as the hero writes it: the figure and its unit apart ("76.8", "kg"). */
  hero: {value: string; unit: string} | null;
  /** One value a day over the range, in grams; a day without a reading is null. */
  values: (number | null)[];
  /** The readings inside the range, oldest first. */
  readings: WeightReading[];
  change: WeightChange | null;
  /** Why there is no change to show, in words (no reading or one reading in the range); null when there is one. */
  note: string | null;
  target: {grams: number; text: string} | null;
  lowest: WeightReading | null; highest: WeightReading | null;
  average: {grams: number; text: string} | null;
  /** Days with a reading in the range, of the range's days, and the hearts that show that share (some of `of` filled). */
  logged: {days: number; of: number; text: string; hearts: {of: number; filled: number}};
  /** The chart's edge labels: the lowest and highest reading, each left out where the goal line is that edge instead. */
  edges: {min?: string; max?: string; dates: [string, string] | null};
  asOf: string | null;
};

const HEARTS_WEEK = 7, HEARTS = 10;
const reading = (date: string, grams: number, unit: WeightUnit): WeightReading => ({date, grams, text: weightReadingText(grams, unit)});
/** A weight as the kit's hero takes it: "76.8 kg" → the figure and the unit. */
function split(text: string): {value: string; unit: string} {
  const at = text.lastIndexOf(' ');
  return at < 0 ? {value: text, unit: ''} : {value: text.slice(0, at), unit: text.slice(at + 1)};
}
/** Whether a difference reads as nothing at the one decimal a change is written with ("0 kg"). */
const readsAsNone = (grams: number, unit: WeightUnit) => Math.round(Math.abs(grams) / (unit === 'lb' ? GRAMS_PER_LB : 1000) * 10) === 0;

export function weightCard(data: HealthData, day: string, range?: WidgetRange): WeightCard {
  const window = rangeOf(range, day), unit = dailyData(data).preferences.weightUnit;
  const trend = weightTrend(data, day, window.days), goal = trend.goalGrams;
  const values = trend.points.map(p => p.grams);
  const readings = trend.points.flatMap(p => p.grams === null ? [] : [reading(p.date, p.grams, unit)]);
  const latest = trend.latestReading ? reading(trend.latestReading.date, trend.latestReading.grams, unit) : null;
  const first = readings[0], last = readings.at(-1);

  let change: WeightChange | null = null;
  if (first && last && readings.length > 1) {
    const grams = last.grams - first.grams, flat = readsAsNone(grams, unit), direction = flat ? 'flat' : grams > 0 ? 'up' : 'down';
    const since = shortDate(first.date, day);
    const before = goal === null ? 0 : Math.abs(first.grams - goal), after = goal === null ? 0 : Math.abs(last.grams - goal);
    change = {grams, direction, since, text: flat ? `no change since ${since}` : `${direction} ${weightText(Math.abs(grams), unit)} since ${since}`,
      good: goal === null || flat || before === after ? null : after < before};
  }
  const note = change ? null : readings.length === 1 ? `One weigh-in in ${window.words}` : latest ? `No weigh-ins in ${window.words}` : null;

  const grams = readings.map(r => r.grams);
  const lowest = readings.length ? readings.reduce((a, r) => r.grams < a.grams ? r : a) : null, highest = readings.length ? readings.reduce((a, r) => r.grams > a.grams ? r : a) : null;
  const mean = grams.length ? Math.round(grams.reduce((a, g) => a + g, 0) / grams.length) : null;
  const of = window.range === 'week' ? HEARTS_WEEK : HEARTS;
  return {
    window, unit, latest, hero: latest ? split(latest.text) : null, values, readings, change, note,
    target: goal === null ? null : {grams: goal, text: weightText(goal, unit)},
    lowest, highest, average: mean === null ? null : {grams: mean, text: weightReadingsText(mean, grams, unit)},
    logged: {days: readings.length, of: window.days, text: `${formatNumber(readings.length)} of ${formatNumber(window.days)} days logged`, hearts: {of, filled: readings.length / window.days * of}},
    edges: {
      ...(lowest && !(goal !== null && goal < lowest.grams) ? {min: lowest.text} : {}),
      ...(highest && !(goal !== null && goal > highest.grams) ? {max: highest.text} : {}),
      dates: first && last && readings.length > 1 ? [shortDate(window.from, day), 'Today'] : null,
    },
    asOf: asOfWords(latest?.date ?? null, day),
  };
}

/** The same figures as text, for the widget's table. */
export function weightRows(card: WeightCard, day: string): (readonly [string, string])[] {
  if (!card.latest) return [];
  return [
    ['Latest weigh-in', `${card.latest.text}, ${logDayWords(card.latest.date, day)}`],
    [`Change in ${card.window.words}`, card.change ? `${card.change.text}${card.change.good === true ? ' (toward your weight goal)' : card.change.good === false ? ' (away from your weight goal)' : ''}` : card.note ?? '—'],
    ['Your weight goal', card.target ? card.target.text : 'Not set'],
    ['Days logged', card.logged.text],
    ...(card.lowest && card.highest && card.average ? [
      ['Lowest', `${card.lowest.text}, ${shortDate(card.lowest.date, day)}`] as const,
      ['Highest', `${card.highest.text}, ${shortDate(card.highest.date, day)}`] as const,
      ['Average', card.average.text] as const,
    ] : []),
    ...card.readings.map(r => [formatDate(r.date), r.text] as const),
  ];
}
