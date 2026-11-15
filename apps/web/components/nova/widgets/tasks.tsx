'use client';
import {useMemo} from 'react';
import {deviceDay} from '../../../lib/tasks/device';
import {tasksHeadline, tasksWidgetView} from '../../../lib/nova/widgets/tasks';
import type {WidgetSize} from '../../../lib/nova/store';
import {TaskAddForm, TaskRow, TaskStatusLine} from '../../tasks/task-parts';
import {useGoalOptions} from '../../tasks/use-goal-options';
import {useTaskList} from '../../tasks/use-task-list';
import {moreWords} from '../../../lib/nova/cards/whole-rows';
import {WholeRows, WholeRowsGroup} from '../cards/whole-rows';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';
import '../../tasks/tasks.css';

/**
 * "Tasks" (Session AK T1/N2; lane WA): today's tasks as the Agenda's day view has them (overdue ones carried to today),
 * then the next actions of the person's goals, each ticked here with Undo (the Tasks page's own rows and status line,
 * components/tasks), and on Medium and Large a quick add for today. A fresh start teaches; an unreadable record says so
 * and is never written over. Everything stays on this device. The Checklist is not touched.
 * Session AM-2 (whole rows only): on the Holo stage the lists show the rows that fit their panel and then "+N more on the
 * Tasks page" (cards/whole-rows.tsx; today's list keeps its rows longest, the goals' next actions give theirs up first and,
 * beside today's list in a medium panel, leave whole). The add form and its status line are the panel's foot. The compact
 * holographic layout is CSS (widgets.css, scoped to `.nova-widget[data-holo] .tasks-widget`): the rows themselves are the
 * Tasks page's own.
 */
export default function TasksWidget({size}: {size: WidgetSize}) {
  const list = useTaskList(), goals = useGoalOptions(), {tasks, today} = list;
  const view = useMemo(() => tasksWidgetView(tasks.data, today, deviceDay, size), [tasks.data, today, size]);
  if (!tasks.loaded) return <NovaReading/>;
  if (tasks.unreadable) return <NovaUnread what="Your tasks"/>;
  const add = size !== 'S' && <TaskAddForm compact onAdd={list.add} goals={[]} today={today} fixedDue={today} label="Add a task for today" submit="Add"/>;
  const status = <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo}/>;
  const row = (t: (typeof view.today)[number]) => <TaskRow key={t.id} task={t} today={today} goal={t.goal ? goals.byKey.get(t.goal) : undefined} onToggle={done => list.toggle(t, done)}/>;
  const more = (hidden: number, shown: number) => moreWords(hidden, {shown, ...(size === 'S' ? {} : {where: 'the Tasks page'})});
  // Session AK lane P7 (EX3-2): one tree for the empty start and the list, so the add form and its status line stay the
  // same elements when the first task arrives (a remounted form dropped the focus to the page, and NOVA's single-key
  // shortcuts then took the next letter typed).
  return <div className="tasks-widget" data-size={size} data-state={view.state}>
    {view.state === 'empty'
      ? <NovaEmpty pillar="goals" ghost="rows">Your list starts here. {size === 'S' ? 'Add a task for today, or give a goal its next action.' : 'Add one for today below, or give a goal its next action on its page.'}</NovaEmpty>
      : <>
        <p className="nova-line tasks-headline">{tasksHeadline(view)}</p>
        <WholeRowsGroup className="tasks-lists" limit>
          {view.today.length > 0 && <WholeRows wrapClassName="tasks-today" className="tasks-list" aria-label="Today’s tasks" extra={view.moreToday} min={1} more={more}>{view.today.map(row)}</WholeRows>}
          {view.next.length > 0 && <WholeRows wrapClassName="tasks-next" className="tasks-list" aria-label="Next actions for your goals" head={<p className="nova-eyebrow">Next for your goals</p>}
            min={size === 'M' && view.today.length > 0 ? 0 : 1} collapse={size === 'M' && view.today.length > 0} more={more}>{view.next.map(row)}</WholeRows>}
        </WholeRowsGroup>
      </>}
    <div className="tasks-foot">{add}{status}</div>
  </div>;
}
