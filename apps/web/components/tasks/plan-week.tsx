'use client';
import Link from 'next/link';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {CALENDAR_IMPORT} from '../../lib/ics/calendar';
import {eventAgendaItems} from '../../lib/agenda/time-items';
import {checklistZone} from '../../lib/checklist/zone';
import {addLocalDays} from '../../lib/local-date';
import {editTask, isLate} from '../../lib/tasks/engine';
import {dayEnergy} from '../../lib/tasks/energy-load';
import {DEFAULT_BLOCK, toMin, type Busy} from '../../lib/tasks/layouts';
import {minutesWords} from '../../lib/tasks/minutes';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import {WEEK_DAYS, fitWeek, keepPlacements, weekCandidates, type WeekPlacement} from '../../lib/tasks/plan-week';
import {windowEnd, windowStart} from '../../lib/tasks/recurrence';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatClock, formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-r4.css';

/**
 * Session AV lane 2 (r4-plan, LEDGER #300; Motion's auto-scheduling, made a proposal), its own chunk, in Tasks → Today (under
 * Plan my day) and Tasks → This week: "Plan my week". The open tasks with minutes go into the free working hours of the
 * next 7 days (lib/tasks/plan-week.ts), shown day by day with each day's minutes (and energy, when tasks have one) and a
 * link to that day on the Day Timeline (round 3's any-day timeline). Every placement is ticked; the person unticks what
 * they do not want and keeps the rest in one change with Undo. Nothing moves until then, and nothing moves by itself.
 */
type Change = (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
const dayName = (d: string, today: string) => d === today ? `Today · ${formatDate(d, {weekday: true, year: false})}` : d === addLocalDays(today, 1) ? `Tomorrow · ${formatDate(d, {weekday: true, year: false})}` : formatDate(d, {weekday: true, year: false});
function useEvents(today: string): (day: string) => Busy[] {
  const calendars = useDeviceRecord(CALENDAR_IMPORT);
  return useMemo(() => {
    const by = new Map<string, Busy[]>();
    if (calendars.loaded) for (const e of eventAgendaItems(calendars.data, today, addLocalDays(today, WEEK_DAYS - 1), checklistZone())) if (e.time) by.set(e.date, [...(by.get(e.date) ?? []), {start: toMin(e.time), end: toMin(e.time) + (e.minutes || DEFAULT_BLOCK), title: e.title}]);
    return (day: string) => by.get(day) ?? [];
  }, [calendars.loaded, calendars.data, today]);
}
export default function PlanWeek({record, today, clock, change, open: startOpen = false}: {record: Tasks; today: string; clock: string; change: Change; open?: boolean}) {
  const plan = useDeviceRecord(TASK_PLAN), id = useId(), extra = useEvents(today);
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const waiting = useMemo(() => weekCandidates(record, today, clock).length, [record, today, clock]);
  const week = useMemo(() => fitWeek({record, plan: plan.data, today, clock, extra}), [record, plan.data, today, clock, extra]);
  const kept = week.placed.filter(p => !unticked.has(p.key)), keptTasks = new Set(kept.map(p => p.task.id)).size;
  const keep = () => {
    if (!kept.length) return;
    if (change(r => keepPlacements(r, kept, today), `Kept: ${formatNumber(keptTasks)} ${keptTasks === 1 ? 'task has' : 'tasks have'} a day and a time this week.`, 'The plan is taken back: each task has its own day again.')) {
      setUnticked(new Set());
      showStatus('Kept: they show on the Agenda and the Day Timeline.');
    }
  };
  const flip = (p: WeekPlacement) => setUnticked(s => { const n = new Set(s); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; });
  return <details className="tasks-plan-week" open={startOpen || undefined}>
    <summary>Plan my week <small>{waiting ? `${formatNumber(waiting)} ${waiting === 1 ? 'task' : 'tasks'} with minutes to place over the next 7 days` : 'nothing to place yet'}</small></summary>
    <p className="fine">Open tasks with minutes go into the free time inside your working hours over the next 7 days, around timed tasks and calendar events: the earliest deadline first, then priority. A task is never placed before its own day or start-early day, nor after its deadline; one that waits for another, a background task and a fixed repeat stay where they are. Nothing moves until you keep it.</p>
    {!week.placed.length && !week.left.length ? <p className="fine">{waiting ? 'Your working hours have no free time left this week.' : 'Nothing to place: give a task its length (“Takes, minutes” in its editor) and no time, and Plan my week finds it a day.'}</p> : <>
      {week.days.map(d => {
        const on = week.placed.filter(p => p.day === d);
        if (!on.length) return null;
        const minutes = on.reduce((n, p) => n + p.minutes, 0), tasks: Task[] = [...record.tasks.filter(t => !t.doneAt && t.due === d && !on.some(p => p.task.id === t.id)), ...on.map(p => ({...p.task, minutes: p.minutes}))];
        const energy = tasks.some(t => t.energy) ? dayEnergy(tasks, plan.data.energyAmount) : null;
        return <section key={d} aria-labelledby={`${id}-${d}`}>
          <h4 id={`${id}-${d}`} className="tasks-plan-week-day">{dayName(d, today)} <small>{minutesWords(minutes)} placed{energy ? ` · energy about ${energy.total} of your ${energy.amount}` : ''}</small> <Link prefetch={false} className="text-link" href={`/app/timeline?day=${d}`}>See the day</Link></h4>
          <ul className="tasks-plan-week-list">{on.map(p => <li key={p.key}><label>
            <input type="checkbox" checked={!unticked.has(p.key)} onChange={() => flip(p)} />
            <span><strong>{formatClock(p.start)}–{formatClock(p.end)}</strong> <span dir="auto">{p.task.title}</span>{p.part ? <small> · part {formatNumber(p.part)} of {formatNumber(p.of!)}</small> : null}{p.task.deadline ? <small> · deadline {formatDate(p.task.deadline, {weekday: true, year: false})}</small> : null}{p.task.afterHours ? <small> · after hours</small> : null}</span>
          </label></li>)}</ul>
        </section>;
      })}
      {week.left.length > 0 && <><p className="fine">Not placed:</p><ul className="tasks-plan-week-left">{week.left.map(l => <li key={l.task.id}><span dir="auto">“{l.task.title}”</span>{l.placed ? ` (${formatNumber(l.placed)} of ${formatNumber(l.of)} parts placed)` : ''}: {l.why === 'deadline' ? `the free time before its deadline (${formatDate(l.by!, {weekday: true, year: false})}) is taken` : 'no free time in your hours this week'}{!l.task.chunk && (l.task.minutes ?? 0) > 120 ? '. Pieces (in its editor) can help it fit' : ''}.</li>)}</ul></>}
      {week.placed.length > 0 && <div className="tasks-plan-week-actions">
        <button type="button" className="secondary" disabled={!kept.length} onClick={keep}>{kept.length ? `Keep ${formatNumber(keptTasks)} ${keptTasks === 1 ? 'task' : 'tasks'}` : 'Tick a task to keep'}</button>
        {unticked.size > 0 && <button type="button" className="quiet" onClick={() => setUnticked(new Set())}>Tick all again</button>}
      </div>}
      {week.placed.some(p => p.part) && <p className="fine">A task in pieces keeps its first ticked piece as its day and time; once that has passed, plan again for the next piece.</p>}
    </>}
  </details>;
}

/**
 * Session AV lane 2 (r4-plan, LEDGER #305; Motion's repeat window), in Tasks → This week: the floating repeats still open in
 * the week shown ("once a week, any day") and its month ("once a month"), each with a day of its window to plan it for.
 * Planning it moves only this time; done, it comes back in the next week or month.
 */
export function FloatingRepeats({record, today, week, change}: {record: Tasks; today: string; week: string; change: Change}) {
  const end = addLocalDays(week, 6);
  const open = record.tasks.filter(t => !t.doneAt && t.recur?.flex && t.due && windowStart(t.recur.flex, t.due) <= end && (t.due >= week || t.due < today));
  if (!open.length) return <p className="fine">No floating repeat yet. Type “once a week” or “once a month” as a task’s repeat: it stays here, any day of its week or month, until it is done.</p>;
  return <ul className="tasks-floating" aria-label="Once this week or month, any day">{open.map(t => {
    const flex = t.recur!.flex!, last = windowEnd(flex, t.due! < today ? today : t.due!), choices: string[] = [];
    for (let d = t.due! < today ? today : later(today, windowStart(flex, t.due!)); d <= last && choices.length < 31; d = addLocalDays(d, 1)) choices.push(d);
    return <li key={t.id}><span><span dir="auto">{t.title}</span> <small>· once a {flex}{isLate(t, today) ? `, open since ${formatDate(t.due!, {weekday: true, year: false})}` : `, by ${formatDate(t.due!, {weekday: true, year: false})}`}</small></span>
      <label className="field"><span className="sr-only">Plan “{t.title}” for</span><select value="" onChange={e => { const d = e.target.value; if (d) change(r => editTask(r, t.id, {due: d}, today, {allowPast: true}), `“${t.title}” is planned for ${formatDate(d, {weekday: true, year: false})}; done, it comes back next ${flex}.`, 'It is back on its own day.'); }}><option value="">Plan for…</option>{choices.map(d => <option key={d} value={d}>{formatDate(d, {weekday: true, year: false})}</option>)}</select></label></li>;
  })}</ul>;
}
const later = (a: string, b: string) => a > b ? a : b;
