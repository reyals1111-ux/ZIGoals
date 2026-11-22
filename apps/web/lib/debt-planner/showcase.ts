import {debtPlannerSchema, type DebtPlannerRecord} from './store';

/**
 * Session AK (F5a, item 1): the Showcase's planner figures beside its fictional car loan and credit card
 * (lib/accounts/showcase.ts, ids …0004 and …0005, in US dollars): fictional minimums and a fictional extra, labelled.
 * The lead wires it as `records[DEBT_PLANNER_KEY]` in lib/showcase-data.ts. Deterministic; `day` is unused but kept
 * for the Showcase builders' shape. Session AV (F-DEBT-PLAN): `day` now places a fictional one-off payment.
 */
const account = (n: number) => `93000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function showcaseDebtPlanner(day: string): DebtPlannerRecord {
  // Session AV (F-DEBT-PLAN): a fictional one-off payment (a tax refund) three months from the Showcase's day.
  const [y, m] = day.split('-').map(Number), i = y! * 12 + m! - 1 + 3, refund = `${Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`;
  return debtPlannerSchema.parse({version: 1, currency: 'USD', extra: '100.00', debts: {[account(4)]: {minimum: '300.00'}, [account(5)]: {minimum: '25.00'}}, lumps: [{month: refund, amount: '1000.00'}], note: 'SHOWCASE DATA · fictional figures'});
}
