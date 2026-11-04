'use client';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {clockAngle, polar, tickPath} from '../../../lib/nova/holo/geometry';
import {clockItems, dayCounts, nextItems} from '../../../lib/nova/holo/agenda';
import {formatClock} from '../../../lib/visual-format';
import {HoloFigure, HoloReading, HoloTable, LensRing, Orn} from '../holo/parts';
import {useAgendaToday} from '../holo/use-agenda-today';
import {NovaEmpty} from './empty';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Agenda clock" — today on a 24-hour dial: each timed item a mark at its time (an open item
 * a bright dot, a done one a ring), the current time as a still hand (it moves with the half-minute clock, not an
 * animation), and beside it the next three in words with their times. The Agenda page's own day (use-agenda-today.ts).
 */
const WHEN = {next: 'next', later: 'later', earlier: 'earlier', anytime: 'any time'} as const;
export default function AgendaClockWidget({size}: {size: WidgetSize}) {
  const {items, now} = useAgendaToday();
  if (!items) return <HoloReading/>;
  if (!items.length) return <NovaEmpty pillar="orbit" href="/app/habits?add=habit" action="Add a habit">Nothing on today’s clock yet. A habit with a time, a task, a bill or a plan shows here at its hour.</NovaEmpty>;
  const marks = clockItems(items).filter(i => i.angle !== null), counts = dayCounts(items), next = nextItems(items, now, size === 'S' ? 1 : 3);
  const hand = polar(0, 0, 46, clockAngle(now) ?? 0), dial = size === 'S' ? 72 : size === 'M' ? 124 : 148;
  return <div className="holo-agenda" data-size={size}>
    <div className="holo-ring" style={{'--ring': `${dial}px`} as CSSProperties}>
      <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
        <path className="holo-orn-ticks" d={tickPath(0, 0, 50, 53, 96)}/>
        <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 47, 54, 24)}/>
        {size !== 'S' && ([['0', 0], ['6', 90], ['12', 180], ['18', 270]] as const).map(([t, a]) => { const p = polar(0, 0, 33, a); return <text key={t} className="holo-dial-label" x={p.x} y={p.y + 3}>{t}</text>; })}
        <circle className="holo-track" r="42"/>
        <path className="holo-hand" d={`M0 0L${hand.x} ${hand.y}`}/>
        {marks.map(m => { const p = polar(0, 0, 42, m.angle!); return <circle key={m.id} className="holo-mark" data-state={m.state} data-pillar={m.pillar} cx={p.x} cy={p.y} r="3.4"/>; })}
        <circle className="holo-hub" r="2.4"/>
      </svg>
      <Orn><circle className="holo-orn-dash" r="57"/></Orn>
      {size !== 'S' && <LensRing/>}
      {size === 'S' && <div className="holo-ring-centre"><HoloFigure text={`${counts.done}/${counts.total}`} className="holo-num-ring"/></div>}
    </div>
    {size !== 'S' && <div className="holo-agenda-side">
      <p className="holo-label"><HoloFigure text={`${counts.done} of ${counts.total}`}/> done today{counts.anytime ? ` · ${counts.anytime} any time` : ''}</p>
      <ol className="holo-next" aria-label="Next on today’s clock">{next.map(i => <li key={i.id} data-pillar={i.pillar}>
        <span className="holo-next-time">{i.time ? formatClock(i.time) : '—'}</span>
        {i.href ? <Link href={i.href} prefetch={false}>{i.title}</Link> : <span>{i.title}</span>}
        <small>{WHEN[i.when]}</small>
      </li>)}</ol>
      {!next.length && <p className="holo-note holo-note-line">Everything on today’s clock is done.</p>}
    </div>}
    <HoloTable caption="Today’s agenda" rows={items.map(i => [i.title, `${i.time ? formatClock(i.time) : 'Any time'} · ${i.state === 'done' ? 'done' : i.state === 'skipped' ? 'skipped' : 'open'}`] as const)}/>
  </div>;
}
