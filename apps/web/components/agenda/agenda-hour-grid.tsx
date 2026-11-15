'use client';
import Link from 'next/link';
import {useId, useState, type DragEvent} from 'react';
import {formatClock, formatDate, formatNumber} from '../../lib/visual-format';
import {MOVE_TIMES, hourRows, movable, timedLoad, untimedOthers, untimedTasks} from '../../lib/agenda/hour-grid';
import type {DayItem, DayWithExtras, TaskAgendaItem} from '../../lib/agenda/time-items';
import {CountdownsOnDay} from '../countdowns/countdowns-on-day';
import './agenda-hour-grid.css';

/**
 * Session AP (owner-approved feature list, time-blocking): the Agenda's day by the hour, loaded the first time the
 * person opens it (React.lazy from agenda-page.tsx). A task is dragged (pointer) to an hour, or moved with its own
 * "Move to…" time picker (the keyboard way); either writes the task's existing day and time through the Agenda's move
 * (lib/tasks/engine.ts editTask), with Undo. Habits, imported events and the rest show at their own time and are never
 * moved here. The heading says the day's load: how many items have a time.
 */
const DRAG_TYPE = 'application/x-zigoals-task';
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const KIND: Record<DayItem['source'], string> = {habit: 'Habit', contribution: 'Contribution', bill: 'Bill', workout: 'Workout', meal: 'Meal', unbonding: 'Unbonding', review: 'Review', task: 'Task', event: 'Event'};
type Props = {day: DayWithExtras; today: string; onMove: (taskId: string, date: string, time?: string | null) => void; onTick: (item: TaskAgendaItem, done: boolean) => void};

export default function AgendaHourGrid({day, today, onMove, onTick}: Props) {
  const id = useId(), rows = hourRows(day), waiting = untimedTasks(day), others = untimedOthers(day), load = timedLoad(day);
  const [over, setOver] = useState<number | null>(null);
  const drop = (hour: number, clock: string) => ({
    onDragOver: (e: DragEvent<HTMLLIElement>) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(hour); } },
    onDragLeave: () => setOver(h => h === hour ? null : h),
    onDrop: (e: DragEvent<HTMLLIElement>) => { const taskId = e.dataTransfer.getData(DRAG_TYPE); setOver(null); if (taskId) { e.preventDefault(); e.stopPropagation(); onMove(taskId, day.date, clock); } },
  });
  return <section className="agenda-hours" aria-labelledby={`${id}-title`} data-load={load}>
    <h3 id={`${id}-title`} className="agenda-hours-title">By the hour <small>{load ? `${plural(load, 'item')} at a set time` : 'nothing at a set time yet'}</small></h3>
    <p className="agenda-hours-help">Drag a task to an hour, or use its “Move to…” to choose a time. Habits and events stay at their own time.</p>
    <CountdownsOnDay date={day.date} today={today} />
    {(waiting.length > 0 || others.length > 0) && <div className="agenda-hours-waiting">
      <h4>No time yet</h4>
      <ul className="agenda-hours-items">{waiting.map(i => <GridItem key={i.id} item={i} date={day.date} onMove={onMove} onTick={onTick} />)}{others.map(i => <GridItem key={i.id} item={i} date={day.date} onMove={onMove} onTick={onTick} />)}</ul>
    </div>}
    <ol className="agenda-hours-grid" aria-label={`Hours of ${formatDate(day.date, {weekday: true, year: false})}`}>{rows.map(r => <li key={r.hour} className="agenda-hour" data-hour={r.hour} data-drop={over === r.hour || undefined} data-empty={r.items.length ? undefined : ''} {...drop(r.hour, r.clock)}>
      <span className="agenda-hour-clock">{formatClock(r.clock)}</span>
      {r.items.length > 0 ? <ul className="agenda-hours-items" aria-label={formatClock(r.clock)}>{r.items.map(i => <GridItem key={i.id} item={i} date={day.date} onMove={onMove} onTick={onTick} />)}</ul> : <span className="sr-only">Nothing at {formatClock(r.clock)}</span>}
    </li>)}</ol>
  </section>;
}

function GridItem({item, date, onMove, onTick}: {item: DayItem; date: string; onMove: Props['onMove']; onTick: Props['onTick']}) {
  const [picking, setPicking] = useState(false), [time, setTime] = useState(item.time ?? '09:00'), task = movable(item) ? item : null;
  const when = item.time ? formatClock(item.time) : 'Any time';
  return <li className="agenda-hour-item" data-source={item.source} data-pillar={item.pillar} data-state={item.state} draggable={!!task || undefined}
    onDragStart={task ? e => { e.dataTransfer.setData(DRAG_TYPE, task.taskId); e.dataTransfer.setData('text/plain', task.title); e.dataTransfer.effectAllowed = 'move'; } : undefined}>
    {item.source === 'task' && <label className="agenda-task-tick"><input type="checkbox" checked={item.state === 'done'} onChange={e => onTick(item, e.target.checked)} /><span className="sr-only">{item.state === 'done' ? `Mark “${item.title}” not done` : `Mark “${item.title}” done`}</span></label>}
    <span className="agenda-hour-text">
      {item.href ? <Link prefetch={false} className="agenda-item-title" href={item.href}>{item.title}</Link> : <span className="agenda-item-title">{item.title}</span>}
      <small>{KIND[item.source]} · {when}{item.state === 'done' ? ' · Done' : ''}{item.source === 'task' && item.overdueSince ? ` · Overdue since ${formatDate(item.overdueSince, {year: false})}` : ''}</small>
    </span>
    {task && <button type="button" className="text-link agenda-hour-move" aria-expanded={picking} aria-label={`Move “${task.title}” to another time`} onClick={() => setPicking(p => !p)}>Move to…</button>}
    {task && picking && <form className="agenda-task-move" aria-label={`Move “${task.title}” to a time`} onSubmit={e => { e.preventDefault(); onMove(task.taskId, date, time || null); setPicking(false); }}>
      <label className="field"><span>Time</span><select value={time} onChange={e => setTime(e.target.value)}>
        <option value="">No time</option>
        {MOVE_TIMES.map(t => <option key={t} value={t}>{formatClock(t)}</option>)}
        {item.time && !MOVE_TIMES.includes(item.time) && <option value={item.time}>{formatClock(item.time)}</option>}
      </select></label>
      <button type="submit" className="secondary">Move</button>
      <button type="button" className="quiet" onClick={() => setPicking(false)}>Cancel</button>
    </form>}
  </li>;
}
