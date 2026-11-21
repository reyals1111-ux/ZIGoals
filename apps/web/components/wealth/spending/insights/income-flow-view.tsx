'use client';
import {useMemo} from 'react';
import {currenciesOf} from '../../../../lib/money-insights/cash-flow';
import {incomeFlow, type IncomeFlow} from '../../../../lib/money-insights/income-flow';
import {monthKey} from '../../../../lib/budgets/engine';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AV (owner follow-up 1, F-INCOME-FLOW; Monarch): this month's income and where it went, as a hand-drawn flow
 * (income on the left, each category and what is left on the right, band widths by amount) with the same figures as a
 * table; one per currency, never converted. Decoration is aria-hidden; the table carries the figures.
 */
function Flow({flow}: {flow: IncomeFlow}) {
  const total = Math.max(flow.income, flow.spent, 1), H = 180, gap = 4, usable = H - gap * Math.max(0, flow.parts.length - 1);
  let y = 0;
  const bands = flow.parts.map(p => { const h = Math.max(2, Math.round(usable * p.cents / total)), band = {p, y, h}; y += h + gap; return band; });
  const leftH = Math.max(2, Math.round(usable * flow.income / total));
  let from = 0;
  return <svg className="money-flow" viewBox={`0 0 320 ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <rect x={0} y={0} width={14} height={leftH} rx={3} className="money-flow-income"/>
    {bands.map(({p, y: to, h}) => { const share = Math.round(leftH * p.cents / Math.max(1, flow.income)), y0 = from; from += share; const y1 = to;
      return <g key={p.label}><path className={`money-flow-band is-${p.kind}`} d={`M14 ${y0} C 160 ${y0}, 160 ${y1}, 300 ${y1} L 300 ${y1 + h} C 160 ${y1 + h}, 160 ${y0 + share}, 14 ${y0 + share} Z`}/><rect x={300} y={to} width={14} height={h} rx={3} className={`money-flow-node is-${p.kind}`}/></g>; })}
  </svg>;
}
function Currency({flow}: {flow: IncomeFlow}) {
  const beyond = flow.spent - flow.income;
  return <section className="money-insights-currency" aria-label={`Where income went in ${flow.currency}`}>
    <h4>Where income went · {monthName(flow.month)} · {flow.currency}</h4>
    <p className="fine">{money(flow.income, flow.currency)} came in{flow.sources.length ? ` (${flow.sources.map(s => `${s.label} ${money(s.cents, flow.currency)}`).join(', ')})` : ''}; {money(flow.spent, flow.currency)} went out. {flow.income === 0 ? 'No income is logged this month, so there is nothing to split yet.' : beyond > 0 ? `Spending went ${money(beyond, flow.currency)} beyond the income logged.` : `${money(flow.income - flow.spent, flow.currency)} is left, as your log shows it.`}</p>
    {flow.income > 0 && <Flow flow={flow}/>}
    <div className="money-insights-scroll" role="region" tabIndex={0} aria-label={`Table: where income went in ${flow.currency}`}>
      <table className="money-insights-table"><caption className="sr-only">This month&rsquo;s income in {flow.currency} and where it went</caption>
        <thead><tr><th scope="col">Where</th><th scope="col">Amount</th><th scope="col">Share of income</th></tr></thead>
        <tbody>{flow.parts.map(p => <tr key={p.label}><th scope="row">{p.label}</th><td>{money(p.cents, flow.currency)}</td><td>{flow.income ? `${Math.round(100 * p.cents / flow.income)}%` : '—'}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export default function IncomeFlowView({entries, today}: InsightProps) {
  const flows = useMemo(() => currenciesOf(entries, today).map(c => incomeFlow(entries, c, monthKey(today))).filter(f => f.income || f.spent), [entries, today]);
  if (!flows.length) return <p className="fine">Log your income and spending this month and this shows where the income went, category by category.</p>;
  return <>{flows.map(f => <Currency key={f.currency} flow={f}/>)}</>;
}
