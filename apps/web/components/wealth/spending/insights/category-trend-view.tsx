'use client';
import {useId, useMemo, useState} from 'react';
import {AVERAGE_SPANS, categoryTrend, currenciesOf, monthlyAverage, totalTrend, trendDrawable, type AverageLine, type AverageSpan, type MonthAverage, type TrendView} from '../../../../lib/money-insights/cash-flow';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AP (feature 1): each spending category over the 12 months to this one, one currency at a time. A small line per
 * category (decoration; a month with no record breaks the line instead of dropping to zero), its 12-month total in words,
 * and a table of the chosen category month by month, where a month with nothing logged reads "No records".
 * Session AV lane 2, round 4 (money; Actual's average ranges, LEDGER #343): the 3-, 6- or 12-month average before this
 * month as a dashed line on each small line and on all spending, and in words beside this month so far ("€40.00 above
 * your 6-month average of €160.00") — a fact, never a target or a warning. Figures: `byCategory` and `totals`
 * (lib/money-insights/cash-flow.ts `monthlyAverage`, `categoryTrend`, `totalTrend`).
 */
function Spark({values, average}: {values: readonly (number | null)[]; average?: number | null}) {
  const max = Math.max(1, ...values.map(v => v ?? 0), average ?? 0), w = 120, h = 32, step = w / Math.max(1, values.length - 1);
  const y = (v: number) => h - 3 - (v / max) * (h - 6);
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => { if (v === null) { if (run.length) runs.push(run); run = []; } else run.push([i * step, y(v)]); });
  if (run.length) runs.push(run);
  return <svg className="money-insights-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
    {average !== null && average !== undefined && average > 0 && <line className="avg" x1={0} x2={w} y1={y(average)} y2={y(average)}/>}
    {runs.map((r, i) => r.length === 1 ? <circle key={i} cx={r[0]![0]} cy={r[0]![1]} r={2.5}/> : <polyline key={i} points={r.map(p => p.join(',')).join(' ')}/>)}
  </svg>;
}
/** "Nov 2026 so far €120.00, €40.00 below your 6-month average of €160.00." */
export function averageWords(line: AverageLine | undefined, avg: MonthAverage, currency: string): string {
  if (!line || line.average === null || line.diff === null) return `No ${avg.span}-month average yet: no earlier month with records in ${currency}.`;
  const over = avg.recorded < avg.span ? ` (over the ${avg.recorded === 1 ? '1 month' : `${avg.recorded} months`} with records)` : '';
  const how = line.diff === 0 ? 'the same as' : `${money(Math.abs(line.diff), currency)} ${line.diff > 0 ? 'above' : 'below'}`;
  return `${monthName(avg.month)} so far ${money(line.thisMonth, currency)}, ${how} your ${avg.span}-month average of ${money(line.average, currency)}${over}.`;
}
function Currency({view, avg, all}: {view: TrendView; avg: MonthAverage; all: (number | null)[]}) {
  const id = useId(), [chosen, setChosen] = useState(view.categories[0]?.category ?? ''), row = view.categories.find(c => c.category === chosen) ?? view.categories[0];
  if (!row) return null;
  const recordedMonths = view.recorded.filter(Boolean).length, drawn = trendDrawable(view), chosenAvg = avg.categories.get(row.category);
  return <section className="money-insights-currency" aria-label={`Categories over a year in ${view.currency}`}>
    <h4>Categories over a year · {view.currency}</h4>
    {/* Session AT (AP D22 minor 2): under three months with records, no line is drawn; a month without records is unknown, not zero. */}
    {!drawn && <p className="fine money-insights-spark-note">A line needs three months with records in {view.currency}; there {recordedMonths === 1 ? 'is 1 so far' : `are ${recordedMonths} so far`}, so none is drawn yet. A month without records is unknown, not zero.</p>}
    {drawn && <p className="money-insights-legend" aria-hidden="true"><span><i className="money-saved-key"/>Your {avg.span}-month average</span></p>}
    <ul className="money-insights-trend">
      <li className="money-avg-all"><span><strong>All spending</strong> <span className="fine">· {averageWords(avg.total, avg, view.currency)}</span></span>{drawn && <Spark values={all} average={avg.total.average}/>}</li>
      {view.categories.slice(0, 10).map(c => { const a = avg.categories.get(c.category); return <li key={c.category}>
        <span><strong>{c.category}</strong> <span className="fine">· {money(c.total, view.currency)} over {recordedMonths === 1 ? 'the one month' : `the ${recordedMonths} months`} with records{a && a.average !== null ? ` · average ${money(a.average, view.currency)} a month` : ''}</span></span>
        {drawn && <Spark values={c.values} average={a?.average ?? null}/>}
      </li>; })}
    </ul>
    <label className="field"><span>Month by month for</span><select value={row.category} onChange={e => setChosen(e.target.value)} aria-controls={`${id}-table`}>{view.categories.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}</select></label>
    <p className="money-avg-line">{row.category}: {averageWords(chosenAvg, avg, view.currency)}</p>
    <table className="money-insights-table" id={`${id}-table`}>
      <caption>{row.category} in {view.currency}, {monthName(view.months[0]!)} to {monthName(view.months.at(-1)!)}</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Spent</th></tr></thead>
      <tbody>{view.months.map((m, i) => { const v = row.values[i] ?? null; return <tr key={m} className={v === null ? 'money-insights-gap' : undefined}><th scope="row">{monthName(m)}</th><td>{v === null ? 'No records' : money(v, view.currency)}</td></tr>; })}</tbody>
      {chosenAvg && chosenAvg.average !== null && <tfoot><tr><th scope="row">{avg.span}-month average</th><td>{money(chosenAvg.average, view.currency)}</td></tr></tfoot>}
    </table>
  </section>;
}
export default function CategoryTrendView({entries, today}: InsightProps) {
  const [span, setSpan] = useState<AverageSpan>(6);
  const views = useMemo(() => currenciesOf(entries, today).map(c => categoryTrend(entries, c, today)).filter(v => v.categories.length), [entries, today]);
  const avgs = useMemo(() => views.map(v => monthlyAverage(entries, v.currency, today, span)), [views, entries, today, span]);
  const alls = useMemo(() => views.map(v => totalTrend(entries, v, today)), [views, entries, today]);
  if (!views.length) return <p className="fine">No spending logged in the last 12 months yet.</p>;
  return <>
    <div className="money-insights-views money-avg-span" role="group" aria-label="Average over">{AVERAGE_SPANS.map(n => <button key={n} type="button" className="quiet" aria-pressed={span === n} onClick={() => setSpan(n)}>{n}-month average</button>)}</div>
    {views.map((v, i) => <Currency key={v.currency} view={v} avg={avgs[i]!} all={alls[i]!}/>)}
    <p className="fine">The average is of the months before this one with records; this month counts so far. Figures, not a target.</p>
  </>;
}
