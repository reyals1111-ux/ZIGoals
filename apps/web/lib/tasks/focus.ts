import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {TASK_PLAN_KEY} from './plan-key';
import type {Task, Tasks} from './schema';
import {setAside} from './engine';

/**
 * Session AV lane 2 (r6-plan, LEDGER #394; OmniFocus's Focus): the Tasks views narrowed to one or more projects or areas for a
 * while — kept as `focus` in the planning record (`zigoals:task-plan:v1`), read here without the planning schema so the Tasks
 * page's first chunk stays light. A task is in focus when its project is chosen, or its project sits in a chosen area; the
 * Inbox (a task with no project) is never hidden, and a project's own view is never narrowed. Pure.
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
/** Whether a task is in focus (no focus: every task is). A task with no project is in the Inbox, which is never hidden. */
export function inFocus(task: Pick<Task, 'projectId'>, focus: TaskFocus | null, record: Pick<Tasks, 'projects'>): boolean {
  if (!focus) return true;
  if (!task.projectId) return true;
  if (focus.projects?.includes(task.projectId)) return true;
  const area = record.projects?.find(p => p.id === task.projectId)?.areaId;
  return !!area && !!focus.areas?.includes(area);
}
/** The record with only the tasks in focus (the same record when there is no focus). */
export const focusedRecord = <T extends Pick<Tasks, 'tasks' | 'projects'>>(record: T, focus: TaskFocus | null): T => focus ? {...record, tasks: record.tasks.filter(t => inFocus(t, focus, record))} : record;
/**
 * Review B6M-3, B6M-4: the one test of whether a task is out of play now — its project is on hold, it waits its turn in an
 * in-order line, or (where a focus applies: pass it) it is out of the focus. My Day's picks, "From yesterday", Plan my day's
 * planner, Upcoming's week and month lists, its deadline line and its at-risk line all read it (Today, Upcoming, the matrix,
 * Plan my week and the counts read the same `setAside` in lib/tasks/engine.ts, the focus on the page).
 */
export const isOutOfPlay = (record: Pick<Tasks, 'tasks' | 'projects'> & Partial<Pick<Tasks, 'sections'>>, task: Task, today: string, focus: TaskFocus | null = null): boolean => setAside(record, task, today) || !inFocus(task, focus, record);
/** The record with only the tasks in play (the same record when every task is). */
export function inPlayRecord<T extends Pick<Tasks, 'tasks' | 'projects'> & Partial<Pick<Tasks, 'sections'>>>(record: T, today: string, focus: TaskFocus | null = null): T {
  const tasks = record.tasks.filter(t => !isOutOfPlay(record, t, today, focus));
  return tasks.length === record.tasks.length ? record : {...record, tasks};
}
/** "Work", "Work and Home", "Work and 2 more"; in Dutch (review B6M-11) "Werk en Thuis", "Werk en nog 2". Names are never changed. */
export function focusName(focus: TaskFocus, record: Pick<Tasks, 'projects' | 'areas'>, lang: 'en' | 'nl' = 'en'): string {
  const names = [...(focus.areas ?? []).map(id => record.areas?.find(a => a.id === id)?.name), ...(focus.projects ?? []).map(id => record.projects?.find(p => p.id === id)?.name)].filter((n): n is string => !!n);
  const and = lang === 'nl' ? ' en ' : ' and ';
  return names.length <= 2 ? names.join(and) : lang === 'nl' ? `${names[0]} en nog ${names.length - 1}` : `${names[0]} and ${names.length - 1} more`;
}
