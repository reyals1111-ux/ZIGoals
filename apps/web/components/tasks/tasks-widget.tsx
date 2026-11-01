'use client';
import Link from 'next/link';
import {useId, useMemo} from 'react';
import {tasksOnDay} from '../../lib/tasks/engine';
import {deviceDay} from '../../lib/tasks/device';
import {formatNumber} from '../../lib/visual-format';
import {TaskAddForm, TaskStatusLine, dueText, PRIORITY_WORDS} from './task-parts';
import {useTaskList} from './use-task-list';
import './tasks.css';

/**
 * Session AK (T1), exported for NOVA (lane NA): today's tasks as a widget — the overdue ones carried to today and the
 * ones due today, tick each (with Undo), and a quick add for today. `size` 's' shows three and no add form, 'm' five,
 * 'l' all. An empty list teaches; a record that cannot be read says so and is never written over. Device-only.
 */
export type TasksWidgetProps = {size?: 's' | 'm' | 'l'};
const SHOWN = {s: 3, m: 5, l: 50} as const;
export function TasksWidget({size = 'm'}: TasksWidgetProps) {
  const id = useId(), list = useTaskList(), {tasks, today} = list;
  const due = useMemo(() => tasksOnDay(tasks.data, today, today, deviceDay), [tasks.data, today]);
  const open = due.filter(t => !t.doneAt), shown = due.slice(0, SHOWN[size]);
  return <section className="tasks-widget" data-size={size} aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} className="tasks-widget-title">Today’s tasks {tasks.loaded && !tasks.unreadable && <small>{open.length ? `${formatNumber(open.length)} to do` : 'all clear'}</small>}</h3>
    {!tasks.loaded ? <p className="fine">Loading your tasks…</p> : tasks.unreadable ? <p className="fine">Your tasks on this device could not be read.</p> : <>
      {shown.length ? <ul className="tasks-list" aria-label="Today’s tasks">{shown.map(t => <li key={t.id} className={`task task-priority-${t.priority}`} data-done={t.doneAt ? true : undefined}>
        <label className="task-done"><input type="checkbox" checked={!!t.doneAt} onChange={e => list.toggle(t, e.target.checked)} /><span className="sr-only">{t.doneAt ? `Mark “${t.title}” not done` : `Mark “${t.title}” done`}</span></label>
        <span className="task-title">{t.title}</span>
        <span className="task-meta">{t.priority !== 'normal' && <span className={`task-chip task-chip-${t.priority}`}>{PRIORITY_WORDS[t.priority]}</span>}<span>{t.doneAt ? 'Done' : dueText(t, today)}</span></span>
      </li>)}</ul> : <p className="fine">Nothing due today. Add a task with today’s date, or give a goal its next action.</p>}
      {due.length > shown.length && <p className="fine">And {formatNumber(due.length - shown.length)} more on the Tasks page.</p>}
      {size !== 's' && <TaskAddForm compact onAdd={list.add} goals={[]} today={today} fixedDue={today} label="Add a task for today" submit="Add" />}
      <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
    </>}
    <Link prefetch={false} className="text-link tasks-widget-link" href="/app/tasks">All tasks →</Link>
  </section>;
}
export default TasksWidget;
