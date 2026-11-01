'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useMemo, useRef, useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {EmptyState} from '../ui/empty-state';
import {LoadBoundary} from '../load-boundary';
import {ZgSkeleton} from '../skeleton/zg-skeleton';
import {TasksGlyph} from './tasks-glyph';
import {TaskAddForm, TaskRow, TaskStatusLine} from './task-parts';
import {useTaskList} from './use-task-list';
import {useGoalOptions} from './use-goal-options';
import {doneTasks, openTasks, taskCounts, taskState, type TaskState} from '../../lib/tasks/engine';
import type {Task} from '../../lib/tasks/schema';
import {isShowcase} from '../../lib/showcase';
import {formatNumber} from '../../lib/visual-format';
import './tasks.css';

/**
 * /app/tasks (Session AK, T1): every task in one place — add one with a priority, a day, a time and the goal it serves;
 * tick it, edit it or remove it (each with Undo); start a Pomodoro on it (Focus Sessions, loaded on use). Grouped as
 * overdue, today, the next 7 days, later and someday, with the last 30 days' finished ones folded away. The Checklist
 * is a separate thing and is not changed here. Everything stays on this device (`zigoals:tasks:v1`).
 */
const PomodoroPanel = lazy(() => import('../focus/pomodoro-panel'));
const GROUPS: {state: TaskState; title: string}[] = [{state: 'overdue', title: 'Overdue'}, {state: 'today', title: 'Today'}, {state: 'soon', title: 'Next 7 days'}, {state: 'later', title: 'Later'}, {state: 'someday', title: 'Someday'}];
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;

export function TasksPage() {
  const list = useTaskList(), goals = useGoalOptions(), {tasks, today} = list;
  const [focus, setFocus] = useState<Task | null>(null), [showcase, setShowcase] = useState(false);
  const focusBox = useRef<HTMLDivElement>(null), asked = useRef(false);
  const open = useMemo(() => openTasks(tasks.data, today), [tasks.data, today]);
  const done = useMemo(() => doneTasks(tasks.data), [tasks.data]);
  const counts = useMemo(() => taskCounts(tasks.data, today), [tasks.data, today]);
  useEffect(() => { if (tasks.loaded) queueMicrotask(() => setShowcase(isShowcase())); }, [tasks.loaded]);
  // "?focus=<id>" (the Agenda's Focus link) opens the Pomodoro for that task once the tasks are read.
  useEffect(() => {
    if (!tasks.loaded || asked.current) return;
    asked.current = true;
    const id = new URLSearchParams(window.location.search).get('focus');
    const task = id ? tasks.data.tasks.find(t => t.id === id && !t.doneAt) : undefined;
    if (task) queueMicrotask(() => setFocus(task));
  }, [tasks.loaded, tasks.data.tasks]);
  useEffect(() => { if (focus) focusBox.current?.scrollIntoView({block: 'nearest'}); }, [focus]);
  const row = (t: Task) => <TaskRow key={t.id} task={t} today={today} goal={t.goal ? goals.byKey.get(t.goal) : undefined} goals={goals.open}
    onToggle={d => list.toggle(t, d)} onRemove={() => list.remove(t)} onEdit={patch => list.edit(t, patch)} onFocus={() => setFocus(t)} />;

  return <div className="tasks-page" data-tasks={tasks.loaded ? 'ready' : 'loading'}>
    <PageHeader className="page-heading tasks-hero" titleId="tasks-title" eyebrow="Tasks" title="One list for the things to do"
      lede="Simple tasks and the next actions of your goals, each with a priority and, if it has one, a day and a time. Tasks with a day show on your Agenda among your habits. Everything stays on this device."
      actions={<p className="tasks-links"><Link className="text-link" href="/app/agenda">Your agenda →</Link></p>}
      art={<OrbitArt glyph={TasksGlyph} tone="goals" spin={-26} />} />
    {!tasks.loaded ? <ZgSkeleton label="Opening your tasks…" className="tasks-skeleton" block lines={3} /> : <>
      {showcase && <p className="fine tasks-showcase" role="note">Showcase · fictional. These example tasks are not yours.</p>}
      {tasks.unreadable && <p className="notice" role="status">Your tasks on this device could not be read, so they are not shown and nothing will be written over them.</p>}
      {focus && <div ref={focusBox} className="tasks-focus"><LoadBoundary quiet><Suspense fallback={<p className="fine">Opening Focus Sessions…</p>}><PomodoroPanel task={{id: focus.id, title: focus.title}} goalId={focus.goal?.startsWith('private:') ? focus.goal.slice(8) : undefined} onClose={() => setFocus(null)} /></Suspense></LoadBoundary></div>}
      <section className="panel tasks-add-panel" aria-labelledby="tasks-add-title">
        <h2 id="tasks-add-title">Add a task</h2>
        <TaskAddForm onAdd={list.add} goals={goals.open} today={today} />
        <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
      </section>
      {!tasks.unreadable && (open.length === 0 ? <div className="pillar-art-host"><EmptyState title={done.length ? 'Nothing left to do' : 'Your list starts here'} level={2}>
        {done.length ? 'Every task is done. Add the next one above when it comes.' : 'Add a few words above: “Call the dentist”, with a day if it has one. Link it to a goal to make it that goal’s next action; give it a time to see it among your habits on the Agenda; tap Focus to work on it in a Pomodoro.'}
      </EmptyState></div> : <section className="panel tasks-groups" aria-labelledby="tasks-open-title">
        <h2 id="tasks-open-title">Open <small>{plural(counts.open, 'task')}{counts.overdue ? ` · ${formatNumber(counts.overdue)} overdue` : ''}</small></h2>
        {GROUPS.map(g => { const items = open.filter(t => taskState(t, today) === g.state); return items.length ? <div key={g.state} className="tasks-group" data-state={g.state}>
          <h3>{g.title} <small>{formatNumber(items.length)}</small></h3>
          <ul className="tasks-list" aria-label={`${g.title} tasks`}>{items.map(row)}</ul>
        </div> : null; })}
      </section>)}
      {done.length > 0 && <details className="panel tasks-done"><summary>Done in the last 30 days <small>{formatNumber(done.length)}</small></summary>
        <ul className="tasks-list" aria-label="Done tasks">{done.map(row)}</ul>
        <p className="fine">Finished tasks are kept 30 days, then they leave this list.</p>
      </details>}
      <p className="fine tasks-fine">The Checklist on Today stays as it is: tasks are one-off things to do; the Checklist is your daily path. Focus starts a Pomodoro in Focus Sessions; a finished run can tick the task for you, with Undo.</p>
    </>}
  </div>;
}
export default TasksPage;
