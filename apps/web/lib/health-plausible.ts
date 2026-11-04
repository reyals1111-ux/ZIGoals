import {formatNumber} from './visual-format';
import {roundHalfUp} from './numbers/round';
import {weightChangeText, type WeightUnit} from './health-units';
import {addLocalDays} from './local-date';

/**
 * Session AL (P-MO-43; MO-017, MO-109, MO-111, M-129): the soft "are you sure?" checks for values that are possible but
 * unlikely. The hard limits stay in lib/limits (a value outside them is refused); these only ask once, beside the field,
 * and a second Save keeps the value as typed. Information, never advice.
 */

/** Days between two ISO dates (whole days, at least 1). */
const daysApart = (a: string, b: string) => Math.max(1, Math.round(Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000));

/**
 * A weight that differs from the nearest other reading by more than 3 % a day (a typo such as 95 for 59, or lb typed
 * into kg): the sentence to show, or null. `readings` are the journal's other daily readings.
 */
export function weightJumpWarning(grams: number, date: string, readings: readonly {date: string; grams: number}[], unit: WeightUnit): string | null {
  const others = readings.filter(r => r.date !== date && r.date >= addLocalDays(date, -60) && r.date <= addLocalDays(date, 60));
  if (!others.length) return null;
  const near = others.reduce((best, r) => daysApart(r.date, date) < daysApart(best.date, date) ? r : best);
  const days = daysApart(near.date, date), change = grams - near.grams;
  if (Math.abs(change) / near.grams <= 0.03 * days) return null;
  return `That is ${weightChangeText(change, unit)} from your reading ${days === 1 ? 'a day' : `${days} days`} away. If it is right, press Save weight again to keep it.`;
}

/** More than 20 servings, or more than 5 kg of one food, in a single diary entry: the sentence, or null. */
export function servingsWarning(quantityMilli: number, grams: number | null): string | null {
  const servings = quantityMilli / 1000;
  if (servings > 20) return `${formatNumber(roundHalfUp(servings, 1))} servings in one entry is a lot. If it is right, press Log meal again to keep it.`;
  if (grams !== null && grams > 5000) return `${formatNumber(roundHalfUp(grams / 1000, 1))} kg in one entry is a lot. If it is right, press Log meal again to keep it.`;
  return null;
}

/** Less than 5 mL in one water entry (a "0,5" meant as half a litre): the sentence, or null. */
export function tinyWaterWarning(ml: number): string | null {
  return ml > 0 && ml < 5 ? `${formatNumber(roundHalfUp(ml, 1))} mL is less than a sip. If it is right, press Log water again to keep it.` : null;
}

/** Session AL (P-MO-48; MO-108, MO-133): protein, carbs and fat read in tenths of a gram everywhere ("10.3 g", not "10.313 g"). */
export const formatMacroGrams = (mg: number | null) => mg === null ? 'Unknown' : formatNumber(roundHalfUp(mg / 1000, 1), {maximumFractionDigits: 1});
