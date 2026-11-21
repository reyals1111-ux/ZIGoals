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
  const leftH = Math.max(2, Math.round(usable * flow.income / total));
  // Each band: where it leaves the income bar (y0, share) and where it lands on the right (y1, h).
  const bands: {key: string; kind: string; y0: number; share: number; y1: number; h: number}[] = [];
  for (let i = 0, y1 = 0, y0 = 0; i < flow.parts.length; i++) {
    const p = flow.parts[i]!, h = Math.max(2, Math.round(usable * p.cents / total)), share = Math.round(leftH * p.cents / Math.max(1, flow.income));
    bands.push({key: p.label, kind: p.kind, y0, share, y1, h});
    y1 += h + gap; y0 += share;
  }
  return <svg className="money-flow" viewBox={`0 0 320 ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <rect x={0} y={0} width={14} height={leftH} rx={3} className="money-flow-income"/>
    {bands.map(b => <g key={b.key}><path className={`money-flow-band is-${b.kind}`} d={`M14 ${b.y0} C 160 ${b.y0}, 160 ${b.y1}, 300 ${b.y1} L 300 ${b.y1 + b.h} C 160 ${b.y1 + b.h}, 160 ${b.y0 + b.share}, 14 ${b.y0 + b.share} Z`}/><rect x={300} y={b.y1} width={14} height={b.h} rx={3} className={`money-flow-node is-${b.kind}`}/></g>)}
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
