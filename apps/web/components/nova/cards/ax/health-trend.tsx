'use client';
import {useMemo, type CSSProperties} from 'react';
import {LOG_WEIGHT_HREF} from '../../../../lib/health-aa/coach-slot';
import type {HealthData} from '../../../../lib/health';
import {periodLabel} from '../../../../lib/nova/cards/ax/calendar';
import {asOfDay} from '../../../../lib/nova/cards/ax/health-scan';
import {trendOf, trendWords, waterWeek, weightTrend, type TrendKind, type WaterWeekView} from '../../../../lib/nova/cards/ax/health-trend';
import {shortDate} from '../../../../lib/nova/cards/weight';
import {Columns, TrendArea, type Ghost} from '../kit';
import {AxhFacts, AxhKey, HealthEmpty, HealthFrame} from './health-kit';
import type {AxProps} from './kit';
import './health.css';

/**
 * Session AS (ADR-042 Part 2, family: trends): the kit's trend line (`TrendArea`: the line, its fill, the lead point and
 * the person's goal as a dashed line) with this family's own marks over it — a band above a goal to reach ("at or above
 * your goal") and two pins, on the highest and the lowest day. A day with nothing logged is a gap in the line.
 * Arrives: the kit's line draws itself, then the band unfurls from the goal line and the pins drop onto their days.
 * Alive: the pins' rings bob (the line, the band and the pins themselves stay still).
 */
// The kit's own plot box (components/nova/cards/kit.tsx TrendArea): 320 wide, 9 of padding, `height` tall.
const W = 320, PAD = 9;
export function AxhTrend({values, height, target = null, targetLabel = null, band = false, minLabel, maxLabel, marker = 'dot', dates}: {
  values: readonly (number | null)[]; height: number; target?: number | null; targetLabel?: string | null;
  /** The goal is one to reach: the part of the plot at or above it is banded. */ band?: boolean;
  minLabel?: string; maxLabel?: string; marker?: 'dot' | 'heart'; dates?: readonly [string, string] | null;
}) {
  const known = values.flatMap((v, i) => typeof v === 'number' && Number.isFinite(v) ? [{v, i}] : []);
  if (!known.length) return null;
  const all = [...known.map(p => p.v), ...(target === null ? [] : [target])], lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const left = (i: number) => values.length > 1 ? (PAD + (i / (values.length - 1)) * (W - PAD * 2)) / W * 100 : 50;
  const top = (v: number) => (PAD + (1 - (v - lo) / span) * (height - PAD * 2)) / height * 100;
  const last = known.at(-1)!, high = known.reduce((a, p) => p.v > a.v ? p : a), low = known.reduce((a, p) => p.v < a.v ? p : a);
  // A pin never sits on the lead point (the kit marks that one), and a flat line has none.
  const pins = known.length > 2 && high.v !== low.v ? [['high', high] as const, ['low', low] as const].filter(([, p]) => p.i !== last.i) : [];
  return <div className="axh-trend" aria-hidden="true">
    <div className="axh-trend-plot">
      <TrendArea values={values} height={height} marker={marker} minLabel={minLabel} maxLabel={maxLabel} target={target} targetLabel={targetLabel}/>
      {band && target !== null && <span className="axh-band" style={{height: `${top(target).toFixed(2)}%`}}/>}
      {pins.map(([kind, p]) => <i key={kind} className="axh-pin" data-pin={kind} style={{left: `${left(p.i).toFixed(2)}%`, top: `${top(p.v).toFixed(2)}%`}}/>)}
    </div>
    {dates && <p className="axh-trend-dates"><span>{dates[0]}</span><span>{dates[1]}</span></p>}
  </div>;
}

/**
 * Water by day: the kit's columns against the target line, with this family's pips over them — a lit pip over a day that
 * reached the target, a ring over today while it is still open, nothing over a day below it. A day with nothing logged is
 * an empty tube. Arrives: the pips drop onto their columns. Alive: today's ring bobs.
 */
export function AxhWater({view, height}: {view: WaterWeekView; height: number}) {
  const n = view.days.length;
  return <div className="axh-water" aria-hidden="true" style={{'--axh-n': n} as CSSProperties}>
    {view.target !== null && <p className="axh-pips">{view.days.map((d, i) => <i key={d.date} data-pip={d.state === 'done' ? 'on' : d.state === 'open' ? 'open' : undefined} style={{'--ax-i': i} as CSSProperties}/>)}</p>}
    <Columns values={view.days.map(d => d.value)} labels={view.days.map(d => d.label)} line={view.target} lineLabel={view.targetText ? `Target ${view.targetText}` : null} height={height} mark={n - 1}/>
  </div>;
}

/* ---- The bodies the trend kinds share ---- */
const TEACH: Readonly<Record<TrendKind, {title: string; href: string; action: string; text: string; ghost: Ghost}>> = {
  'sleep-trend': {title: 'No nights logged yet', href: '/app/health?view=sleep', action: 'Log a night', text: 'Log a night on Health and your hours show here, night by night, against your own sleep goal.', ghost: 'trend'},
  'steps-trend': {title: 'No steps logged yet', href: '/app/health?view=activity', action: 'Log your steps', text: 'Log steps on Health and your days show here as one line, against your own target.', ghost: 'trend'},
  'heart-trend': {title: 'No resting heart rate recorded yet', href: '/app/health?view=insights', action: 'Log on Health', text: 'A resting heart rate comes with an import or a device link on Health. Once one is recorded, its days show here. It is a record, never a live reading.', ghost: 'trend'},
  'calorie-trend': {title: 'No food logged yet', href: '/app/health?view=diary', action: 'Log a meal', text: 'Log what you eat on Health and your calories show here, day by day.', ghost: 'trend'},
};
/** One measure over a period as a line: sleep, steps, resting heart rate, calories (lib/nova/cards/ax/health-trend.ts). */
export function HealthTrendBody({kind, health, day, size, params}: {kind: TrendKind; health: HealthData; day: string} & AxProps) {
  const view = useMemo(() => trendOf(kind, health, params?.period, day), [kind, health, params?.period, day]);
  const words = useMemo(() => trendWords(view, day), [view, day]);
  const teach = TEACH[kind];
  if (!view.any) return <HealthEmpty size={size} ghost={teach.ghost} title={teach.title} href={teach.href} action={teach.action}>{teach.text}</HealthEmpty>;
  if (view.average === null || !view.lowest || !view.highest) return <HealthEmpty size={size} ghost={teach.ghost} title="Nothing logged in this period" href={teach.href} action="Log on Health">{`${view.name}: nothing is logged ${periodLabel(view.period, day)}. Ask for a longer period, or log on Health.`}</HealthEmpty>;
  const t = view.text, lo = view.lowest, hi = view.highest, goal = view.target;
  return <HealthFrame kind={kind} size={size} words={words} extra={<AxhFacts rows={[['Lowest', `${t(lo.value!)} · ${asOfDay(lo.date, day)}`], ['Highest', `${t(hi.value!)} · ${asOfDay(hi.date, day)}`]]}/>}>
    <AxhTrend values={view.values} height={size === 'L' ? 128 : 64} target={goal} targetLabel={goal === null ? null : `${kind === 'sleep-trend' ? 'Goal' : 'Target'} ${t(goal)}`} band={view.reach}
      minLabel={goal !== null && goal < lo.value! ? undefined : t(lo.value!)} maxLabel={goal !== null && goal > hi.value! ? undefined : t(hi.value!)}
      dates={size === 'L' && view.dates.length > 1 ? [shortDate(view.dates[0]!, day), view.dates.at(-1) === day ? 'Today' : shortDate(view.dates.at(-1)!, day)] : null}/>
  </HealthFrame>;
}
/** The weight over a range: the Weight card's own readings as a line, the weight goal as the dashed line, the change in words. */
export function WeightTrendBody({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const {card, words} = useMemo(() => weightTrend(health, params, day), [health, params, day]);
  if (!card.latest) return <HealthEmpty size={size} title="No weight logged yet" href={LOG_WEIGHT_HREF} action="Log your weight">Add a weigh-in on Health and your weight shows here as one line, with your goal.</HealthEmpty>;
  return <HealthFrame kind="weight-trend" size={size} words={words}
    extra={card.lowest && card.highest && card.average ? <AxhFacts rows={[['Lowest', `${card.lowest.text} · ${shortDate(card.lowest.date, day)}`], ['Highest', `${card.highest.text} · ${shortDate(card.highest.date, day)}`], ['Average', card.average.text]]}/> : null}>
    <AxhTrend values={card.values} height={size === 'L' ? 128 : 64} marker="heart" target={card.target?.grams ?? null} targetLabel={card.target ? `Goal ${card.target.text}` : null} minLabel={card.edges.min} maxLabel={card.edges.max} dates={size === 'L' ? card.edges.dates : null}/>
  </HealthFrame>;
}
/** Water by day as columns against the target (the newest fourteen days of the period at most). */
export function WaterWeekBody({health, day, size, params}: {health: HealthData; day: string} & AxProps) {
  const view = useMemo(() => waterWeek(health, params?.period, day), [health, params?.period, day]);
  if (!view.any) return <HealthEmpty size={size} ghost="columns" title="No water logged yet" href="/app/health#water" action="Log water">Log water on Health and your days show here as columns, against your own target.</HealthEmpty>;
  if (!view.logged) return <HealthEmpty size={size} ghost="columns" title="Nothing logged in this period" href="/app/health#water" action="Log water">{`Water: nothing is logged ${periodLabel(view.period, day)}.`}</HealthEmpty>;
  return <HealthFrame kind="water-week" size={size} words={view.words} tone={view.target !== null && view.reached >= view.logged ? 'clear' : undefined}
    extra={view.target !== null ? <AxhKey items={[['reached', 'Target reached'], ['target', `Your target, ${view.targetText}`], ['none', 'Nothing logged']]}/> : null}>
    <AxhWater view={view} height={size === 'L' ? 120 : 64}/>
  </HealthFrame>;
}
