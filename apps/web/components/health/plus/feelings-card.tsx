'use client';
import {useMemo, useState} from 'react';
import type {HealthData} from '../../../lib/health';
import {ENERGY} from '../../../lib/energy/schema';
import {SYMPTOMS} from '../../../lib/symptoms/schema';
import {DIRECTION_WORDS} from '../../../lib/health-trends/trends';
import {feelingTrends, measureOptions, weeklyMeasure, type MeasureId, type MeasureOption} from '../../../lib/feeling-trends/trends';
import {GRAPH_MAX, readCheckin, setGraph} from '../../../lib/checkin-extras/rule';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHabits} from '../../habits/use-habits';
import './feelings-card.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #66, #67 — Bearable's Trends and customisable graph), in Health → Activity
 * beside Trends: "How you felt" (mood, energy, each symptom or factor: the last 90 days against your usual, the last
 * 365) and "Week by week": up to four measures you choose (mood, energy, sleep, steps, a symptom, a habit's days),
 * drawn as small multiples over the same twelve weeks (one row each, its own scale; never two scales on one chart),
 * each point named on hover and focus, and the same numbers as a table. All from your own records, on view.
 */
const num = (v: number, max = 1) => formatNumber(v, {maximumFractionDigits: max});
export default function FeelingsCard({data, today}: {data: HealthData; today: string}) {
  const energy = useDeviceRecord(ENERGY), symptoms = useDeviceRecord(SYMPTOMS), habits = useHabits();
  const src = useMemo(() => ({health: data, energy: energy.loaded && !energy.unreadable ? energy.data : null, symptoms: symptoms.loaded && !symptoms.unreadable ? symptoms.data : null, habits: habits.loaded ? habits.data : null}), [data, energy.loaded, energy.unreadable, energy.data, symptoms.loaded, symptoms.unreadable, symptoms.data, habits.loaded, habits.data]);
  const trends = useMemo(() => feelingTrends(src, today), [src, today]);
  const options = useMemo(() => measureOptions(src), [src]);
  if (!energy.loaded || !symptoms.loaded) return null;
  return <>
    <section className="av2-feelings" aria-labelledby="av2-feelings-title"><p className="eyebrow">Your usual: the last 365 days</p><h2 id="av2-feelings-title">How you felt</h2>
      {trends.ready.length > 0 && <ul className="av2-feelings-list">{trends.ready.map(t => <li key={t.id}><span className="ap-trend-arrow" aria-hidden="true">{DIRECTION_WORDS[t.direction].arrow}</span><div>
        <p><strong>{t.label}: {DIRECTION_WORDS[t.direction].words}</strong></p>
        <p>Last 90 days: {num(t.recent.value)} of {t.scale} ({formatNumber(t.recent.days)} days answered). Your usual: {num(t.usual.value)} of {t.scale} ({formatNumber(t.usual.days)} days).</p>
      </div></li>)}</ul>}
      {trends.pending.length > 0 && <details className="ap-trends-pending" open={!trends.ready.length || undefined}><summary>Not enough days yet</summary><ul>{trends.pending.map(p => <li key={p.id}>{p.label}: {formatNumber(p.recentDays)} of the {p.needRecent} days needed in the last 90; {formatNumber(p.yearDays)} of the {p.needYear} in the last 365.</li>)}</ul></details>}
      {!trends.ready.length && !trends.pending.length && <p>Nothing answered yet. The day’s mood (Diary), the energy rating and Symptoms and factors fill this in; the evening check-in asks all three.</p>}
      <p className="fine">Only answered days count; a day without an answer is never read as none. Up or down describes your own answers, not whether that is good.</p>
    </section>
    <WeekGraph src={src} options={options} today={today} chosen={readCheckin(energy.data).graph} save={list => energy.update(r => setGraph(r, list))}/>
  </>;
}
function WeekGraph({src, options, today, chosen, save}: {src: Parameters<typeof weeklyMeasure>[0]; options: MeasureOption[]; today: string; chosen: string[]; save: (list: string[]) => void}) {
  const [said, setSaid] = useState('');
  const known = new Set(options.map(o => o.id)), own = chosen.filter(c => known.has(c as MeasureId));
  const shown = (own.length ? own : ['mood', 'sleep', 'steps', ...options.filter(o => o.id.startsWith('symptom:')).slice(0, 1).map(o => o.id)]) as MeasureId[];
  const rows = shown.map(id => ({o: options.find(x => x.id === id)!, w: weeklyMeasure(src, id, today, 12)})).filter(r => r.o);
  const weeks = rows[0]?.w.map(x => x.week) ?? [];
  const flip = (id: MeasureId, on: boolean) => {
    const next = on ? [...shown, id] : shown.filter(x => x !== id);
    try { save(next); setSaid(on ? `${options.find(o => o.id === id)?.label} is in the graph.` : `${options.find(o => o.id === id)?.label} is out of the graph.`); } catch (cause) { setSaid(cause instanceof Error ? cause.message : 'Not saved on this device.'); }
  };
  const fmt = (o: MeasureOption, v: number | null) => v === null ? 'no record' : o.id === 'steps' ? formatNumber(Math.round(v)) : o.id.startsWith('habit:') ? `${Math.round(v)}%` : num(v);
  const W = 300, H = 56, pad = 6;
  return <section className="av2-graph" aria-labelledby="av2-graph-title"><p className="eyebrow">The same twelve weeks</p><h2 id="av2-graph-title">Week by week</h2>
    {rows.length === 0 ? <p>Choose up to {GRAPH_MAX} measures below to see them side by side.</p> : <ul className="av2-graph-rows">{rows.map(({o, w}) => {
      const vals = w.map(x => x.value).filter((v): v is number => v !== null), lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1, span = hi - lo || 1;
      const x = (i: number) => pad + i * (W - 2 * pad) / Math.max(1, w.length - 1), y = (v: number) => H - pad - (v - lo) / span * (H - 2 * pad);
      const segs: string[][] = []; let cur: string[] = [];
      w.forEach((p, i) => { if (p.value === null) { if (cur.length) segs.push(cur); cur = []; } else cur.push(`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`); }); if (cur.length) segs.push(cur);
      const last = [...w].reverse().find(p => p.value !== null);
      return <li key={o.id} className="av2-graph-row">
        <p className="av2-graph-label"><strong>{o.label}</strong> <span className="fine">{last ? `${fmt(o, last.value)} ${o.unit} in the week of ${formatDate(last.week, {year: false})}` : 'no record in these weeks'}</span></p>
        <svg viewBox={`0 0 ${W} ${H}`} className="av2-graph-svg" role="img" aria-label={`${o.label}, week by week: ${w.map(p => `${formatDate(p.week, {year: false})} ${fmt(o, p.value)}`).join('; ')}`} preserveAspectRatio="none">
          <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} className="av2-graph-base"/>
          {segs.map((s, k) => s.length > 1 ? <polyline key={k} points={s.join(' ')} className="av2-graph-line"/> : null)}
          {w.map((p, i) => p.value === null ? null : <circle key={p.week} cx={x(i)} cy={y(p.value)} r={4} className="av2-graph-dot"><title>{`${o.label}, week of ${formatDate(p.week, {year: false})}: ${fmt(o, p.value)} ${o.unit} (${p.days} ${p.days === 1 ? 'day' : 'days'})`}</title></circle>)}
        </svg>
      </li>;
    })}</ul>}
    {weeks.length > 0 && <p className="fine av2-graph-axis"><span>{formatDate(weeks[0]!, {year: false})}</span><span>week of {formatDate(weeks.at(-1)!, {year: false})}</span></p>}
    {rows.length > 0 && <details className="av2-graph-table"><summary>As a table</summary><div className="av2-graph-scroll" role="region" aria-label="Week by week as a table" tabIndex={0}><table><caption className="sr-only">Week by week, one row per week</caption><thead><tr><th scope="col">Week of</th>{rows.map(r => <th key={r.o.id} scope="col">{r.o.label} ({r.o.unit})</th>)}</tr></thead>
      <tbody>{weeks.map((wk, i) => <tr key={wk}><th scope="row">{formatDate(wk, {year: false})}</th>{rows.map(r => <td key={r.o.id}>{fmt(r.o, r.w[i]!.value)}</td>)}</tr>)}</tbody></table></div></details>}
    <details className="av2-graph-pick"><summary>Choose what to show (up to {GRAPH_MAX})</summary><fieldset><legend className="sr-only">Measures in the graph</legend>
      {options.map(o => { const on = shown.includes(o.id); return <label key={o.id} className="checkbox"><input type="checkbox" checked={on} disabled={!on && shown.length >= GRAPH_MAX} onChange={e => flip(o.id, e.target.checked)}/><span>{o.label}</span></label>; })}
    </fieldset></details>
    <p className="fine" role="status">{said}</p>
    <p className="fine">Each row has its own scale, so rows are compared by their shape over the same weeks, not by height. Weeks without a record are left blank.</p>
  </section>;
}
