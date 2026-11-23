'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {childrenOf, editTask, restoreTasks} from '../../lib/tasks/engine';
import {recordWords, repeatRecord} from '../../lib/tasks/repeat-record';
import {localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import './tasks-r6.css';

/**
 * Session AV lane 2 (r6-plan), in the task editor, its own chunk:
 * - "Do the subtasks in order" (LEDGER #393; OmniFocus's sequential action groups) on a task with subtasks: only the first
 *   open one is in Today, Upcoming, the matrix and the plans; the next comes forward when it is done. Acts at once, with Undo.
 * - The repeat's record (LEDGER #396; Capacities' "Avg. interval"): how often it was done in the last 3 months, how many by its
 *   day and after it, and the average days between finishes beside the rule. Facts only, never "behind".
 * `onWrote` gives the editor the task's new change time, so it does not read its own write as another tab's.
 */
export default function TaskR6Parts({task, today, onWrote}: {task: Task; today: string; onWrote: (updatedAt: string | undefined) => void}) {
  const tasks = useDeviceRecord(TASKS);
  if (!tasks.loaded || tasks.unreadable) return null;
  const now = tasks.data.tasks.find(t => t.id === task.id) ?? task, steps = childrenOf(tasks.data, task.id).filter(t => !t.doneAt);
  const record = now.recur ? repeatRecord(now, today, iso => localDate(new Date(iso))) : null;
  if (!record && steps.length < 2 && !now.inOrder) return null;
  const toggle = (on: boolean) => {
    const before = tasks.data.tasks.filter(t => t.id === task.id);
    try {
      const next = tasks.update((r: Tasks) => editTask(r, task.id, {inOrder: on ? true : null}, today, {allowPast: true}));
      showUndo({message: on ? `The subtasks of “${task.title}” are done in order: one at a time, from the top.` : `Every subtask of “${task.title}” is available again.`, undone: 'As it was.', restore: () => tasks.update(r => restoreTasks(r, before))});
      onWrote(next.tasks.find(t => t.id === task.id)?.updatedAt);
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  return <div className="task-r6">
    {(steps.length >= 2 || now.inOrder) && <label className="tasks-r6-check"><input type="checkbox" checked={!!now.inOrder} onChange={e => toggle(e.target.checked)} /> <span>Do the subtasks in order, one at a time</span></label>}
    {record && <p role="note"><strong>This repeat’s record</strong> <small>(since {formatDate(record.from, {year: false})})</small>: {recordWords(record)}</p>}
  </div>;
}
