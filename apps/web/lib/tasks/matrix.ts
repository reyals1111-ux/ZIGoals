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
export type MatrixRules = {urgentDays: number; importantUpTo: 1 | 2 | 3;
  /**
   * Session AV lane 2 (tasks, LEDGER #14, q1 Minor "matrix rules by label"; TickTick's quadrant filters): a task with one of
   * these labels is important (or urgent) whatever its priority (or day); `project` keeps the matrix to one project.
   */
  importantLabels?: string[]; urgentLabels?: string[]; project?: string};
/** Session AV lane 2 (LEDGER #14; TickTick's several matrices): a named set of lines, kept beside the lines in use. */
export type SavedMatrix = {id: string; name: string; rules: MatrixRules};
export const MAX_SAVED_MATRICES = 10;
export const DEFAULT_RULES: MatrixRules = {urgentDays: URGENT_DAYS, importantUpTo: 2};
export const MATRIX_RULES_KEY = 'zigoals:matrix-rules';
export function readRules(raw: unknown): MatrixRules {
  const v = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const days = typeof v.urgentDays === 'number' && Number.isInteger(v.urgentDays) && v.urgentDays >= 0 && v.urgentDays <= 7 ? v.urgentDays : URGENT_DAYS;
  const up = v.importantUpTo === 1 || v.importantUpTo === 2 || v.importantUpTo === 3 ? v.importantUpTo : 2;
  const labels = (x: unknown) => Array.isArray(x) ? [...new Set(x.filter((l): l is string => typeof l === 'string' && /^[\p{L}\p{N}_-]{1,40}$/u.test(l)))].slice(0, 10) : [];
  const important = labels(v.importantLabels), urgent = labels(v.urgentLabels), project = typeof v.project === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(v.project) ? v.project : undefined;
  return {urgentDays: days, importantUpTo: up, ...(important.length ? {importantLabels: important} : {}), ...(urgent.length ? {urgentLabels: urgent} : {}), ...(project ? {project} : {})};
}
/** The saved matrices kept with the lines (`saved` in the same display record); bad entries are left out. */
export function readSaved(raw: unknown): SavedMatrix[] {
  const v = raw && typeof raw === 'object' ? (raw as {saved?: unknown}).saved : null;
  if (!Array.isArray(v)) return [];
  return v.flatMap(x => x && typeof x === 'object' && typeof (x as SavedMatrix).id === 'string' && typeof (x as SavedMatrix).name === 'string' && (x as SavedMatrix).name.trim()
    ? [{id: (x as SavedMatrix).id.slice(0, 80), name: (x as SavedMatrix).name.trim().slice(0, 40), rules: readRules((x as SavedMatrix).rules)}] : []).slice(0, MAX_SAVED_MATRICES);
}
/** Whether two sets of lines are the same (the usual ones, or a saved one). */
export const sameRules = (a: MatrixRules, b: MatrixRules) => JSON.stringify(readRules(a)) === JSON.stringify(readRules(b));
const hasLabel = (task: {labels?: string[]}, list?: string[]) => !!list?.length && !!task.labels?.some(l => list.some(x => x.toLowerCase() === l.toLowerCase()));
const levels = (up: number) => up === 1 ? 'P1' : up === 2 ? 'P1 or P2' : 'P1 to P3';
const tags = (l?: string[]) => l?.length ? `, or labelled ${l.map(x => `@${x}`).join(' or ')}` : '';
export const ruleWords = (r: MatrixRules = DEFAULT_RULES) => `Urgent: overdue or due ${r.urgentDays === 0 ? 'today' : `within ${r.urgentDays} ${r.urgentDays === 1 ? 'day' : 'days'}`}${tags(r.urgentLabels)}. Important: priority ${levels(r.importantUpTo)}${tags(r.importantLabels)}. Moving a card changes only its priority; its day stays. A deadline that near is urgent too.`;
export const MATRIX_RULE = ruleWords();

/**
 * Overdue (late today too) or due within the next 2 days (or the person's own number): every day up to today + n.
 * Session AV (1c, q1 #15, fresh-agent review; Things counts the deadline down): a deadline that near is urgent too.
 */
export const isUrgent = (task: Pick<Task, 'due'> & {deadline?: string; labels?: string[]}, today: string, rules: MatrixRules = DEFAULT_RULES): boolean => { const limit = addLocalDays(today, rules.urgentDays); return (!!task.due && task.due <= limit) || (!!task.deadline && task.deadline <= limit) || hasLabel(task, rules.urgentLabels); };
export const isImportant = (task: Pick<Task, 'level' | 'priority'> & {labels?: string[]}, rules: MatrixRules = DEFAULT_RULES): boolean => taskLevel(task) <= rules.importantUpTo || hasLabel(task, rules.importantLabels);
export function quadrantOf(task: Task, today: string, rules: MatrixRules = DEFAULT_RULES): Quadrant {
  const urgent = isUrgent(task, today, rules), important = isImportant(task, rules);
  return urgent ? (important ? 'do' : 'quick') : (important ? 'plan' : 'later');
}
/** The open tasks in their four boxes, each box in the order given (the Tasks list's own order). */
export function matrix(tasks: readonly Task[], today: string, rules: MatrixRules = DEFAULT_RULES): Record<Quadrant, Task[]> {
  const out: Record<Quadrant, Task[]> = {do: [], plan: [], quick: [], later: []};
  for (const t of tasks) if (!t.doneAt && (!rules.project || t.projectId === rules.project)) out[quadrantOf(t, today, rules)].push(t);
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
  // Session AV lane 2 (LEDGER #14): a label that makes it important (or urgent) is the person's own rule; the label moves it, not its priority.
  if ((from === 'do' || from === 'plan') && hasLabel(task, rules.importantLabels) && URGENT_ROW[from] === URGENT_ROW[target]) throw new Error(`It is important by its label (${(task.labels ?? []).filter(l => rules.importantLabels!.some(x => x.toLowerCase() === l.toLowerCase())).map(l => `@${l}`).join(', ')}): take the label off to move it.`);
  if (URGENT_ROW[from] !== URGENT_ROW[target]) throw new Error(URGENT_ROW[target] ? `A task becomes urgent by its day: give it a day ${rules.urgentDays === 0 ? 'of today' : `within ${rules.urgentDays} ${rules.urgentDays === 1 ? 'day' : 'days'}`} to move it there.` : 'A task stops being urgent by its day: give it a later day to move it there.');
  // Session AV (F-MATRIX-RULES): into an important box the level stays within the person's line; out of one, below it.
  return target === 'do' ? 1 : target === 'plan' ? (Math.min(2, rules.importantUpTo) as TaskLevel) : (Math.max(3, rules.importantUpTo + 1) as TaskLevel);
}
