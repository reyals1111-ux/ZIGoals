import type {Tasks} from './schema';

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
/** "About 1 h 45 min planned for 3 tasks; 1 more without a length" — null when no task of the day says its minutes. */
export function dayLoadWords(load: DayLoad): string | null {
  if (!load.timed) return null;
  const rest = load.tasks - load.timed;
  return `About ${minutesWords(load.minutes)} planned for ${load.timed === 1 ? '1 task' : `${load.timed} tasks`}${rest ? `; ${rest} more without a length` : ''}.`;
}
