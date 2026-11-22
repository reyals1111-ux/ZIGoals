import {localWeekday} from '../local-date';
import type {TaskPlan, TimeBlock} from './plan-record';
import type {Task, Tasks} from './schema';

/**
 * Session AV lane 2 (r5-plan, LEDGER #348, #353): the reading half of lib/tasks/time-blocks.ts — the blocks on a day, their
 * tasks and "2 of 4 done", the time to leave and an imported event's travel minutes — with no planner in it, so the Day
 * Timeline's task source and the notification plan load only this. Pure.
 */
const minutesOf = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
const clockOf = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** The blocks on a day, by their start. */
export const blocksOn = (plan: Pick<TaskPlan, 'blocks'>, day: string): TimeBlock[] => (plan.blocks ?? []).filter(b => b.on ? b.on === day : b.days!.includes(localWeekday(day))).sort((a, b) => a.from.localeCompare(b.from) || a.name.localeCompare(b.name));
/** The tasks dropped into a block on a day: its open ones and those finished (not cancelled) or closed that day. */
export function blockTasks(record: Pick<Tasks, 'tasks'>, block: Pick<TimeBlock, 'id'>, day: string): Task[] {
  return record.tasks.filter(t => t.block === block.id && t.due === day && !t.parentId).sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99') || a.createdAt.localeCompare(b.createdAt));
}
/** "2 of 4 done": cancelled ones leave the count. */
export function blockProgress(tasks: readonly Task[]): {done: number; total: number} {
  const counted = tasks.filter(t => t.state?.kind !== 'cancelled');
  return {done: counted.filter(t => t.doneAt).length, total: counted.length};
}
/** The time to leave ("08:40") for a time and the travel minutes before it; null when it would be before midnight. */
export function leaveBy(time: string, travel: number): string | null {
  const at = minutesOf(time) - travel;
  return at >= 0 ? clockOf(at) : null;
}
/** The event's own id (the short hash) from an Agenda event item's id (`event:<calendar>:<event>:<date>[:part]`). */
export const eventIdOf = (itemId: string): string | null => /^event:[^:]+:([0-9a-f]{16}):/.exec(itemId)?.[1] ?? null;
/** The travel minutes typed before an imported event, or 0. */
export const eventTravel = (plan: Pick<TaskPlan, 'eventTravel'>, itemId: string): number => { const id = eventIdOf(itemId); return id ? plan.eventTravel?.[id] ?? 0 : 0; };
