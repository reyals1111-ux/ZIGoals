import type {DayItem, DayWithExtras, TaskAgendaItem} from './time-items';

/**
 * Session AP (owner-approved feature list, time-blocking): the Agenda's day as an hour grid. Pure; nothing is stored:
 * a task moved to an hour gets that time through its own record's edit (lib/tasks/engine.ts editTask, the Agenda's
 * existing move). Habits, events and the other kinds show at their own time and are never moved here.
 * - The grid runs from 06:00 to 23:00, earlier when an item is earlier (a 05:30 run starts it at 05:00).
 * - A day's load is the number of its items with a time (done ones too: they took that time).
 * - Only an open task can move; a task with no time yet waits above the grid ("No time yet").
 */
export const GRID_FIRST_HOUR = 6, GRID_LAST_HOUR = 23;
export const hourOf = (clock: string) => Number(clock.slice(0, 2));
export const hourClock = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
export const timedLoad = (day: Pick<DayWithExtras, 'items'>): number => day.items.filter(i => i.time !== null).length;
export const movable = (item: DayItem): item is TaskAgendaItem => item.source === 'task' && item.state !== 'done';
export type HourRow = {hour: number; clock: string; items: DayItem[]};
export function hourRows(day: Pick<DayWithExtras, 'items'>): HourRow[] {
  const timed = day.items.filter(i => i.time !== null);
  const first = Math.min(GRID_FIRST_HOUR, ...timed.map(i => hourOf(i.time!)));
  const rows: HourRow[] = [];
  for (let h = first; h <= GRID_LAST_HOUR; h++) rows.push({hour: h, clock: hourClock(h), items: timed.filter(i => hourOf(i.time!) === h)});
  return rows;
}
/** The day's open tasks with no time yet, ready to be given an hour. */
export const untimedTasks = (day: Pick<DayWithExtras, 'items'>): TaskAgendaItem[] => day.items.filter((i): i is TaskAgendaItem => movable(i) && i.time === null);
/** The day's other untimed items (habits any time, all-day events …), shown beside the grid, never moved. */
export const untimedOthers = (day: Pick<DayWithExtras, 'items'>): DayItem[] => day.items.filter(i => i.time === null && !movable(i));
/** The hours a task can be moved to with the keyboard ("Move to…"): every hour of the day, then the half hours. */
export const MOVE_TIMES: readonly string[] = Array.from({length: 48}, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
