import {MAX_TASK_VERSIONS, MAX_TASK_VERSION_CHARS, TASK_VERSIONS_PER_TASK, taskPlanSchema, type TaskPlan, type TaskVersion} from './plan-record';
import type {Task} from './schema';

/**
 * Session AV lane 2 (rest, LEDGER #33; Notion's version history, for a task as the notes and journal have it): each save
 * that changes a task's title or notes keeps what it replaced as an earlier version, in this device's planning record
 * (`zigoals:task-plan:v1` → `versions`, newest last; never synced): at most 10 per task, 300 in all and 200,000
 * characters together (the oldest go first), none for a task that is gone. A version already holding the same words is
 * not doubled. A version can be read, restored (through the task's own Save, which keeps the words it replaces), deleted,
 * or all of a task's earlier versions deleted. Pure.
 */
export const newTaskVersionId = () => `tv-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`;
export function capTaskVersions(versions: readonly TaskVersion[], taskIds?: ReadonlySet<string>): TaskVersion[] {
  const per = new Map<string, number>(), kept: TaskVersion[] = [];
  let chars = 0;
  for (const v of [...versions].reverse()) {
    if (taskIds && !taskIds.has(v.taskId)) continue;
    const n = per.get(v.taskId) ?? 0, size = v.title.length + (v.notes ?? '').length;
    if (n >= TASK_VERSIONS_PER_TASK || kept.length >= MAX_TASK_VERSIONS || chars + size > MAX_TASK_VERSION_CHARS) continue;
    per.set(v.taskId, n + 1); chars += size; kept.push(v);
  }
  return kept.reverse();
}
/** A task's earlier versions, newest first. */
export const taskVersionsOf = (plan: Pick<TaskPlan, 'versions'>, taskId: string) => [...(plan.versions ?? [])].filter(v => v.taskId === taskId).reverse();
const words = (t: Pick<Task, 'title' | 'notes'>) => `${t.title}\u0000${t.notes ?? ''}`;
/**
 * Keeps `before`'s title and notes as a version when `after` changed them. `liveIds` (the task list's ids) drops the
 * versions of tasks that are gone.
 */
export function keepTaskVersion(plan: TaskPlan, before: Pick<Task, 'id' | 'title' | 'notes' | 'createdAt' | 'updatedAt'>, after: Pick<Task, 'title' | 'notes'>, {id = newTaskVersionId(), liveIds}: {id?: string; liveIds?: ReadonlySet<string>} = {}): TaskPlan {
  if (words(before) === words(after)) return plan;
  if ((plan.versions ?? []).some(v => v.taskId === before.id && words(v) === words(before))) return liveIds ? taskPlanSchema.parse({...plan, versions: capTaskVersions(plan.versions ?? [], liveIds)}) : plan;
  const version: TaskVersion = {id, taskId: before.id, title: before.title, ...(before.notes ? {notes: before.notes} : {}), savedAt: before.updatedAt ?? before.createdAt};
  return taskPlanSchema.parse({...plan, versions: capTaskVersions([...(plan.versions ?? []), version], liveIds)});
}
/** Deletes one version; returns where it was, for Undo. */
export function deleteTaskVersion(plan: TaskPlan, versionId: string): {plan: TaskPlan; removed: TaskVersion | null; at: number} {
  const at = (plan.versions ?? []).findIndex(v => v.id === versionId);
  if (at < 0) return {plan, removed: null, at};
  return {plan: taskPlanSchema.parse({...plan, versions: (plan.versions ?? []).filter(v => v.id !== versionId)}), removed: plan.versions![at]!, at};
}
/** Deletes every earlier version of one task; returns them, for Undo. */
export function deleteTaskVersions(plan: TaskPlan, taskId: string): {plan: TaskPlan; removed: TaskVersion[]} {
  const removed = (plan.versions ?? []).filter(v => v.taskId === taskId);
  return {plan: removed.length ? taskPlanSchema.parse({...plan, versions: (plan.versions ?? []).filter(v => v.taskId !== taskId)}) : plan, removed};
}
/** Undo of a deletion: the versions back in their order (by saved time), within the caps. */
export function putBackTaskVersions(plan: TaskPlan, versions: readonly TaskVersion[]): TaskPlan {
  const have = new Set((plan.versions ?? []).map(v => v.id)), merged = [...(plan.versions ?? []), ...versions.filter(v => !have.has(v.id))].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  return taskPlanSchema.parse({...plan, versions: capTaskVersions(merged)});
}
