import {tasksSchema, type Tasks} from './schema';
import {taskPlanSchema, type TaskPlan} from './plan-record';

/**
 * Session AV lane 2 (r5-plan, LEDGER #352; Akiflow's past occurrences): one earlier finish of a repeating task, opened from
 * Completed, can be taken back (it was ticked by mistake) or moved to the day it was really done. Only that finish in the
 * task's `completions` changes; the task's next day, its repeat and every other finish stay as they are. Normal writes;
 * nothing new is stored. Pure.
 *
 * The planning record's `doneLog` (finishes per day past the 30 days, lib/tasks/plan-record.ts) has already counted the
 * days up to its `through`; `moveInDoneLog` moves that count with the finish, so the daily goal's streak agrees.
 */
export const OCCURRENCE_FUTURE_MESSAGE = 'Choose the day it was done: today or an earlier day.';
const finishOf = (record: Tasks, id: string, at: string) => {
  const task = record.tasks.find(t => t.id === id);
  if (!task) throw new Error('That task is no longer on this device.');
  const hit = task.completions?.find(c => c.at === at && c.at !== task.doneAt);
  if (!hit) throw new Error('That finish is no longer on this task.');
  return task;
};
/** Takes back one earlier finish ("It was not done"). */
export function takeBackFinish(record: Tasks, id: string, at: string, now = new Date()): Tasks {
  finishOf(record, id, at);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => {
    if (t.id !== id) return t;
    const completions = (t.completions ?? []).filter(c => c.at !== at), out: Record<string, unknown> = {...t, updatedAt: now.toISOString()};
    if (completions.length) out.completions = completions; else delete out.completions;
    return out;
  })});
}
/**
 * Moves one earlier finish to `day` (the device's own day), at midday that day so its local day is the one chosen. `toIso`
 * turns the day into the stored instant (the page passes the device's own clock; the default reads `day` as local noon).
 */
export function moveFinish(record: Tasks, id: string, at: string, day: string, today: string, {now = new Date(), toIso = (d: string) => new Date(`${d}T12:00:00`).toISOString()}: {now?: Date; toIso?: (day: string) => string} = {}): Tasks {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Choose a day.');
  if (day > today) throw new Error(OCCURRENCE_FUTURE_MESSAGE);
  finishOf(record, id, at);
  const iso = toIso(day);
  return tasksSchema.parse({...record, tasks: record.tasks.map(t => t.id !== id ? t : {...t, updatedAt: now.toISOString(),
    completions: (t.completions ?? []).map(c => c.at === at ? {...c, at: iso} : c).sort((a, b) => a.at.localeCompare(b.at))})});
}
/** The finishes-per-day log after a finish left `from` (and, unless taken back, arrived on `to`). Days after `through` are live. */
export function moveInDoneLog(plan: TaskPlan, from: string, to: string | null): TaskPlan {
  const through = plan.doneLog?.through;
  if (!through || !plan.doneLog) return plan;
  const days = {...plan.doneLog.days};
  let changed = false;
  if (from <= through && (days[from] ?? 0) > 0) { days[from] = days[from]! - 1; if (!days[from]) delete days[from]; changed = true; }
  if (to && to <= through) { days[to] = (days[to] ?? 0) + 1; changed = true; }
  return changed ? taskPlanSchema.parse({...plan, doneLog: {...plan.doneLog, days}}) : plan;
}
/** Review B5L-7: the inverse of `moveInDoneLog` (the count goes back to `from`, off `to`), on the latest planning record. */
export function unmoveInDoneLog(plan: TaskPlan, from: string, to: string | null): TaskPlan {
  const through = plan.doneLog?.through;
  if (!through || !plan.doneLog) return plan;
  const days = {...plan.doneLog.days};
  if (to && to <= through && (days[to] ?? 0) > 0) { days[to] = days[to]! - 1; if (!days[to]) delete days[to]; }
  if (from <= through) days[from] = (days[from] ?? 0) + 1;
  return taskPlanSchema.parse({...plan, doneLog: {...plan.doneLog, days}});
}
