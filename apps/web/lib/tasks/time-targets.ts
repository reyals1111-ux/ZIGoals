import {addLocalDays, localWeekday} from '../local-date';
import type {FocusSessions} from '../focus-sessions/schema';
import {MAX_TARGET_MINUTES, MAX_TIME_TARGETS, taskPlanSchema, type TaskPlan, type TimeTarget} from './plan-record';
import type {Task, Tasks} from './schema';

/**
 * Session AW (X2, LEDGER #437; Amazing Marvin's time targets for a category or a label): "5 h a week on Writing". A target
 * in hours a week or a month for a project, an area or a label, kept in the planning record (`timeTargets`), and met from
 * the dated focus blocks (Focus Sessions, `zigoals:focus-sessions:v1`) of its tasks: a block's focused minutes count for
 * the task it was started on, and through the task for its project (a subtask's project is its parent's when it has none of
 * its own), the project's area and the task's labels. Shown as a bar in Tasks → This week ("3 h 10 of 5 h"), never a
 * warning, and a week with nothing yet is said so plainly. A task's timer adds to its total time (undated) and so does not
 * count here. Pure.
 */
export type TargetWindow = {from: string; to: string};
export const weekOf = (day: string): TargetWindow => { const from = addLocalDays(day, -((localWeekday(day) + 6) % 7)); return {from, to: addLocalDays(from, 6)}; };
export function monthOf(day: string): TargetWindow {
  const from = `${day.slice(0, 7)}-01`; let to = from;
  for (let d = from; d.slice(0, 7) === from.slice(0, 7); d = addLocalDays(d, 1)) to = d;
  return {from, to};
}
export const windowOf = (t: Pick<TimeTarget, 'per'>, day: string) => t.per === 'week' ? weekOf(day) : monthOf(day);

/** Whether a task counts for the target (directly, or a subtask through its parent's project). */
export function taskCounts(target: Pick<TimeTarget, 'kind' | 'of'>, task: Task, record: Pick<Tasks, 'tasks' | 'projects'>): boolean {
  if (target.kind === 'label') return (task.labels ?? []).includes(target.of);
  const projectId = task.projectId ?? (task.parentId ? record.tasks.find(t => t.id === task.parentId)?.projectId : undefined);
  if (!projectId) return false;
  if (target.kind === 'project') return projectId === target.of;
  return record.projects?.find(p => p.id === projectId)?.areaId === target.of;
}
export type TargetProgress = {target: TimeTarget; name: string | null; spent: number; window: TargetWindow; blocks: number};
/** The minutes of focus a target has had in its week or month (the one holding `today`). */
export function targetProgress(target: TimeTarget, record: Tasks, focus: FocusSessions | null | undefined, today: string): TargetProgress {
  const window = windowOf(target, today), byId = new Map(record.tasks.map(t => [t.id, t]));
  let seconds = 0, blocks = 0;
  for (const s of focus?.sessions ?? []) {
    if (!s.taskId || s.day < window.from || s.day > window.to) continue;
    const task = byId.get(s.taskId);
    if (task && taskCounts(target, task, record)) { seconds += s.focusedSeconds; blocks++; }
  }
  return {target, name: targetName(target, record), spent: Math.round(seconds / 60), window, blocks};
}
/** The target's name: the project's or area's name, or "@label"; null when its project or area is no longer here. */
export function targetName(target: Pick<TimeTarget, 'kind' | 'of'>, record: Pick<Tasks, 'projects' | 'areas'>): string | null {
  if (target.kind === 'label') return `@${target.of}`;
  if (target.kind === 'project') return record.projects?.find(p => p.id === target.of)?.name ?? null;
  return record.areas?.find(a => a.id === target.of)?.name ?? null;
}
/** "3 h 10", "45 min", "5 h": hours and minutes, the way the bar says them. */
export function hoursWords(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? `${h} h ${String(m).padStart(2, '0')}` : h ? `${h} h` : `${m} min`;
}
/** The bar's line: "3 h 10 of 5 h this week" (never "behind"; a target met says so). */
export function progressWords(p: Pick<TargetProgress, 'spent' | 'target'>): string {
  const per = p.target.per === 'week' ? 'this week' : 'this month';
  return p.spent >= p.target.minutes ? `${hoursWords(p.spent)} of ${hoursWords(p.target.minutes)} ${per}: reached` : p.spent ? `${hoursWords(p.spent)} of ${hoursWords(p.target.minutes)} ${per}` : `Nothing yet of ${hoursWords(p.target.minutes)} ${per}`;
}

/** Adds a target (or changes the hours of the one for the same project, area or label). */
export function setTimeTarget(plan: TaskPlan, input: {kind: TimeTarget['kind']; of: string; minutes: number; per: TimeTarget['per']}, id: string): TaskPlan {
  if (!Number.isInteger(input.minutes) || input.minutes < 1 || input.minutes > MAX_TARGET_MINUTES[input.per]) throw new Error(input.per === 'week' ? 'Choose between 1 minute and 168 hours a week.' : 'Choose between 1 minute and 744 hours a month.');
  const list = plan.timeTargets ?? [], same = list.find(t => t.kind === input.kind && t.of === input.of);
  if (!same && list.length >= MAX_TIME_TARGETS) throw new Error(`At most ${MAX_TIME_TARGETS} time targets. Remove one first.`);
  const next = same ? list.map(t => t === same ? {...t, minutes: input.minutes, per: input.per} : t) : [...list, {id, ...input}];
  const parsed = taskPlanSchema.parse({...plan, timeTargets: next});
  if ((parsed.timeTargets?.length ?? 0) !== next.length) throw new Error('That target could not be kept.');
  return parsed;
}
export function removeTimeTarget(plan: TaskPlan, id: string): TaskPlan {
  const next: Record<string, unknown> = {...plan}, list = (plan.timeTargets ?? []).filter(t => t.id !== id);
  if (list.length) next.timeTargets = list; else delete next.timeTargets;
  return taskPlanSchema.parse(next);
}
