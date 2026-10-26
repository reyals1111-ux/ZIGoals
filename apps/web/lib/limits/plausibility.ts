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

export function weightIssue(grams: number): string | null {
  const kg = grams / 1000;
  return Number.isFinite(kg) && kg >= LIMITS.weightKg.min && kg <= LIMITS.weightKg.max ? null
    : `Enter a weight from ${LIMITS.weightKg.min} to ${LIMITS.weightKg.max} kg (${Math.round(LIMITS.weightKg.min * 1000 / GRAMS_PER_LB)} to ${fmt(Math.round(LIMITS.weightKg.max * 1000 / GRAMS_PER_LB))} lb).`;
}
export function minutesIssue(minutes: number, what = 'minutes'): string | null {
  return Number.isFinite(minutes) && minutes >= 0 && minutes <= LIMITS.minutesPerDay ? null : `A day has ${fmt(LIMITS.minutesPerDay)} minutes: enter at most that many ${what}.`;
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

