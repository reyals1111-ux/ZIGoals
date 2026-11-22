'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {CALENDAR_IMPORT} from '../../lib/ics/calendar';
import {eventAgendaItems} from '../../lib/agenda/time-items';
import {checklistZone} from '../../lib/checklist/zone';
import {DEFAULT_BLOCK, addSpent, fitDay, overLimit, plannedVsActual, taskBusy, toClock, toMin, type Busy} from '../../lib/tasks/layouts';
import {TASK_PLAN, finishesByDay, goalStreak, harvestDoneLog, runningTimer, startTimer, stopTimer, tidyTimers, timerMinutes} from '../../lib/tasks/plan-record';
import {editMany} from '../../lib/tasks/engine';
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
const clockNow = () => Date.now();
export default function TodayPlanner({record, today, clock, shown, change, doneDay}: {record: Tasks; today: string; clock: string; shown: readonly Task[]; change: Change; doneDay: (iso: string) => string}) {
  const plan = useDeviceRecord(TASK_PLAN), calendars = useDeviceRecord(CALENDAR_IMPORT), id = useId();
  const [now, setNow] = useState(() => Date.now()), [until, setUntil] = useState('18:00');
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  // The finishes per day are counted into the log once a day (so a year of them outlives the 30 days a task is kept), and
  // timers of tasks that are gone are dropped.
  useEffect(() => {
    if (!plan.loaded || plan.unreadable) return;
    const next = tidyTimers(harvestDoneLog(plan.data, record, today, doneDay), record);
    if (next !== plan.data) { try { plan.update(() => next); } catch { /* counted next time */ } }
  }, [plan, record, today, doneDay]);
  const busy = useMemo<Busy[]>(() => {
    const events = calendars.loaded ? eventAgendaItems(calendars.data, today, today, checklistZone()).filter(e => e.time).map(e => ({start: toMin(e.time!), end: toMin(e.time!) + (e.minutes || DEFAULT_BLOCK), title: e.title})) : [];
    return [...taskBusy(record, today), ...events];
  }, [record, today, calendars.loaded, calendars.data]);
  const open = shown.filter(t => !t.doneAt && !t.parentId);
  const fit = useMemo(() => fitDay(open, busy, {from: clock < '09:00' ? '09:00' : clock, until}), [open, busy, clock, until]);
  const pva = plannedVsActual(open.concat(record.tasks.filter(t => t.doneAt && doneDay(t.doneAt) === today && !t.parentId)));
  const load = open.filter(t => !t.parallel).reduce((n, t) => n + (t.minutes ?? 0), 0), limit = plan.data.dayLimit, over = overLimit(load, limit);
  const goal = plan.data.dailyGoal, streak = goal ? goalStreak(finishesByDay(plan.data, record, doneDay), goal, today) : null;
  const place = (items: typeof fit.placed) => {
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
    {goal && streak && <p className="fine tasks-goal-line">Daily goal: {formatNumber(streak.today)} of {formatNumber(goal)} done today{streak.reached ? ' — reached' : ''}. {streak.current ? `${formatNumber(streak.current)} ${streak.current === 1 ? 'day' : 'days'} in a row` : 'No streak yet'}{streak.best > streak.current ? ` (best ${formatNumber(streak.best)})` : ''}.</p>}
    {running.length > 0 && <ul className="tasks-timers" aria-label="Timers running">{running.map(({x, task}) => <li key={x.taskId}><span aria-hidden="true">⏱ </span><span dir="auto">{task.title}</span> · {minutesWords(timerMinutes(x.since, now))}{task.minutes ? ` of ${minutesWords(task.minutes)} planned` : ''}
      <button type="button" className="secondary" onClick={() => timer(task)}>Stop</button></li>)}</ul>}
    {(pva.planned > 0 || pva.actual > 0) && <p className="fine">Today: planned {minutesWords(pva.planned)}, spent {minutesWords(pva.actual)}.</p>}
    <details className="tasks-fit-day">
      <summary>Fit my day around the Agenda</summary>
      <p className="fine">Tasks without a time go into the free time between your timed tasks and calendar events, each for its minutes (30 when it has none). Background tasks take no slot.</p>
      <label className="field"><span>My day ends at</span><input type="time" value={until} onChange={e => setUntil(e.target.value || '18:00')} /></label>
      {busy.length > 0 && <p className="fine">Fixed today: {[...busy].sort((a, b) => a.start - b.start).map(b => `${formatClock(toClock(b.start))} ${b.title}`).join(' · ')}</p>}
      {fit.placed.length ? <><ol className="tasks-fit-list" aria-label="A plan for today">{fit.placed.map(p => <li key={p.task.id}>
        <span><strong>{formatClock(p.start)}–{formatClock(p.end)}</strong> <span dir="auto">{p.task.title}</span>{p.task.minutes ? '' : <small> · 30 min, it has no length</small>}</span>
        <button type="button" className="quiet" aria-label={`Place “${p.task.title}” at ${formatClock(p.start)}`} onClick={() => place([p])}>Place</button>
        <button type="button" className="quiet" aria-label={`${runningTimer(plan.data, p.task.id) ? 'Stop the timer of' : 'Start a timer for'} “${p.task.title}”`} onClick={() => timer(p.task)}>{runningTimer(plan.data, p.task.id) ? 'Stop' : 'Start timer'}</button></li>)}</ol>
        <button type="button" className="secondary" onClick={() => place(fit.placed)}>Place all {formatNumber(fit.placed.length)}</button></>
        : <p className="fine">{open.some(t => !t.time && !t.parallel) ? 'No free time is left before your day ends.' : 'Every task of today already has a time, or none is planned.'}</p>}
      {fit.left.length > 0 && <p className="fine">No room today for: {fit.left.map(t => `“${t.title}”`).join(', ')}.</p>}
      {open.filter(t => t.time && !runningTimer(plan.data, t.id)).length > 0 && <p className="tasks-fit-timers">{open.filter(t => t.time && !runningTimer(plan.data, t.id)).slice(0, 8).map(t => <button key={t.id} type="button" className="quiet" aria-label={`Start a timer for “${t.title}”`} onClick={() => timer(t)}>⏱ {t.title}</button>)}</p>}
    </details>
  </section>;
}
