'use client';
import {useMemo} from 'react';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {budgetGauges} from '../../../lib/nova/cards/ax/money-worth';
import {formatDate} from '../../../lib/visual-format';
import {AxBody, type AxProps} from '../cards/ax/kit';
import {AxmGauges} from '../cards/ax/money-gauge';
import {AxmFacts, AxmHead} from '../cards/ax/money-kit';
import {CardFoot} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import {BudgetsSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Budget gauges" — each monthly budget as an arc: what the money log shows spent
 * in its category this month, of what the budget has available (the Wealth page's own month view). A budget above its
 * amount has a full arc with a dashed outer band and says "over by …" in words. The figure counts the budgets within
 * plan. Each budget keeps its own currency; facts from the log, no projection and no advice.
 */
export default function BudgetGaugesWidget({size}: AxProps) {
  return <BudgetsSource>{(budgets, entries, today) => <Gauges budgets={budgets} entries={entries} today={today} size={size}/>}</BudgetsSource>;
}
function Gauges({budgets, entries, today, size}: {budgets: BudgetsRecord; entries: readonly MoneyEntry[]; today: string; size: AxProps['size']}) {
  const view = useMemo(() => budgetGauges(budgets, entries, today), [budgets, entries, today]), cap = size === 'L' ? 6 : 3, shown = view.gauges.slice(0, cap), more = view.gauges.length - shown.length;
  return <AxBody kind="budget-gauges" size={size}>
    <AxmHead figure={String(view.within)} unit={`of ${view.count}`} label={`${view.count === 1 ? 'budget' : 'budgets'} within plan · this month`} note={view.over.length ? view.over.map(g => `${g.label} ${g.words}`).join(' · ') : 'None is over'}/>
    {size !== 'S' && <AxmGauges items={shown.map(g => ({key: g.id, name: g.label, share: g.share, over: g.over, figure: g.percent, text: g.over ? g.words : `${g.spent} of ${g.available}`}))}/>}
    {size !== 'S' && more > 0 && <p className="axm-note" aria-hidden="true">+{more} more {more === 1 ? 'budget' : 'budgets'} on the Wealth page</p>}
    {size === 'L' && view.daysLeft !== null && <AxmFacts rows={[['Left in this month', view.daysLeft === 1 ? 'the last day' : `${view.daysLeft} days`]]}/>}
    <CardFoot source="Your budgets and money log" asOf={view.lastDate ? `last entry ${formatDate(view.lastDate, {year: false})}` : 'nothing logged yet this month'}/>
    <HoloTable caption="Budgets this month, spent of available" rows={[
      ['Budgets within plan this month', `${view.within} of ${view.count}`],
      ...view.gauges.map(g => [g.label, `${g.spent} of ${g.available} spent (${g.percent}), ${g.words}`] as const),
      ...(view.daysLeft !== null ? [['Days left this month', String(view.daysLeft)] as const] : []),
    ]}/>
  </AxBody>;
}
