'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {openTasks} from '../../lib/tasks/engine';
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
 */
export function TasksBody() {
  const list = useTaskList(), goals = useGoalOptions(), {tasks, today} = list, [all, setAll] = useState(false);
  const open = useMemo(() => openTasks(tasks.data, today), [tasks.data, today]);
  if (!tasks.loaded) return <p className="fine">Loading your tasks…</p>;
  return <div className="tasks-body">
    {open.length ? <ul className="tasks-list" aria-label="Open tasks">{(all ? open : open.slice(0, SHOWN)).map(t => <TaskRow key={t.id} task={t} today={today} goal={t.goal ? goals.byKey.get(t.goal) : undefined}
      onToggle={done => list.toggle(t, done)} onRemove={() => list.remove(t)} />)}</ul> : <p className="fine">No open tasks. Add one below: a few words, a priority and, if it has one, a day.</p>}
    {open.length > SHOWN && <button type="button" className="text-link" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${open.length}`}</button>}
    <TaskAddForm onAdd={list.add} goals={goals.open} today={today} />
    <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
    <p className="fine"><Link prefetch={false} className="text-link" href="/app/tasks">All tasks, with goals and Focus →</Link></p>
  </div>;
}
export default TasksBody;
