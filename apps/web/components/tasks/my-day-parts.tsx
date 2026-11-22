'use client';
import {useCallback, useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import {carriedPicks, pickForToday, picksToday, readMyDay} from '../../lib/tasks/my-day';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatDate} from '../../lib/visual-format';
import {addLocalDays} from '../../lib/local-date';
import './tasks-r2.css';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day): picking tasks into today's My Day (Plan my day, the
 * task editor). A pick is written to the planning record (`zigoals:task-plan:v1`, `myDay`) and the toast carries Undo; the
 * task's own day and deadline are never touched. In the Plan my day and editor chunks.
 */
export function useMyDay(today: string) {
  const plan = useDeviceRecord(TASK_PLAN), myDay = useMemo(() => readMyDay(plan.data.myDay), [plan.data.myDay]);
  const picked = useMemo(() => new Set(picksToday(myDay, today)), [myDay, today]);
  const pick = useCallback((tasks: readonly Pick<Task, 'id' | 'title'>[], on: boolean): boolean => {
    if (!tasks.length) return false;
    if (plan.unreadable) { showStatus('Your planning choices could not be read on this device, so nothing was written over them.', {tone: 'error'}); return false; }
    const ids = tasks.map(t => t.id), what = tasks.length === 1 ? `“${tasks[0]!.title}”` : `${tasks.length} tasks`;
    try {
      plan.update(p => pickForToday(p, ids, today, on));
      showUndo({message: on ? `${what} ${tasks.length === 1 ? 'is' : 'are'} in My Day for today; ${tasks.length === 1 ? 'its' : 'their'} own day stays.` : `${what} left My Day.`, undone: on ? 'Taken out of My Day.' : 'Back in My Day.',
        undoLabel: on ? `Undo: take ${what} out of My Day` : `Undo: put ${what} back in My Day`, restore: () => { plan.update(p => pickForToday(p, ids, today, !on)); }});
      return true;
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return false; }
  }, [plan, today]);
  return {myDay, picked, pick, loaded: plan.loaded};
}
/** "From yesterday" (or "From Friday"): the last day's picks that are still open and not picked today. */
export function useCarried(record: Tasks, today: string, myDay: ReturnType<typeof useMyDay>['myDay']) {
  return useMemo(() => {
    const open = new Map(record.tasks.filter(t => !t.doneAt).map(t => [t.id, t]));
    const carried = carriedPicks(myDay, today, id => open.has(id));
    if (!carried) return null;
    const when = carried.day === addLocalDays(today, -1) ? 'yesterday' : formatDate(carried.day, {weekday: true, year: false});
    return {when, tasks: carried.ids.map(id => open.get(id)!)};
  }, [record, today, myDay]);
}
/** The editor's button: in or out of today's My Day, at once (with Undo). */
export default function MyDayButton({task, today}: {task: Task; today: string}) {
  const {picked, pick, loaded} = useMyDay(today);
  if (task.doneAt || !loaded) return null;
  const on = picked.has(task.id);
  return <p className="task-editor-myday"><button type="button" className="secondary" onClick={() => pick([task], !on)}>{on ? 'Take out of My Day' : 'Add to My Day'}</button>
    <small className="tasks-field-note">{on ? 'Shown in Today for today only; its own day stays.' : 'Shows it in Today for today only, without moving its day. My Day starts empty each morning.'}</small></p>;
}
