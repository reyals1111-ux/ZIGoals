import type {Task} from './schema';
import {firstDue, upcoming} from './recurrence';

/**
 * Session AV lane 2 (minors, q1 #43 check 3; TickTick shows a paused repeat): whether a repeating task is paused, and
 * from which day it would resume. A pause moves the task's day past the series' next days (lib/tasks/engine.ts keeps no
 * flag), so a repeat is read as paused only when its day lies beyond the next TWO days the rule gives from today: a daily
 * task finished today and due tomorrow, or a weekly one due next week, is never called paused. Only every-1 repeats
 * counted from their own days (not "after it's done"), as the editor's Resume can only put those back on their day.
 * Pure; nothing stored.
 */
export function pausedRepeat(task: Pick<Task, 'recur' | 'due' | 'doneAt'>, today: string): {until: string; resume: string} | null {
  const rule = task.recur;
  if (!rule || task.doneAt || !task.due || rule.afterDone || rule.interval !== 1 || task.due <= today) return null;
  const resume = firstDue(rule, today), second = upcoming(rule, resume, 2)[1];
  return second && task.due > second ? {until: task.due, resume} : null;
}
