import {prune, TASK_LIMIT_MESSAGE} from './engine';
import {MAX_TASKS, taskSchema, tasksSchema, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #261; Structured's copy day and clear day): "Copy this day to…" makes the day's tasks
 * again on another day — each a new task with the same time, minutes, priority, project, labels, notes, symbol and energy;
 * subtasks come along under their copied parent; a repeating task is copied once (no repeat), a finished one copied open.
 * "Clear this day" moves the day's open tasks to no day (their time and start-early go with the day; a reminder at its
 * own date and time stays); a repeating task keeps its day (a repeat needs one); nothing is deleted. Both are one change
 * the caller can undo. Pure.
 */
const KEEP = ['title', 'priority', 'level', 'time', 'minutes', 'projectId', 'sectionId', 'labels', 'notes', 'goal', 'habit', 'health', 'look', 'energy', 'parallel', 'fields'] as const;
export const COPY_MAX = 100;
/** The tasks a day holds for copying: due that day (top level, or a subtask whose parent is not due that day). */
export function dayTasks(record: Tasks, day: string): Task[] {
  const onDay = record.tasks.filter(t => t.due === day), ids = new Set(onDay.map(t => t.id));
  return onDay.filter(t => !t.parentId || !ids.has(t.parentId));
}
export function copyDay(record: Tasks, from: string, to: string, {today, at = new Date(), newId}: {today: string; at?: Date; newId: () => string}): {record: Tasks; copied: number; repeating: number} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Choose the day to copy to.');
  if (to === from) throw new Error('Choose another day than this one.');
  const roots = dayTasks(record, from);
  if (!roots.length) return {record, copied: 0, repeating: 0};
  const stamp = at.toISOString(), made: Task[] = [], map = new Map<string, string>();
  const copy = (t: Task, parentId: string | undefined, depth: number) => {
    if (made.length >= COPY_MAX || depth > 8) return;
    const id = newId(), fields: Record<string, unknown> = {id, createdAt: stamp, updatedAt: stamp};
    for (const k of KEEP) if (t[k] !== undefined) fields[k] = t[k];
    const due = !parentId || t.due === from ? to : t.due && t.due !== from ? t.due : undefined;
    if (due) fields.due = due; else delete fields.time;
    if (parentId) fields.parentId = parentId;
    if (t.reminders?.some(r => !r.at)) fields.reminders = t.reminders.filter(r => !r.at);
    map.set(t.id, id); made.push(taskSchema.parse(fields));
    for (const kid of record.tasks.filter(k => k.parentId === t.id)) copy(kid, id, depth + 1);
  };
  for (const t of roots) copy(t, undefined, 0);
  const kept = prune(record, today);
  if (kept.tasks.length + made.length > MAX_TASKS) throw new Error(TASK_LIMIT_MESSAGE);
  return {record: tasksSchema.parse({...kept, tasks: [...kept.tasks, ...made]}), copied: made.length, repeating: roots.filter(t => t.recur).length};
}
export function clearDay(record: Tasks, day: string, at = new Date()): {record: Tasks; cleared: number; repeating: number} {
  const open = record.tasks.filter(t => !t.doneAt && t.due === day), moving = new Set(open.filter(t => !t.recur).map(t => t.id)), stamp = at.toISOString();
  if (!moving.size) return {record, cleared: 0, repeating: open.length};
  const tasks = record.tasks.map(t => {
    if (!moving.has(t.id)) return t;
    const {due: _d, time: _t, early: _e, reminders, ...rest} = t; void _d; void _t; void _e;
    const own = (reminders ?? []).filter(r => r.at);
    return taskSchema.parse({...rest, ...(own.length ? {reminders: own} : {}), updatedAt: stamp});
  });
  return {record: tasksSchema.parse({...record, tasks}), cleared: moving.size, repeating: open.length - moving.size};
}
