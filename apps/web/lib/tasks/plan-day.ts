import {formatDate} from '../visual-format';
import {deadlineState, isLate, openTasks} from './engine';
import {taskLevel, type Task, type Tasks} from './schema';

/**
 * Session AV (owner follow-up 1, F-PLAN-DAY; TickTick's suggested tasks, Sunsama's daily planning, with no model): the
 * open tasks worth a look when planning today — overdue ones, a deadline within three days that is not planned for
 * today, and priority 1 or 2 tasks with no day yet — each with why, in plain words. Subtasks follow their parent and are
 * left out. Ones set aside ("Not today") are skipped. At most five. Pure.
 */
export const PLAN_DAY_MAX = 5;
export type PlanWhy = 'overdue' | 'deadline' | 'priority';
export type PlanSuggestion = {task: Task; why: PlanWhy; words: string};
const RANK: Record<PlanWhy, number> = {overdue: 0, deadline: 1, priority: 2};
export function planSuggestions(record: Tasks, today: string, setAside: ReadonlySet<string> = new Set()): PlanSuggestion[] {
  const out: PlanSuggestion[] = [];
  for (const task of openTasks(record, today)) {
    if (task.parentId || setAside.has(task.id) || task.due === today) continue;
    const d = deadlineState(task, today), level = taskLevel(task);
    if (task.due && isLate(task, today)) out.push({task, why: 'overdue', words: `Was planned for ${formatDate(task.due, {weekday: true, year: false})}`});
    else if (d === 'passed' || d === 'today' || d === 'soon') out.push({task, why: 'deadline', words: d === 'passed' ? `Deadline passed on ${formatDate(task.deadline!, {year: false})}` : d === 'today' ? 'Deadline today' : `Deadline ${formatDate(task.deadline!, {weekday: true, year: false})}`});
    else if (!task.due && level <= 2) out.push({task, why: 'priority', words: `Priority ${level}, no day yet`});
  }
  return out.sort((a, b) => RANK[a.why] - RANK[b.why]).slice(0, PLAN_DAY_MAX);
}
/** Open top-level tasks planned for today. */
export const plannedToday = (record: Tasks, today: string) => record.tasks.filter(t => !t.doneAt && !t.parentId && t.due === today).length;
