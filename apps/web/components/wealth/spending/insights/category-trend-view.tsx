'use client';
import {useId, useMemo, useState} from 'react';
import {categoryTrend, currenciesOf, type TrendView} from '../../../../lib/money-insights/cash-flow';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AP (feature 1): each spending category over the 12 months to this one, one currency at a time. A small line per
 * category (decoration; a month with no record breaks the line instead of dropping to zero), its 12-month total in words,
 * and a table of the chosen category month by month, where a month with nothing logged reads "No records".
 */
function Spark({values}: {values: readonly (number | null)[]}) {
  const max = Math.max(1, ...values.map(v => v ?? 0)), w = 120, h = 32, step = w / Math.max(1, values.length - 1);
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => { if (v === null) { if (run.length) runs.push(run); run = []; } else run.push([i * step, h - 3 - (v / max) * (h - 6)]); });
  if (run.length) runs.push(run);
  return <svg className="money-insights-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
    {runs.map((r, i) => r.length === 1 ? <circle key={i} cx={r[0]![0]} cy={r[0]![1]} r={2.5}/> : <polyline key={i} points={r.map(p => p.join(',')).join(' ')}/>)}
  </svg>;
}
function Currency({view}: {view: TrendView}) {
  const id = useId(), [chosen, setChosen] = useState(view.categories[0]?.category ?? ''), row = view.categories.find(c => c.category === chosen) ?? view.categories[0];
  if (!row) return null;
  const recordedMonths = view.recorded.filter(Boolean).length;
  return <section className="money-insights-currency" aria-label={`Categories over a year in ${view.currency}`}>
    <h4>Categories over a year · {view.currency}</h4>
    <ul className="money-insights-trend">{view.categories.slice(0, 10).map(c => <li key={c.category}>
      <span><strong>{c.category}</strong> <span className="fine">· {money(c.total, view.currency)} over {recordedMonths === 1 ? 'the one month' : `the ${recordedMonths} months`} with records</span></span>
      <Spark values={c.values}/>
    </li>)}</ul>
    <label className="field"><span>Month by month for</span><select value={row.category} onChange={e => setChosen(e.target.value)} aria-controls={`${id}-table`}>{view.categories.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}</select></label>
    <table className="money-insights-table" id={`${id}-table`}>
      <caption>{row.category} in {view.currency}, {monthName(view.months[0]!)} to {monthName(view.months.at(-1)!)}</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Spent</th></tr></thead>
      <tbody>{view.months.map((m, i) => { const v = row.values[i] ?? null; return <tr key={m} className={v === null ? 'money-insights-gap' : undefined}><th scope="row">{monthName(m)}</th><td>{v === null ? 'No records' : money(v, view.currency)}</td></tr>; })}</tbody>
    </table>
  </section>;
}
export default function CategoryTrendView({entries, today}: InsightProps) {
  const views = useMemo(() => currenciesOf(entries, today).map(c => categoryTrend(entries, c, today)).filter(v => v.categories.length), [entries, today]);
  if (!views.length) return <p className="fine">No spending logged in the last 12 months yet.</p>;
  return <>{views.map(v => <Currency key={v.currency} view={v}/>)}</>;
}
