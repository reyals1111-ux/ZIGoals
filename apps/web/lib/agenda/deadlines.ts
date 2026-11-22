import type {Task, Tasks} from '../tasks/schema';

/**
 * Session AV lane 2 (minors, q1 #15 check 8; Things shows a deadline on its own day): the open tasks whose deadline is
 * this day while they are planned for another one (a task planned for its deadline day is already on that day). Top-level
 * tasks only, as Tasks → Upcoming shows them. Read-only; nothing stored. Pure.
 */
export function deadlinesOn(record: Pick<Tasks, 'tasks'>, date: string): Task[] {
  return record.tasks.filter(t => !t.doneAt && !t.parentId && t.deadline === date && t.due !== date);
}
