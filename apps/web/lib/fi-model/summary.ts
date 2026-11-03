import type {FiInput, FiResult} from './model';

/**
 * Session AK (F5a, item 4): the Financial freedom model's plain-language line and the field an input issue belongs to,
 * so the panel can mark that field (aria-invalid) and say it next to it. Words only; amounts are formatted by the
 * caller's helper. A model, not advice.
 */
export type FiField = 'invested' | 'yearlySpend' | 'withdrawalPct' | 'monthlyContribution' | 'returnPct' | 'volatilityPct' | 'years';
/** The field `fiIssue` refused first (the same order it checks in), or null. */
export function fiIssueField(i: FiInput): FiField | null {
  const within = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi;
  if (!Number.isFinite(i.invested) || i.invested < 0 || i.invested > 1e12) return 'invested';
  if (!Number.isFinite(i.yearlySpend) || i.yearlySpend <= 0 || i.yearlySpend > 1e12) return 'yearlySpend';
  if (!Number.isFinite(i.monthlyContribution) || i.monthlyContribution < 0 || i.monthlyContribution > 1e12) return 'monthlyContribution';
  if (!within(i.withdrawalPct, 1, 10)) return 'withdrawalPct';
  if (!within(i.returnPct, -10, 20)) return 'returnPct';
  if (!within(i.volatilityPct, 0, 60)) return 'volatilityPct';
  if (!within(i.years, 1, 60) || !Number.isInteger(i.years)) return 'years';
  return null;
}
const yearsText = (n: number) => { const r = Math.round(n * 10) / 10; return `${r} ${r === 1 ? 'year' : 'years'}`; };
/**
 * One line a person can read aloud: "In this model, half of the paths reach your target of €750,000 within 18 years;
 * a slow path (1 in 10) takes 27 years or more." Unknown is said as such, never as a number.
 */
export function fiSummary(r: FiResult, years: number, money: (amount: number) => string): string {
  const target = `your target of ${money(r.target)}`;
  if (r.yearsTo.p50 === 0) return `In this model you are already at ${target}: today’s amount covers your yearly spending at this withdrawal rate.`;
  if (r.yearsTo.p50 === null) {
    const pct = Math.round(r.reached * 100);
    return pct === 0 ? `In this model none of the paths reach ${target} within ${yearsText(years)}. Adding more each month, spending less, or looking further ahead changes that.`
      : `In this model fewer than half of the paths reach ${target} within ${yearsText(years)} (${pct} in 100 do).`;
  }
  const slow = r.yearsTo.p90 === null ? `a slow path (1 in 10) does not get there within ${yearsText(years)}` : `a slow path (1 in 10) takes ${yearsText(r.yearsTo.p90)} or more`;
  return `In this model, half of the paths reach ${target} within ${yearsText(r.yearsTo.p50)}; ${slow}.`;
}
