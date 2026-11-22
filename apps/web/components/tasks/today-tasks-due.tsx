'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {taskState, viewTasks} from '../../lib/tasks/engine';
import {useDeviceRecord} from '../ai/use-device-record';
import {FOCUS_VIEW, focusName, inFocus, liveFocus} from '../../lib/tasks/focus';
import {dueReminders} from '../../lib/tasks/reminders';
import {checklistZone} from '../../lib/checklist/zone';
import {formatClock, formatNumber} from '../../lib/visual-format';
import {useTaskList} from './use-task-list';
import {ReminderRows} from './reminder-rows';
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
  // Session AV lane 2 (r6-plan, LEDGER #394): with a focus on, only its tasks (said in the line; no Tab stop is added).
  const focusRead = useDeviceRecord(FOCUS_VIEW), focus = tasks.loaded && !tasks.unreadable ? liveFocus(focusRead.data, tasks.data) : null;
  const due = useMemo(() => tasks.loaded && !tasks.unreadable ? viewTasks(tasks.data, {kind: 'today'}, today, clock).filter(t => inFocus(t, focus, tasks.data)) : [], [tasks.loaded, tasks.unreadable, tasks.data, today, clock, focus]);
  const reminders = useMemo(() => tasks.loaded && !tasks.unreadable ? dueReminders(tasks.data, now, checklistZone(), {dismissed}) : [], [tasks.loaded, tasks.unreadable, tasks.data, now, dismissed]);
  if (!tasks.loaded || tasks.unreadable || (!due.length && !reminders.length)) return null;
  const overdue = due.filter(t => taskState(t, today, clock) === 'overdue').length, first = due.find(t => taskState(t, today, clock) !== 'overdue') ?? due[0];
  return <section className="today-tasks-due" aria-label="Tasks due today">
    {/* Session AV (1c, q1 #1): Done, Snooze (15 min, 1 h, tomorrow) and Dismiss. */}
    <ReminderRows reminders={reminders} className="tasks-today-reminders" label="Task reminders" change={list.change} onDone={t => list.toggle(t, true)} onDismiss={key => setDismissed(s => new Set(s).add(key))} fallback={() => document.querySelector<HTMLElement>('.today-tasks-due-line a')} />
    {/* Session AL (CI 1539, Today's phone height): the words sit in one span, so they flow as one sentence inside the 44 px
        link (two lines at 390 px) instead of each piece taking its own flex row (three). */}
    {first && <p className="today-tasks-due-line"><Link className="text-link" href="/app/tasks?view=today"><span>
      <strong>Tasks due today: {formatNumber(due.length)}</strong>{overdue ? ` · ${formatNumber(overdue)} overdue` : ''} · <span dir="auto">{first.title}</span>{first.time ? ` ${formatClock(first.time)}` : ''}{due.length > 1 ? ` and ${formatNumber(due.length - 1)} more` : ''} →{focus ? ` · focused on ${focusName(focus, tasks.data)}` : ''}</span></Link></p>}
    {list.error && <p role="alert">{list.error}</p>}
  </section>;
}
export default TodayTasksDue;
