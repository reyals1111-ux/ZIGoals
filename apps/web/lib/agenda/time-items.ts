import type {AgendaDay, AgendaItem, AgendaSource} from './build';
import type {Task, TaskPriority, Tasks} from '../tasks/schema';
import {openTasks, shownDoneOn} from '../tasks/engine';
import type {CalendarImport} from '../ics/calendar';
import {occurrences} from '../ics/expand';
import type {ExtraSource} from './extra-sources';

/**
 * Session AK (T1, T2): the Agenda's two newer kinds of item, beside the ones `buildAgenda` reads (lib/agenda/build.ts,
 * unchanged, so ZIGi's agenda tool and its tests read exactly what they did): the person's tasks and the events of
 * calendars they imported. Pure; nothing is written.
 *
 * - A task shows on its due day; an overdue open task shows on today (still to do, so it is carried forward, never left
 *   on a past day); a finished one shows on its due day, or on the day it was finished when that came later. A task with
 *   no day is not on a calendar (it is on the Tasks page). Tasks are the one kind the Agenda can tick.
 * - An imported event shows on each day it falls on, in this device's zone; it is read-only and opens nothing.
 *
 * Within a day: items without a time first, then by time; at the same time reviews, habits, tasks, meals, workouts,
 * contributions, bills, unbonding, then imported events last (the person's own plans before someone else's calendar).
 */
export {EXTRA_SOURCES, EXTRA_LABEL, type ExtraSource} from './extra-sources';
export const MAX_EXTRA_ITEMS = 3000, TASK_MINUTES = 30;
type Base = Omit<AgendaItem, 'source' | 'pillar' | 'href'>;
export type TaskAgendaItem = Base & {source: 'task'; pillar: 'goals' | 'life'; href: string; taskId: string; priority: TaskPriority; goal?: string; overdueSince?: string};
export type EventAgendaItem = Base & {source: 'event'; pillar: 'life'; href: null; calendarId: string; calendar: string; part?: number; parts?: number};
export type DayItem = AgendaItem | TaskAgendaItem | EventAgendaItem;
export type DayWithExtras = {date: string; items: DayItem[]};
export type DaySource = AgendaSource | ExtraSource;

const ORDER: Record<DaySource, number> = {review: 0, habit: 1, task: 2, meal: 3, workout: 4, contribution: 5, bill: 6, unbonding: 7, event: 8};
export const compareDayItems = (a: DayItem, b: DayItem) => (a.time === null ? -1 : 0) - (b.time === null ? -1 : 0) || (a.time ?? '').localeCompare(b.time ?? '') || ORDER[a.source] - ORDER[b.source] || a.title.localeCompare(b.title);

function taskItem(t: Task, date: string, today: string): TaskAgendaItem {
  const time = t.time && t.due === date ? t.time : null;
  return {id: `task:${t.id}:${date}`, source: 'task', pillar: t.goal ? 'goals' : 'life', date, time, minutes: time ? TASK_MINUTES : 0, title: t.title, href: `/app/tasks#task-${t.id}`,
    state: t.doneAt ? 'done' : 'open', taskId: t.id, priority: t.priority, ...(t.goal ? {goal: t.goal} : {}), ...(!t.doneAt && t.due && t.due < today ? {overdueSince: t.due} : {})};
}
/** The tasks between two days (`doneDay` gives the local day of a finish time). */
export function taskAgendaItems(record: Tasks, from: string, to: string, today: string, doneDay: (iso: string) => string): TaskAgendaItem[] {
  const out: TaskAgendaItem[] = [];
  for (const t of openTasks(record, today)) {
    if (!t.due) continue;
    const date = t.due < today ? today : t.due;
    if (date >= from && date <= to) out.push(taskItem(t, date, today));
  }
  for (const t of record.tasks) {
    const date = shownDoneOn(t, doneDay);
    if (date && date >= from && date <= to) out.push(taskItem(t, date, today));
  }
  return out;
}
/** The imported events between two days, in `zone` (the device's). */
export function eventAgendaItems(record: CalendarImport, from: string, to: string, zone: string): EventAgendaItem[] {
  const out: EventAgendaItem[] = [];
  for (const cal of record.calendars) for (const e of cal.events) {
    let list: ReturnType<typeof occurrences> = [];
    try { list = occurrences(e, from, to, zone); } catch { list = []; }
    for (const o of list) {
      out.push({id: `event:${cal.id}:${e.id}:${o.date}${o.part ? `:${o.part}` : ''}`, source: 'event', pillar: 'life', date: o.date, time: o.time, minutes: o.minutes, title: e.title, href: null, state: 'open', calendarId: cal.id, calendar: cal.name, ...(o.part ? {part: o.part, parts: o.parts} : {})});
      if (out.length >= MAX_EXTRA_ITEMS) return out;
    }
  }
  return out;
}
/** `buildAgenda`'s days with tasks and imported events added (those not hidden), each day in one order. */
export function withExtras(days: readonly AgendaDay[], extra: readonly DayItem[], hidden: readonly ExtraSource[] = []): DayWithExtras[] {
  const byDay = new Map<string, DayItem[]>(days.map(d => [d.date, [...d.items]]));
  const skip = new Set<string>(hidden);
  for (const item of extra.slice(0, MAX_EXTRA_ITEMS)) if (!skip.has(item.source)) byDay.get(item.date)?.push(item);
  return days.map(d => ({date: d.date, items: byDay.get(d.date)!.sort(compareDayItems)}));
}
export function countExtras(items: readonly DayItem[]): Record<ExtraSource, number> {
  const out: Record<ExtraSource, number> = {task: 0, event: 0};
  for (const i of items) if (i.source === 'task' || i.source === 'event') out[i.source]++;
  return out;
}

/**
 * Session AL (P-LA-14 page side, LA-022/LA-023): what is next today across habits, tasks and the rest, in time order —
 * the timed open items from now on first (a 6 PM task among the habits), then the open ones with no time. For NOVA's
 * "Next three" and ZIGi's agenda answer (lane L7/L8 call it with the Agenda's own day, so the three agree with the page).
 */
export function nextUp(day: DayWithExtras, nowClock: string, count = 3): DayItem[] {
  const open = day.items.filter(i => i.state === 'open');
  const timed = open.filter(i => i.time !== null && i.time >= nowClock).sort(compareDayItems), anytime = open.filter(i => i.time === null).sort(compareDayItems);
  return [...timed, ...anytime].slice(0, count);
}
