import { formatNumber } from "./visual-format";
import { roundHalfUp } from "./numbers/round";

/**
 * Session Z-Cloud Part 4.7 (persona item 7): weight and water read in the person's chosen unit everywhere they are shown
 * (Journal settings → Weight unit, Water unit). Display only: records stay in grams and millilitres, and nothing here is
 * ever written back. Pounds show one decimal, US fluid ounces whole ones; millilitres keep today's text.
 * Session AH (TR10; L-070, M-039, B-073): one rounding rule for weight, one decimal in kilograms and in pounds (165 lb read
 * as "74.843 kg"); the records keep the gram.
 */
export type WeightUnit = "kg" | "lb";
export type WaterUnit = "ml" | "fl-oz-us";
export const GRAMS_PER_LB = 453.59237, ML_PER_US_FL_OZ = 29.5735295625;

/** "72.4 kg" or "159.6 lb", from grams (one decimal in either unit). */
export function weightText(grams: number, unit: WeightUnit): string {
  return unit === "lb" ? `${formatNumber(grams / GRAMS_PER_LB, { maximumFractionDigits: 1 })} lb` : `${formatNumber(grams / 1000, { maximumFractionDigits: 1 })} kg`;
}
/** A change in weight, signed ("+0.4 kg", "-1.2 lb"); zero has no sign. */
export function weightChangeText(grams: number, unit: WeightUnit): string {
  return `${grams > 0 ? "+" : grams < 0 ? "-" : ""}${weightText(Math.abs(grams), unit)}`;
}
/**
 * Session AL sweep 2 (NOVA review M5): with no water entry today every surface says so in the same words NOVA uses
 * (lib/nova/holo/health.ts, core.ts), so a 0 is never read as a measured zero.
 */
export const NO_WATER_TODAY = "No water logged yet today";
/** "1,250 mL" or "42 fl oz", from millilitres. */
export function waterText(millilitres: number, unit: WaterUnit): string {
  return unit === "fl-oz-us" ? `${formatNumber(Math.round(millilitres / ML_PER_US_FL_OZ))} fl oz` : `${formatNumber(millilitres, { maximumFractionDigits: 1 })} mL`;
}
/** A weight chart's point in the chosen unit: an integer text with its decimals (a tenth in either unit, as weightText). */
export function weightChartValue(grams: number, unit: WeightUnit): { value: string; decimals: number; unit: string } {
  return unit === "lb" ? { value: String(Math.round(grams / GRAMS_PER_LB * 10)), decimals: 1, unit: "lb" } : { value: String(Math.round(grams / 100)), decimals: 1, unit: "kg" };
}

/**
 * Session AL (3f, MO-140: a waist chart read 35.4 in as 35.4 cm): every body measure converts through one table before it
 * is compared, charted or checked. Records keep their own base unit (grams, millilitres, micrometres); these convert a
 * typed or stored value between the units the app offers. Round only when showing (measureText), never here.
 */
export type LengthUnit = "cm" | "in";
export type MeasureUnit = "kg" | "lb" | "g" | "cm" | "in" | "mm" | "ml" | "l" | "fl-oz-us" | "kcal" | "kj";
export const CM_PER_IN = 2.54, KJ_PER_KCAL = 4.184;
type Dimension = "mass" | "length" | "volume" | "energy";
/** Each unit's dimension and its size in the dimension's base (grams, millimetres, millilitres, kilocalories). */
const UNITS: Record<MeasureUnit, { dimension: Dimension; base: number; label: string; decimals: number }> = {
  g: { dimension: "mass", base: 1, label: "g", decimals: 0 },
  kg: { dimension: "mass", base: 1000, label: "kg", decimals: 1 },
  lb: { dimension: "mass", base: GRAMS_PER_LB, label: "lb", decimals: 1 },
  mm: { dimension: "length", base: 1, label: "mm", decimals: 0 },
  cm: { dimension: "length", base: 10, label: "cm", decimals: 1 },
  in: { dimension: "length", base: CM_PER_IN * 10, label: "in", decimals: 1 },
  ml: { dimension: "volume", base: 1, label: "mL", decimals: 0 },
  l: { dimension: "volume", base: 1000, label: "L", decimals: 2 },
  "fl-oz-us": { dimension: "volume", base: ML_PER_US_FL_OZ, label: "fl oz", decimals: 0 },
  kcal: { dimension: "energy", base: 1, label: "kcal", decimals: 0 },
  kj: { dimension: "energy", base: 1 / KJ_PER_KCAL, label: "kJ", decimals: 0 },
};
export function isMeasureUnit(unit: string): unit is MeasureUnit { return Object.hasOwn(UNITS, unit); }
/** The unit's label as shown ("mL", "fl oz", "kcal"). */
export function unitLabel(unit: MeasureUnit): string { return UNITS[unit].label; }
/** True when the two units measure the same thing (kg and lb; cm and in), so one can be converted to the other. */
export function sameDimension(a: MeasureUnit, b: MeasureUnit): boolean { return UNITS[a].dimension === UNITS[b].dimension; }
/** `value` in `from`, written in `to`, unrounded. Throws when the units measure different things (kg to cm). */
export function convertUnit(value: number, from: MeasureUnit, to: MeasureUnit): number {
  if (from === to) return value;
  if (!sameDimension(from, to)) throw new Error(`A value in ${unitLabel(from)} can’t be shown in ${unitLabel(to)}.`);
  return value * UNITS[from].base / UNITS[to].base;
}
/**
 * Readings that may each carry their own unit (35.4 in after 91.5 cm), all in `to`, unrounded and in their order: what a
 * chart, a trend or a "since" figure must use (MO-140). A reading in another dimension is left out, never drawn as is.
 */
export function inOneUnit<T extends { value: number; unit: MeasureUnit }>(readings: readonly T[], to: MeasureUnit): (T & { converted: number })[] {
  return readings.filter((r) => Number.isFinite(r.value) && sameDimension(r.unit, to)).map((r) => ({ ...r, converted: convertUnit(r.value, r.unit, to) }));
}
/**
 * A measure as shown: the unit's usual decimals (a tenth of a kg, lb, cm or inch; whole mL, fl oz and kcal), half up,
 * grouped in the display locale: "89.9 cm", "35.4 in", "1,250 mL", "2,000 kcal". `decimals` overrides the usual ones.
 */
export function measureText(value: number, unit: MeasureUnit, decimals = UNITS[unit].decimals): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatNumber(roundHalfUp(value, decimals), { maximumFractionDigits: decimals })} ${UNITS[unit].label}`;
}
/** A length in the chosen unit, from centimetres: "89.9 cm" or "35.4 in". */
export function lengthText(cm: number, unit: LengthUnit): string { return measureText(convertUnit(cm, "cm", unit), unit); }
/** Energy, whole kilocalories: "2,000 kcal". */
export function kcalText(kcal: number): string { return measureText(kcal, "kcal"); }
