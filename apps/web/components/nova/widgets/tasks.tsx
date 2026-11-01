'use client';
import {useMemo} from 'react';
import {deviceDay} from '../../../lib/tasks/device';
import {tasksHeadline, tasksWidgetView} from '../../../lib/nova/widgets/tasks';
import type {WidgetSize} from '../../../lib/nova/store';
import {TaskAddForm, TaskRow, TaskStatusLine} from '../../tasks/task-parts';
import {useGoalOptions} from '../../tasks/use-goal-options';
import {useTaskList} from '../../tasks/use-task-list';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';
import '../../tasks/tasks.css';

/**
 * "Tasks" (Session AK T1/N2; lane WA): today's tasks as the Agenda's day view has them (overdue ones carried to today),
 * then the next actions of the person's goals, each ticked here with Undo (the Tasks page's own rows and status line,
 * components/tasks), and on Medium and Large a quick add for today. A fresh start teaches; an unreadable record says so
 * and is never written over. Everything stays on this device. The Checklist is not touched.
 */
export default function TasksWidget({size}: {size: WidgetSize}) {
  const list = useTaskList(), goals = useGoalOptions(), {tasks, today} = list;
  const view = useMemo(() => tasksWidgetView(tasks.data, today, deviceDay, size), [tasks.data, today, size]);
  if (!tasks.loaded) return <NovaReading/>;
  if (tasks.unreadable) return <NovaUnread what="Your tasks"/>;
  const add = size !== 'S' && <TaskAddForm compact onAdd={list.add} goals={[]} today={today} fixedDue={today} label="Add a task for today" submit="Add"/>;
  const status = <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo}/>;
  if (view.state === 'empty') return <div className="tasks-widget" data-size={size}>
    <NovaEmpty pillar="goals">Your list starts here. {size === 'S' ? 'Add a task for today, or give a goal its next action.' : 'Add one for today below, or give a goal its next action on its page.'}</NovaEmpty>
    {add}{status}
  </div>;
  const row = (t: (typeof view.today)[number]) => <TaskRow key={t.id} task={t} today={today} goal={t.goal ? goals.byKey.get(t.goal) : undefined} onToggle={done => list.toggle(t, done)}/>;
  return <div className="tasks-widget" data-size={size}>
    <p className="nova-line">{tasksHeadline(view)}</p>
    {view.today.length > 0 && <ul className="tasks-list" aria-label="Today’s tasks">{view.today.map(row)}</ul>}
    {view.moreToday > 0 && <p className="nova-line">And {view.moreToday} more on the Tasks page.</p>}
    {view.next.length > 0 && <>
      <p className="nova-eyebrow">Next for your goals</p>
      <ul className="tasks-list" aria-label="Next actions for your goals">{view.next.map(row)}</ul>
    </>}
    {add}{status}
  </div>;
}
