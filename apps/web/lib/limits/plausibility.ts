import {parseNumberInput} from '../numbers/parse';
import {convertUnit, isMeasureUnit, unitLabel, type MeasureUnit} from '../health-units';
/**
 * Session AH Part 5 (VA2, VA3, B3, B9): one set of plausibility limits for every way a value gets in (forms, Quick add,
 * the Checklist, imports). They guard the write functions only: a record saved before keeps reading as it is. Each check
 * returns the sentence to show next to the field, or null when the value fits.
 */
export const LIMITS = {
  weightKg: {min: 20, max: 400},
  /** Minutes in one day (exercise, a habit's duration, sleep and meditation per day). */
  minutesPerDay: 1440,
  stepsPerDay: 100_000,
  /** Session AH Part 18: one quick counter's repetitions in one day (its four-digit display). */
  repsPerDay: 9_999,
  /** Water in millilitres, after converting fl oz: one entry, and one day's total. */
  waterEntryMl: 5_000,
  waterDayMl: 10_000,
  kcalTarget: 10_000,
  /** Money and asset amounts: at most a trillion. */
  amountMax: 1_000_000_000_000,
  earliestDate: '1990-01-01',
} as const;
export const ML_PER_US_FL_OZ = 29.5735295625, GRAMS_PER_LB = 453.59237;
export class LimitError extends Error { constructor(message: string) { super(message); this.name = 'LimitError'; } }
const fmt = (n: number) => n.toLocaleString('en-GB');
/** Throws the sentence when a check fails. */
export function within(message: string | null): void { if (message) throw new LimitError(message); }

export function repsIssue(count: number): string | null {
  return Number.isInteger(count) && count >= 0 && count <= LIMITS.repsPerDay ? null : `Enter a whole number from 0 to ${fmt(LIMITS.repsPerDay)}.`;
}
export function weightIssue(grams: number): string | null {
  const kg = grams / 1000;
  return Number.isFinite(kg) && kg >= LIMITS.weightKg.min && kg <= LIMITS.weightKg.max ? null
    : `Enter a weight from ${LIMITS.weightKg.min} to ${LIMITS.weightKg.max} kg (${Math.round(LIMITS.weightKg.min * 1000 / GRAMS_PER_LB)} to ${fmt(Math.round(LIMITS.weightKg.max * 1000 / GRAMS_PER_LB))} lb).`;
}
export function minutesIssue(minutes: number, what = 'minutes'): string | null {
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= LIMITS.minutesPerDay ? null : `A day has ${fmt(LIMITS.minutesPerDay)} minutes: enter at most that many ${what}.`;
}
/**
 * Session AL fifth pass (G-044): a value a person keeps per day in their own unit ("hours", "min") is a share of one day:
 * at most 24 hours (1,440 minutes). The unit word is read loosely ("h", "hrs", "hours a day", "minutes of screen time");
 * any other unit ("pages", "EUR") has no day limit here and returns null.
 */
const HOUR_WORD = /^(h|hr|hrs|hour|hours|uur|uren|stunden?)\b/i, MINUTE_WORD = /^(m|min|mins|minute|minutes|minuten)\b/i;
export function dayTimeUnit(unit: string): {perDay: number; word: string} | null {
  const u = unit.trim();
  return HOUR_WORD.test(u) ? {perDay: 24, word: 'hours'} : MINUTE_WORD.test(u) ? {perDay: LIMITS.minutesPerDay, word: 'minutes'} : null;
}
/** More than one day holds, in the unit's own words, or null. */
export function perDayUnitIssue(value: number, unit: string): string | null {
  const t = dayTimeUnit(unit);
  if (!t || !Number.isFinite(value) || value <= t.perDay) return null;
  return `A day holds at most ${fmt(t.perDay)} ${t.word}. Enter from 0 to ${fmt(t.perDay)} ${t.word}.`;
}
/** Possible but unlikely: 20 hours (1,200 minutes) or more of one day. The question to ask once before keeping it, or null. */
export function perDayUnitWarning(value: number, unit: string): string | null {
  const t = dayTimeUnit(unit);
  if (!t || !Number.isFinite(value) || value > t.perDay || value < t.perDay * 20 / 24) return null;
  return `${value.toLocaleString('en-GB', {maximumFractionDigits: 2})} ${t.word} is most of a day. If it is right, press Save again to keep it.`;
}
export function stepsIssue(steps: number): string | null {
  return Number.isFinite(steps) && steps >= 0 && steps <= LIMITS.stepsPerDay ? null : `Enter up to ${fmt(LIMITS.stepsPerDay)} steps for one day.`;
}
/** A water amount in millilitres (already converted). */
export function waterEntryIssue(ml: number): string | null {
  return Number.isFinite(ml) && ml > 0 && ml <= LIMITS.waterEntryMl ? null : `Enter from 1 to ${fmt(LIMITS.waterEntryMl)} mL (${Math.floor(LIMITS.waterEntryMl / ML_PER_US_FL_OZ)} fl oz) at a time.`;
}
export function waterDayIssue(totalMl: number): string | null {
  return totalMl <= LIMITS.waterDayMl ? null : `That would make more than ${fmt(LIMITS.waterDayMl)} mL in one day. Check the amount, or correct an earlier entry.`;
}
export function kcalTargetIssue(kcal: number | null | undefined): string | null {
  return kcal === null || kcal === undefined || (Number.isFinite(kcal) && kcal > 0 && kcal <= LIMITS.kcalTarget) ? null : `Enter a daily target up to ${fmt(LIMITS.kcalTarget)} kcal.`;
}
export function amountIssue(value: number): string | null {
  return Number.isFinite(value) && value >= 0 && value <= LIMITS.amountMax ? null : 'Enter an amount up to a trillion.';
}
/** A day for a record: from 1990 to today, or to a year ahead when the future is allowed (a plan, a target date). */
export function dateIssue(date: string, today: string, future: 'past' | 'year-ahead' = 'past'): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choose a date.';
  if (date < LIMITS.earliestDate) return 'Choose a date from 1990 on.';
  const ahead = `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`;
  if (future === 'past' && date > today) return 'Choose today or an earlier day.';
  if (future === 'year-ahead' && date > ahead) return 'Choose a date within a year from today.';
  return null;
}
/**
 * Session AH (HE5, C11): a food's label values must be possible. Pure fat is 9 kcal a gram, so 100 g holds at most
 * 900 kcal; protein, carbs and fat together cannot weigh more than the serving; one serving stays under 10,000 kcal.
 * Weights in mg, the serving in grams (null when the label gives a volume, which needs no mass check).
 */
export function foodIssue(n: {kcal: number | null; proteinMg: number | null; carbsMg: number | null; fatMg: number | null}, servingGrams: number | null): string | null {
  if (n.kcal !== null && n.kcal > LIMITS.kcalTarget) return `One serving can hold at most ${fmt(LIMITS.kcalTarget)} kcal. Check the label.`;
  if (servingGrams === null || servingGrams <= 0) return null;
  if (n.kcal !== null && n.kcal > servingGrams * 9 + 5) return `${fmt(n.kcal)} kcal in ${fmt(servingGrams)} g is more than pure fat holds (900 kcal per 100 g). Check the calories or the serving weight.`;
  const macroGrams = ((n.proteinMg ?? 0) + (n.carbsMg ?? 0) + (n.fatMg ?? 0)) / 1000;
  if (macroGrams > servingGrams + 1) return `Protein, carbs and fat add up to ${fmt(Math.round(macroGrams))} g, more than the ${fmt(servingGrams)} g serving. Check the label.`;
  return null;
}
/** A fee much larger than the trade it belongs to reads as a typing slip: a warning, never a refusal. */
export function feeWarning(fee: number, trade: number): string | null {
  return fee > 0 && trade > 0 && fee > trade ? 'The fee is larger than the trade itself. Check it before saving.' : null;
}
/** A record's day at the write layer: from 1990 on (1900 was saved). The page itself refuses future days, in the journal's
 * own zone; a clock-based upper bound here would refuse a restored backup from a device ahead of this one. */
export function recordDayIssue(date: string): string | null {
  return !/^\d{4}-\d{2}-\d{2}$/.test(date) ? 'Choose a date.' : date < LIMITS.earliestDate ? 'Choose a date from 1990 on.' : null;
}
/** Base units (`decimals` places) of an asset quantity: at most 18 digits before the decimal point (some tokens are held
 * in the trillions; 27-digit quantities were saved). */
export function quantityUnitsIssue(units: bigint, decimals: number): string | null {
  return units < 10n ** 18n * 10n ** BigInt(decimals) ? null : 'Enter a quantity with at most 18 digits before the decimal point.';
}
/** Base units of a money value: at most a trillion. */
export function moneyUnitsIssue(units: bigint, decimals: number): string | null {
  return units <= BigInt(LIMITS.amountMax) * 10n ** BigInt(decimals) ? null : 'Enter an amount up to a trillion.';
}


/*
 * Session AL (3d, LS-007, BUG-009): the ONE limits table, one row per kind of value a person types, and one
 * validateValue(kind, raw, unit?) that every entry point calls the same way — a form, Quick add, a ZIGi or NOVA confirm
 * card, the Checklist and an import. It reads the text with parseNumberInput (decimal commas, grouping), converts the
 * unit (lb → kg, in → cm, fl oz → mL) and checks the row, and answers {ok, value, error} with a plain sentence for the
 * field. The write functions above keep their own checks (a store refuses what this would refuse); the rows here use the
 * same numbers (LIMITS), so a form and its store never disagree.
 */

type NumberRow = {
  /** What the sentence calls it ("a weight"). */
  noun: string;
  /** The unit `value` comes back in, and the units a person may type it in (the first is the default). */
  base: MeasureUnit | null; units?: readonly MeasureUnit[];
  /** The plain word after the range when the kind has no unit ("steps", "hours"). */
  word?: string;
  min: number; max: number;
  /** Zero is refused (a target, a quantity, a water entry). */
  aboveZero?: boolean;
  whole?: boolean; maxDecimals?: number;
  /** Units typed in whole numbers only (a glass of water in mL), while the row's other units keep `maxDecimals`. */
  wholeUnits?: readonly MeasureUnit[];
};
type TextRow = {noun: string; max: number; required: boolean; multiline: boolean};
export const VALUE_LIMITS = {
  weight: {noun: 'a weight', base: 'kg', units: ['kg', 'lb'], min: LIMITS.weightKg.min, max: LIMITS.weightKg.max, maxDecimals: 2},
  height: {noun: 'a height', base: 'cm', units: ['cm', 'in'], min: 50, max: 272, maxDecimals: 1},
  /** A body circumference: waist, hips, chest, neck, arm, thigh. */
  waist: {noun: 'a measurement', base: 'cm', units: ['cm', 'in'], min: 10, max: 250, maxDecimals: 1},
  /** One water entry (a day's total is waterDayIssue). */
  water: {noun: 'an amount of water', base: 'ml', units: ['ml', 'fl-oz-us', 'l'], min: 0, max: LIMITS.waterEntryMl, aboveZero: true, maxDecimals: 2},
  /** Session AL fifth pass (LS-056): one water entry logged with a tap or a stepper (the Checklist, ZIGi's card): whole
   *  millilitres ("Log 2.5 ml" was kept), fl oz to two decimals. The Health form keeps `water` (a sub-sip amount is asked). */
  waterStep: {noun: 'an amount of water', base: 'ml', units: ['ml', 'fl-oz-us'], min: 0, max: LIMITS.waterEntryMl, aboveZero: true, maxDecimals: 2, wholeUnits: ['ml']},
  /** One food, one meal or a daily target. */
  kcal: {noun: 'calories', base: 'kcal', units: ['kcal', 'kj'], min: 0, max: LIMITS.kcalTarget, maxDecimals: 1},
  /** Protein, carbs or fat in one food or one day, in grams. */
  macro: {noun: 'an amount', base: 'g', units: ['g'], min: 0, max: 1_000, maxDecimals: 1},
  sleepHours: {noun: 'hours of sleep', base: null, word: 'hours', min: 0, max: 24, maxDecimals: 2},
  minutes: {noun: 'minutes', base: null, word: 'minutes', min: 0, max: LIMITS.minutesPerDay, maxDecimals: 2},
  steps: {noun: 'steps', base: null, word: 'steps', min: 0, max: LIMITS.stepsPerDay, whole: true},
  reps: {noun: 'a count', base: null, min: 0, max: LIMITS.repsPerDay, whole: true},
  /** A habit's or a counter's whole count. */
  count: {noun: 'a count', base: null, min: 0, max: 1_000_000, whole: true},
  /** Money in USD or EUR: the currency's minor digits at most. */
  money: {noun: 'an amount', base: null, min: 0, max: LIMITS.amountMax, maxDecimals: 2},
  /** A quantity of an asset (BTC, a share count): 18 digits before the point, 18 after. */
  quantity: {noun: 'a quantity', base: null, min: 0, max: 1e18, aboveZero: true, maxDecimals: 18},
  /** A Goal's target, in money or in its own unit ("20 books"). */
  goalTarget: {noun: 'a target', base: null, min: 0, max: LIMITS.amountMax, aboveZero: true, maxDecimals: 8},
  percent: {noun: 'a percentage', base: null, word: '%', min: 0, max: 100, maxDecimals: 2},
} as const satisfies Record<string, NumberRow>;
/** Characters, as a field's maxLength and a schema's .max() count them (UTF-16 code units). */
export const TEXT_LIMITS = {
  /** A thing's name: a Goal, a habit, an account, a person, a food. */
  name: {noun: 'A name', max: 80, required: true, multiline: false},
  /** A task's or an entry's title. */
  title: {noun: 'A title', max: 120, required: true, multiline: false},
  /** A short label on a chip or a path point. */
  label: {noun: 'A label', max: 40, required: true, multiline: false},
  /** A note on a record. */
  note: {noun: 'A note', max: 500, required: false, multiline: true},
  /** A journal entry, a Goal's notes, a long description. */
  longNote: {noun: 'This text', max: 2_000, required: false, multiline: true},
  /** A message to ZIGi or NOVA (lib/ai/chats.ts MAX_INPUT_CHARS). */
  message: {noun: 'A message', max: 15_000, required: true, multiline: true},
} as const satisfies Record<string, TextRow>;
export type NumberKind = keyof typeof VALUE_LIMITS;
export type TextKind = keyof typeof TEXT_LIMITS;
export type ValueKind = NumberKind | TextKind | 'currency';
/**
 * What validateValue answers. `value` is in the kind's base unit (kg, cm, mL, kcal, g) or the trimmed text; `input` is
 * the number in the unit it was typed in; `text` is the canonical decimal as typed ("1234.56"), for exact money
 * (parseUnits). `error` is the sentence for the field; null when ok.
 */
export type Validated<V> =
  | {ok: true; value: V; input: V; text: string; unit: string | null; error: null}
  | {ok: false; value: null; input: null; text: null; unit: string | null; error: string};
const bad = (error: string, unit: string | null = null): Validated<never> => ({ok: false, value: null, input: null, text: null, unit, error});
const say = (n: number) => n.toLocaleString('en-GB', {maximumFractionDigits: 2});

export function validateValue(kind: TextKind | 'currency', raw: unknown): Validated<string>;
export function validateValue(kind: NumberKind, raw: unknown, unit?: string): Validated<number>;
export function validateValue(kind: ValueKind, raw: unknown, unit?: string): Validated<number> | Validated<string> {
  if (kind === 'currency') return currencyValue(raw);
  if (Object.hasOwn(TEXT_LIMITS, kind)) return textValue(TEXT_LIMITS[kind as TextKind], raw);
  return numberValue(kind as NumberKind, raw, unit);
}

function numberValue(kind: NumberKind, raw: unknown, unitIn?: string): Validated<number> {
  const row: NumberRow = VALUE_LIMITS[kind];
  // The unit: a measure's own units only ("lb" for a weight, never "cm"); money in USD or EUR.
  let unit: MeasureUnit | null = row.base;
  const maxDecimals = row.whole ? 0 : row.maxDecimals ?? 2;
  if (kind === 'money') {
    if (unitIn !== undefined && unitIn !== 'USD' && unitIn !== 'EUR') return bad('Choose US dollars (USD) or euros (EUR).', unitIn);
  } else if (row.base && unitIn !== undefined) {
    const u = unitIn === 'mL' ? 'ml' : unitIn === 'L' ? 'l' : unitIn === 'fl oz' ? 'fl-oz-us' : unitIn;
    if (!isMeasureUnit(u) || !row.units?.includes(u)) return bad(`Choose ${row.units!.map(x => unitLabel(x)).join(' or ')}.`, unitIn);
    unit = u;
  }
  const shownUnit = kind === 'money' ? unitIn ?? null : unit;
  if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return bad(`Enter ${row.noun}.`, shownUnit);
  if (typeof raw !== 'string' && typeof raw !== 'number') return bad(`Enter ${row.noun}.`, shownUnit);
  const parsed = parseNumberInput(raw);
  if (!parsed.ok) return bad(parsed.error, shownUnit);
  // The range in the unit typed: the lowest bound up and the highest down, so the sentence and the base check agree.
  // Whole bounds when the range is wide (45 to 881 lb), tenths when narrow.
  const conv = (v: number) => unit && row.base ? convertUnit(v, row.base, unit) : v, step = conv(row.max) - conv(row.min) > 10 ? 1 : 10;
  const lo = unit && row.base ? Math.ceil(conv(row.min) * step - 1e-9) / step || 0 : row.min;
  const hi = unit && row.base ? Math.floor(conv(row.max) * step + 1e-9) / step : row.max;
  const label = unit ? ` ${unitLabel(unit)}` : row.word === '%' ? '%' : row.word ? ` ${row.word}` : '';
  const range = row.aboveZero ? `more than 0 and at most ${say(hi)}${label}` : `from ${say(lo)} to ${say(hi)}${label}`;
  const wholeUnit = !row.whole && !!unit && !!row.wholeUnits?.includes(unit);
  const sentence = wholeUnit ? `Enter ${row.noun} in whole${label}, ${range}.` : `Enter ${row.whole ? 'a whole number' : row.noun} ${range}.`;
  const decimals = parsed.text.split('.')[1]?.length ?? 0;
  if ((row.whole || wholeUnit) && decimals > 0 && !/^0+$/.test(parsed.text.split('.')[1]!)) return bad(sentence, shownUnit);
  if (!row.whole && decimals > maxDecimals) return bad(maxDecimals === 0 ? sentence : `Use at most ${maxDecimals} decimal ${maxDecimals === 1 ? 'place' : 'places'}.`, shownUnit);
  const input = parsed.value;
  if (input < lo || input > hi || (row.aboveZero && input <= 0)) return bad(sentence, shownUnit);
  const value = unit && row.base ? convertUnit(input, unit, row.base) : input;
  return {ok: true, value, input, text: parsed.text, unit: shownUnit, error: null};
}

function textValue(row: TextRow, raw: unknown): Validated<string> {
  const typed = typeof raw === 'string' ? raw : raw === null || raw === undefined ? '' : String(raw);
  // One line collapses its runs of spaces; a note keeps its line breaks and only loses the blank edges.
  const value = row.multiline ? typed.replace(/\r\n?/g, '\n').trim() : typed.replace(/\s+/g, ' ').trim();
  if (!value) return row.required ? bad(`${row.noun} can’t be empty.`) : {ok: true, value: '', input: '', text: '', unit: null, error: null};
  if (value.length > row.max) return bad(`${row.noun} can be at most ${say(row.max)} characters (this one has ${say(value.length)}).`);
  return {ok: true, value, input: value, text: value, unit: null, error: null};
}

/** TK-014: only the two currencies Alpha keeps. "usd", "$", "€" and "euro" are read; any other code is refused, never kept. */
function currencyValue(raw: unknown): Validated<string> {
  const typed = typeof raw === 'string' ? raw.trim() : '';
  const code = /^(usd|us\$|\$|dollars?|us dollars?)$/i.test(typed) ? 'USD' : /^(eur|€|euros?)$/i.test(typed) ? 'EUR' : null;
  if (!typed) return bad('Choose a currency: US dollars (USD) or euros (EUR).');
  if (!code) return bad(`ZIGoals keeps US dollars (USD) and euros (EUR) for now; “${typed.slice(0, 12)}” isn’t one of them.`);
  return {ok: true, value: code, input: code, text: code, unit: null, error: null};
}
