import type {TimelineBand, TimelineSource, TimelineSourceItem} from '../timeline/sources';
import {tasksOnDay} from './engine';
import {deviceDay, readTasks, tasksToday} from './device';
import type {Tasks} from './schema';

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
    id: t.id, title: t.title, done: !!t.doneAt, href: `/app/tasks?task=${encodeURIComponent(t.id)}`, band: bandOf(t.time), ...(t.time ? {time: t.time} : {}),
    pillar: t.goal ? 'goals' : null, label: t.due && t.due < date && !t.doneAt ? 'Task · overdue' : 'Task',
  }));
}
export const tasksTimelineSource: TimelineSource = ({date, now}) => taskTimelineItems(readTasks(), date, tasksToday(now), deviceDay);
export default tasksTimelineSource;
