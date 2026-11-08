import {formatNumber} from './visual-format';
import {roundHalfUp} from './numbers/round';
import {weightChangeText, weightReadingText, weightText, type WeightUnit} from './health-units';
import {addLocalDays} from './local-date';

/**
 * Session AL (P-MO-43; MO-017, MO-109, MO-111, M-129): the soft "are you sure?" checks for values that are possible but
 * unlikely. The hard limits stay in lib/limits (a value outside them is refused); these only ask once, beside the field,
 * and a second Save keeps the value as typed. Information, never advice.
 */

/** Days between two ISO dates (whole days, at least 1). */
const daysApart = (a: string, b: string) => Math.max(1, Math.round(Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000));

/**
 * A weight that differs from the nearest reading by more than 3 % a day (a typo such as 95 for 59, or lb typed into kg):
 * the sentence to show, or null. `readings` are the journal's daily readings. Session AL fourth pass (MO-017): the
 * reading being corrected on the same day counts too (300 lb over today's 178.2 lb said "a day away"), and the change
 * and the reading are written to the tenth ("+121.8 lb", not "+121 lb").
 */
export function weightJumpWarning(grams: number, date: string, readings: readonly {date: string; grams: number}[], unit: WeightUnit): string | null {
  const near = (date: string) => readings.filter(r => r.date >= addLocalDays(date, -60) && r.date <= addLocalDays(date, 60));
  const others = near(date);
  if (!others.length) return null;
  const gap = (r: {date: string}) => r.date === date ? 0 : daysApart(r.date, date);
  const nearest = others.reduce((best, r) => gap(r) < gap(best) ? r : best);
  const days = gap(nearest), change = grams - nearest.grams;
  if (Math.abs(change) / nearest.grams <= 0.03 * Math.max(1, days)) return null;
  const where = days === 0 ? `this day’s reading of ${weightText(nearest.grams, unit)}` : `your reading ${days === 1 ? 'a day' : `${days} days`} away`;
  return `That is ${weightChangeText(change, unit)} from ${where}. If it is right, press Save weight again to keep it.`;
}

/** Session AL fourth pass (N-MO-14, N-NB-10): a reading as it was typed, to two decimals ("70.55 kg", not "70.6 kg"). */
export function weightAsEntered(grams: number, unit: WeightUnit): string {
  return weightReadingText(grams, unit); // fifth pass (N-MO-14): the one reading format, lib/health-units
}

/**
 * Session AL fourth pass (DV-012a, DV-052a, G-044): a sleep target or a night of 20 hours or more is possible but
 * unlikely (24 h is every hour of the day): the question to ask once before keeping it, or null. For the Goals lane's
 * Average goal (sleep) form and any sleep-hours entry.
 */
export function sleepHoursWarning(hours: number): string | null {
  return Number.isFinite(hours) && hours >= 20 && hours <= 24 ? `${formatNumber(roundHalfUp(hours, 1))} hours of sleep is most of the day. If it is right, press Save again to keep it.` : null;
}

/** More than 20 servings, or more than 5 kg of one food, in a single diary entry: the sentence, or null. */
export function servingsWarning(quantityMilli: number, grams: number | null): string | null {
  const servings = quantityMilli / 1000;
  if (servings > 20) return `${formatNumber(roundHalfUp(servings, 1))} servings in one entry is a lot. If it is right, press Log to diary again to keep it.`;
  if (grams !== null && grams > 5000) return `${formatNumber(roundHalfUp(grams / 1000, 1))} kg in one entry is a lot. If it is right, press Log to diary again to keep it.`;
  return null;
}

/** Less than 5 mL in one water entry (a "0,5" meant as half a litre): the sentence, or null. */
export function tinyWaterWarning(ml: number): string | null {
  return ml > 0 && ml < 5 ? `${formatNumber(roundHalfUp(ml, 1))} mL is less than a sip. If it is right, press Log water again to keep it.` : null;
}

/** Session AL (P-MO-48; MO-108, MO-133): protein, carbs and fat read in tenths of a gram everywhere ("10.3 g", not "10.313 g"). */
export const formatMacroGrams = (mg: number | null) => mg === null ? 'Unknown' : formatNumber(roundHalfUp(mg / 1000, 1), {maximumFractionDigits: 1});
