'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {taskState, viewTasks} from '../../lib/tasks/engine';
import {dueReminders} from '../../lib/tasks/reminders';
import {checklistZone} from '../../lib/checklist/day';
import {formatClock, formatNumber} from '../../lib/visual-format';
import {useTaskList} from './use-task-list';
import './today-tasks-due.css';

/**
 * Session AL fourth pass (PR-103, C-LS-09): Tasks on Today, near the top, whatever For you shows. One line, "Tasks due
 * today: 2 · 1 overdue · Call mum 18:00", that opens Tasks' Today view, and the task reminders that have gone off while
 * the app is open, with Done and Dismiss (Tasks says reminders show "here and on Today"). Nothing shows on a day with no
 * task due and no reminder, so Today stays as it is. On this device only.
 */
export function TodayTasksDue() {
  const list = useTaskList(), {tasks, today, clock} = list;
  const [now, setNow] = useState(() => Date.now()), [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  const due = useMemo(() => tasks.loaded && !tasks.unreadable ? viewTasks(tasks.data, {kind: 'today'}, today, clock) : [], [tasks.loaded, tasks.unreadable, tasks.data, today, clock]);
  const reminders = useMemo(() => tasks.loaded && !tasks.unreadable ? dueReminders(tasks.data, now, checklistZone(), {dismissed}) : [], [tasks.loaded, tasks.unreadable, tasks.data, now, dismissed]);
  if (!tasks.loaded || tasks.unreadable || (!due.length && !reminders.length)) return null;
  const overdue = due.filter(t => taskState(t, today, clock) === 'overdue').length, first = due.find(t => taskState(t, today, clock) !== 'overdue') ?? due[0];
  return <section className="today-tasks-due" aria-label="Tasks due today">
    {reminders.length > 0 && <ul className="tasks-today-reminders" aria-label="Task reminders">{reminders.map(r => <li key={r.key}>
      <span><span aria-hidden="true">⏰ </span>Reminder · <span dir="auto">{r.task.title}</span>{r.task.time ? ` at ${formatClock(r.task.time)}` : ''}</span>
      <button type="button" className="text-link" onClick={() => list.toggle(r.task, true)}>Done</button>
      <button type="button" className="text-link" onClick={() => setDismissed(s => new Set(s).add(r.key))}>Dismiss</button></li>)}</ul>}
    {first && <p className="today-tasks-due-line"><Link className="text-link" href="/app/tasks?view=today">
      <strong>Tasks due today: {formatNumber(due.length)}</strong>{overdue ? ` · ${formatNumber(overdue)} overdue` : ''} · <span dir="auto">{first.title}</span>{first.time ? ` ${formatClock(first.time)}` : ''}{due.length > 1 ? ` and ${formatNumber(due.length - 1)} more` : ''} →</Link></p>}
    {list.error && <p role="alert">{list.error}</p>}
  </section>;
}
export default TodayTasksDue;
