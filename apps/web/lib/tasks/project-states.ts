import {addLocalDays} from '../local-date';
import {byOrder, heldProject, orderAhead, projectHeld, waitingFor, waitsTurn} from './engine';
import {MAX_REVIEW_WEEKS, tasksSchema, type Project, type Task, type Tasks} from './schema';

/**
 * Session AV lane 2 (r6-plan, LEDGER #392, #393, #395; OmniFocus's On Hold, sequential projects and Review): a project put on
 * hold (until a day, or until it is resumed), its tasks done in order, and its review every few weeks. Pure; each returns
 * the record to write (one Undo puts it back), and never changes a task.
 */
export const HOLD_PAST_MESSAGE = 'Choose a day after today to resume on, or leave it empty to resume by hand.';
export const REVIEW_CHOICES = [1, 2, 3, 4, 6, 8, 12] as const;
const change = (record: Tasks, id: string, edit: (p: Project) => Project): Tasks => {
  if (!record.projects?.some(p => p.id === id)) throw new Error('That project is no longer on this device.');
  return tasksSchema.parse({...record, projects: record.projects.map(p => p.id === id ? edit(p) : p)});
};
const without = (p: Project, key: 'hold' | 'inOrder' | 'review'): Project => { const out = {...p}; delete out[key]; return out; };

/** "On hold", from today, until `until` (a later day) or until resumed. */
export function holdProject(record: Tasks, id: string, today: string, until?: string | null): Tasks {
  if (until && until <= today) throw new Error(HOLD_PAST_MESSAGE);
  return change(record, id, p => ({...p, hold: {since: today, ...(until ? {until} : {})}}));
}
/** Resumed now: its tasks are back in Today, Upcoming and the reminders. */
export const resumeProject = (record: Tasks, id: string): Tasks => change(record, id, p => without(p, 'hold'));
/** A hold whose day has come is no longer kept (the project is active again by itself; this tidies the record). */
export const holdEnded = (p: Pick<Project, 'hold'>, today: string): boolean => !!p.hold && !projectHeld(p, today);
/** "In order" on a project, or ended. */
export const setProjectInOrder = (record: Tasks, id: string, on: boolean): Tasks => change(record, id, p => on ? {...p, inOrder: true} : without(p, 'inOrder'));
/** "Review every N weeks" (null: no review); the first turn comes N weeks from today. */
export function setReview(record: Tasks, id: string, every: number | null, today: string): Tasks {
  if (every !== null && (!Number.isInteger(every) || every < 1 || every > MAX_REVIEW_WEEKS)) throw new Error(`Choose 1 to ${MAX_REVIEW_WEEKS} weeks.`);
  return change(record, id, p => every === null ? without(p, 'review') : {...p, review: {every, last: p.review?.last ?? today}});
}
/** "Reviewed": the next turn comes `every` weeks from today. */
export const markReviewed = (record: Tasks, id: string, today: string): Tasks => change(record, id, p => p.review ? {...p, review: {...p.review, last: today}} : p);
/** The day a project's review comes round (its `last` day plus its weeks; never set: now). */
export const nextReview = (p: Pick<Project, 'review'>, today: string): string | null => p.review ? p.review.last ? addLocalDays(p.review.last, 7 * p.review.every) : today : null;
/** The live projects whose review has come round, the longest waiting first. */
export function projectsToReview(record: Pick<Tasks, 'projects'>, today: string): Project[] {
  return (record.projects ?? []).filter(p => !p.archived && p.review && nextReview(p, today)! <= today).sort((a, b) => nextReview(a, today)!.localeCompare(nextReview(b, today)!) || a.order - b.order);
}
/** A project's open tasks for its review: available, waiting (their turn, or another task) and on hold. */
export function projectTasks(record: Tasks, projectId: string, today: string): {open: Task[]; waiting: {task: Task; on: string}[]; held: Task[]} {
  const mine = record.tasks.filter(t => t.projectId === projectId && !t.doneAt && !t.parentId), open: Task[] = [], waiting: {task: Task; on: string}[] = [], held: Task[] = [];
  for (const t of mine) {
    if (heldProject(record, t, today)) { held.push(t); continue; }
    const turn = waitsTurn(record, t), other = waitingFor(record, t);
    if (turn) waiting.push({task: t, on: turn.title}); else if (other.length) waiting.push({task: t, on: other[0]!.title}); else open.push(t);
  }
  return {open, waiting, held};
}
/** The task now up in an in-order project (the first open one), or null. */
export function nextInOrder(record: Tasks, projectId: string): Task | null {
  const ahead = orderAhead(record), waiting = record.tasks.find(t => t.projectId === projectId && !t.parentId && ahead.has(t.id));
  if (waiting) return ahead.get(waiting.id)!;
  return byOrder(record.tasks.filter(t => t.projectId === projectId && !t.parentId && !t.doneAt && !t.recur))[0] ?? null;
}
