'use client';
import {useMemo} from 'react';
import {cashFlow, currenciesOf, type CashFlow} from '../../../../lib/money-insights/cash-flow';
import type {InsightProps} from './spending-insights';
import {money, monthName, signed} from './format';

/**
 * Session AP (feature 1): income, spending and net for the last 12 months with a record, one currency at a time. The
 * chart is drawn by hand (no library, no motion) and is never the only way to read it: the table beside it lists every
 * figure. A run of months with nothing logged is one gap row ("No records"), drawn as an empty dashed slot, never zero.
 */
const W = 640, H = 180, PAD = 8;
function Chart({flow}: {flow: CashFlow}) {
  const slots = flow.rows.length, step = (W - PAD * 2) / Math.max(1, slots), bar = Math.max(2, Math.min(22, step / 2 - 3));
  const max = Math.max(1, ...flow.months.flatMap(m => [m.income, m.spending])), base = H - PAD, scale = (v: number) => (v / max) * (H - PAD * 2);
  return <svg className="money-insights-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${flow.currency}: money received and spent each month, as bars; the table lists the same figures`}>
    <line className="axis" x1={PAD} x2={W - PAD} y1={base} y2={base}/>
    {flow.rows.map((r, i) => {
      const x = PAD + i * step + step / 2;
      if (r.kind === 'gap') return <rect key={`gap-${r.from}`} className="gap-mark" x={x - bar - 1} y={PAD} width={bar * 2 + 2} height={H - PAD * 2} rx={4}><title>{r.months === 1 ? monthName(r.from) : `${monthName(r.from)} – ${monthName(r.to)}`}: no records</title></rect>;
      const hIn = scale(r.income), hOut = scale(r.spending);
      return <g key={r.month}>
        {r.income > 0 && <rect className="bar-in" x={x - bar - 1} y={base - hIn} width={bar} height={hIn} rx={Math.min(4, bar / 2)}><title>{monthName(r.month)}: received {money(r.income, flow.currency)}</title></rect>}
        {r.spending > 0 && <rect className="bar-out" x={x + 1} y={base - hOut} width={bar} height={hOut} rx={Math.min(4, bar / 2)}><title>{monthName(r.month)}: spent {money(r.spending, flow.currency)}</title></rect>}
      </g>;
    })}
  </svg>;
}
export default function CashFlowView({entries, today}: InsightProps) {
  const flows = useMemo(() => currenciesOf(entries, today).map(c => cashFlow(entries, c, today)).filter(f => f.months.length), [entries, today]);
  if (!flows.length) return <p className="fine">Nothing logged yet. Months appear here once you log spending or income.</p>;
  return <>{flows.map(flow => <section key={flow.currency} className="money-insights-currency" aria-label={`Month by month in ${flow.currency}`}>
    <h4>Month by month · {flow.currency}</h4>
    <p className="money-insights-legend" aria-hidden="true"><span><i className="in"/>Received</span><span><i className="out"/>Spent</span></p>
    <Chart flow={flow}/>
    <table className="money-insights-table">
      <caption>{flow.currency}: the last {flow.months.length === 1 ? 'month' : `${flow.months.length} months`} with a record</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Received</th><th scope="col">Spent</th><th scope="col">Net</th></tr></thead>
      <tbody>{flow.rows.map(r => r.kind === 'gap'
        ? <tr key={`gap-${r.from}`} className="money-insights-gap"><th scope="row">{r.months === 1 ? monthName(r.from) : `${monthName(r.from)} – ${monthName(r.to)}`}</th><td colSpan={3}>No records</td></tr>
        : <tr key={r.month}><th scope="row">{monthName(r.month)}</th><td>{money(r.income, flow.currency)}</td><td>{money(r.spending, flow.currency)}</td><td>{signed(r.net, flow.currency)}</td></tr>)}</tbody>
    </table>
  </section>)}
  <p className="fine">Net is what you logged as received minus what you logged as spent that month. Your records, not your bank balance.</p></>;
}
