'use client';
import {useMemo} from 'react';
import {currenciesOf} from '../../../../lib/money-insights/cash-flow';
import {incomeFlow, type FlowPart, type IncomeFlow} from '../../../../lib/money-insights/income-flow';
import {monthKey} from '../../../../lib/budgets/engine';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AV (owner follow-up 1, F-INCOME-FLOW; Monarch): this month's income and where it went, as a hand-drawn flow
 * (income on the left, each category and what is left on the right, band widths by amount) with the same figures as a
 * table; one per currency, never converted. Decoration is aria-hidden; the table carries the figures.
 * Session AV (fresh-agent check q2, rank 14; Monarch names every node): each income source is its own node on the left
 * and every node is named with its amount (14 px); categories under 3 % of the flow are drawn together as "Other" when
 * there are two or more of them (the table keeps each). Labels never overlap: each is moved down to clear the one above.
 */
const LABEL_H = 40, MIN_SHARE = 0.03;
/** A share of income in words: "<1%" for a share that rounds to nothing, never "0%". */
export const shareWords = (cents: number, income: number) => !income ? '—' : cents > 0 && 100 * cents / income < 0.5 ? '<1%' : `${Math.round(100 * cents / income)}%`;
/** Label tops for nodes centred at `centres`, each moved down to clear the one above. */
function placeLabels(centres: readonly number[]): number[] {
  const out: number[] = [];
  for (const c of centres) out.push(Math.max(c - LABEL_H / 2, out.length ? out[out.length - 1]! + LABEL_H : 0));
  return out;
}
function Flow({flow}: {flow: IncomeFlow}) {
  const total = Math.max(flow.income, flow.spent, 1);
  // Small categories drawn together (only when two or more are small); the table below keeps each one.
  const small = flow.parts.filter(p => p.kind === 'category' && p.cents / total < MIN_SHARE);
  const drawn: FlowPart[] = small.length >= 2 ? [...flow.parts.filter(p => !small.includes(p) && p.kind === 'category'), {label: 'Other', cents: small.reduce((t, p) => t + p.cents, 0), kind: 'category'}, ...flow.parts.filter(p => p.kind !== 'category')] : flow.parts;
  const H = Math.max(180, drawn.length * (LABEL_H + 4), flow.sources.length * (LABEL_H + 4)), gap = 4, usable = H - gap * Math.max(0, drawn.length - 1);
  const leftH = Math.max(2, Math.round(usable * flow.income / total));
  // Each band: where it leaves the income bar (y0, share) and where it lands on the right (y1, h).
  const bands: {key: string; part: FlowPart; y0: number; share: number; y1: number; h: number}[] = [];
  for (let i = 0, y1 = 0, y0 = 0; i < drawn.length; i++) {
    const p = drawn[i]!, h = Math.max(2, Math.round(usable * p.cents / total)), share = Math.round(leftH * p.cents / Math.max(1, flow.income));
    bands.push({key: p.label, part: p, y0, share, y1, h});
    y1 += h + gap; y0 += share;
  }
  // Each income source its own node: the income bar in segments, largest first.
  const sources: {label: string; cents: number; y: number; h: number}[] = [];
  for (let i = 0, y = 0; i < flow.sources.length; i++) { const s = flow.sources[i]!, h = i === flow.sources.length - 1 ? leftH - y : Math.round(leftH * s.cents / Math.max(1, flow.income)); sources.push({...s, y, h}); y += h; }
  const right = placeLabels(bands.map(b => b.y1 + b.h / 2)), left = placeLabels(sources.map(s => s.y + s.h / 2));
  const height = Math.max(H, (right.at(-1) ?? 0) + LABEL_H, (left.at(-1) ?? 0) + LABEL_H);
  return <div className="money-flow-wrap" aria-hidden="true" style={{height}}>
    <ul className="money-flow-labels is-left">{sources.map((s, i) => <li key={s.label} style={{top: left[i]}}><span dir="auto">{s.label}</span><span>{money(s.cents, flow.currency)}</span></li>)}</ul>
    <svg className="money-flow" viewBox={`0 0 320 ${H}`} preserveAspectRatio="none" focusable="false" style={{height: H}}>
      {bands.map(b => <path key={b.key} className={`money-flow-band is-${b.part.kind}`} d={`M14 ${b.y0} C 160 ${b.y0}, 160 ${b.y1}, 300 ${b.y1} L 300 ${b.y1 + b.h} C 160 ${b.y1 + b.h}, 160 ${b.y0 + b.share}, 14 ${b.y0 + b.share} Z`}/>)}
      {sources.map(s => <rect key={s.label} x={0} y={s.y} width={14} height={Math.max(1, s.h)} className="money-flow-income money-flow-source"/>)}
      {bands.map(b => <rect key={b.key} x={300} y={b.y1} width={14} height={b.h} rx={3} className={`money-flow-node is-${b.part.kind}`}/>)}
    </svg>
    <ul className="money-flow-labels is-right">{bands.map((b, i) => <li key={b.key} style={{top: right[i]}}><span className="money-flow-name"><span dir="auto">{b.part.label}</span><span>{shareWords(b.part.cents, flow.income)}</span></span><span>{money(b.part.cents, flow.currency)}</span></li>)}</ul>
  </div>;
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
        <tbody>{flow.parts.map(p => <tr key={p.label}><th scope="row">{p.label}</th><td>{money(p.cents, flow.currency)}</td><td>{shareWords(p.cents, flow.income)}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}
export default function IncomeFlowView({entries, today}: InsightProps) {
  const flows = useMemo(() => currenciesOf(entries, today).map(c => incomeFlow(entries, c, monthKey(today))).filter(f => f.income || f.spent), [entries, today]);
  if (!flows.length) return <p className="fine">Log your income and spending this month and this shows where the income went, category by category.</p>;
  return <>{flows.map(f => <Currency key={f.currency} flow={f}/>)}</>;
}
