'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {openTasks, setAside} from '../../lib/tasks/engine';
import {useDeviceRecord} from '../ai/use-device-record';
import {FOCUS_VIEW, inFocus, liveFocus} from '../../lib/tasks/focus';
import {checklistZone} from '../../lib/checklist/zone';
import {TaskAddForm, TaskRow, TaskStatusLine} from './task-parts';
import {useTaskList} from './use-task-list';
import {ReminderRows} from './reminder-rows';
import {remindersDue, ringAhead, useRemindAgain, useWakeAt} from './use-remind-again';
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
  // Session AV lane 2 (r6-plan, LEDGER #392–#394): not a task of a project on hold or one waiting its turn; with a focus on, only its tasks and the Inbox's.
  const focusRead = useDeviceRecord(FOCUS_VIEW), focus = useMemo(() => liveFocus(focusRead.data, tasks.data), [focusRead.data, tasks.data]);
  const open = useMemo(() => openTasks(tasks.data, today).filter(t => !t.parentId && !setAside(tasks.data, t, today) && inFocus(t, focus, tasks.data)), [tasks.data, today, focus]);
  const again = useRemindAgain(); // Session AW (X1, LEDGER #438)
  const reminders = useMemo(() => tasks.loaded ? remindersDue(again, tasks.data, now, checklistZone(), dismissed) : [], [tasks.loaded, tasks.data, now, dismissed, again]);
  // Session AW (X1, LEDGER #438): the rows wake at the next ring (a first ring or a repeat), on its minute.
  const ringAt = useMemo(() => tasks.loaded ? ringAhead(again, tasks.data, now, checklistZone()) : null, [tasks.loaded, tasks.data, now, again]);
  useWakeAt(ringAt, setNow);
  if (!tasks.loaded) return <p className="fine">Loading your tasks…</p>;
  return <div className="tasks-body">
    {/* Session AV (1c, q1 #1): Done, Snooze (15 min, 1 h, tomorrow) and Dismiss. */}
    <ReminderRows reminders={reminders} className="tasks-today-reminders" label="Task reminders" change={list.change} onDone={t => list.toggle(t, true)} onDismiss={key => setDismissed(s => new Set(s).add(key))} />
    {open.length ? <ul className="tasks-list" aria-label="Open tasks">{(all ? open : open.slice(0, SHOWN)).map(t => <TaskRow key={t.id} task={t} today={today} nowClock={clock} record={tasks.data} goal={t.goal ? goals.byKey.get(t.goal) : undefined}
      onToggle={done => list.toggle(t, done)} onRemove={() => list.remove(t)} />)}</ul> : <p className="fine">No open tasks. Add one below: a few words, a priority and, if it has one, a day.</p>}
    {open.length > SHOWN && <button type="button" className="text-link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${open.length}`}</button>}
    <TaskAddForm onAdd={list.add} goals={goals.open} today={today} />
    <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
    <p className="fine"><Link prefetch={false} className="text-link" href="/app/tasks">All tasks: projects, repeats and more →</Link></p>
  </div>;
}
export default TasksBody;
