'use client';
import Link from 'next/link';
import {createElement, type ComponentType, type ReactNode} from 'react';
import {arcPath, clamp01, polar, tickPath} from '../../../lib/nova/holo/geometry';
import type {CorePillar} from '../../../lib/nova/holo/core';
import type {Meter} from '../../../lib/nova/holo/health';
import type {NovaOrbState} from '../../../lib/nova/orb';
import type {StageWidget} from '../../../lib/nova/stage/record';
import {widgetSpec} from '../../../lib/nova/widgets/catalog';
import {useCore} from '../holo/holo-core';
import {useAgendaToday} from '../holo/use-agenda-today';
import {useHealthHud} from '../holo/use-hud-data';
import type {NovaCounts} from '../use-counts';
import {useOrbitDay} from '../widgets/use-orbit-day';
import './phone-stage.css';

/**
 * Session AM-3 (round 6; the phone's stage, redrawn): two parts of a phone's first screen, in one small chunk that only
 * a phone loads.
 *
 * - `bezel`: the star's instrument. A ring of seventy-two ticks (every sixth longer) around the star and, outside it,
 *   the four pillars as four arcs — Habits, Health, Wealth and Goals, clockwise from the top — each lit as far
 *   as that pillar's one figure of today (the same four figures as the computer's core: lib/nova/holo/core.ts). An
 *   unknown figure is a quiet dashed track, never zero. It is drawn inside the star's button as decoration: the button
 *   still says only "Talk to NOVA", and the strip under it says the figures in words.
 * - `strip`: the widgets on the stage as one row of small instrument cards that swipes sideways (CSS scroll-snap; no
 *   script follows the finger). Each card is one dial, one figure and the widget's name, and is a link to what the
 *   widget's own link opens. A widget whose switch is off for NOVA shows no figure (the same gate as the widget itself:
 *   components/nova/stage/use-stage.ts `gateOpen`); one whose gates are not known yet says "Reading…".
 *
 * Nothing here moves, blurs or follows the pointer: static strokes and gradients only (a phone stays light).
 */
// The ring is open at the top (NOVA's name stands in that opening) and at the bottom (its state does): 46 and 52 degrees.
const R = 91;
const QUADS: readonly {pillar: CorePillar; from: number; span: number}[] = [{pillar: 'habits', from: 23, span: 65}, {pillar: 'health', from: 92, span: 62}, {pillar: 'wealth', from: 206, span: 62}, {pillar: 'goals', from: 272, span: 65}];
const TICKS = tickPath(0, 0, 79.5, 83.5, 72), MAJORS = tickPath(0, 0, 76.5, 83.5, 12);

function PhoneBezel({state}: {state: NovaOrbState}) {
  const rings = useCore(), by = new Map(rings.map(r => [r.pillar, r] as const));
  return <span className="ps-bezel" aria-hidden="true" data-state={state}>
    <svg viewBox="-100 -100 200 200" focusable="false">
      <path className="ps-bezel-ticks" d={TICKS}/><path className="ps-bezel-majors" d={MAJORS}/>
      <circle className="ps-bezel-inner" r="72.5" pathLength="360" strokeDasharray="1 5"/>
      {QUADS.map(q => {
        const ring = by.get(q.pillar);
        if (!ring) return null; // the pillar's page is switched off: its quarter stays open
        const share = ring.share === null ? null : clamp01(ring.share), to = q.from + q.span * (share ?? 0), lit = share !== null && share > 0.004 ? arcPath(0, 0, R, q.from, Math.max(to, q.from + 1.2)) : '', end = polar(0, 0, R, to);
        return <g key={q.pillar} className="ps-arc" data-pillar={q.pillar} data-unknown={share === null || undefined}>
          <path className="ps-arc-rule" d={arcPath(0, 0, 98.4, q.from, q.from + q.span)}/>
          <path className="ps-arc-track" d={arcPath(0, 0, R, q.from, q.from + q.span)}/>
          {lit && <><path className="ps-arc-halo" d={lit}/><path className="ps-arc-lit" d={lit}/><path className="ps-arc-core" d={lit}/><circle className="ps-arc-end" cx={end.x} cy={end.y} r="3.1"/></>}
        </g>;
      })}
      {[90, 270].map(a => { const p = polar(0, 0, R, a); return <rect key={a} className="ps-bezel-node" x={p.x - 2} y={p.y - 2} width="4" height="4" transform={`rotate(45 ${p.x} ${p.y})`}/>; })}
    </svg>
  </span>;
}

type Figure = {figure: string | null; caption: string; share: number | null; /** A count drawn as lit segments (up to eight). */ pips?: number};
const DIAL_TICKS = tickPath(0, 0, 44.5, 48.5, 36);
/** One small dial: a tick bezel, a track, and the share as a lit arc with a bright end; a count lights segments; unknown is a dashed track. */
function Dial({share, pips}: {share: number | null; pips?: number}) {
  const s = share === null ? null : clamp01(share), lit = s !== null && s > 0.004 ? arcPath(0, 0, 35, 0, Math.max(360 * s, 3)) : '', end = polar(0, 0, 35, 360 * (s ?? 0));
  return <span className="ps-dial" aria-hidden="true" data-unknown={s === null && pips === undefined || undefined}>
    <svg viewBox="-50 -50 100 100" focusable="false">
      <path className="ps-dial-ticks" d={DIAL_TICKS}/>
      {pips === undefined ? <>
        <circle className="ps-dial-track" r="35"/>
        {lit && <><path className="ps-dial-halo" d={lit}/><path className="ps-dial-lit" d={lit}/>{s! < 0.995 && <circle className="ps-dial-end" cx={end.x} cy={end.y} r="4.2"/>}</>}
      </> : Array.from({length: 8}, (_, i) => <path key={i} className="ps-dial-pip" data-lit={i < pips || undefined} d={arcPath(0, 0, 35, i * 45 + 5, i * 45 + 40)}/>)}
      <rect className="ps-dial-heart" x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)"/>
    </svg>
  </span>;
}
function Card({widget, state, data}: {widget: StageWidget; state: 'live' | 'locked' | 'reading'; data: Figure}) {
  const spec = widgetSpec(widget.id)!;
  const shown: Figure = state === 'locked' ? {figure: null, caption: 'Off in Permissions', share: null} : state === 'reading' ? {figure: null, caption: 'Reading…', share: null} : data;
  return <li className="ps-item" data-pillar={spec.pillar} data-state={state}>
    <Link className="ps-card" href={spec.href} prefetch={false}>
      <span className="ps-card-name">{spec.title}</span><span className="sr-only">: </span>
      <Dial share={shown.share} pips={shown.pips}/>
      {shown.figure && <><b className="ps-card-figure">{shown.figure}</b><span className="sr-only"> </span></>}
      <span className="ps-card-caption" data-alone={shown.figure ? undefined : ''}>{shown.caption}</span>
    </Link>
  </li>;
}
type CardProps = {widget: StageWidget; state: 'live' | 'locked' | 'reading'; counts: NovaCounts};
const meterFigure = (m: Meter | undefined, reading: string): Figure => !m ? {figure: null, caption: reading, share: null}
  : m.value === null ? {figure: null, caption: m.note ?? m.label, share: null} : {figure: m.text, caption: m.targetText ? `of ${m.targetText}` : m.note ?? m.label, share: m.share};
const METER: Readonly<Record<string, 'kcal' | 'water' | 'sleep' | 'steps'>> = {'health-hud': 'kcal', water: 'water', sleep: 'sleep', steps: 'steps'};
function HealthCard({widget, state}: CardProps) {
  const {hud} = useHealthHud();
  return <Card widget={widget} state={state} data={meterFigure(hud?.[METER[widget.id] ?? 'kcal'], 'Your Health journal is not read yet')}/>;
}
const CORE: Readonly<Record<string, {pillar: CorePillar; caption: string | null}>> = {
  'habits-hud': {pillar: 'habits', caption: 'done today'}, 'habit-week': {pillar: 'habits', caption: 'done today'},
  'goals-hud': {pillar: 'goals', caption: null}, 'goal-pace': {pillar: 'goals', caption: null},
  'wealth-hud': {pillar: 'wealth', caption: 'set aside for goals'}, 'net-worth': {pillar: 'wealth', caption: 'set aside for goals'},
};
function CoreCard({widget, state}: CardProps) {
  const plan = CORE[widget.id]!, ring = useCore().find(r => r.pillar === plan.pillar);
  const data: Figure = !ring ? {figure: null, caption: 'Switched off under Your pages', share: null}
    : ring.share === null ? {figure: null, caption: ring.reason ?? ring.measure, share: null} : {figure: ring.text, caption: plan.caption ?? ring.measure, share: ring.share};
  return <Card widget={widget} state={state} data={data}/>;
}
function OrbitCard({widget, state}: CardProps) {
  const {summary, error} = useOrbitDay();
  const data: Figure = !summary ? {figure: null, caption: error ? 'Your day could not be read' : 'Reading…', share: null}
    : summary.source === 'none' ? {figure: null, caption: summary.line, share: null}
    : {figure: `${summary.done} of ${summary.total}`, caption: summary.source === 'checklist' ? 'planets lit' : 'habits done', share: summary.total ? summary.done / summary.total : null};
  return <Card widget={widget} state={state} data={data}/>;
}
function AgendaCard({widget, state}: CardProps) {
  const {items} = useAgendaToday();
  return <Card widget={widget} state={state} data={items === null ? {figure: null, caption: 'Reading…', share: null} : {figure: String(items.length), caption: 'on today’s agenda', share: null, pips: Math.min(8, items.length)}}/>;
}
const COUNT: Readonly<Record<string, (c: NovaCounts) => [number | null, string]>> = {
  tasks: c => [c.tasksDue, 'due'], notes: c => [c.notesInbox, 'in the inbox'], focus: c => [c.focusWeek, 'sessions this week'], briefs: c => [c.briefsUnread, 'unread'],
};
function CountCard({widget, state, counts}: CardProps) {
  const [n, words] = COUNT[widget.id]!(counts);
  return <Card widget={widget} state={state} data={n === null ? {figure: null, caption: 'Reading…', share: null} : {figure: String(n), caption: words, share: null, pips: Math.min(8, n)}}/>;
}
function BillCard({widget, state, counts}: CardProps) {
  const bill = counts.nextBill;
  return <Card widget={widget} state={state} data={bill ? {figure: bill.amount, caption: bill.title, share: null, pips: 0} : {figure: null, caption: counts.billsRead ? 'None in two months' : 'Reading…', share: null}}/>;
}
const OpenCard = ({widget, state}: CardProps) => <Card widget={widget} state={state} data={{figure: null, caption: 'Tap to open', share: null}}/>;
type Kind = 'health' | 'core' | 'count' | 'orbit' | 'agenda' | 'bill' | 'open';
const CARDS: Readonly<Record<Kind, ComponentType<CardProps>>> = {health: HealthCard, core: CoreCard, count: CountCard, orbit: OrbitCard, agenda: AgendaCard, bill: BillCard, open: OpenCard};
const kindOf = (id: string): Kind => id in METER ? 'health' : id in CORE ? 'core' : id in COUNT ? 'count' : id === 'orbit' ? 'orbit' : id === 'agenda-clock' || id === 'next' || id === 'hour-grid' ? 'agenda' : id === 'money' || id === 'bills' ? 'bill' : 'open';

function PhoneStrip({widgets, gateOpen, counts}: {widgets: readonly StageWidget[]; gateOpen: (w: StageWidget) => boolean | null; counts: NovaCounts}) {
  const cards: ReactNode[] = [];
  for (const w of widgets) {
    if (!widgetSpec(w.id)) continue;
    // A card reads its figure only while the widget's own switch is open (the widget's body is not mounted otherwise either).
    const gate = gateOpen(w);
    cards.push(createElement(CARDS[gate === true ? kindOf(w.id) : 'open'], {key: w.id, widget: w, state: gate === false ? 'locked' : gate === null ? 'reading' : 'live', counts}));
  }
  if (!cards.length) return null;
  return <ul className="ps-strip" aria-label="On your stage">{cards}</ul>;
}

export type PhoneStageProps = {part: 'bezel'; state: NovaOrbState} | {part: 'strip'; widgets: readonly StageWidget[]; gateOpen: (w: StageWidget) => boolean | null; counts: NovaCounts};
export default function PhoneStage(props: PhoneStageProps) {
  return props.part === 'bezel' ? <PhoneBezel state={props.state}/> : <PhoneStrip widgets={props.widgets} gateOpen={props.gateOpen} counts={props.counts}/>;
}
