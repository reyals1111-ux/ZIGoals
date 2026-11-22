import {instantAt} from '../zone-time';
import {addLocalDays} from '../local-date';
import {eventAgendaItems} from '../agenda/time-items';
import type {CalendarImport} from '../ics/calendar';
import type {TaskPlan} from './plan-record';
import type {Tasks} from './schema';
import {eventIdOf, eventTravel, leaveBy} from './time-blocks-read';

/**
 * Session AV lane 2 (r5-plan, LEDGER #353; Akiflow's "leave by" reminder; TIER 3 (PWA)): the "Leave by 8:40" wakes — one
 * for each open timed task with typed travel minutes, and each imported event with travel typed before it, over the next
 * `days` days. They go to the notification plan as task reminders do (lib/notify/plan.ts: under the tasks switch, refused
 * inside quiet hours, the title only where names are allowed; the time to leave is always said, it is not a name). They have
 * no Done: leaving is not finishing the task. Pure; the minutes are the person's own, never worked out from a route.
 */
export type LeaveWake = {id: string; title: string; at: number; leave: string; href: string};
export function leaveByWakes({tasks, plan, calendars, zone, now, today, days = 3}: {tasks: Pick<Tasks, 'tasks'> | null; plan: Pick<TaskPlan, 'eventTravel'> | null; calendars: CalendarImport | null; zone: string; now: number; today: string; days?: number}): LeaveWake[] {
  const out: LeaveWake[] = [], last = addLocalDays(today, days - 1);
  for (const t of tasks?.tasks ?? []) {
    if (t.doneAt || !t.travel || !t.time || !t.due || t.due < today || t.due > last) continue;
    const leave = leaveBy(t.time, t.travel); if (!leave) continue;
    out.push({id: t.id, title: t.title, at: instantAt(t.due, leave, zone), leave, href: `/app/tasks?task=${encodeURIComponent(t.id)}`});
  }
  if (plan?.eventTravel && calendars) for (const e of eventAgendaItems(calendars, today, last, zone)) {
    const minutes = e.time ? eventTravel(plan, e.id) : 0, leave = minutes ? leaveBy(e.time!, minutes) : null, eventId = eventIdOf(e.id);
    if (!leave || !eventId) continue;
    out.push({id: `event_${eventId}_${e.date}`, title: e.title, at: instantAt(e.date, leave, zone), leave, href: '/app/agenda'});
  }
  return out.filter(w => Number.isFinite(w.at) && w.at > now).sort((a, b) => a.at - b.at).slice(0, 30);
}
