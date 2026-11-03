/**
 * Session AK (lane M, item 12, COMPETITORS M5): the "Financial freedom" model. The target is the yearly spending ÷ the
 * withdrawal rate (4 % by default, so 25 × the yearly spending). From today's invested amount and a monthly
 * contribution, 1,000 paths of yearly returns are drawn (log-normal, from the expected yearly return and volatility the
 * person types) with a hand-written seeded generator (mulberry32) and Box-Muller normals, so a seed always gives the same
 * bands. The 10th, 50th and 90th percentiles per year and the years each path takes to reach the target are reported.
 * Pure, no dependency, floating point on purpose (a model, not money). A model, not advice: nothing here is a forecast.
 */
export type FiInput = {
  /** What is invested today, in one currency. */
  invested: number;
  yearlySpend: number;
  /** The yearly withdrawal rate, in percent (4 means 4 %). */
  withdrawalPct: number;
  monthlyContribution: number;
  /** The expected yearly return and its volatility, in percent, after inflation. */
  returnPct: number;
  volatilityPct: number;
  years: number;
  paths?: number;
  seed?: number;
};
export const FI_DEFAULTS = {withdrawalPct: 4, returnPct: 5, volatilityPct: 15, years: 50, paths: 1000, seed: 20261031} as const;
export const FI_LIMITS = {money: 1e12, withdrawalPct: [1, 10], returnPct: [-10, 20], volatilityPct: [0, 60], years: [1, 60], paths: [10, 5000]} as const;
export type FiBand = {year: number; p10: number; p50: number; p90: number};
export type FiResult = {
  target: number;
  bands: FiBand[];
  /** Share of paths that reach the target within the horizon (0 to 1). */
  reached: number;
  /** Years to the target at the 10th, 50th and 90th percentile of paths; null where that share of paths never got there. */
  yearsTo: {p10: number | null; p50: number | null; p90: number | null};
  ms: number;
};
/** mulberry32: a small, fast, seeded 32-bit generator in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Standard normals from a uniform source, two at a time (Box-Muller), the spare kept for the next call. */
export function normals(next: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u <= Number.MIN_VALUE) u = next();
    const v = next(), r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * v;
    spare = r * Math.sin(th);
    return r * Math.cos(th);
  };
}
/** The p-th percentile (0 to 1) of sorted values, by the nearest rank. */
export const percentile = (sorted: ArrayLike<number>, p: number): number => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))]!;
export function fiIssue(i: FiInput): string | null {
  const within = (v: number, [lo, hi]: readonly [number, number]) => Number.isFinite(v) && v >= lo && v <= hi;
  if (!Number.isFinite(i.invested) || i.invested < 0 || i.invested > FI_LIMITS.money) return 'Enter what is invested today, zero or more.';
  if (!Number.isFinite(i.yearlySpend) || i.yearlySpend <= 0 || i.yearlySpend > FI_LIMITS.money) return 'Enter your yearly spending, above zero.';
  if (!Number.isFinite(i.monthlyContribution) || i.monthlyContribution < 0 || i.monthlyContribution > FI_LIMITS.money) return 'Enter a monthly contribution, zero or more.';
  if (!within(i.withdrawalPct, FI_LIMITS.withdrawalPct)) return 'A withdrawal rate from 1 to 10 %.';
  if (!within(i.returnPct, FI_LIMITS.returnPct)) return 'An expected return from −10 to 20 % a year.';
  if (!within(i.volatilityPct, FI_LIMITS.volatilityPct)) return 'A volatility from 0 to 60 %.';
  if (!within(i.years, FI_LIMITS.years) || !Number.isInteger(i.years)) return 'Whole years from 1 to 60.';
  if (i.paths !== undefined && (!within(i.paths, FI_LIMITS.paths) || !Number.isInteger(i.paths))) return 'From 10 to 5,000 paths.';
  return null;
}
export const fiTarget = (yearlySpend: number, withdrawalPct: number) => yearlySpend / (withdrawalPct / 100);
/** Runs the model; throws with the plain reason when an input is out of range. */
export function runFiModel(input: FiInput, clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())): FiResult {
  const issue = fiIssue(input); if (issue) throw Error(issue);
  const started = clock();
  const paths = input.paths ?? FI_DEFAULTS.paths, years = input.years, target = fiTarget(input.yearlySpend, input.withdrawalPct);
  // Yearly steps (50,000 draws for 1,000 × 50 years, a few milliseconds): a log-normal year whose mean growth is
  // 1 + return, and the year's contributions arriving evenly through it (continuous: 12 × monthly × (g − 1) / ln g).
  const sigma = input.volatilityPct / 100, drift = Math.log(1 + input.returnPct / 100) - sigma * sigma / 2, yearly = input.monthlyContribution * 12;
  const z = normals(mulberry32(input.seed ?? FI_DEFAULTS.seed));
  // values[y * paths + p]: path p's value at the end of year y (year 0 is today).
  const values = new Float64Array((years + 1) * paths), hit = new Float64Array(paths);
  for (let p = 0; p < paths; p++) {
    let v = input.invested, at = v >= target ? 0 : Infinity;
    values[p] = v;
    for (let y = 1; y <= years; y++) {
      const log = drift + sigma * z(), g = Math.exp(log), before = v;
      v = v * g + (Math.abs(log) < 1e-12 ? yearly : yearly * (g - 1) / log);
      // The year it is reached, between the two year ends (linear inside the year).
      if (at === Infinity && v >= target) at = y - 1 + (target - before) / (v - before);
      values[y * paths + p] = v;
    }
    hit[p] = at;
  }
  const bands: FiBand[] = [];
  for (let y = 0; y <= years; y++) {
    const row = values.subarray(y * paths, (y + 1) * paths).slice().sort();
    bands.push({year: y, p10: percentile(row, 0.1), p50: percentile(row, 0.5), p90: percentile(row, 0.9)});
  }
  hit.sort();
  const reachedCount = hit.filter(h => h !== Infinity).length, at = (p: number) => { const v = percentile(hit, p); return v === Infinity ? null : Math.round(v * 10) / 10; };
  return {target, bands, reached: reachedCount / paths, yearsTo: {p10: at(0.1), p50: at(0.5), p90: at(0.9)}, ms: clock() - started};
}
