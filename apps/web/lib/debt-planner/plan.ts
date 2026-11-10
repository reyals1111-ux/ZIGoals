import {parseNumberInput} from '../numbers/parse';
/**
 * Session AK (F5a, item 1): the debt payoff planner, snowball against avalanche. Pure, in exact cents (bigint), no
 * dependency. Each month: interest is added to every open debt at the person's own yearly rate ÷ 12, rounded to the
 * cent (half up); every open debt gets its minimum (or what is left of it); then what is left of the monthly budget
 * (all the minimums plus the extra, so a cleared debt's minimum rolls on to the next) goes to the first open debt in the
 * strategy's order. Snowball: the smallest balance first. Avalanche: the highest rate first. Minimums only: each debt
 * its own minimum, nothing rolls on and no extra (the line both strategies are compared with).
 *
 * A model, not advice: it assumes the rates and payments stay the same, interest is worked out monthly and nothing new
 * is borrowed. A plan that does not clear within 100 years has no date (null), never a guess.
 */
export type Strategy = 'snowball' | 'avalanche';
export type PlanDebt = {
  id: string; name: string;
  /** What is owed today, in cents. */
  balance: bigint;
  /** The yearly rate as the person typed it ("21.9" for 21.9 %). */
  ratePercent: string;
  /** The minimum monthly payment, in cents. */
  minimum: bigint;
};
export type DebtPayoff = {id: string; name: string; month: number; interest: bigint};
export type PlanResult = {
  strategy: Strategy | 'minimums';
  /** Months until every debt is cleared (1 = next month's payment clears it), or null when not within 100 years. */
  months: number | null;
  totalInterest: bigint;
  totalPaid: bigint;
  /** The order the extra goes in (the strategy's order; the input order for minimums only). */
  order: string[];
  /** Each debt's month of payoff, in the order they are cleared; debts never cleared are left out. */
  payoffs: DebtPayoff[];
  /** The total owed at the start (index 0) and after each month's payments. */
  balances: bigint[];
};
export const MAX_MONTHS = 1200, MAX_DEBTS = 50, MAX_CENTS = 100_000_000_000_000n; // a trillion in cents

const RATE = /^(?:0|[1-9]\d{0,2})(?:\.\d{1,4})?$/;
/** The rate in ten-thousandths of a percent ("21.9" → 219000n), or null when it is not a rate from 0 to 100. */
export function rateE4(ratePercent: string): bigint | null {
  // Session AL (PRIMITIVES 3f): the app's one number reader ("5,25" and "5.25" alike); the rate rule stays here.
  const read = parseNumberInput(ratePercent), t = read.ok ? read.text : '';
  if (!RATE.test(t)) return null;
  const [whole, frac = ''] = t.split('.');
  const v = BigInt(whole!) * 10_000n + BigInt(frac.padEnd(4, '0'));
  return v <= 1_000_000n ? v : null;
}
/** a ÷ b rounded half up, for a ≥ 0 and b > 0. */
const divRound = (a: bigint, b: bigint) => (a * 2n + b) / (2n * b);
/** One month's interest on a balance in cents at a yearly rate (ten-thousandths of a percent): balance × rate ÷ 12. */
export const monthlyInterest = (balance: bigint, rate: bigint): bigint => balance <= 0n || rate <= 0n ? 0n : divRound(balance * rate, 12n * 100n * 10_000n);

/** Text typed as an amount ("1,250.5" is refused; "1250.50" or "1250,5" read) → cents, or null. */
export function parseCents(text: string): bigint | null {
  const t = text.trim().replace(/\s/g, '').replace(/,(\d{1,2})$/, '.$1');
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(t)) return null;
  const [whole, frac = ''] = t.split('.');
  const v = BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'));
  return v <= MAX_CENTS ? v : null;
}
/** Cents as plain decimal text ("-12.05"), for formatMoney. */
export function centsText(cents: bigint): string {
  const neg = cents < 0n, v = neg ? -cents : cents;
  return `${neg ? '-' : ''}${v / 100n}.${String(v % 100n).padStart(2, '0')}`;
}
/** A balance with any number of decimals (an account's snapshot) → cents, half up. */
export function toCents(value: bigint, decimals: number): bigint {
  if (decimals === 2) return value;
  if (decimals < 2) return value * 10n ** BigInt(2 - decimals);
  const d = 10n ** BigInt(decimals - 2);
  return value >= 0n ? divRound(value, d) : -divRound(-value, d);
}

/** Why the plan cannot be worked out, in plain words, or null. */
export function planIssue(debts: readonly PlanDebt[], extra: bigint): string | null {
  if (!debts.length) return 'Add at least one debt with what you owe.';
  if (debts.length > MAX_DEBTS) return `Up to ${MAX_DEBTS} debts at a time.`;
  if (extra < 0n || extra > MAX_CENTS) return 'Enter an extra monthly amount, zero or more.';
  for (const d of debts) {
    if (!(d.balance > 0n) || d.balance > MAX_CENTS) return `Enter what you owe on ${d.name}, above zero.`;
    if (rateE4(d.ratePercent) === null) return `Enter the yearly rate for ${d.name}, from 0 to 100 %.`;
    if (!(d.minimum > 0n) || d.minimum > MAX_CENTS) return `Enter the minimum monthly payment for ${d.name}, above zero.`;
  }
  return null;
}
const byName = (a: PlanDebt, b: PlanDebt) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
/** The order the extra goes in: snowball by the smallest balance (then the higher rate), avalanche by the highest rate (then the smaller balance). */
export function strategyOrder(debts: readonly PlanDebt[], strategy: Strategy): PlanDebt[] {
  const r = (d: PlanDebt) => rateE4(d.ratePercent) ?? 0n, cmp = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;
  return [...debts].sort(strategy === 'snowball'
    ? (a, b) => cmp(a.balance, b.balance) || cmp(r(b), r(a)) || byName(a, b)
    : (a, b) => cmp(r(b), r(a)) || cmp(a.balance, b.balance) || byName(a, b));
}

/** Runs one strategy (or minimums only); throws with the plain reason when an input is out of range. */
export function runPlan(debts: readonly PlanDebt[], extra: bigint, strategy: Strategy | 'minimums'): PlanResult {
  const issue = planIssue(debts, extra); if (issue) throw Error(issue);
  const ordered = strategy === 'minimums' ? [...debts] : strategyOrder(debts, strategy);
  const state = ordered.map(d => ({d, rate: rateE4(d.ratePercent)!, left: d.balance, interest: 0n, done: 0}));
  const budget = strategy === 'minimums' ? 0n : ordered.reduce((t, d) => t + d.minimum, 0n) + extra;
  const balances: bigint[] = [state.reduce((t, s) => t + s.left, 0n)], payoffs: DebtPayoff[] = [];
  let totalInterest = 0n, totalPaid = 0n, months: number | null = null;
  for (let month = 1; month <= MAX_MONTHS; month++) {
    let room = budget;
    for (const s of state) if (s.left > 0n) { const i = monthlyInterest(s.left, s.rate); s.left += i; s.interest += i; totalInterest += i; }
    for (const s of state) if (s.left > 0n) { const p = s.left < s.d.minimum ? s.left : s.d.minimum; s.left -= p; totalPaid += p; room -= p; }
    if (strategy !== 'minimums') for (const s of state) { if (room <= 0n) break; if (s.left <= 0n) continue; const p = s.left < room ? s.left : room; s.left -= p; totalPaid += p; room -= p; }
    for (const s of state) if (s.left <= 0n && !s.done) { s.done = month; payoffs.push({id: s.d.id, name: s.d.name, month, interest: s.interest}); }
    const total = state.reduce((t, s) => t + s.left, 0n);
    balances.push(total);
    if (total === 0n) { months = month; break; }
  }
  return {strategy, months, totalInterest, totalPaid, order: ordered.map(d => d.id), payoffs, balances};
}
export type PlanComparison = {snowball: PlanResult; avalanche: PlanResult; minimums: PlanResult;
  /** Interest each strategy saves against minimums only; null when minimums alone do not clear it within 100 years. */
  savedSnowball: bigint | null; savedAvalanche: bigint | null};
export function comparePlans(debts: readonly PlanDebt[], extra: bigint): PlanComparison {
  const snowball = runPlan(debts, extra, 'snowball'), avalanche = runPlan(debts, extra, 'avalanche'), minimums = runPlan(debts, extra, 'minimums');
  const saved = (r: PlanResult) => minimums.months === null || r.months === null ? null : minimums.totalInterest - r.totalInterest;
  return {snowball, avalanche, minimums, savedSnowball: saved(snowball), savedAvalanche: saved(avalanche)};
}
/** The calendar month `n` months after a month key ("2026-11" + 3 → "2027-02"). */
export function addMonths(monthKey: string, n: number): string {
  const [y, m] = monthKey.split('-').map(Number), i = y! * 12 + (m! - 1) + n;
  return `${String(Math.floor(i / 12)).padStart(4, '0')}-${String(i % 12 + 1).padStart(2, '0')}`;
}
/** The month of the first payment: the month after today's. */
export const firstPaymentMonth = (today: string) => addMonths(today.slice(0, 7), 1);
/** The month a plan clears (month 1 is the first payment month), or null. */
export const payoffMonth = (today: string, months: number | null) => months === null ? null : addMonths(firstPaymentMonth(today), months - 1);

/**
 * The plain-language line under the results (words only; amounts and months are formatted by the caller's helpers).
 * Which strategy costs less interest, which clears the first debt sooner, or that they come out the same.
 */
export function comparisonWords(c: PlanComparison, money: (cents: bigint) => string): string {
  const s = c.snowball, a = c.avalanche;
  if (s.months === null || a.months === null) return 'With these payments the debts are not cleared within 100 years. A larger extra amount, or higher minimums, would change that.';
  const diff = s.totalInterest - a.totalInterest, firstS = s.payoffs[0]?.month, firstA = a.payoffs[0]?.month;
  const sooner = firstS !== undefined && firstA !== undefined && firstS < firstA ? ` Snowball clears its first debt sooner (after ${firstS} ${firstS === 1 ? 'month' : 'months'}, against ${firstA}), which some people find keeps them going.` : '';
  if (diff === 0n && s.months === a.months) return `Both orders come out the same here: debt-free after ${s.months} ${s.months === 1 ? 'month' : 'months'}, with the same interest.${sooner}`;
  if (diff > 0n) return `Avalanche costs ${money(diff)} less interest than snowball${a.months < s.months ? ` and clears everything ${s.months - a.months} ${s.months - a.months === 1 ? 'month' : 'months'} sooner` : ''}.${sooner}`;
  return `Snowball costs ${money(-diff)} less interest here than avalanche.${sooner}`;
}

/** Example debts for an empty start ("Try it with example figures"): fictional, labelled, never stored. */
export const EXAMPLE_DEBTS: readonly PlanDebt[] = [
  {id: 'example-card', name: 'Credit card (example)', balance: 240_000n, ratePercent: '22.9', minimum: 7_000n},
  {id: 'example-store', name: 'Store card (example)', balance: 45_000n, ratePercent: '12.9', minimum: 2_500n},
  {id: 'example-car', name: 'Car loan (example)', balance: 650_000n, ratePercent: '6.4', minimum: 19_000n},
];
export const EXAMPLE_EXTRA = 10_000n;
