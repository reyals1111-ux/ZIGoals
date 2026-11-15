'use client';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {clockAngle, polar, tickPath} from '../../../lib/nova/holo/geometry';
import {clockItems, dayCounts, nextItems} from '../../../lib/nova/holo/agenda';
import {formatClock} from '../../../lib/visual-format';
import {GradArc, HoloFigure, HoloReading, HoloTable, Orn, OrnMarks} from '../holo/parts';
import {useAgendaToday} from '../holo/use-agenda-today';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Agenda clock" — today on a 24-hour dial: each timed item a mark at its time (an open item
 * a bright dot, a done one a ring), the current time as a still hand (it moves with the half-minute clock, not an
 * animation), and beside it the next three in words with their times. The Agenda page's own day (use-agenda-today.ts).
 * Review fixes (lane L8d): the hours are readable words (12 px HTML, m5) at 00, 06, 12 and 18; the times never wrap and
 * the count is one short line ("4/10 done · 3 any time", M1); the lens ring is the core's alone (p3); and a day with
 * nothing on it still shows its clock with the time, unlit, and says how to fill it (M8).
 * Session AM-2 (art direction D, the day: an ice clock bezel): the dial is a compass-like bezel — 96 ticks, the hours
 * longer, hairline rings and a cross inside — sized to its panel; the part of the day already behind you is a soft
 * gradient arc up to the hand's lit tip; each coming item is a row with its lit node in its pillar's colour.
 */
const WHEN = {next: 'next', later: 'later', earlier: 'earlier', anytime: 'any time'} as const;
const HOURS = [['00', 0], ['06', 90], ['12', 180], ['18', 270]] as const;
export default function AgendaClockWidget({size}: {size: WidgetSize}) {
  const {items, now} = useAgendaToday();
  if (!items) return <HoloReading/>;
  const marks = clockItems(items).filter(i => i.angle !== null), counts = dayCounts(items), next = nextItems(items, now, size === 'S' ? 1 : 3);
  // Second review m3 (lane L8f): the hand stops short of the hour words (r 30) and a bright tip marks the time on the track,
  // so the line never runs through "06" like a strike-through.
  const angle = clockAngle(now) ?? 0, hand = polar(0, 0, 19, angle), tipIn = polar(0, 0, 37, angle), tipOut = polar(0, 0, 47, angle), dial = size === 'S' ? 64 : undefined;
  const rows = <ol className="holo-next" aria-label="Next on today’s clock">{next.map(i => <li key={i.id} data-pillar={i.pillar}>
    <span className="holo-next-time">{i.time ? formatClock(i.time) : '—'}</span>
    {i.href ? <Link href={i.href} prefetch={false} title={i.title}>{i.title}</Link> : <span title={i.title}>{i.title}</span>}
    <small>{WHEN[i.when]}</small>
  </li>)}</ol>;
  return <div className="holo-agenda" data-size={size} data-empty={items.length ? undefined : ''}>
    <div className="holo-ring holo-clock" data-small={size === 'S' || undefined} style={dial ? {'--ring': `${dial}px`} as CSSProperties : undefined}>
      <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
        <circle className="holo-well" r="37"/>
        <path className="holo-orn-ticks" d={tickPath(0, 0, 50.5, 53, size === 'S' ? 24 : 96)}/>
        <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 49.5, 55, size === 'S' ? 4 : 24)}/>
        {size !== 'S' && <><circle className="holo-orn-hair" r="34.6"/><circle className="holo-orn-hair" r="14"/><path className="holo-orn-hair" d="M-11 0H-4.5M4.5 0H11M0 -11V-4.5M0 4.5V11"/></>}
        <circle className="holo-track" r="42" data-unknown={items.length ? undefined : ''}/>
        {items.length > 0 && angle > 0 && <g className="holo-arc-g holo-clock-day"><GradArc r={42} from={0} to={angle}/></g>}
        <path className="holo-hand" d={`M0 0L${hand.x} ${hand.y}`}/>
        <path className="holo-hand holo-hand-tip" d={`M${tipIn.x} ${tipIn.y}L${tipOut.x} ${tipOut.y}`}/>
        {marks.map(m => { const p = polar(0, 0, 42, m.angle!); return <circle key={m.id} className="holo-mark" data-state={m.state} data-pillar={m.pillar} cx={p.x} cy={p.y} r="3.4"/>; })}
        <circle className="holo-hub" r="2.4"/>
      </svg>
      <Orn><OrnMarks r={58}/></Orn>
      {size !== 'S' && HOURS.map(([t, a]) => { const p = polar(0, 0, 30, a); return <span key={t} className="holo-dial-hour" style={{left: `${50 + p.x / 1.2}%`, top: `${50 + p.y / 1.2}%`}} aria-hidden="true">{t}</span>; })}
      {size === 'S' && <div className="holo-ring-centre"><HoloFigure text={items.length ? `${counts.done}/${counts.total}` : '—'} className="holo-num-ring"/></div>}
    </div>
    {/* A small panel keeps the clock and the one next row beside it. */}
    {size === 'S' && next.length > 0 && <div className="holo-agenda-side">{rows}</div>}
    {size !== 'S' && <div className="holo-agenda-side">
      {items.length ? <>
        <p className="holo-agenda-count"><HoloFigure text={`${counts.done}/${counts.total}`}/> done{counts.anytime ? ` · ${counts.anytime} any time` : ''}<span className="sr-only"> today</span></p>
        {rows}
        {!next.length && <p className="holo-note holo-note-line">Everything on today’s clock is done.</p>}
      </> : <>
        <p className="holo-empty-words">Nothing on today’s clock yet. A habit with a time, a task, a bill or a plan shows here at its hour.</p>
        <Link className="nova-link holo-empty-action" href="/app/habits?add=habit" prefetch={false}>Add a habit <span aria-hidden="true">→</span></Link>
      </>}
    </div>}
    <HoloTable caption="Today’s agenda" rows={items.length ? items.map(i => [i.title, `${i.time ? formatClock(i.time) : 'Any time'} · ${i.state === 'done' ? 'done' : i.state === 'skipped' ? 'skipped' : 'open'}`] as const) : [['Today', 'Nothing on the clock yet']]}/>
  </div>;
}
