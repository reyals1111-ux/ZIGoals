'use client';
import Link from 'next/link';
import {useId} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {MILESTONES, type PaceChart} from '../../../lib/nova/holo/goals';
import {arcPath, polar} from '../../../lib/nova/holo/geometry';
import {forecastWords} from '../../../lib/goal-forecast';
import {formatDay} from '../../goals/format';
import {DotSlider, Glint, HoloEmpty, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {useGoalsHud, usePillarShown} from '../holo/use-hud-data';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Goals HUD" in violet — each active goal's progress on an arc with milestone ticks at a
 * quarter, a half and three quarters (ornaments), and the lead goal's pace: its recorded progress as a line toward the
 * target, with the projection band from today to the forecast's earliest and latest dates, labelled "Estimate" in the
 * forecast's own words (lib/goal-forecast.ts). Nothing here is a promise or advice. Second pass: the chart names its own
 * parts in place (Target, Today, Estimate), and a large panel lists the next goals as dot sliders with milestone ticks.
 * Review fixes (lane L8d, B1, M1, M8): the panel fits its height with the pace line whole (a medium panel shows the arcs
 * and the pace; rows drop only below that, never through the chart); each goal is one link (its arc, its name and its
 * pace words), the name one centred line with an ellipsis and its full words in the table; an empty panel is unlit arcs.
 */
const SWEEP = 270, START = -135;
function GoalArc({pct}: {pct: number | null}) {
  const s = pct === null ? 0 : Math.max(0, Math.min(1, pct / 100)), end = polar(0, 0, 40, START + SWEEP * s);
  return <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
    <path className="holo-track-path" d={arcPath(0, 0, 40, START, START + SWEEP)} data-unknown={pct === null || undefined}/>
    {MILESTONES.map(m => { const a = polar(0, 0, 33, START + SWEEP * m / 100), b = polar(0, 0, 47, START + SWEEP * m / 100); return <path key={m} className="holo-orn-ticks holo-orn-major" d={`M${a.x} ${a.y}L${b.x} ${b.y}`}/>; })}
    {s > 0 && <><path className="holo-arc" d={arcPath(0, 0, 40, START, START + SWEEP * s)}/><Glint d={arcPath(0, 0, 40, START, START + SWEEP * s)}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r="3.4"/></>}
  </svg>;
}
function PaceLine({chart, label}: {chart: PaceChart; label: string}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), W = 260, H = 70, P = 4, top = chart.target * 1.06;
  const x = (t: number) => P + t / Math.max(1, chart.span) * (W - 2 * P), y = (v: number) => H - P - Math.max(0, Math.min(1, v / top)) * (H - 2 * P);
  const line = chart.line.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('') + `L${x(chart.now.t).toFixed(1)} ${y(chart.now.v).toFixed(1)}`;
  const b = chart.band, ty = y(chart.target), nx = x(chart.now.t), ny = y(chart.now.v);
  const pct = (n: number, of: number) => `${Math.max(0, Math.min(100, n / of * 100)).toFixed(1)}%`;
  return <div className="holo-pace-chart">
  <svg className="holo-pace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs><linearGradient id={`${id}b`} x1="0" x2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient></defs>
    <path className="holo-grid-lines" d={[0.25, 0.5, 0.75].map(f => `M0 ${H * f}H${W}`).join('')}/>
    <path className="holo-target-line" d={`M${P} ${ty.toFixed(1)}H${W - P}`}/>
    {b && <path className="holo-band" fill={`url(#${id}b)`} d={`M${nx.toFixed(1)} ${ny.toFixed(1)}L${x(b.early).toFixed(1)} ${ty.toFixed(1)}L${(b.late === null ? W - P : x(b.late)).toFixed(1)} ${ty.toFixed(1)}Z`}/>}
    {b && <path className="holo-band-mid" d={`M${nx.toFixed(1)} ${ny.toFixed(1)}L${x(b.mid).toFixed(1)} ${ty.toFixed(1)}`}/>}
    <path className="holo-spark-line" d={line}/>
    <Glint d={line}/>
    <title>{label}</title>
  </svg>
  {/* Today's point stays round over the stretched drawing (HTML). */}
  <i className="holo-pace-dot" style={{left: pct(nx, W), top: pct(ny, H)}} aria-hidden="true"/>
  {/* The chart's own names, in place (decoration over the words below, which say the same). */}
  <span className="holo-chart-tag" data-at="target" style={{top: pct(ty, H)}} aria-hidden="true">Target</span>
  <span className="holo-chart-tag" data-at="today" style={{left: pct(nx, W)}} aria-hidden="true">Today</span>
  {b && <span className="holo-chart-tag holo-chart-estimate" style={{left: pct(x(b.mid), W), top: pct(ty, H)}} aria-hidden="true">Estimate</span>}
  </div>;
}
export default function GoalsHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('goals'), data = useGoalsHud();
  if (!shown) return <HoloHidden pillar="Goals"/>;
  if (!data.loaded) return <HoloReading/>;
  if (data.error || !data.arcs) return <HoloUnread what="Your goals"/>;
  const {arcs, active} = data.arcs;
  if (!arcs.length) return <HoloEmpty kind="arcs" href="/app/goals/new" action="Set a goal">No active goals yet. Their progress and pace light up here.</HoloEmpty>;
  const shownArcs = arcs.slice(0, size === 'S' ? 1 : 3), sliders = size === 'L' ? arcs.slice(3, 7) : [], more = Math.max(0, active - shownArcs.length - sliders.length), pace = size === 'S' ? null : data.pace, words = pace ? forecastWords(pace.forecast, formatDay) : null;
  const moreLink = more > 0 ? <Link className="holo-more-link" href="/app/goals" prefetch={false}>+{more} more <span className="sr-only">{more === 1 ? 'goal' : 'goals'}</span></Link> : null;
  return <div className="holo-goals" data-size={size}>
    <ul className="holo-arcs" data-count={shownArcs.length}>{shownArcs.map(a => <li key={a.key} data-tone={a.pace.tone}>
      <Link href={a.href} prefetch={false} className="holo-arc-link" title={a.name}>
        <span className="holo-arc-box"><GoalArc pct={a.pct}/><HoloFigure text={a.text} className="holo-num-arc"/></span>
        <span className="holo-arc-name">{a.name}</span>
        <small className="holo-pace-words">{a.pace.words}</small>
      </Link>
    </li>)}</ul>
    {sliders.length > 0 && <ul className="holo-sliders" aria-label="More active goals">{sliders.map(a => <li key={a.key} data-tone={a.pace.tone}>
      <Link href={a.href} prefetch={false} className="holo-slider-name" title={a.name}>{a.name}</Link>
      <DotSlider share={a.pct === null ? null : a.pct / 100}/>
      <b className="holo-num">{a.text}</b>
    </li>)}</ul>}
    {pace && words ? <div className="holo-pace-box" data-state={pace.chart.state}>
      <p className="holo-label holo-pace-head"><span className="holo-pace-name">Pace · {pace.name}</span>{moreLink}</p>
      <PaceLine chart={pace.chart} label={`${words.headline}. ${words.detail}`}/>
      <p className="holo-estimate">{pace.chart.band ? <span className="holo-tag holo-tag-estimate" title="A projection from your recorded pace, not a promise">Estimate</span> : null}<span className="holo-estimate-words">{words.headline}{pace.chart.band ? <span className="holo-estimate-note"> · projection, not a promise</span> : null}</span></p>
    </div> : moreLink && <p className="holo-more">{moreLink}</p>}
    <HoloTable caption="Goals" rows={[...arcs.map(a => [a.name, `${a.text} · ${a.pace.words}`] as const), ...(pace && words ? [[`Pace of ${pace.name}`, `${words.headline}${pace.chart.band ? ' (an estimate: a projection, not a promise)' : ''}. ${words.detail}`] as const] : [])]}/>
  </div>;
}
