'use client';
import Link from 'next/link';
import {Suspense, lazy, useMemo, useState} from 'react';
import {finishGoalTasks, goalKeyOf, goalNextActions, nextActionsSummary, unlinkGoalTasks} from '../../lib/tasks/engine';
import type {Task} from '../../lib/tasks/schema';
import {LoadBoundary} from '../load-boundary';
import {TaskAddForm, TaskRow, TaskStatusLine} from './task-parts';
import {useTaskList} from './use-task-list';
import './tasks.css';

/**
 * Session AK (T1): a goal's next actions on its page — its open tasks (tick with Undo, edit, Focus), and a quick add
 * that links the new task to this goal. One lazy mount in components/platform/tracked-detail.tsx. Device-only.
 */
const PomodoroPanel = lazy(() => import('../focus/pomodoro-panel'));
export default function GoalNextActions({goalId, goalName, writable = true}: {goalId: string; goalName: string; writable?: boolean}) {
  const list = useTaskList(), {tasks, today} = list, [focus, setFocus] = useState<Task | null>(null), [kept, setKept] = useState(false);
  const actions = useMemo(() => goalNextActions(tasks.data, goalId, today), [tasks.data, goalId, today]);
  if (!tasks.loaded) return <p className="fine">Loading next actions…</p>;
  if (tasks.unreadable) return <p className="fine">Your tasks on this device could not be read, so next actions are not shown.</p>;
  return <div className="goal-next-actions">
    {actions.length > 0 && <p className="fine goal-next-summary">{nextActionsSummary(tasks.data, goalId, today)}</p>}
    {/* Session AL (P-LS-43, LS-035): a closed goal offers what to do with the tasks still linked to it; each choice has Undo. */}
    {!writable && actions.length > 0 && !kept && <div className="goal-close-tasks" role="group" aria-label="Tasks of this closed goal">
      <p>This goal is closed. {actions.length === 1 ? '1 open task still serves it.' : `${actions.length} open tasks still serve it.`} What should happen to {actions.length === 1 ? 'it' : 'them'}?</p>
      <div className="goal-close-actions">
        <button type="button" className="secondary" onClick={() => setKept(true)}>Keep {actions.length === 1 ? 'it' : 'them'} linked</button>
        <button type="button" className="secondary" onClick={() => list.change(r => unlinkGoalTasks(r, goalId), actions.length === 1 ? `Unlinked “${actions[0]!.title}” from this goal. It stays in Tasks.` : `Unlinked ${actions.length} tasks from this goal. They stay in Tasks.`, 'Linked to this goal again.')}>Unlink from this goal</button>
        <button type="button" className="secondary" onClick={() => list.change(r => finishGoalTasks(r, goalId), actions.length === 1 ? `Done: “${actions[0]!.title}”.` : `Marked ${actions.length} tasks done.`, actions.length === 1 ? `“${actions[0]!.title}” is open again.` : `${actions.length} tasks are open again.`)}>Mark {actions.length === 1 ? 'it' : 'them'} done</button>
      </div>
    </div>}
    {actions.length ? <ul className="tasks-list" aria-label={`Next actions for ${goalName}`}>{actions.map(t => <TaskRow key={t.id} task={t} today={today} nowClock={list.clock} record={tasks.data} showGoal={false}
      onToggle={d => list.toggle(t, d)} onEdit={patch => list.edit(t, patch)} onFocus={() => setFocus(t)} onRemove={() => list.remove(t)} />)}</ul>
      : <p className="fine">No next action yet. What is the one small step that moves “{goalName}” forward? Add it below; it shows on your Agenda on its day.</p>}
    {focus && <LoadBoundary quiet><Suspense fallback={<p className="fine">Opening Focus Sessions…</p>}><PomodoroPanel task={{id: focus.id, title: focus.title}} goalId={goalId} onClose={() => setFocus(null)} /></Suspense></LoadBoundary>}
    {writable && <TaskAddForm onAdd={list.add} goals={[]} today={today} fixedGoal={goalKeyOf(goalId)} label={`Add a next action for ${goalName}`} submit="Add next action" />}
    <TaskStatusLine status={list.status} error={list.error} onUndo={list.runUndo} />
    <p className="fine"><Link prefetch={false} className="text-link" href="/app/tasks">All tasks →</Link></p>
  </div>;
}
