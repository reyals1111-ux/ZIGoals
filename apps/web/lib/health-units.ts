import { formatNumber } from "./visual-format";

/**
 * Session Z-Cloud Part 4.7 (persona item 7): weight and water read in the person's chosen unit everywhere they are shown
 * (Journal settings → Weight unit, Water unit). Display only: records stay in grams and millilitres, and nothing here is
 * ever written back. Pounds show one decimal, US fluid ounces whole ones; kilograms and millilitres keep today's text.
 */
export type WeightUnit = "kg" | "lb";
export type WaterUnit = "ml" | "fl-oz-us";
export const GRAMS_PER_LB = 453.59237, ML_PER_US_FL_OZ = 29.5735295625;

/** "72.4 kg" or "159.6 lb", from grams. */
export function weightText(grams: number, unit: WeightUnit): string {
  return unit === "lb" ? `${formatNumber(grams / GRAMS_PER_LB, { maximumFractionDigits: 1 })} lb` : `${formatNumber(grams / 1000, { maximumFractionDigits: 3 })} kg`;
}
/** A change in weight, signed ("+0.4 kg", "-1.2 lb"); zero has no sign. */
export function weightChangeText(grams: number, unit: WeightUnit): string {
  return `${grams > 0 ? "+" : grams < 0 ? "-" : ""}${weightText(Math.abs(grams), unit)}`;
}
/** "1,250 mL" or "42 fl oz", from millilitres. */
export function waterText(millilitres: number, unit: WaterUnit): string {
  return unit === "fl-oz-us" ? `${formatNumber(Math.round(millilitres / ML_PER_US_FL_OZ))} fl oz` : `${formatNumber(millilitres, { maximumFractionDigits: 1 })} mL`;
}
/** A weight chart's point in the chosen unit: an integer text with its decimals (kg to the gram, lb to a tenth). */
export function weightChartValue(grams: number, unit: WeightUnit): { value: string; decimals: number; unit: string } {
  return unit === "lb" ? { value: String(Math.round(grams / GRAMS_PER_LB * 10)), decimals: 1, unit: "lb" } : { value: String(grams), decimals: 3, unit: "kg" };
}
