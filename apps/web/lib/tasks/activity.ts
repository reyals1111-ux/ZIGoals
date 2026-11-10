import {formatDate} from '../visual-format';
import type {Tasks} from './schema';

/**
 * Session AL (for lane L4, DV-172 / P-DV-73): tasks in the Activity log. Each task gives a row for when it was added and
 * one for each time it was finished (a repeating task's past occurrences each count). The row's own day is the day it
 * happened in the app's zone (`dayOf`), so a task finished just after midnight sits under the new day. Pure; the feed
 * reads the record with `useDeviceRecord(TASKS)`.
 */
export type TaskActivity = {id: string; category: 'TASK'; title: string; detail: string; at: string; day: string; href: string; source: string};
/** How a task row looks in the feed (its label, icon and colour). */
export const TASK_ACTIVITY_PRESENTATION = {label: 'Task', icon: 'tasks', tone: 'habit'} as const;

export function getTaskActivities(record: Tasks | null | undefined, dayOf: (iso: string) => string): TaskActivity[] {
  if (!record) return [];
  const out: TaskActivity[] = [];
  for (const t of record.tasks) {
    const href = `/app/tasks?task=${encodeURIComponent(t.id)}`;
    const due = t.due ? ` · due ${formatDate(t.due)}` : '';
    out.push({id: `task-added:${t.id}`, category: 'TASK', title: t.title, detail: `Task added${due}`, at: t.createdAt, day: dayOf(t.createdAt), href, source: 'Added by you'});
    // A repeating task keeps each finished occurrence; the last one may also be its doneAt (the series ended).
    for (const c of t.completions ?? []) {
      if (c.at === t.doneAt) continue;
      out.push({id: `task-done:${t.id}:${c.at}`, category: 'TASK', title: t.title, detail: `Done${c.due ? ` · was due ${formatDate(c.due)}` : ''} · repeats`, at: c.at, day: dayOf(c.at), href, source: 'Marked by you'});
    }
    if (t.doneAt) out.push({id: `task-done:${t.id}`, category: 'TASK', title: t.title, detail: `Done${t.due ? ` · was due ${formatDate(t.due)}` : ''}`, at: t.doneAt, day: dayOf(t.doneAt), href, source: 'Marked by you'});
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
