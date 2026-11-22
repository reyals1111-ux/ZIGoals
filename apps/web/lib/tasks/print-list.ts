import {addLocalDays} from '../local-date';
import {formatClock, formatDate} from '../visual-format';
import {byOrder, childrenOf} from './engine';
import {LEVEL_SHORT, MAX_SUBTASK_DEPTH, taskLevel, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #225; Google Tasks' print): a list as it prints — groups (a project's sections, the
 * days of Upcoming, or one group), each task with a tick box, its day and time, its priority and deadline, and its open
 * subtasks indented under it (three levels). Pure: the page gives the tasks it shows.
 */
export type PrintRow = {task: Task; depth: number; meta: string};
export type PrintGroup = {title: string; rows: PrintRow[]};
export type PrintGrouping = 'section' | 'day' | 'none';
const PRINT_DEPTH = Math.min(3, MAX_SUBTASK_DEPTH);
function meta(t: Task, today: string): string {
  const parts: string[] = [];
  if (t.due) parts.push(`${t.due === today ? 'Today' : t.due === addLocalDays(today, 1) ? 'Tomorrow' : formatDate(t.due, {weekday: true, year: t.due.slice(0, 4) !== today.slice(0, 4)})}${t.time ? `, ${formatClock(t.time)}` : ''}`);
  const level = taskLevel(t); if (level !== 3) parts.push(`P${level} · ${LEVEL_SHORT[level]}`);
  if (t.deadline) parts.push(`deadline ${formatDate(t.deadline, {year: false})}`);
  if (t.minutes) parts.push(`${t.minutes} min`);
  if (t.labels?.length) parts.push(t.labels.map(l => `@${l}`).join(' '));
  return parts.join(' · ');
}
function rowsOf(record: Tasks, top: readonly Task[], today: string): PrintRow[] {
  const out: PrintRow[] = [];
  const walk = (t: Task, depth: number) => {
    out.push({task: t, depth, meta: meta(t, today)});
    if (depth < PRINT_DEPTH) for (const k of childrenOf(record, t.id)) if (!k.doneAt && k.id !== t.id) walk(k, depth + 1);
  };
  for (const t of top) walk(t, 0);
  return out;
}
/** The groups to print for the tasks a view shows (subtasks of a shown task print under it, not twice). */
export function printGroups(record: Tasks, shown: readonly Task[], {grouping, today, projectId}: {grouping: PrintGrouping; today: string; projectId?: string}): PrintGroup[] {
  const ids = new Set(shown.map(t => t.id)), top = shown.filter(t => !t.parentId || !ids.has(t.parentId));
  if (grouping === 'section' && projectId) {
    const sections = (record.sections ?? []).filter(s => s.projectId === projectId && !s.archived).sort((a, b) => a.order - b.order);
    const groups: PrintGroup[] = [{title: '', rows: rowsOf(record, byOrder(top.filter(t => !t.sectionId || !sections.some(s => s.id === t.sectionId))), today)}];
    for (const s of sections) groups.push({title: s.name, rows: rowsOf(record, byOrder(top.filter(t => t.sectionId === s.id)), today)});
    return groups.filter(g => g.rows.length);
  }
  if (grouping === 'day') {
    const days = new Map<string, Task[]>();
    for (const t of top) { const k = t.due ?? ''; days.set(k, [...(days.get(k) ?? []), t]); }
    return [...days].sort(([a], [b]) => (a || '￿').localeCompare(b || '￿')).map(([d, list]) => ({title: d ? (d === today ? 'Today' : formatDate(d, {weekday: true, year: d.slice(0, 4) !== today.slice(0, 4)})) : 'No day', rows: rowsOf(record, list, today)}));
  }
  return [{title: '', rows: rowsOf(record, top, today)}].filter(g => g.rows.length);
}
