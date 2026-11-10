import Decimal from "decimal.js";

/**
 * Session AL (3f, PR-023): one rounding rule for what a page shows. Half up, on the decimal text (Decimal), so 1.005
 * rounds to 1.01 where Math.round(1.005 * 100) / 100 gives 1.00, and −0 is 0. Money keeps its own rule (formatMoney cuts
 * toward −∞ so a balance never reads higher than it is); this is for measures, counts and percentages.
 */
export function roundHalfUp(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value;
  const rounded = new Decimal(value).toDecimalPlaces(Math.max(0, Math.floor(decimals)), Decimal.ROUND_HALF_UP).toNumber();
  return Object.is(rounded, -0) ? 0 : rounded;
}

/**
 * A progress percentage as a whole number, the same on every page (PR-023: a ring read 99 % where a card read 100 %):
 * half up, but 100 only when the thing is actually complete (complete, or ≥ 100 when not said), so 99.6 reads 99 and a
 * finished Goal reads 100. Never below 0; unknown (null, NaN, text that is not a number) is null, never 0.
 */
export function wholePercent(value: number | string | null | undefined, complete?: boolean): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value.trim()) : NaN;
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(0, n), attained = complete ?? clamped >= 100;
  return Math.min(roundHalfUp(clamped), attained ? 100 : 99);
}
