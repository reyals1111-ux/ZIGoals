import {lumpMonth, parseCents, type Lump, type PlanDebt, type PlanOptions} from './plan';
import type {DebtPlannerRecord} from './store';

/**
 * Session AV (owner follow-up 1, F-DEBT-PLAN): the planner's kept order and one-off payments as plan options, so NOVA's
 * card and ZIGi's answer work out the same dates as the planner. One-off payments belong to the planner's currency, as
 * its extra does; a passed month is not counted; an order naming no debt of this plan is no order.
 */
export function keptPlanOptions(planner: DebtPlannerRecord | null | undefined, today: string, debts: readonly PlanDebt[], plannerCurrency = true): Pick<PlanOptions, 'order' | 'lumps'> {
  const order = (planner?.order ?? []).filter(id => debts.some(d => d.id === id));
  const lumps: Lump[] = plannerCurrency ? (planner?.lumps ?? []).flatMap(l => { const month = lumpMonth(today, l.month), cents = parseCents(l.amount); return month && cents ? [{month, cents}] : []; }) : [];
  return {...(order.length ? {order} : {}), ...(lumps.length ? {lumps} : {})};
}
