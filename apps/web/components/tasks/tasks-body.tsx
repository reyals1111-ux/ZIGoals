'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {openTasks} from '../../lib/tasks/engine';
import {dueReminders} from '../../lib/tasks/reminders';
import {checklistZone} from '../../lib/checklist/zone';
import {formatClock} from '../../lib/visual-format';
import {TaskAddForm, TaskRow, TaskStatusLine} from './task-parts';
import {useTaskList} from './use-task-list';
import {useGoalOptions} from './use-goal-options';
import './tasks.css';

const SHOWN = 5;
/**
 * Session AI (tasks with a priority and a due date): one-off things to do on Today — add one with a priority and an
 * optional day, tick it done (Undo), remove it (Undo). Overdue and today's first. On this device only.
 * Session AK (T1): the same rows and form as the Tasks page (a time on the day, the goal it serves, named in the row),
 * and a link to every task.
 * Session AL (P-LS-68): the task reminders that have gone off show here while the app is open (Done or Dismiss).
 */
export function TasksBody() {
  const list = useTaskList(), goals = useGoalOptions(), {tasks, today, clock} = list, [all, setAll] = useState(false);
  const [now, setNow] = useState(() => Date.now()), [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  const open = useMemo(() => openTasks(tasks.data, today).filter(t => !t.parentId), [tasks.data, today]);
  const reminders = useMemo(() => tasks.loaded ? dueReminders(tasks.data, now, checklistZone(), {dismissed}) : [], [tasks.loaded, tasks.data, now, dismissed]);
  if (!tasks.loaded) return <p className="fine">Loading your tasks…</p>;
  return <div className="tasks-body">
    {reminders.length > 0 && <ul className="tasks-today-reminders" aria-label="Task reminders">{reminders.map(r => <li key={r.key}>
      <span><span aria-hidden="true">⏰ </span>Reminder · <span dir="auto">{r.task.title}</span>{r.task.time ? ` at ${formatClock(r.task.time)}` : ''}</span>
      <button type="button" className="text-link" onClick={() => list.toggle(r.task, true)}>Done</button>
      <button type="button" className="text-link" onClick={() => setDismissed(s => new Set(s).add(r.key))}>Dismiss</button></li>)}</ul>}
    {open.length ? <ul className="tasks-list" aria-label="Open tasks">{(all ? open : open.slice(0, SHOWN)).map(t => <TaskRow key={t.id} task={t} today={today} nowClock={clock} record={tasks.data} goal={t.goal ? goals.byKey.get(t.goal) : undefined}
      onToggle={done => list.toggle(t, done)} onRemove={() => list.remove(t)} />)}</ul> : <p className="fine">No open tasks. Add one below: a few words, a priority and, if it has one, a day.</p>}
    {open.length > SHOWN && <button type="button" className="text-link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${open.length}`}</button>}
    <TaskAddForm onAdd={list.add} goals={goals.open} today={today} />
    <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
    <p className="fine"><Link prefetch={false} className="text-link" href="/app/tasks">All tasks: projects, repeats and more →</Link></p>
  </div>;
}
export default TasksBody;
