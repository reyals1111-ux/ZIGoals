/**
 * Session AF (L2b, Part 6, ADR-028 H17; P6.4): the Goal Vault's projection, only ever shown as a labelled illustration and
 * never added to progress: "if this stake kept earning R a year, compounded monthly, it would reach the Goal in about N
 * months". R is either the person's own assumption or today's chain rate before commission (ZIGoals' /api/earn/chain, with
 * its source and block beside it). Rates are decimal fractions ("0.0533" is 5.33 %). Returns null months when the rate is
 * zero or missing, or when it would take more than 50 years.
 */
export const ILLUSTRATION_LABEL = 'Illustration, not a promise';
export const MAX_MONTHS = 600;
export function illustrate({currentAzig, targetAzig, yearlyRate}: {currentAzig: bigint; targetAzig: bigint; yearlyRate: string | null}): {reached: boolean; months: number | null} {
  if (targetAzig <= 0n) return {reached: false, months: null};
  if (currentAzig >= targetAzig) return {reached: true, months: 0};
  const r = yearlyRate !== null && /^\d{1,3}(\.\d{1,18})?$/.test(yearlyRate) ? Number(yearlyRate) : NaN;
  if (!Number.isFinite(r) || r <= 0 || r > 10 || currentAzig <= 0n) return {reached: false, months: null};
  // The ratio needs no precision beyond a float's: it only picks a whole number of months.
  const ratio = Number(targetAzig * 1_000_000n / currentAzig) / 1_000_000, months = Math.ceil(Math.log(ratio) / Math.log(1 + r / 12));
  return {reached: false, months: Number.isFinite(months) && months <= MAX_MONTHS ? Math.max(1, months) : null};
}
/** A percentage the person typed ("5.2") as a decimal fraction ("0.052"), or null when it is not a plain 0–100 number. */
export function rateFromPercent(text: string): string | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d{1,2})?$|^100$/.test(t)) return null;
  const [whole, fraction = ''] = t.split('.');
  const basisPoints = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  return basisPoints === 0n ? null : (Number(basisPoints) / 10_000).toString();
}
