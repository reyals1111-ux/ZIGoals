import type {TimelineBand, TimelineSource, TimelineSourceItem} from '../timeline/sources';
import {isLate, tasksOnDay} from './engine';
import {deviceDay, readTasks, tasksToday} from './device';
import type {Tasks} from './schema';
import {LOOK_HEX, taskLook} from './look';
import {readDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {TASK_PLAN, type TaskPlan} from './plan-record';
import {blockProgress, blockTasks, blocksOn, leaveBy} from './time-blocks-read';
import {formatClock} from '../visual-format';

/**
 * Session AL (PR-103, N-PR-08, P-PR-41): tasks on the Day Timeline — the day's tasks as the Agenda shows them (due that
 * day; on today also every overdue one; finished ones on their day), each in its part of the day by its time, else on
 * the Anytime shelf. A read only. Registered by components/tasks/tasks-timeline-source.tsx (the Timeline page and Today's
 * tasks card mount it).
 */
const bandOf = (time?: string): TimelineBand => { if (!time) return 'anytime'; const h = Number(time.slice(0, 2)); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
export function taskTimelineItems(record: Tasks | null, date: string, today: string, doneDay: (iso: string) => string): TimelineSourceItem[] {
  if (!record) return [];
  return tasksOnDay(record, date, today, doneDay).map(t => ({
    // Session AV lane 2 (r3-plan, LEDGER #257): the task's own symbol and colour.
    ...((l => l ? {glyph: l.glyph, colour: LOOK_HEX[l.colour]} : {})(taskLook(t))),
    id: t.id, title: t.title, done: !!t.doneAt, href: `/app/tasks?task=${encodeURIComponent(t.id)}`, band: bandOf(t.time), ...(t.time ? {time: t.time} : {}),
    pillar: t.goal ? 'goals' : null, label: t.due && isLate(t, date) && !t.doneAt ? 'Task · overdue' : 'Task',
  }));
}
/**
 * Session AV lane 2 (r5-plan, LEDGER #348, #353; Akiflow): the day's time blocks as spans ("Deep work · 2 of 4 done") and the
 * travel minutes typed before a timed task as a span that ends at its time ("Travel · leave by 8:40"). Reads only.
 */
export function blockTimelineItems(record: Tasks | null, plan: Pick<TaskPlan, 'blocks'>, date: string): TimelineSourceItem[] {
  return blocksOn(plan, date).map(b => {
    const p = record ? blockProgress(blockTasks(record, b, date)) : {done: 0, total: 0};
    return {id: `block:${b.id}:${date}`, title: b.name, done: false, href: '/app/tasks?view=today', band: bandOf(b.from), time: b.from, minutes: (Number(b.to.slice(0, 2)) * 60 + Number(b.to.slice(3))) - (Number(b.from.slice(0, 2)) * 60 + Number(b.from.slice(3))), colour: LOOK_HEX[b.colour], pillar: null,
      label: `Time block · until ${formatClock(b.to)}${p.total ? ` · ${p.done} of ${p.total} done` : ''}`};
  });
}
export function travelTimelineItems(record: Tasks | null, date: string): TimelineSourceItem[] {
  if (!record) return [];
  return record.tasks.filter(t => !t.doneAt && t.travel && t.time && t.due === date).flatMap(t => {
    const leave = leaveBy(t.time!, t.travel!);
    return leave ? [{id: `travel:${t.id}`, title: `Travel to “${t.title}”`, done: false, href: `/app/tasks?task=${encodeURIComponent(t.id)}`, band: bandOf(leave), time: leave, minutes: t.travel!, pillar: null, label: `Travel · leave by ${formatClock(leave)}`}] : [];
  });
}
export const tasksTimelineSource: TimelineSource = ({date, now}) => {
  const record = readTasks(), today = tasksToday(now);
  let plan: TaskPlan = {version: 1};
  try { const read = readDeviceRecord(getAppStorage(), TASK_PLAN); if (!read.unreadable) plan = read.data; } catch { /* no blocks drawn */ }
  return [...taskTimelineItems(record, date, today, deviceDay), ...blockTimelineItems(record, plan, date), ...travelTimelineItems(record, date)];
};
export default tasksTimelineSource;
