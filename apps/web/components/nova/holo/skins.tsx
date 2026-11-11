'use client';
import Link from 'next/link';
import {useMemo, type CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {balanceWords, sleepBalance} from '../../../lib/sleep/engine';
import {durationWords} from '../../../lib/nova/widgets/words';
import {polar, tickPath} from '../../../lib/nova/holo/geometry';
import {nextItems} from '../../../lib/nova/holo/agenda';
import {recentNotes, tasksHud} from '../../../lib/nova/holo/lists';
import {NOTES} from '../../../lib/notes/schema';
import {TASKS} from '../../../lib/tasks/schema';
import {deviceDay} from '../../../lib/tasks/device';
import {formatClock, formatPercent, formatTime} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useTaskClock} from '../../tasks/use-task-list';
import {useOrbitDay} from '../widgets/use-orbit-day';
import {NovaEmpty} from '../widgets/empty';
import TasksWidget from '../widgets/tasks';
import {GradArc, HoloEmpty, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, Lead, NotShared, Orn, OrnMarks, SegMeter} from './parts';
import {useHealthHud, useHealthShared, usePillarShown} from './use-hud-data';
import {useAgendaToday} from './use-agenda-today';
import './holo-parts.css';

/**
 * Session AL Part 11 (lane L8): the Holo look of NOVA's earlier widgets, where an instrument says more than a card: Water
 * and Sleep as neon meters (the Health page's own figures and words; MO-063/P-MO-18: the water target is the Water card's
 * own, lib/health-daily.ts waterSummary), Today's orbit as a ring of planets, Next three from the Agenda's day (P-LA-14:
 * timed habits and tasks with their times), Tasks with due and overdue counters over the Tasks page's own rows, and Notes
 * as the newest captures. The other widgets keep their bodies inside the Holo panel.
 * Review fixes (lane L8d): water with nothing logged today is "—" with its reason (M5); Today's orbit is a 140 px ring with
 * the day's next step beside it (p5) and, empty, the ring unlit (M8); an overdue count is coral with "!" — never Wealth's
 * amber (M7).
 * Session AM-2 (art direction D): each is a hologram of its own — a hero figure over a wide segmented meter (Water, Sleep),
 * the orbit as a bezelled ring whose lit planets ride a gradient arc, the day's next steps as a timeline of lit nodes,
 * the tasks' counters as three lit read-outs, the newest notes as rows with nodes.
 */
export function HoloWater({size}: {size: WidgetSize}) {
  const shown = usePillarShown('health'), shared = useHealthShared(), {hud, loaded, error} = useHealthHud();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Today’s water"/>;
  const w = hud.water;
  return <div className="holo-water" data-size={size}>
    <p className="holo-big-line"><HoloFigure text={w.text} className="holo-num-big"/>{w.targetText ? <small> of {w.targetText}</small> : null}</p>
    <SegMeter label="Today" share={w.share} text={w.share === null ? '—' : formatPercent(w.share * 100)} note={w.note} count={size === 'S' ? 12 : 20} compact={size === 'S'}/>
    {w.value === null && <p className="sr-only">No water logged yet today.</p>}
    {!shared && size !== 'S' && <NotShared/>}
    <HoloTable caption="Water today" rows={[['Logged', w.value === null ? '— (no water logged yet today)' : w.text], ['Your target', w.targetText ?? 'No target set']]}/>
  </div>;
}
export function HoloSleep({size}: {size: WidgetSize}) {
  const shown = usePillarShown('health'), {hud, loaded, error, health, day} = useHealthHud();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your sleep log"/>;
  const s = hud.sleep, sleep = health.data.sleep, balance = sleep ? sleepBalance(sleep, day) : null;
  if (!sleep || !sleep.nights.length) return <HoloEmpty kind="ring" href="/app/health?view=sleep" action="Log a night">No nights logged yet.{size === 'S' ? '' : ' Set a sleep goal too, to see your balance.'}</HoloEmpty>;
  return <div className="holo-sleep" data-size={size}>
    <p className="holo-big-line"><HoloFigure text={s.text} className="holo-num-big"/>{s.targetText ? <small> of {s.targetText}</small> : null}</p>
    <SegMeter label="Last night" share={s.share} text={s.share === null ? '—' : formatPercent(s.share * 100)} note={s.note} count={size === 'S' ? 12 : 20} compact={size === 'S'}/>
    {size !== 'S' && balance && <p className="holo-note-line">{balanceWords(balance, durationWords)}</p>}
    <HoloTable caption="Sleep" rows={[['Last night', `${s.text}${s.targetText ? ` of ${s.targetText}` : ''}`], ...(balance ? [['Two-week balance', balanceWords(balance, durationWords)] as const] : [])]}/>
  </div>;
}
/** Today's orbit: one planet per item on the orbit, lit when done (at most 24 drawn; the figure counts them all). */
export function HoloOrbit({size}: {size: WidgetSize}) {
  const {summary} = useOrbitDay();
  if (!summary) return <HoloReading/>;
  if (summary.source === 'none') return <HoloEmpty kind="ring">Your day’s orbit fills in as you add a habit or star something for the Checklist.</HoloEmpty>;
  const n = Math.min(24, summary.total), dial = size === 'S' ? 64 : undefined, unit = summary.source === 'checklist' ? 'planets lit' : 'habits done';
  const share = summary.total ? Math.min(1, summary.done / summary.total) : 0, lit = Math.min(n, summary.done), step = n ? 360 / n : 0, end = polar(0, 0, 42, Math.max(0, lit - 1) * step);
  return <div className="holo-orbit" data-size={size}>
    <div className="holo-ring holo-orbit-ring" data-small={size === 'S' || undefined} style={dial ? {'--ring': `${dial}px`} as CSSProperties : undefined}>
      <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
        <circle className="holo-well" r="37"/>
        <path className="holo-orn-ticks" d={tickPath(0, 0, 50.5, 53, size === 'S' ? 24 : 60)}/>
        <path className="holo-orn-ticks holo-orn-major" d={tickPath(0, 0, 49.5, 54.6, 12)}/>
        {size !== 'S' && <circle className="holo-orn-hair" r="34.6"/>}
        <circle className="holo-track" r="42"/>
        {/* The lit planets ride one gradient arc from the first to the last of them (the same count as the figure). */}
        {lit > 1 && <g className="holo-arc-g holo-orbit-arc"><GradArc r={42} from={0} to={(lit - 1) * step}/></g>}
        {Array.from({length: n}, (_, i) => { const p = polar(0, 0, 42, i * step); return <circle key={i} className="holo-planet" data-lit={i < summary.done || undefined} cx={p.x} cy={p.y} r={n > 12 ? 3.4 : 4.8}/>; })}
      </svg>
      {lit > 0 && share < 1 && <Lead x={end.x} y={end.y}/>}
      <Orn><OrnMarks/></Orn>
      <div className="holo-ring-centre"><HoloFigure text={`${summary.done}/${summary.total}`} className="holo-num-ring"/>{size !== 'S' && <small>{unit}</small>}</div>
    </div>
    <p className="holo-orbit-line">{summary.line}</p>
    <HoloTable caption="Today’s orbit" rows={[['Done', `${summary.done} of ${summary.total} ${unit}`]]}/>
  </div>;
}
const WHEN = {next: 'next', later: 'later', earlier: 'earlier', anytime: 'any time today'} as const;
/** Next three across every source of the Agenda's day, by time (P-LA-14). */
export function HoloNext({size}: {size: WidgetSize}) {
  const {items, now} = useAgendaToday();
  if (!items) return <HoloReading/>;
  const next = nextItems(items, now, size === 'S' ? 2 : 3);
  if (!next.length) return <NovaEmpty pillar="habits" ghost="rows" href="/app/habits" action="Add a habit">{items.length ? 'Nothing else is due today. A calm orbit.' : 'Nothing is planned yet. A habit, a task or a bill shows up here at its time.'}</NovaEmpty>;
  return <ol className="holo-next holo-next-wide" aria-label="Next in your day">{next.map(i => <li key={i.id} data-pillar={i.pillar} data-when={i.when}>
    <span className="holo-next-time">{i.time ? formatClock(i.time) : '—'}</span>
    {i.href ? <Link href={i.href} prefetch={false}>{i.title}</Link> : <span>{i.title}</span>}
    <small>{WHEN[i.when]}</small>
  </li>)}</ol>;
}
/** Tasks: the due, overdue and open counters (taskCounts) over the Tasks page's own rows and quick add. */
export function HoloTasks({size}: {size: WidgetSize}) {
  // Release review AL (RR-8): the Tasks page's own day and clock (the app's zone), so a task late today counts as overdue here too.
  const record = useDeviceRecord(TASKS), {today, clock} = useTaskClock();
  const hud = useMemo(() => record.loaded && !record.unreadable ? tasksHud(record.data, today, deviceDay, 4, clock) : null, [record.loaded, record.unreadable, record.data, today, clock]);
  return <div className="holo-tasks" data-size={size}>
    {hud && hud.total > 0 && <dl className="holo-counters">
      <div data-tone={hud.overdue ? 'attention' : undefined}><dt>Overdue</dt><dd>{hud.overdue > 0 && <span className="holo-attention-mark" aria-hidden="true">!</span>}<HoloFigure text={String(hud.overdue)}/></dd></div>
      {/* Second review m5 (lane L8f): due today only — the line under it and the Tasks page's Today tab also count what was
          carried over (overdue), which has its own counter beside it. */}
      <div><dt>Due today</dt><dd><HoloFigure text={String(hud.today)}/></dd></div>
      <div><dt>Open</dt><dd><HoloFigure text={String(hud.open)}/></dd></div>
    </dl>}
    <TasksWidget size={size}/>
  </div>;
}
/** Notes: the newest captures (any kind) and how many wait in the inbox. */
export function HoloNotes({size}: {size: WidgetSize}) {
  const record = useDeviceRecord(NOTES);
  if (!record.loaded) return <HoloReading/>;
  if (record.unreadable) return <HoloUnread what="Your notes"/>;
  const r = recentNotes(record.data, size === 'L' ? 5 : size === 'M' ? 3 : 1);
  if (!r.total) return <NovaEmpty pillar="orbit" ghost="rows">Your notes start here. A quick capture from anywhere lands in your inbox.</NovaEmpty>;
  return <div className="holo-notes" data-size={size}>
    <p className="holo-label holo-notes-head"><HoloFigure text={String(r.inbox)} className="holo-num-big"/> <span>in your inbox</span></p>
    <ol className="holo-captures" aria-label="Recent captures">{r.recent.map(n => <li key={n.id}><Link href="/app/notes" prefetch={false}>{n.name}</Link><small>{formatTime(n.at)}</small></li>)}</ol>
  </div>;
}
