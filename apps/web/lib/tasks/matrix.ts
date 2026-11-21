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
/**
 * Session AV (owner follow-up 1, F-MATRIX-RULES; TickTick's own quadrant rules): the person's own lines — urgent within
 * 0 to 7 days, important up to priority 1, 2 or 3 — kept on this device as a display choice (`MATRIX_RULES_KEY`). The
 * defaults are the rules above. Nothing about a task is stored differently.
 */
export type MatrixRules = {urgentDays: number; importantUpTo: 1 | 2 | 3};
export const DEFAULT_RULES: MatrixRules = {urgentDays: URGENT_DAYS, importantUpTo: 2};
export const MATRIX_RULES_KEY = 'zigoals:matrix-rules';
export function readRules(raw: unknown): MatrixRules {
  const v = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const days = typeof v.urgentDays === 'number' && Number.isInteger(v.urgentDays) && v.urgentDays >= 0 && v.urgentDays <= 7 ? v.urgentDays : URGENT_DAYS;
  const up = v.importantUpTo === 1 || v.importantUpTo === 2 || v.importantUpTo === 3 ? v.importantUpTo : 2;
  return {urgentDays: days, importantUpTo: up};
}
const levels = (up: number) => up === 1 ? 'P1' : up === 2 ? 'P1 or P2' : 'P1 to P3';
export const ruleWords = (r: MatrixRules = DEFAULT_RULES) => `Urgent: overdue or due ${r.urgentDays === 0 ? 'today' : `within ${r.urgentDays} ${r.urgentDays === 1 ? 'day' : 'days'}`}. Important: priority ${levels(r.importantUpTo)}. Moving a card changes only its priority; its day stays.`;
export const MATRIX_RULE = ruleWords();

/** Overdue (late today too) or due within the next 2 days (or the person's own number): every day up to today + n. */
export const isUrgent = (task: Pick<Task, 'due'>, today: string, rules: MatrixRules = DEFAULT_RULES): boolean => !!task.due && task.due <= addLocalDays(today, rules.urgentDays);
export const isImportant = (task: Pick<Task, 'level' | 'priority'>, rules: MatrixRules = DEFAULT_RULES): boolean => taskLevel(task) <= rules.importantUpTo;
export function quadrantOf(task: Task, today: string, rules: MatrixRules = DEFAULT_RULES): Quadrant {
  const urgent = isUrgent(task, today, rules), important = isImportant(task, rules);
  return urgent ? (important ? 'do' : 'quick') : (important ? 'plan' : 'later');
}
/** The open tasks in their four boxes, each box in the order given (the Tasks list's own order). */
export function matrix(tasks: readonly Task[], today: string, rules: MatrixRules = DEFAULT_RULES): Record<Quadrant, Task[]> {
  const out: Record<Quadrant, Task[]> = {do: [], plan: [], quick: [], later: []};
  for (const t of tasks) if (!t.doneAt) out[quadrantOf(t, today, rules)].push(t);
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
export function levelForMove(task: Task, target: Quadrant, today: string, rules: MatrixRules = DEFAULT_RULES): TaskLevel | null {
  const from = quadrantOf(task, today, rules);
  if (from === target) return null;
  if (URGENT_ROW[from] !== URGENT_ROW[target]) throw new Error(URGENT_ROW[target] ? `A task becomes urgent by its day: give it a day ${rules.urgentDays === 0 ? 'of today' : `within ${rules.urgentDays} ${rules.urgentDays === 1 ? 'day' : 'days'}`} to move it there.` : 'A task stops being urgent by its day: give it a later day to move it there.');
  // Session AV (F-MATRIX-RULES): into an important box the level stays within the person's line; out of one, below it.
  return target === 'do' ? 1 : target === 'plan' ? (Math.min(2, rules.importantUpTo) as TaskLevel) : (Math.max(3, rules.importantUpTo + 1) as TaskLevel);
}
