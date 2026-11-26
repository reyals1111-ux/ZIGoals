'use client';
import Link from 'next/link';
import {useMemo, type CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {balanceWords, sleepBalance} from '../../../lib/sleep/engine';
import {durationWords} from '../../../lib/nova/widgets/words';
import {polar, tickPath} from '../../../lib/nova/holo/geometry';
import {nextItems} from '../../../lib/nova/holo/agenda';
import {noteRowWhen, notesPanel, tasksHud} from '../../../lib/nova/holo/lists';
import {moreWords} from '../../../lib/nova/cards/whole-rows';
import {NOTES} from '../../../lib/notes/schema';
import {TASKS} from '../../../lib/tasks/schema';
import {deviceDay} from '../../../lib/tasks/device';
import {formatClock, formatPercent} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useTaskClock} from '../../tasks/use-task-list';
import {useLocalToday} from '../../use-local-today';
import {WholeRows} from '../cards/whole-rows';
import {useOrbitDay} from '../widgets/use-orbit-day';
import {NovaEmpty} from '../widgets/empty';
import TasksWidget from '../widgets/tasks';
import {GradArc, HoloEmpty, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, Lead, NotShared, Orn, OrnMarks, SegMeter, Unlit} from './parts';
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
 * Session AM-2 (whole rows only): every list here shows the rows that fit its panel and then "+N more" (cards/whole-rows.tsx).
 */
export function HoloWater({size}: {size: WidgetSize}) {
  const shown = usePillarShown('health'), shared = useHealthShared(), {hud, loaded, error} = useHealthHud();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Today’s water"/>;
  const w = hud.water;
  // Round 4: with nothing logged yet today the meter's own unlit ring stands beside the figure (decoration; the words say it).
  return <div className="holo-water" data-size={size} data-empty={w.value === null ? '' : undefined}>
    {w.value === null && <span className="holo-water-ghost" aria-hidden="true"><Unlit kind="ring"/></span>}
    <p className="holo-big-line"><HoloFigure text={w.text} className="holo-num-big"/>{w.targetText ? <small> of {w.targetText}</small> : null}</p>
    <SegMeter label="Today" share={w.share} text={w.share === null ? '—' : formatPercent(w.share * 100)} note={w.note} count={size === 'S' ? 12 : 20} compact={size === 'S'}/>
    {w.value === null && <p className="sr-only">No water logged yet today.</p>}
    {w.value === null && size !== 'S' && <Link className="nova-link holo-empty-action" href="/app/health#water" prefetch={false}>Log a glass <span aria-hidden="true">→</span></Link>}
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
  if (!sleep || !sleep.nights.length) return <HoloEmpty kind="meter" href="/app/health?view=sleep" action="Log a night">No nights logged yet.{size === 'S' ? '' : ' Set a sleep goal too, to see your balance.'}</HoloEmpty>;
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
    {/* Session AR (Part 2): on a compact plate the figure stands beside the ring (holo-parts.css "tiers"); elsewhere not drawn. */}
    {size === 'S' && <p className="holo-sfig"><HoloFigure text={`${summary.done}/${summary.total}`} className="holo-num-big"/> <small>{unit}</small></p>}
    <div className="holo-orbit-side">
      <p className="holo-orbit-line">{summary.line}</p>
      {/* Round 2: what is still open on the orbit, as lit rows (the summary's own next items: lib/orbit-card/summary.ts). */}
      {size !== 'S' && summary.next.length > 0 && <WholeRows as="ol" wrapClassName="holo-orbit-rows" className="holo-next holo-orbit-next" aria-label="Next on your orbit" collapse>{summary.next.map(i => <li key={i.key} data-pillar={i.pillar}>
        <span className="holo-next-time">{i.time ? formatClock(i.time) : '—'}</span>
        <Link href={i.href} prefetch={false} title={i.label}>{i.label}</Link>
        <small>{WHEN[i.when]}</small>
      </li>)}</WholeRows>}
    </div>
    <HoloTable caption="Today’s orbit" rows={[['Done', `${summary.done} of ${summary.total} ${unit}`]]}/>
  </div>;
}
const WHEN = {next: 'next', later: 'later', earlier: 'earlier', anytime: 'any time today', overdue: 'overdue'} as const;
/** Next three across every source of the Agenda's day, by time (P-LA-14). */
export function HoloNext({size}: {size: WidgetSize}) {
  const {items, now} = useAgendaToday();
  if (!items) return <HoloReading/>;
  const next = nextItems(items, now, size === 'S' ? 2 : 3);
  if (!next.length) return <NovaEmpty pillar="habits" ghost="rows" href="/app/habits" action="Add a habit">{items.length ? 'Nothing else is due today. A calm orbit.' : 'Nothing is planned yet. A habit, a task or a bill shows up here at its time.'}</NovaEmpty>;
  // Session AM-3 (round 6): a timeline rail (ref 14) — one lit rail the height of the panel, a node per step (the first
  // white-hot), a hexagon with the step's state drawn in it (decoration: the words at the row's end say it), the time as a
  // figure. The rows share the panel's height, so three always stand where there is room for three.
  return <WholeRows as="ol" wrapClassName="holo-next-box" className="holo-next holo-next-wide holo-rail" aria-label="Next in your day" min={1} more={(hidden, shown) => moreWords(hidden, {shown, where: 'your agenda'})}>{next.map((i, k) => <li key={i.id} data-pillar={i.pillar} data-when={i.when} data-lead={k === 0 || undefined}>
    <span className="holo-next-time">{i.time ? formatClock(i.time) : '—'}</span>
    {i.href ? <Link href={i.href} prefetch={false} title={i.title}>{i.title}</Link> : <span title={i.title}>{i.title}</span>}
    <small>{WHEN[i.when]}</small>
    <svg className="holo-rail-hex" viewBox="-18 -18 36 36" aria-hidden="true" focusable="false"><path className="holo-rail-hex-rim" d="M0 -15.5L13.4 -7.75V7.75L0 15.5L-13.4 7.75V-7.75Z"/><path className="holo-rail-hex-in" d="M0 -11.6L10 -5.8V5.8L0 11.6L-10 5.8V-5.8Z"/><path className="holo-rail-hex-glyph" data-fill={i.when === 'next' || undefined} d={HEX_GLYPH[i.when]}/></svg>
  </li>)}</WholeRows>;
}
/** What the hexagon draws for a step's state: a play mark (next), a clock (later), a turn back (earlier and overdue), a small sun (any time). */
const HEX_GLYPH = {next: 'M-2.8 -4.6L4.8 0L-2.8 4.6Z', later: 'M0 -6A6 6 0 1 0 0 6A6 6 0 1 0 0 -6M0 -3.4V0L2.6 1.7', earlier: 'M-4.2 -4.2A6 6 0 1 1 -6 0M-4.4 -7.4V-4H-1', overdue: 'M-4.2 -4.2A6 6 0 1 1 -6 0M-4.4 -7.4V-4H-1', anytime: 'M0 -2.8A2.8 2.8 0 1 0 0 2.8A2.8 2.8 0 1 0 0 -2.8M0 -7V-5.2M0 5.2V7M-7 0H-5.2M5.2 0H7M-5 -5L-3.7 -3.7M3.7 3.7L5 5M5 -5L3.7 -3.7M-3.7 3.7L-5 5'} as const;
/** Tasks: the due, overdue and open counters (taskCounts) over the Tasks page's own rows and quick add. */
export function HoloTasks({size}: {size: WidgetSize}) {
  // Release review AL (RR-8): the Tasks page's own day and clock (the app's zone), so a task late today counts as overdue here too.
  const record = useDeviceRecord(TASKS), {today, clock} = useTaskClock();
  const hud = useMemo(() => record.loaded && !record.unreadable ? tasksHud(record.data, today, deviceDay, 4, clock) : null, [record.loaded, record.unreadable, record.data, today, clock]);
  return <div className="holo-tasks" data-size={size} data-counters={hud && hud.total > 0 ? '' : undefined}>
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
/**
 * Notes: the newest captures (any kind) and how many wait in the inbox. Session AM-2: a row is the note's name at the
 * row's whole width (a daily note by its date in the app's format, an untitled one by its first line or "Untitled note")
 * and when it was captured (the time today, else the date; never raw ISO); the rows that fit, then "+N more".
 */
export function HoloNotes({size}: {size: WidgetSize}) {
  const record = useDeviceRecord(NOTES), today = useLocalToday();
  if (!record.loaded) return <HoloReading/>;
  if (record.unreadable) return <HoloUnread what="Your notes"/>;
  // Round 2: the rows are the inbox itself while notes wait there, so "+N more" counts what the figure counts (lib/nova/holo/lists.ts notesPanel).
  const r = notesPanel(record.data, size === 'L' ? 8 : size === 'M' ? 4 : 2);
  if (!r.total) return <NovaEmpty pillar="orbit" ghost="rows">Your notes start here. A quick capture from anywhere lands in your inbox.</NovaEmpty>;
  return <div className="holo-notes" data-size={size}>
    {/* Session AM-3 (round 6): the count is an instrument — the figure over a strip of pips, one lit for each note that waits (eight drawn; the figure counts them all). */}
    <p className="holo-label holo-notes-head"><HoloFigure text={String(r.inbox)} className="holo-num-big"/> <span>in your inbox</span>
      <span className="holo-notes-pips" aria-hidden="true">{Array.from({length: 8}, (_, i) => <i key={i} data-lit={i < r.inbox || undefined} data-lead={i === Math.min(8, r.inbox) - 1 || undefined}/>)}</span></p>
    <WholeRows as="ol" wrapClassName="holo-notes-rows" className="holo-captures" aria-label={r.of === 'inbox' ? 'Waiting in your inbox' : 'Recent captures'} extra={r.more} min={1} more={(hidden, shown) => moreWords(hidden, {shown, ...(size === 'S' ? {} : {where: 'the Notes page'})})}>
      {r.rows.map(n => <li key={n.id}><Link href="/app/notes" prefetch={false} title={n.label}><span className="holo-capture-name">{n.label}</span></Link><small>{noteRowWhen(n.at, today)}</small></li>)}
    </WholeRows>
  </div>;
}
