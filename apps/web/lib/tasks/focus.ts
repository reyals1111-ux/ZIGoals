import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {TASK_PLAN_KEY} from './plan-key';
import type {Task, Tasks} from './schema';

/**
 * Session AV lane 2 (r6-plan, LEDGER #394; OmniFocus's Focus): the Tasks views narrowed to one or more projects or areas for a
 * while — kept as `focus` in the planning record (`zigoals:task-plan:v1`), read here without the planning schema so the Tasks
 * page's first chunk stays light. A task is in focus when its project is chosen, or its project sits in a chosen area. The
 * Inbox view and a project's own view are never narrowed. Pure.
 */
export const MAX_FOCUS = 20;
export type TaskFocus = {projects?: string[]; areas?: string[]};
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const ids = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ID.test(x)))].slice(0, MAX_FOCUS) : [];
/** A stored focus, or null when there is none (or it cannot be read: then nothing is narrowed). */
export function readFocus(v: unknown): TaskFocus | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as {projects?: unknown; areas?: unknown}, projects = ids(o.projects), areas = ids(o.areas);
  return projects.length || areas.length ? {...(projects.length ? {projects} : {}), ...(areas.length ? {areas} : {})} : null;
}
/** The planning record read for its focus only. */
export const FOCUS_VIEW: DeviceRecordSpec<TaskFocus | null> = {
  key: TASK_PLAN_KEY,
  schema: z.unknown().transform(v => v && typeof v === 'object' && (v as {version?: unknown}).version === 1 ? readFocus((v as {focus?: unknown}).focus) : null),
  empty: () => null,
};
/** The focus as it applies to this list: chosen projects and areas still on it (none left: no focus). */
export function liveFocus(focus: TaskFocus | null | undefined, record: Pick<Tasks, 'projects' | 'areas'>): TaskFocus | null {
  if (!focus) return null;
  const projects = (focus.projects ?? []).filter(id => record.projects?.some(p => p.id === id)), areas = (focus.areas ?? []).filter(id => record.areas?.some(a => a.id === id));
  return projects.length || areas.length ? {projects, areas} : null;
}
/** Whether a task is in focus (no focus: every task is). A task with no project is in the Inbox, never narrowed there. */
export function inFocus(task: Pick<Task, 'projectId'>, focus: TaskFocus | null, record: Pick<Tasks, 'projects'>): boolean {
  if (!focus) return true;
  if (!task.projectId) return false;
  if (focus.projects?.includes(task.projectId)) return true;
  const area = record.projects?.find(p => p.id === task.projectId)?.areaId;
  return !!area && !!focus.areas?.includes(area);
}
/** The record with only the tasks in focus (the same record when there is no focus). */
export const focusedRecord = <T extends Pick<Tasks, 'tasks' | 'projects'>>(record: T, focus: TaskFocus | null): T => focus ? {...record, tasks: record.tasks.filter(t => inFocus(t, focus, record))} : record;
/** "Work", "Work and Home", "Work and 2 more". */
export function focusName(focus: TaskFocus, record: Pick<Tasks, 'projects' | 'areas'>): string {
  const names = [...(focus.areas ?? []).map(id => record.areas?.find(a => a.id === id)?.name), ...(focus.projects ?? []).map(id => record.projects?.find(p => p.id === id)?.name)].filter((n): n is string => !!n);
  return names.length <= 2 ? names.join(' and ') : `${names[0]} and ${names.length - 1} more`;
}
