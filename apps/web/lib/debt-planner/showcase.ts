import {debtPlannerSchema, type DebtPlannerRecord} from './store';

/**
 * Session AK (F5a, item 1): the Showcase's planner figures beside its fictional car loan and credit card
 * (lib/accounts/showcase.ts, ids …0004 and …0005, in US dollars): fictional minimums and a fictional extra, labelled.
 * The lead wires it as `records[DEBT_PLANNER_KEY]` in lib/showcase-data.ts. Deterministic; `day` is unused but kept
 * for the Showcase builders' shape.
 */
const account = (n: number) => `93000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export function showcaseDebtPlanner(day: string): DebtPlannerRecord {
  void day;
  return debtPlannerSchema.parse({version: 1, currency: 'USD', extra: '100.00', debts: {[account(4)]: {minimum: '300.00'}, [account(5)]: {minimum: '25.00'}}, note: 'SHOWCASE DATA · fictional figures'});
}
