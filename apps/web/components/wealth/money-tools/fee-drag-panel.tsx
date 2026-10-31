'use client';
import {useId, useState} from 'react';
import {FEE_LIMITS, feeDrag, feeDragIssue, type FeeDragInput} from '../../../lib/fee-drag/fee-drag';
import {money} from './format';
import './money-tools.css';

/**
 * Session AK (lane M, item 18): the fee drag calculator beside the compound interest calculator. One amount, the same
 * yearly return, two yearly fees (expense ratios): the two balances as two lines and the difference at the end. An
 * illustration from the person's own numbers; nothing is stored and nothing is advice. Lazy-loaded on the calculator page.
 */
const num = (raw: string) => raw.trim() === '' ? Number.NaN : Number(raw.trim().replace(/\s/g, '').replace(',', '.'));
const W = 320, H = 160, PAD = 8;
export default function FeeDragPanel() {
  const id = useId();
  const [f, setF] = useState({amount: '10000', years: '30', returnPct: '6', feeA: '0.2', feeB: '1', currency: 'EUR'});
  const input: FeeDragInput = {amount: num(f.amount), years: num(f.years), returnPct: num(f.returnPct), feeAPct: num(f.feeA), feeBPct: num(f.feeB)};
  const issue = feeDragIssue(input), result = issue ? null : feeDrag(input); // 60 small steps at most: no memo needed
  const set = (key: keyof typeof f) => (e: {target: {value: string}}) => setF(x => ({...x, [key]: e.target.value}));
  const path = (values: number[], max: number) => values.map((v, i) => `${i ? 'L' : 'M'}${(PAD + (W - 2 * PAD) * i / Math.max(1, values.length - 1)).toFixed(1)} ${(H - PAD - (H - 2 * PAD) * v / max).toFixed(1)}`).join(' ');
  const max = result ? Math.max(...result.a, ...result.b, 1) : 1;
  return <section className="money-panel fee-drag" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">A PLANNING TOOL</p>
    <h3 id={`${id}-title`}>What a yearly fee costs</h3>
    <p className="fine">The same amount and return under two yearly fees (an expense ratio). An illustration from your own numbers; returns are not guaranteed and this is not advice.</p>
    <div className="money-grid">
      <label className="field"><span>Amount</span><input inputMode="decimal" value={f.amount} onChange={set('amount')}/></label>
      <label className="field"><span>Currency</span><select value={f.currency} onChange={set('currency')}>{['EUR', 'USD', 'GBP', 'CHF'].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <label className="field"><span>Years ({FEE_LIMITS.years[0]} to {FEE_LIMITS.years[1]})</span><input inputMode="numeric" value={f.years} onChange={set('years')}/></label>
      <label className="field"><span>Yearly return before fees (%)</span><input inputMode="decimal" value={f.returnPct} onChange={set('returnPct')}/></label>
      <label className="field"><span>Fee A each year (%)</span><input inputMode="decimal" value={f.feeA} onChange={set('feeA')}/></label>
      <label className="field"><span>Fee B each year (%)</span><input inputMode="decimal" value={f.feeB} onChange={set('feeB')}/></label>
    </div>
    {issue ? <p role="alert">{issue}</p> : result && <>
      <p className="fee-drag-result" aria-live="polite">After {input.years} {input.years === 1 ? 'year' : 'years'}: <strong>{money(result.endA, f.currency)}</strong> with fee A and <strong>{money(result.endB, f.currency)}</strong> with fee B — a difference of <strong>{money(Math.abs(result.difference), f.currency)}</strong>{result.difference !== 0 ? ` (${Math.round(result.share * 1000) / 10} % of the higher one)` : ''}.</p>
      <svg className="money-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Two lines over ${input.years} years: fee A ends at ${money(result.endA, f.currency)}, fee B at ${money(result.endB, f.currency)}.`}>
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="money-chart-axis"/>
        <path d={path(result.a, max)} className="money-chart-a"/>
        <path d={path(result.b, max)} className="money-chart-b"/>
      </svg>
      <p className="fine money-legend"><span className="money-key money-key-a" aria-hidden="true"/>Fee A ({input.feeAPct} %) <span className="money-key money-key-b" aria-hidden="true"/>Fee B ({input.feeBPct} %), dashed</p>
    </>}
  </section>;
}
