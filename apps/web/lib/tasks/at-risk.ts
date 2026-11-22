import {addLocalDays} from '../local-date';
import {taskBusy, toMin} from './layouts';
import type {ExtraBusy} from './plan-week';
import type {TaskPlan} from './plan-record';
import type {Task, Tasks} from './schema';
import {afterHours, freeIn, hoursOn} from './work-hours';

/**
 * Session AV lane 2 (r4-plan, LEDGER #302; Motion's "could not fit", said as a fact): the first deadline in the next two
 * weeks that the open tasks due by it cannot fit before. Their minutes still to do (minutes less time spent; background
 * tasks and tasks without minutes are not counted, the latter said) are held against the free time inside the person's
 * hours from now to the end of the deadline's day (the evening hours too when one of them is an "after hours" task),
 * outside timed tasks and imported events that are not among them. Derived, nothing stored. Pure.
 */
export const RISK_DAYS = 14;
export type AtRisk = {deadline: string; need: number; free: number; tasks: Task[]; unsized: number};
const toDo = (t: Task) => Math.max(0, (t.minutes ?? 0) - (t.spent ?? 0));
export function deadlineAtRisk({record, plan, today, clock, extra = () => [], days = RISK_DAYS}: {record: Tasks; plan: Pick<TaskPlan, 'workHours'>; today: string; clock: string; extra?: ExtraBusy; days?: number}): AtRisk | null {
  const last = addLocalDays(today, days - 1), now = toMin(clock);
  const open = record.tasks.filter(t => !t.doneAt && !t.parentId && t.deadline && t.deadline >= today && t.deadline <= last);
  for (const deadline of [...new Set(open.map(t => t.deadline!))].sort()) {
    const due = open.filter(t => t.deadline! <= deadline), sized = due.filter(t => t.minutes && !t.parallel), need = sized.reduce((n, t) => n + toDo(t), 0);
    if (!need) continue;
    const except = new Set(due.map(t => t.id)), evening = sized.some(t => t.afterHours);
    let free = 0;
    for (let d = today; d <= deadline; d = addLocalDays(d, 1)) free += freeIn([...hoursOn(plan, d), ...(evening ? [afterHours(plan)] : [])], [...taskBusy(record, d, except), ...extra(d)], d === today ? now : 0);
    if (need > free) return {deadline, need, free, tasks: sized.filter(t => toDo(t) > 0), unsized: due.length - sized.length};
  }
  return null;
}
