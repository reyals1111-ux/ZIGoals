'use client';
import {inPlayRecord} from '../../lib/tasks/focus';
import {Suspense, lazy, useEffect, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {CALENDAR_IMPORT} from '../../lib/ics/calendar';
import {eventAgendaItems} from '../../lib/agenda/time-items';
import {checklistZone} from '../../lib/checklist/zone';
import {DEFAULT_BLOCK, addSpent, fitDay, overLimit, plannedVsActual, taskBusy, toClock, type Busy} from '../../lib/tasks/layouts';
import {TASK_PLAN, finishesByDay, goalStreak, harvestDoneLog, runningTimer, settleTimers, startTimer, stopTimer, timerMinutes} from '../../lib/tasks/plan-record';
import {editMany, waitingFor} from '../../lib/tasks/engine';
import {planAgain} from '../../lib/tasks/pieces';
import {afterHours, hoursOn, hoursUntil} from '../../lib/tasks/work-hours';
import {blocksOn, eventBusy, fitWithBlocks} from '../../lib/tasks/time-blocks';
import './tasks-r4.css';
import {minutesWords} from '../../lib/tasks/minutes';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatClock, formatNumber} from '../../lib/visual-format';

/**
 * Session AV lane 2 (tasks; Sunsama's daily planning, timeboxing, timers and workload; Todoist's daily goal), part of the
 * Plan my day chunk (plan-day.tsx), on Tasks → Today:
 * - "Fit my day" (LEDGER #21, #24): today's tasks without a time placed in the free time between the day's fixed items
 *   (timed tasks and imported calendar events, as the Agenda shows them), each for its minutes (30 when it has none); place
 *   one, or all in one change with Undo; the Agenda then draws each block to its end.
 * - Timers (LEDGER #25, #27): Start and Stop per task, several at once; Stop adds the minutes to the task's time spent, and
 *   the day says planned against spent.
 * - The day's limit (LEDGER #26) and the daily goal with its streak (LEDGER #9), chosen in Tasks → This week.
 */
type Change = (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
/** Session AV lane 2 (r3-plan, LEDGER #259; Structured's Energy Monitor): the day's energy line, its own chunk. */
const TaskEnergyLine = lazy(() => import('./task-energy-line'));
/** Session AV lane 2 (r4-plan, LEDGER #300; Motion's auto-scheduling, as a proposal): Plan my week, its own chunk. */
const PlanWeek = lazy(() => import('./plan-week'));
/** Session AV lane 2 (r5-plan, LEDGER #348; Akiflow's time slots): today's time blocks, "2 of 4 done", Move what is left (its own chunk). */
const TodayBlocks = lazy(() => import('./time-blocks'));
const clockNow = () => Date.now();
export default function TodayPlanner({record, today, clock, shown, change, doneDay}: {record: Tasks; today: string; clock: string; shown: readonly Task[]; change: Change; doneDay: (iso: string) => string}) {
  const plan = useDeviceRecord(TASK_PLAN), calendars = useDeviceRecord(CALENDAR_IMPORT), id = useId();
  // Session AV lane 2 (r4-plan, LEDGER #301): the day's working hours; "My day ends at" changes this visit only.
  const [now, setNow] = useState(() => Date.now()), [untilTyped, setUntil] = useState<string | null>(null);
  const hours = hoursOn(plan.data, today), evening = afterHours(plan.data), until = untilTyped ?? hours.at(-1)?.to ?? '18:00';
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  // The finishes per day are counted into the log once a day (so a year of them outlives the 30 days a task is kept), and
  // timers of tasks that are gone are dropped.
  // Review b1 #2: a timer of a task finished elsewhere gives its minutes (up to the finish) to the task's time spent.
  useEffect(() => {
    if (!plan.loaded || plan.unreadable) return;
    const {plan: next, spent} = settleTimers(harvestDoneLog(plan.data, record, today, doneDay), record);
    if (next === plan.data) return;
    try { plan.update(() => next); } catch { return; /* counted next time */ }
    for (const s of spent) { const t = record.tasks.find(x => x.id === s.taskId); if (t) change(r => addSpent(r, t.id, s.minutes), `Stopped: ${minutesWords(s.minutes)} on “${t.title}”.`, 'The minutes are taken back.'); }
  }, [plan, record, today, doneDay, change]);
  const busy = useMemo<Busy[]>(() => {
    // Session AV lane 2 (r5-plan, LEDGER #353): an event's typed travel minutes are busy before it.
    const events = calendars.loaded ? eventAgendaItems(calendars.data, today, today, checklistZone()).flatMap(e => { const b = eventBusy(plan.data, e, DEFAULT_BLOCK); return b ? [b] : []; }) : [];
    // Session AV lane 2 (r4-plan, LEDGER #303): a task in pieces whose kept time has passed is planned again for its next piece.
    // Review B6M-3: a task of a project on hold, or one waiting its turn, keeps no time busy today.
    const inPlay = inPlayRecord(record, today);
    return [...taskBusy(inPlay, today, new Set(inPlay.tasks.filter(t => planAgain(t, today, clock)).map(t => t.id))), ...events];
  }, [record, today, clock, calendars.loaded, calendars.data, plan.data]);
  const open = shown.filter(t => !t.doneAt && !t.parentId);
  // Session AV lane 2 (r4-plan, LEDGER #301, #304): inside the working hours ("after hours" tasks in the evening); a waiting task is not placed.
  const fit = useMemo(() => {
    const first = hours[0]?.from ?? '09:00', ready = open.filter(t => !waitingFor(record, t).length).map(t => planAgain(t, today, clock) ? {...t, time: undefined} : t);
    // Session AV lane 2 (r5-plan, LEDGER #348): a block's tasks go inside the block, every other task outside the blocks.
    const blocks = blocksOn(plan.data, today), opts = {from: clock < first ? first : clock, until, windows: untilTyped ? hoursUntil(hours, until) : hours, after: [evening]};
    return blocks.length ? fitWithBlocks(ready, busy, opts, blocks) : {...fitDay(ready, busy, opts), inBlock: new Map<string, string>()};
  }, [open, busy, clock, until, untilTyped, hours, evening, record, today, plan.data]);
  const waiting = record.tasks.filter(t => !t.doneAt && !t.parentId && t.due && t.due <= today).map(t => ({t, on: waitingFor(record, t)})).filter(w => w.on.length);
  const pva = plannedVsActual(open.concat(record.tasks.filter(t => t.doneAt && doneDay(t.doneAt) === today && !t.parentId)));
  const load = open.filter(t => !t.parallel).reduce((n, t) => n + (t.minutes ?? 0), 0), limit = plan.data.dayLimit, over = overLimit(load, limit);
  const goal = plan.data.dailyGoal, streak = goal ? goalStreak(finishesByDay(plan.data, record, doneDay), goal, today) : null;
  const place = (all: typeof fit.placed) => {
    // A task in pieces keeps its first piece: that is its day and time (the next one is planned once it has had its time).
    const items = all.filter((p, i) => all.findIndex(x => x.task.id === p.task.id) === i);
    if (!items.length) return;
    const ok = change(r => items.reduce((rec, p) => editMany(rec, [p.task.id], () => ({due: today, time: p.start}), today, {allowPast: true}), r), items.length === 1 ? `“${items[0]!.task.title}” is at ${formatClock(items[0]!.start)} today.` : `${formatNumber(items.length)} tasks placed in today’s free time.`, 'Taken back off the clock.');
    if (ok) showStatus(items.length === 1 ? `Placed at ${formatClock(items[0]!.start)}: it shows on the Agenda.` : 'Placed: they show on the Agenda, each until it ends.');
  };
  const timer = (t: Task) => {
    if (plan.unreadable) { showStatus('Your timers could not be read on this device, so nothing was written over them.', {tone: 'error'}); return; }
    const running = runningTimer(plan.data, t.id);
    try {
      if (!running) { plan.update(p => startTimer(p, t.id, clockNow())); showStatus(`Timing “${t.title}”.`); return; }
      const {plan: next, minutes} = stopTimer(plan.data, t.id, clockNow());
      plan.update(() => next);
      change(r => addSpent(r, t.id, minutes), `Stopped: ${minutesWords(minutes)} on “${t.title}”.`, 'The minutes are taken back.');
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  const running = (plan.data.timers ?? []).map(x => ({x, task: record.tasks.find(t => t.id === x.taskId)})).filter((r): r is {x: typeof r.x; task: Task} => !!r.task);
  return <section className="tasks-today-planner" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="sr-only">Your day</h3>
    {over.over ? <p className="notice tasks-over-limit" role="status">About {minutesWords(load)} planned: {minutesWords(over.by)} more than the {minutesWords(limit!)} your day holds. Move a task to tomorrow, or let one go.</p>
      : limit && load ? <p className="fine">About {minutesWords(load)} of the {minutesWords(limit)} your day holds.</p> : null}
    {open.some(t => t.energy) && <Suspense fallback={null}><TaskEnergyLine tasks={open} today={today} amount={plan.data.energyAmount} /></Suspense>}
    {goal && streak && <p className="fine tasks-goal-line">Daily goal: {formatNumber(streak.today)} of {formatNumber(goal)} done today{streak.reached ? ' — reached' : ''}. {streak.current ? `${formatNumber(streak.current)} ${streak.current === 1 ? 'day' : 'days'} in a row` : 'No streak yet'}{streak.best > streak.current ? ` (best ${formatNumber(streak.best)})` : ''}.</p>}
    {running.length > 0 && <ul className="tasks-timers" aria-label="Timers running">{running.map(({x, task}) => <li key={x.taskId}><span aria-hidden="true">⏱ </span><span dir="auto">{task.title}</span> · {minutesWords(timerMinutes(x.since, now))}{task.minutes ? ` of ${minutesWords(task.minutes)} planned` : ''}
      <button type="button" className="secondary" onClick={() => timer(task)}>Stop</button></li>)}</ul>}
    {waiting.length > 0 && <p className="fine tasks-waiting-line">{waiting.length === 1 ? 'Waiting' : `${formatNumber(waiting.length)} waiting`}: {waiting.slice(0, 5).map(({t, on}, i) => <span key={t.id}>{i ? '; ' : ''}“<span dir="auto">{t.title}</span>” after {on.map(b => `“${b.title}”`).join(', ')}</span>)}. Each joins today once those are done.</p>}
    {(pva.planned > 0 || pva.actual > 0) && <p className="fine">Today: planned {minutesWords(pva.planned)}, spent {minutesWords(pva.actual)}.</p>}
    {blocksOn(plan.data, today).length > 0 && <Suspense fallback={null}><TodayBlocks record={record} today={today} change={change} /></Suspense>}
    <details className="tasks-fit-day">
      <summary>Fit my day around the Agenda</summary>
      <p className="fine">Tasks without a time go into the free time inside your working hours ({hours.length ? hours.map(b => `${formatClock(b.from)}–${formatClock(b.to)}`).join(' and ') : 'today is a day off'}; set them in Tasks → This week), between your timed tasks and calendar events, each for its minutes (30 when it has none). An “after hours” task goes in the evening; a long task with pieces goes piece by piece. Background tasks take no slot. A task dropped into a time block goes inside it; the others stay outside your blocks; travel minutes before a time count as taken.</p>
      <label className="field"><span>My day ends at</span><input type="time" value={until} aria-describedby={`${id}-until`} onChange={e => setUntil(e.target.value || null)} />
        <small id={`${id}-until`} className="tasks-field-note">{hours.length ? 'Moves the end of today’s last hours, later or earlier, for this visit only.' : 'Today is a day off in your working hours, so nothing is placed.'}</small></label>
      {busy.length > 0 && <p className="fine">Fixed today: {[...busy].sort((a, b) => a.start - b.start).map(b => `${formatClock(toClock(b.start))} ${b.title}`).join(' · ')}</p>}
      {fit.placed.length ? <><ol className="tasks-fit-list" aria-label="A plan for today">{fit.placed.map(p => <li key={`${p.task.id}:${p.part ?? 1}`}>
        <span><strong>{formatClock(p.start)}–{formatClock(p.end)}</strong> <span dir="auto">{p.task.title}</span>{p.part ? <small> · part {formatNumber(p.part)} of {formatNumber(p.of!)}</small> : null}{fit.inBlock.get(`${p.task.id}:${p.part ?? 1}`) ? <small> · in “{fit.inBlock.get(`${p.task.id}:${p.part ?? 1}`)}”</small> : null}{p.task.minutes ? '' : <small> · 30 min, it has no length</small>}</span>
        <button type="button" className="quiet" aria-label={`Place “${p.task.title}”${p.part ? ` (part ${p.part})` : ''} at ${formatClock(p.start)}`} onClick={() => place([p])}>Place</button>
        <button type="button" className="quiet" aria-label={`${runningTimer(plan.data, p.task.id) ? 'Stop the timer of' : 'Start a timer for'} “${p.task.title}”`} onClick={() => timer(p.task)}>{runningTimer(plan.data, p.task.id) ? 'Stop' : 'Start timer'}</button></li>)}</ol>
        <button type="button" className="secondary" onClick={() => place(fit.placed)}>Place all {formatNumber(new Set(fit.placed.map(p => p.task.id)).size)}</button>
        {fit.placed.some(p => p.part) && <p className="fine">A task in pieces keeps its first piece on the Agenda; once that time has passed, Plan my day offers the next piece (the time spent counts against the whole).</p>}</>
        : <p className="fine">{open.some(t => !t.time && !t.parallel) ? 'No free time is left before your day ends.' : 'Every task of today already has a time, or none is planned.'}</p>}
      {fit.left.length > 0 && <p className="fine">No room today for: {fit.left.map(t => `“${t.title}”`).join(', ')}.</p>}
      {fit.rest.length > 0 && <p className="fine">Pieces for another day: {fit.rest.map(r => `“${r.task.title}” (${formatNumber(r.pieces)} more)`).join(', ')}. Plan my week finds them a day.</p>}
      {open.filter(t => t.time && !runningTimer(plan.data, t.id)).length > 0 && <p className="tasks-fit-timers">{open.filter(t => t.time && !runningTimer(plan.data, t.id)).slice(0, 8).map(t => <button key={t.id} type="button" className="quiet" aria-label={`Start a timer for “${t.title}”`} onClick={() => timer(t)}>⏱ {t.title}</button>)}</p>}
    </details>
    <Suspense fallback={null}><PlanWeek record={record} today={today} clock={clock} change={change} /></Suspense>
  </section>;
}
