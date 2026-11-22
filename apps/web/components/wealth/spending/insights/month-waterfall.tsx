'use client';
import {useMemo, useState} from 'react';
import {monthWaterfall, type Waterfall, type WaterfallMode} from '../../../../lib/money-insights/month-compare';
import {formatDate, formatMonth} from '../../../../lib/visual-format';
import {monthOf} from '../../../../lib/money-log/engine';
import type {InsightProps} from './spending-insights';
import {money, signed} from './format';

/**
 * Session AV lane 2, round 3 (money; Simplifi's comparison report with a waterfall, LEDGER #297): Wealth → Spending →
 * "Your money over time" → "What changed": a waterfall from last month's spending total to this month's, one step per
 * category that moved it, largest first, per currency (lib/money-insights/month-compare.ts `monthWaterfall`, from Wealth
 * → Spending's own figures). Hand-drawn, no motion; the table beside it holds every figure. Its own chunk.
 */
const W = 640, BAR = 34, GAP = 10, PAD = 8, MAX_STEPS = 8;
function Chart({w}: {w: Waterfall}) {
  const shown = w.steps.slice(0, MAX_STEPS), rest = w.steps.slice(MAX_STEPS).reduce((n, s) => n + s.change, 0);
  const steps = rest ? [...shown, {category: `${w.steps.length - MAX_STEPS} more`, change: rest}] : shown;
  const bars: {label: string; from: number; to: number; kind: 'total' | 'up' | 'down'}[] = [{label: 'before', from: 0, to: w.before, kind: 'total'}];
  let run = w.before;
  for (const s of steps) { bars.push({label: s.category, from: run, to: run + s.change, kind: s.change > 0 ? 'up' : 'down'}); run += s.change; }
  bars.push({label: 'after', from: 0, to: w.after, kind: 'total'});
  const max = Math.max(1, ...bars.flatMap(b => [b.from, b.to])), H = bars.length * (BAR + GAP) + PAD * 2, x = (v: number) => PAD + (v / max) * (W - PAD * 2);
  return <svg className="money-insights-chart waterfall-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${w.currency}: from ${money(w.before, w.currency)} to ${money(w.after, w.currency)}, one bar per category that moved it; the table lists the same figures`}>
    {bars.map((b, i) => { const lo = Math.min(b.from, b.to), hi = Math.max(b.from, b.to), y = PAD + i * (BAR + GAP);
      return <rect key={`${b.label}-${i}`} className={`waterfall-${b.kind}`} x={x(lo)} y={y} width={Math.max(2, x(hi) - x(lo))} height={BAR} rx={4}/>; })}
  </svg>;
}
function One({w}: {w: Waterfall}) {
  const c = w.currency, span = (p: {start: string; end: string}) => p.start.endsWith('-01') && p.end === monthOf(p.start).end ? formatMonth(p.start.slice(0, 7)) : `${formatDate(p.start)} – ${formatDate(p.end)}`;
  const from = span(w.from), to = span(w.to);
  if (!w.recorded) return <section className="money-insights-currency" aria-label={`What changed in ${c}`}><h4>What changed · {c}</h4><p className="fine">{formatMonth(w.from.start.slice(0, 7))} has no records in {c}, so there is nothing to compare yet.</p></section>;
  return <section className="money-insights-currency" aria-label={`What changed in ${c}`}>
    <h4>What changed · {c}</h4>
    <p><strong>{money(w.before, c)}</strong> ({from}) to <strong>{money(w.after, c)}</strong> ({to}): {w.after === w.before ? 'the same' : `${signed(w.after - w.before, c)}`}.</p>
    <p className="money-insights-legend" aria-hidden="true"><span><i className="waterfall-key-total"/>Total</span><span><i className="waterfall-key-up"/>More spent</span><span><i className="waterfall-key-down"/>Less spent</span></p>
    <Chart w={w}/>
    <table className="money-insights-table">
      <caption className="sr-only">Spending in {c}, {from} to {to}, by the categories that moved it, largest first</caption>
      <thead><tr><th scope="col">Step</th><th scope="col">Change</th></tr></thead>
      <tbody>
        <tr><th scope="row">Spent {from}</th><td>{money(w.before, c)}</td></tr>
        {w.steps.map(s => <tr key={s.category}><th scope="row">{s.category} <small className="fine">({money(s.before, c)} → {money(s.after, c)})</small></th><td>{signed(s.change, c)}</td></tr>)}
        <tr><th scope="row">Spent {to}</th><td>{money(w.after, c)}</td></tr>
      </tbody>
    </table>
  </section>;
}
export default function MonthWaterfallView({entries, today}: InsightProps) {
  const [mode, setMode] = useState<WaterfallMode>('so-far');
  const rows = useMemo(() => monthWaterfall(entries, today, mode), [entries, today, mode]);
  return <>
    <div className="money-insights-views" role="group" aria-label="Compare">
      <button type="button" className="quiet" aria-pressed={mode === 'so-far'} onClick={() => setMode('so-far')}>This month so far</button>
      <button type="button" className="quiet" aria-pressed={mode === 'last-full'} onClick={() => setMode('last-full')}>Last month, whole</button>
    </div>
    {!rows.length ? <p className="fine">No spending logged in these two months yet. Once there is, this shows how the total moved, category by category.</p> : rows.map(w => <One key={w.currency} w={w}/>)}
    <p className="fine">{mode === 'so-far' ? 'This month so far beside last month to the same day.' : 'Last month beside the month before, both whole.'} From your own entries, as Wealth → Spending counts them; a comparison of records, not a forecast.</p>
  </>;
}
