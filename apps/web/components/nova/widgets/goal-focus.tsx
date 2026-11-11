'use client';
import Link from 'next/link';
import {useId, useMemo, type CSSProperties, type ReactNode} from 'react';
import {paceForecast, privateGoalPoints, type Forecast} from '../../../lib/goal-forecast';
import {localDate} from '../../../lib/local-date';
import {estimateWords, focusGoal, type FocusGoal} from '../../../lib/nova/cards/goal-focus';
import {arcPath, polar} from '../../../lib/nova/holo/geometry';
import {MILESTONES, paceChart, type PaceChart} from '../../../lib/nova/holo/goals';
import {formatDate} from '../../../lib/visual-format';
import {useEvidenceNow} from '../../platform/use-evidence-now';
import {usePlatform} from '../../platform/use-platform';
import {CardFoot, CardNotice, Delta, Fact, Hero, type CardProps} from '../cards/kit';
import {Glint, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {useGoalsHud, usePillarShown} from '../holo/use-hud-data';
import '../cards/life-cards.css';

/**
 * Session AM (ADR-038; art direction §4, Goals): "Goal" in violet — one goal: the percent reached on an arc with
 * milestone ticks, its name, what is saved of its target, whether its plan keeps pace and, where its own records give
 * one, the date its pace points to — always an estimate, never a promise. The goal is the one the request named
 * (`params.ref`), else the lead goal of NOVA's Goals HUD; every figure comes through the same functions as that HUD and
 * the goal's own page (lib/nova/cards/goal-focus.ts).
 * S: the arc, the percent and the name. M: the amounts, the pace and the estimate. L: the pace line, what is left and
 * the target date.
 */
const SWEEP = 270, START = -135;
/** The goal's arc, as the Goals HUD draws one: a track, milestone ticks at a quarter, a half and three quarters, the lit share. */
function GoalRing({pct, size, children}: {pct: number | null; size: number; children?: ReactNode}) {
  const s = pct === null ? 0 : Math.max(0, Math.min(1, pct / 100)), end = polar(0, 0, 40, START + SWEEP * s), lit = arcPath(0, 0, 40, START, START + SWEEP * s);
  return <span className="nc-goal-ring" style={{'--nc-goal-ring': `${size}px`} as CSSProperties}>
    <svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      <path className="holo-track-path" d={arcPath(0, 0, 40, START, START + SWEEP)} data-unknown={pct === null || undefined}/>
      {MILESTONES.map(m => { const a = polar(0, 0, 33, START + SWEEP * m / 100), b = polar(0, 0, 47, START + SWEEP * m / 100); return <path key={m} className="holo-orn-ticks holo-orn-major" d={`M${a.x} ${a.y}L${b.x} ${b.y}`}/>; })}
      {s > 0 && lit && <><path className="holo-arc nc-draw" pathLength={1} d={lit}/><Glint d={lit}/><circle className="holo-arc-end" cx={end.x} cy={end.y} r="3"/></>}
    </svg>
    {children}
  </span>;
}
/**
 * The pace line, as the Goals HUD draws it (the same selector, lib/nova/holo/goals.ts paceChart, and the same strokes):
 * the recorded progress up to today, the target as a dashed line and, only for an estimate, the band from today to the
 * earliest and latest dates with the central estimate dashed through it.
 */
function PaceLine({chart, label}: {chart: PaceChart; label: string}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, ''), W = 320, H = 100, P = 5, top = chart.target * 1.08;
  const x = (t: number) => P + t / Math.max(1, chart.span) * (W - 2 * P), y = (v: number) => H - P - Math.max(0, Math.min(1, v / top)) * (H - 2 * P);
  const line = chart.line.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join('') + `L${x(chart.now.t).toFixed(1)} ${y(chart.now.v).toFixed(1)}`;
  const b = chart.band, ty = y(chart.target), nx = x(chart.now.t), ny = y(chart.now.v), pct = (n: number, of: number) => `${Math.max(0, Math.min(100, n / of * 100)).toFixed(1)}%`;
  return <div className="nc-goal-chart">
    <svg className="holo-pace nc-goal-pace" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs><linearGradient id={`${id}b`} x1="0" x2="1"><stop offset="0" className="holo-stop-a"/><stop offset="1" className="holo-stop-b"/></linearGradient></defs>
      <path className="holo-grid-lines" d={[0.25, 0.5, 0.75].map(f => `M0 ${H * f}H${W}`).join('')}/>
      <path className="holo-target-line" d={`M${P} ${ty.toFixed(1)}H${W - P}`}/>
      {b && <path className="holo-band" fill={`url(#${id}b)`} d={`M${nx.toFixed(1)} ${ny.toFixed(1)}L${x(b.early).toFixed(1)} ${ty.toFixed(1)}L${(b.late === null ? W - P : x(b.late)).toFixed(1)} ${ty.toFixed(1)}Z`}/>}
      {b && <path className="holo-band-mid" d={`M${nx.toFixed(1)} ${ny.toFixed(1)}L${x(b.mid).toFixed(1)} ${ty.toFixed(1)}`}/>}
      <path className="holo-spark-line nc-draw" pathLength={1} d={line}/>
      <Glint d={line}/>
      <title>{label}</title>
    </svg>
    {/* Today's point and the chart's own names are HTML over the stretched drawing, so they stay round and readable. */}
    <i className="nc-goal-dot" style={{left: pct(nx, W), top: pct(ny, H)}} aria-hidden="true"/>
    {b && <i className="nc-goal-dot" data-kind="estimate" style={{left: pct(x(b.mid), W), top: pct(ty, H)}} aria-hidden="true"/>}
    <span className="nc-goal-tag" data-at="target" style={{top: pct(ty, H)}} aria-hidden="true">Target</span>
    <span className="nc-goal-tag" data-at="today" data-side={nx > W * 0.8 ? 'end' : nx < W * 0.2 ? 'start' : undefined} style={{left: pct(nx, W)}} aria-hidden="true">Today</span>
  </div>;
}

type Pace = {forecast: Forecast; chart: PaceChart | null};
/** The goal in focus and its pace: the HUD's own pace when this is its lead goal, else the same functions over this goal's own records. */
function useFocus(ref: string | undefined) {
  const data = useGoalsHud(), platform = usePlatform(), now = useEvidenceNow(platform.data, 0);
  const focus = useMemo((): {goal: FocusGoal | null; pace: Pace | null} | null => {
    if (!data.loaded || data.error || !data.arcs) return null;
    const goals = 'goals' in data && data.goals ? data.goals : [], goal = focusGoal(goals, data.arcs.arcs, ref, data.pace?.href ?? null);
    if (!goal) return {goal: null, pace: null};
    if (data.pace && data.pace.href === goal.href) return {goal, pace: {forecast: data.pace.forecast, chart: data.pace.chart}};
    const summary = goals.find(g => g.key === goal.key), stored = platform.loaded && !platform.error ? platform.data.goals.find(g => `private:${g.id}` === goal.key) : undefined;
    const current = Number(summary?.current), target = Number(summary?.target);
    if (!summary || !stored || stored.type === 'PROJECT' || summary.progressBound === 'unavailable' || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return {goal, pace: null};
    const today = localDate(new Date(now)), points = privateGoalPoints(stored, platform.data.contributions ?? [], current, today), forecast = paceForecast(points, current, target, today);
    return {goal, pace: {forecast, chart: paceChart(points, current, target, today, forecast)}};
  }, [data, ref, platform.loaded, platform.error, platform.data, now]);
  return {loaded: data.loaded, error: data.error, focus};
}

export default function GoalFocusWidget({size, params}: {size: CardProps['size']; params?: CardProps['params']}) {
  const shown = usePillarShown('goals'), {loaded, error, focus} = useFocus(params?.ref);
  if (!shown) return <HoloHidden pillar="Goals"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !focus) return <HoloUnread what="Your goals"/>;
  const {goal, pace} = focus;
  if (!goal) return <CardNotice kind="empty" title="No active goals yet" href="/app/goals/new" action="Set a goal">Set one and its progress, its pace and what is left show here.</CardNotice>;
  const words = estimateWords(pace?.forecast), unknown = goal.pct === null;
  const tone = goal.pace.tone === 'good' ? true : goal.pace.tone === 'attention' ? false : null, direction = /^ahead/i.test(goal.pace.words) ? 'up' as const : /^behind/i.test(goal.pace.words) ? 'down' as const : 'flat' as const;
  const name = <Link className="nc-goal-name" href={goal.href} prefetch={false} title={goal.name}>{goal.name}</Link>;
  const estimate = words && <p className="nc-goal-estimate">{words.estimate && <span className="nc-goal-chip">Estimate</span>}<span>{words.headline}</span></p>;
  return <div className="nc-body nc-goal" data-size={size}>
    {size === 'S' ? <div className="nc-goal-hero">
      <GoalRing pct={goal.pct} size={44}/>
      <Hero value={goal.text} label={goal.name}/>
    </div> : <div className="nc-goal-hero">
      <GoalRing pct={goal.pct} size={size === 'L' ? 132 : 108}>
        <span className="nc-goal-figure">{goal.atLeast && <small>at least</small>}<HoloFigure text={goal.figure} className="nc-goal-num"/><small>{unknown ? 'unknown' : 'reached'}</small></span>
      </GoalRing>
      <div className="nc-goal-words">
        {name}
        {goal.saved && <p className="nc-goal-saved">{goal.saved}</p>}
        <Delta text={goal.pace.words} direction={direction} good={tone}/>
      </div>
    </div>}
    {size !== 'S' && estimate}
    {size === 'L' && words && <p className="nc-goal-detail">{words.detail}</p>}
    {size === 'L' && pace?.chart && words && <PaceLine chart={pace.chart} label={`${words.headline}. ${words.detail}`}/>}
    {size !== 'S' && (goal.left || (size === 'L' && goal.targetDate)) && <div className="nc-facts nc-goal-facts">
      {goal.left && <Fact label="Left to go" value={goal.left}/>}
      {size === 'L' && goal.targetDate && <Fact label="Target date" value={formatDate(goal.targetDate)}/>}
    </div>}
    <CardFoot source="Your goals" asOf="today"/>
    <HoloTable caption={`Goal: ${goal.name}`} rows={[
      ['Reached', goal.text],
      ...(goal.saved ? [['So far, of the target', goal.saved] as const] : []),
      ['Plan', goal.pace.words],
      ...(goal.left ? [['Left to go', goal.left] as const] : []),
      ...(goal.targetDate ? [['Target date', formatDate(goal.targetDate)] as const] : []),
      ...(words ? [['Pace', `${words.headline}${words.estimate ? ' (an estimate: a projection, not a promise)' : ''}. ${words.detail}`] as const] : []),
    ]}/>
  </div>;
}
