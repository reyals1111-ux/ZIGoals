import {addLocalDays} from '../local-date';
import {taskLevel, type Task, type TaskLevel} from './schema';

/**
 * Session AP (owner-approved feature list): the "Priority matrix" view of Tasks — urgent and important, four boxes,
 * read from fields every task already has. Nothing new is stored. Pure.
 * - Urgent: overdue or due within the next 2 days (every day up to today + 2).
 * - Important: priority P1 or P2.
 * Moving a card to another box changes only its priority level (the existing field): urgency comes from its day, so a
 * card moves only between the two boxes of its own row (urgent or not); its day never changes here.
 */
export const QUADRANTS = ['do', 'plan', 'quick', 'later'] as const;
export type Quadrant = typeof QUADRANTS[number];
export const URGENT_DAYS = 2;
export const QUADRANT_WORDS: Record<Quadrant, {title: string; hint: string}> = {
  do: {title: 'Urgent and important', hint: 'Do these first'},
  plan: {title: 'Important, not urgent', hint: 'Give them a time'},
  quick: {title: 'Urgent, not important', hint: 'Keep them short, or hand them on'},
  later: {title: 'Neither urgent nor important', hint: 'Later, or let them go'},
};
export const MATRIX_RULE = `Urgent: overdue or due within ${URGENT_DAYS} days. Important: priority P1 or P2. Moving a card changes only its priority; its day stays.`;

/** Overdue (late today too) or due within the next 2 days: every day up to today + 2. */
export const isUrgent = (task: Pick<Task, 'due'>, today: string): boolean => !!task.due && task.due <= addLocalDays(today, URGENT_DAYS);
export const isImportant = (task: Pick<Task, 'level' | 'priority'>): boolean => taskLevel(task) <= 2;
export function quadrantOf(task: Task, today: string): Quadrant {
  const urgent = isUrgent(task, today), important = isImportant(task);
  return urgent ? (important ? 'do' : 'quick') : (important ? 'plan' : 'later');
}
/** The open tasks in their four boxes, each box in the order given (the Tasks list's own order). */
export function matrix(tasks: readonly Task[], today: string): Record<Quadrant, Task[]> {
  const out: Record<Quadrant, Task[]> = {do: [], plan: [], quick: [], later: []};
  for (const t of tasks) if (!t.doneAt) out[quadrantOf(t, today)].push(t);
  return out;
}
const URGENT_ROW: Record<Quadrant, boolean> = {do: true, quick: true, plan: false, later: false};
/** The other box a card can move to (same urgency, the other importance). */
export const partnerOf = (q: Quadrant): Quadrant => ({do: 'quick', quick: 'do', plan: 'later', later: 'plan'} as const)[q];
/**
 * The priority level a card takes in `target`, or null when it is already there. Into an important box: P1 for
 * "Urgent and important", P2 for "Important, not urgent". Out of one: P3 (Normal). Refused (throws) across the urgency
 * line, which only its day decides.
 */
export function levelForMove(task: Task, target: Quadrant, today: string): TaskLevel | null {
  const from = quadrantOf(task, today);
  if (from === target) return null;
  if (URGENT_ROW[from] !== URGENT_ROW[target]) throw new Error(URGENT_ROW[target] ? 'A task becomes urgent by its day: give it a day within 2 days to move it there.' : 'A task stops being urgent by its day: give it a later day to move it there.');
  return target === 'do' ? 1 : target === 'plan' ? 2 : 3;
}
