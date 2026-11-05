'use client';
import Link from 'next/link';
import {useEffect, useRef, useState, type DragEvent, type KeyboardEvent} from 'react';
import {formatClock, formatDate, formatNumber, formatWeekday} from '../../lib/visual-format';
import {shiftAnchor, type AgendaItem, type AgendaSource} from '../../lib/agenda/build';
import {daySummary, foldAnytimeHabits} from '../../lib/agenda/group';
import type {DayItem, DayWithExtras, TaskAgendaItem} from '../../lib/agenda/time-items';
import {PRIORITY_WORDS} from '../tasks/task-parts';
import type {GoalOption} from '../tasks/use-goal-options';
import {addLocalDays} from '../../lib/local-date';

/**
 * CI14 (page weights; budgets are never raised): the Agenda's days, rows and month grid, and the task form and status
 * line it shows with them, moved here from agenda-page.tsx unchanged. They show only once the agenda's records have been
 * read (after mount), so they are a chunk of their own, asked for as the page loads (components/use-chunk.ts); until it
 * is here the page shows its loading skeleton and says data-agenda="loading", exactly as while the records are read.
 */
export {TaskAddForm, TaskStatusLine} from '../tasks/task-parts';
const ONE: Record<AgendaSource, string> = {habit: 'Habit', contribution: 'Contribution', bill: 'Bill', workout: 'Workout', meal: 'Meal', unbonding: 'Unbonding', review: 'Review'};
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export type RowProps = {today: string; goals: ReadonlyMap<string, GoalOption>; onTick: (item: TaskAgendaItem, done: boolean) => void; onMove: (taskId: string, date: string, time?: string | null) => void};
const DRAG_TYPE = 'application/x-zigoals-task';
export function DayList({day, today, heading, goals, onTick, onMove}: {day: DayWithExtras; heading: boolean} & RowProps) {
  const title = <>{formatDate(day.date, {weekday: true, year: false})}{day.date === today && <span className="agenda-today">Today</span>}</>;
  const [over, setOver] = useState(false);
  const fold = heading ? foldAnytimeHabits(day.items) : {habits: [], rest: day.items};
  const drop = {
    onDragOver: (e: DragEvent<HTMLDivElement>) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent<HTMLDivElement>) => { const id = e.dataTransfer.getData(DRAG_TYPE); setOver(false); if (id) { e.preventDefault(); onMove(id, day.date); } },
  };
  return <div className="agenda-day" data-today={day.date === today || undefined} data-drop={over || undefined} {...drop}>
    {heading && <h3 className="agenda-day-title">{title}</h3>}
    {day.items.length ? <ul className="agenda-items">{fold.rest.map(i => i.source === 'task' ? <TaskItemRow key={i.id} item={i} goals={goals} onTick={onTick} onMove={onMove} today={today} /> : i.source === 'event' ? <EventItemRow key={i.id} item={i} /> : <ItemRow key={i.id} item={i} />)}
      {/* Session AL (DV-193, P-DV-125): in the week and month views, habits with no time are one row ("4 habits · any time") */}
      {fold.habits.length > 0 && <li className="agenda-item agenda-habit-group" data-source="habit" data-pillar="habits">
        <span className="agenda-time">Any time</span>
        <details className="agenda-item-main"><summary className="agenda-item-title">{plural(fold.habits.length, 'habit')} <small>({fold.habits.filter(h => h.state === 'done').length} done)</small></summary>
          <ul className="agenda-items">{fold.habits.map(i => <ItemRow key={i.id} item={i as AgendaItem} />)}</ul></details>
      </li>}</ul> : <p className="agenda-nothing">Nothing planned.</p>}
  </div>;
}
function ItemRow({item}: {item: AgendaItem}) {
  return <li className="agenda-item" data-source={item.source} data-pillar={item.pillar} data-state={item.state}>
    <span className="agenda-time">{item.time ? formatClock(item.time) : 'Any time'}</span>
    <div className="agenda-item-main">
      <Link prefetch={false} className="agenda-item-title" href={item.href}>{item.title}</Link>
      <p className="agenda-item-meta"><span>{ONE[item.source]}</span>{item.detail && <span> · {item.detail}</span>}{item.state === 'done' && <span className="agenda-badge"> Done</span>}{item.state === 'skipped' && <span className="agenda-badge"> Skipped</span>}{item.example && <span className="agenda-badge is-example"> Example</span>}</p>
    </div>
  </li>;
}

/** Session AK (T1): a task on the Agenda — tick it here (the page's status line has the Undo), open it, or focus on it. */
function TaskItemRow({item, goals, onTick, onMove, today}: {item: TaskAgendaItem; goals: ReadonlyMap<string, GoalOption>; onTick: (item: TaskAgendaItem, done: boolean) => void; onMove: RowProps['onMove']; today: string}) {
  const goal = item.goal ? goals.get(item.goal) : undefined, done = item.state === 'done';
  const [moving, setMoving] = useState(false), [day, setDay] = useState(item.date), [time, setTime] = useState(item.time ?? '');
  return <li className="agenda-item agenda-task" data-source="task" data-pillar={item.pillar} data-state={item.state} draggable={!done}
    onDragStart={e => { e.dataTransfer.setData(DRAG_TYPE, item.taskId); e.dataTransfer.setData('text/plain', item.title); e.dataTransfer.effectAllowed = 'move'; }}>
    <span className="agenda-time">{item.time ? formatClock(item.time) : 'Any time'}</span>
    <div className="agenda-item-main agenda-task-main">
      <label className="agenda-task-tick"><input type="checkbox" checked={done} onChange={e => onTick(item, e.target.checked)} /><span className="sr-only">{done ? `Mark “${item.title}” not done` : `Mark “${item.title}” done`}</span></label>
      <div className="agenda-task-text">
        <Link prefetch={false} className="agenda-item-title" href={item.href}>{item.title}</Link>
        <p className="agenda-item-meta"><span>Task</span>{item.priority !== 'normal' && <span> · {PRIORITY_WORDS[item.priority]} priority</span>}{item.overdueSince && <span className="agenda-overdue"> · Overdue since {formatDate(item.overdueSince, {year: false})}</span>}{goal && <span> · {goal.name}</span>}{done && <span className="agenda-badge"> Done</span>}</p>
      </div>
      {!done && <Link prefetch={false} className="text-link agenda-task-focus" href={`/app/tasks?focus=${encodeURIComponent(item.taskId)}`} aria-label={`Focus on “${item.title}”`}>Focus</Link>}
      {!done && <button type="button" className="text-link agenda-task-focus" aria-expanded={moving} aria-label={`Move “${item.title}” to another day or time`} onClick={() => setMoving(m => !m)}>Move</button>}
    </div>
    {moving && <form className="agenda-task-move" aria-label={`Move “${item.title}”`} onSubmit={e => { e.preventDefault(); if (day) { onMove(item.taskId, day, time || null); setMoving(false); } }}>
      <label className="field"><span>Day</span><input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
      <label className="field"><span>Time (optional)</span><input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
      <button type="button" className="quiet" onClick={() => { onMove(item.taskId, addLocalDays(today, 1)); setMoving(false); }}>Tomorrow</button>
      <button type="submit" className="secondary" disabled={!day}>Move</button><button type="button" className="quiet" onClick={() => setMoving(false)}>Cancel</button>
    </form>}
  </li>;
}
/** Session AK (T2): an imported event — read-only, named by its calendar; it opens nothing. */
function EventItemRow({item}: {item: Extract<DayItem, {source: 'event'}>}) {
  return <li className="agenda-item agenda-event" data-source="event" data-pillar="life" data-state="open">
    <span className="agenda-time">{item.time ? formatClock(item.time) : 'All day'}</span>
    <div className="agenda-item-main">
      <span className="agenda-item-title">{item.title}</span>
      <p className="agenda-item-meta"><span>From {item.calendar}</span>{item.parts && <span> · day {item.part} of {item.parts}</span>}{item.time && item.minutes > 0 && <span> · {formatNumber(item.minutes)} min</span>}</p>
    </div>
  </li>;
}

/** The month as a grid of day buttons (arrows move, Page Up/Down change month, Home/End the week's ends); the chosen day's items below. */
export function MonthGrid({days, first, last, selected, today, onSelect, goals, onTick, onMove}: {days: DayWithExtras[]; first: string; last: string; selected: string; onSelect: (date: string) => void} & RowProps) {
  const grid = useRef<HTMLOListElement>(null), moved = useRef(false);
  useEffect(() => { if (moved.current) { moved.current = false; grid.current?.querySelector<HTMLButtonElement>(`[data-date="${selected}"]`)?.focus(); } }, [selected]);
  const go = (date: string) => { moved.current = true; onSelect(date); };
  const keys = (e: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const index = days.findIndex(d => d.date === date), weekday = index % 7;
    const step: Record<string, number> = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday};
    if (e.key in step) { e.preventDefault(); const to = days[index + step[e.key]!]; go(to ? to.date : addLocalDays(date, step[e.key]!)); }
    else if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); go(shiftAnchor('month', date, e.key === 'PageUp' ? -1 : 1)); }
  };
  const chosen = days.find(d => d.date === selected) ?? days.find(d => d.date === first)!;
  return <div className="agenda-month">
    <div className="agenda-weekdays" aria-hidden="true">{days.slice(0, 7).map(d => <span key={d.date}>{formatWeekday(d.date)}</span>)}</div>
    <ol ref={grid} className="agenda-grid" aria-label="Days of the month">{days.map(d => {
      const out = d.date < first || d.date > last, pillars = [...new Set(d.items.map(i => i.pillar))];
      return <li key={d.date} data-out={out || undefined}>
        <button type="button" className="agenda-cell" data-date={d.date} tabIndex={d.date === chosen.date ? 0 : -1} aria-pressed={d.date === chosen.date} aria-current={d.date === today ? 'date' : undefined}
          aria-label={`${formatDate(d.date, {weekday: true})}: ${d.items.length ? daySummary(d.items) : 'nothing planned'}`} title={d.items.length ? daySummary(d.items) : undefined} onClick={() => onSelect(d.date)} onKeyDown={e => keys(e, d.date)}>
          <span className="agenda-cell-weekday" aria-hidden="true">{formatWeekday(d.date)}</span>
          <span className="agenda-cell-day" aria-hidden="true">{Number(d.date.slice(8))}</span>
          {d.items.length > 0 && <span className="agenda-cell-dots" aria-hidden="true">{pillars.slice(0, 4).map(p => <i key={p} data-pillar={p} />)}<b>{d.items.length}</b></span>}
        </button>
      </li>;
    })}</ol>
    {/* Session AL (DV-194, P-DV-125): what the dots and numbers mean */}
    <p className="fine agenda-legend"><span className="agenda-cell-dots" aria-hidden="true"><i data-pillar="habits" /></span> Habits <span className="agenda-cell-dots" aria-hidden="true"><i data-pillar="health" /></span> Health <span className="agenda-cell-dots" aria-hidden="true"><i data-pillar="goals" /></span> Goals <span className="agenda-cell-dots" aria-hidden="true"><i data-pillar="wealth" /></span> Money <span className="agenda-cell-dots" aria-hidden="true"><i data-pillar="life" /></span> Tasks and events · the number is how many items that day. Choose a day to see them.</p>
    <DayList day={chosen} today={today} heading goals={goals} onTick={onTick} onMove={onMove} />
  </div>;
}
