import type {Task, Tasks} from './schema';

/**
 * Session AV (owner follow-up 1, F-TASK-MINUTES; Todoist durations, Sunsama's planned time): a task's minutes in words
 * and the day's load — the minutes of the open tasks planned for a day, beside how many of them have none. Pure.
 */
export function minutesWords(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
}
/** Dutch, for NOVA: "1 uur 30 min", "45 min". */
export function minutesWordsNl(minutes: number): string {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h && m ? `${h} uur ${m} min` : h ? `${h} uur` : `${m} min`;
}
export type DayLoad = {tasks: number; timed: number; minutes: number};
/** Open top-level tasks planned for `day`: how many, how many say their minutes, and those minutes added up. */
export function dayLoad(record: Tasks, day: string): DayLoad {
  let tasks = 0, timed = 0, minutes = 0;
  for (const t of record.tasks) {
    if (t.doneAt || t.parentId || t.due !== day) continue;
    tasks++;
    if (t.minutes) { timed++; minutes += t.minutes; }
  }
  return {tasks, timed, minutes};
}
/**
 * Session AV (1c, q1 #39, fresh-agent review; Sunsama counts the whole day): the load of the tasks a view lists — Tasks →
 * Today's own list, overdue ones and a deadline today included — open top-level tasks only, each once.
 */
export function viewLoad(tasks: readonly Task[]): DayLoad {
  let count = 0, timed = 0, minutes = 0;
  const seen = new Set<string>();
  for (const t of tasks) { if (t.doneAt || t.parentId || seen.has(t.id)) continue; seen.add(t.id); count++; if (t.minutes) { timed++; minutes += t.minutes; } }
  return {tasks: count, timed, minutes};
}
/** "About 1 h 45 min planned for 3 tasks; 1 more without a length" — null when no task of the day says its minutes. */
export function dayLoadWords(load: DayLoad): string | null {
  if (!load.timed) return null;
  const rest = load.tasks - load.timed;
  return `About ${minutesWords(load.minutes)} planned for ${load.timed === 1 ? '1 task' : `${load.timed} tasks`}${rest ? `; ${rest} more without a length` : ''}.`;
}
