'use client';
import {useMemo} from 'react';
import {currenciesOf} from '../../../../lib/money-insights/cash-flow';
import {vsLastMonth, type VsLastView} from '../../../../lib/money-insights/month-compare';
import {ordinal} from '../../../../lib/money-insights/spending-pace';
import type {InsightProps} from './spending-insights';
import {money, monthName, signed} from './format';

/**
 * Session AV (owner follow-up 1, F-VS-LAST; Copilot, Rocket Money): each spending category this month so far beside last
 * month by the same day and all of last month, one table per currency. A month without records says so; nothing is
 * converted or forecast.
 */
function Currency({view}: {view: VsLastView}) {
  const same = `${monthName(view.previous)} to the ${ordinal(view.cut)}`;
  return <section className="money-insights-currency" aria-label={`This month against last month in ${view.currency}`}>
    <h4>This month against last · {view.currency}</h4>
    <p className="fine">{monthName(view.month)} to the {ordinal(view.day)}, beside {same} (the same point in the month) and all of {monthName(view.previous)}.{view.previousRecorded ? '' : ` ${monthName(view.previous)} has no records in ${view.currency}, so there is nothing to compare yet.`}</p>
    {/* Scrolls sideways inside its own box on a narrow screen; focusable so the keyboard can scroll it too (axe). */}
    <div className="money-insights-scroll" role="region" tabIndex={0} aria-label={`Table: this month against last in ${view.currency}`}>
      <table className="money-insights-table money-insights-vs-last">
        <caption className="sr-only">Spending by category in {view.currency}: {monthName(view.month)} so far, {same}, all of {monthName(view.previous)}, and the difference</caption>
        <thead><tr><th scope="col">Category</th><th scope="col">This month</th><th scope="col">Last month by now</th><th scope="col">Difference</th><th scope="col">All of last month</th></tr></thead>
        <tbody>{view.rows.map(r => <tr key={r.category}><th scope="row">{r.category}</th><td>{money(r.thisMonth, view.currency)}</td><td>{r.lastBySameDay === null ? 'No records' : money(r.lastBySameDay, view.currency)}</td><td>{r.difference === null ? '—' : signed(r.difference, view.currency)}</td><td>{r.lastMonth === null ? 'No records' : money(r.lastMonth, view.currency)}</td></tr>)}</tbody>
        <tfoot><tr><th scope="row">All categories</th><td>{money(view.totals.thisMonth, view.currency)}</td><td>{view.totals.lastBySameDay === null ? 'No records' : money(view.totals.lastBySameDay, view.currency)}</td><td>{view.totals.lastBySameDay === null ? '—' : signed(view.totals.thisMonth - view.totals.lastBySameDay, view.currency)}</td><td>{view.totals.lastMonth === null ? 'No records' : money(view.totals.lastMonth, view.currency)}</td></tr></tfoot>
      </table>
    </div>
  </section>;
}
export default function VsLastView({entries, today}: InsightProps) {
  const views = useMemo(() => currenciesOf(entries, today).map(c => vsLastMonth(entries, c, today)).filter(v => v.rows.length), [entries, today]);
  if (!views.length) return <p className="fine">No spending logged this month or last month yet. Log an expense and this table compares each category with last month by the same day.</p>;
  return <>{views.map(v => <Currency key={v.currency} view={v}/>)}</>;
}
