import {isDebtKind, type Accounts} from '../../accounts/schema';
import {balanceOn} from '../../accounts/net-worth';
import {centsText, comparePlans, comparisonWords, parseCents, payoffMonth, planIssue, rateE4, toCents, type PlanComparison, type PlanDebt} from '../../debt-planner/plan';
import type {DebtPlannerRecord} from '../../debt-planner/store';
import {formatMoney, formatMonth} from '../../visual-format';

/**
 * Owner follow-up 1 (F9): the debt payoff planner's view for ZIGi (a tool, a local answer, a card's preview), worked out
 * exactly as the planner does (components/wealth/debt-planner.tsx): the person's debts with a balance in Wealth's
 * accounts (read only), per currency and never converted, with each debt's rate (the account's own, else the one kept in
 * the planner) and the minimum kept in the planner; the extra a month belongs to the planner's currency. A missing
 * figure is said as missing (unknown is not zero), never filled in. A model, not advice: nothing is paid or moved.
 */
export const DEBT_PLANNER_WHERE = 'Wealth → What you owe → Plan paying off your debts';
export const DEBT_MODEL = 'A model, not advice: it assumes the rates and payments stay the same and nothing new is borrowed.';
export type DebtRow = {id: string; name: string; owed: bigint; ratePercent: string | null; rateFromAccount: boolean; minimum: bigint | null};
export type DebtCurrencyView = {currency: string; debts: DebtRow[]; extra: bigint; issue: string | null; comparison: PlanComparison | null};
const name = (n: string) => n.replace(/\s+/g, ' ').trim().slice(0, 60);

/** The debts with a balance above zero, by currency, as the planner reads them. */
export function debtRows(accounts: Accounts | null | undefined, planner: DebtPlannerRecord | null | undefined, today: string): Map<string, DebtRow[]> {
  const out = new Map<string, DebtRow[]>();
  for (const a of accounts?.items ?? []) {
    if (a.archivedAt || !isDebtKind(a.kind)) continue;
    const b = balanceOn(a, today); if (!b || b.value <= 0n) continue;
    const kept = planner?.debts?.[a.id], rate = a.ratePercent ?? kept?.ratePercent ?? null, minimum = kept?.minimum ? parseCents(kept.minimum) : null;
    const list = out.get(a.currency) ?? [];
    list.push({id: a.id, name: name(a.name), owed: toCents(b.value, b.decimals), ratePercent: rate, rateFromAccount: !!a.ratePercent, minimum: minimum !== null && minimum > 0n ? minimum : null});
    out.set(a.currency, list);
  }
  return out;
}
/** Each currency's plan, or the first figure it still needs (in the planner's own words). */
export function debtView(accounts: Accounts | null | undefined, planner: DebtPlannerRecord | null | undefined, today: string): DebtCurrencyView[] {
  const rows = debtRows(accounts, planner, today), currencies = [...rows.keys()].sort();
  const extraCurrency = planner?.currency && rows.has(planner.currency) ? planner.currency : currencies[0];
  const extraKept = planner?.extra ? parseCents(planner.extra) ?? 0n : 0n;
  return currencies.map(currency => {
    const debts = rows.get(currency)!, extra = currency === extraCurrency ? extraKept : 0n;
    const missing = debts.find(d => d.ratePercent === null || rateE4(d.ratePercent) === null) ?? null, noMin = debts.find(d => d.minimum === null) ?? null;
    let issue: string | null = missing ? `The planner needs the yearly rate for ${missing.name} (your own figure from your statement).`
      : noMin ? `The planner needs the minimum monthly payment for ${noMin.name} (from your statement).` : null;
    const plan: PlanDebt[] = issue ? [] : debts.map(d => ({id: d.id, name: d.name, balance: d.owed, ratePercent: d.ratePercent!, minimum: d.minimum!}));
    issue ??= planIssue(plan, extra);
    let comparison: PlanComparison | null = null;
    if (!issue) { try { comparison = comparePlans(plan, extra); } catch (error) { issue = error instanceof Error ? error.message : 'The plan cannot be worked out with these figures.'; } }
    return {currency, debts, extra, issue, comparison};
  });
}
export const debtMoney = (cents: bigint, currency: string) => formatMoney(centsText(cents), currency);
/** "March 2029", or null when the plan does not clear within 100 years. */
export const debtFreeMonth = (today: string, months: number | null) => { const m = payoffMonth(today, months); return m ? formatMonth(m) : null; };
const monthsWords = (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`;
/** One currency's plan in plain words (used by the local answer). */
export function debtSentence(v: DebtCurrencyView, today: string): string {
  const head = `${v.currency} (${v.debts.length} ${v.debts.length === 1 ? 'debt' : 'debts'}${v.extra > 0n ? `, ${debtMoney(v.extra, v.currency)} extra a month` : ''})`;
  if (v.issue || !v.comparison) return `${head}: ${v.issue ?? 'not worked out'}`;
  const c = v.comparison, say = (r: PlanComparison['avalanche']) => { const m = debtFreeMonth(today, r.months); return m ? `${m} (${monthsWords(r.months!)}, ${debtMoney(r.totalInterest, v.currency)} interest)` : 'not within 100 years'; };
  return `${head}: debt-free in ${say(c.avalanche)} with avalanche; ${say(c.snowball)} with snowball; minimums only: ${say(c.minimums)}. ${comparisonWords(c, cents => debtMoney(cents, v.currency))}`;
}
