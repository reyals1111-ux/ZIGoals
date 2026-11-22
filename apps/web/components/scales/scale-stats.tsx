'use client';
import {useId, useState} from 'react';
import type {Scale, Scales} from '../../lib/scales/store';
import {valueWords} from '../../lib/scales/engine';
import {scaleStats, STAT_SPANS, type StatSpan} from '../../lib/scales/stats';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './your-scales.css';

const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/**
 * Session AV lane 2 (habits pillar; LEDGER #189, Daylio's scale statistics): a page per scale — choose the scale and the
 * last 30, 90 or 365 days: the days rated, the average, the lowest and highest, how often each level came (counts in
 * words, with a bar each), and a dot per rated day on one 1–5 axis (an unrated day is a gap). Loaded when its fold opens
 * on the Journal page's "Your own scales". Derived; nothing stored.
 */
export default function ScaleStats({rec, scales, today}: {rec: Pick<Scales, 'days'>; scales: readonly Scale[]; today: string}) {
  const [chosen, setChosen] = useState(scales[0]?.id ?? ''), [span, setSpan] = useState<StatSpan>(30), id = useId();
  const scale = scales.find(s => s.id === chosen) ?? scales[0];
  if (!scale) return <p className="fine">Add a scale above, rate it on a few days, and its statistics show here.</p>;
  const st = scaleStats(rec, scale.id, today, span), W = 320, H = 90, L = 18, days = span;
  const x = (d: string) => L + (days <= 1 ? (W - L) / 2 : dayDiff(st.from, d) / (days - 1) * (W - L - 6)), y = (v: number) => 8 + (5 - v) / 4 * (H - 24);
  const most = Math.max(1, ...st.counts);
  return <div className="scale-stats">
    <div className="scale-stats-pick">
      {scales.length > 1 && <label className="field"><span>Scale</span><select value={scale.id} onChange={e => setChosen(e.target.value)}>{scales.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      <fieldset className="scale-stats-spans"><legend>Over the last</legend>{STAT_SPANS.map(n => <label key={n} className="checkbox"><input type="radio" name={`${id}-span`} checked={span === n} onChange={() => setSpan(n)}/><span>{n} days</span></label>)}</fieldset>
    </div>
    <h3 className="scale-stats-title">{scale.name} <small>· {scale.low} (1) … {scale.high} (5)</small></h3>
    {st.rated ? <>
      <p>{st.rated} of {days} days rated · average {formatNumber(st.average!)} of 5 · lowest {st.low}, highest {st.high}{st.mostly ? ` · most often ${st.mostly} (${valueWords(scale, st.mostly)})` : ''}.</p>
      <ul className="scale-stats-levels" aria-label={`How often each level came, last ${span} days`}>{[5, 4, 3, 2, 1].map(l => { const n = st.counts[l - 1] ?? 0; return <li key={l}><span>{l} · {valueWords(scale, l)}</span><span className="scale-stats-bar" aria-hidden="true"><span style={{width: `${Math.round(n / most * 100)}%`}}/></span><strong>{n} {n === 1 ? 'day' : 'days'}</strong></li>; })}</ul>
      <svg className="scale-stats-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${scale.name}, each rated day from ${formatDate(st.from, {year: false})} to ${formatDate(st.to, {year: false})}: ${st.points.slice(-12).map(p => `${formatDate(p.date, {year: false})} ${p.value}`).join(', ')}${st.points.length > 12 ? ` (the latest 12 of ${st.points.length})` : ''}.`}>
        {[1, 3, 5].map(v => <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} className="scale-stats-grid"/><text x={L - 4} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
        {st.points.map(p => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={3} className="scale-stats-dot"><title>{formatDate(p.date, {year: false})}: {p.value}</title></circle>)}
        <text x={L} y={H - 2}>{formatDate(st.from, {year: false})}</text><text x={W} y={H - 2} textAnchor="end">{formatDate(st.to, {year: false})}</text>
      </svg>
    </> : <p>No rating in the last {span} days. Rate {scale.name} on the Journal page or in ZIGi’s check-in; skipped days stay unknown.</p>}
  </div>;
}
