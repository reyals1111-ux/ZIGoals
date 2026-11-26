import {isOutOfPlay} from './focus';
import {waitingFor} from './engine';
import type {Task, Tasks} from './schema';

/**
 * Session AW (X2, LEDGER #435; Amazing Marvin's "Pick one for me" and "This or that"): when choosing is the hard part, one
 * open task of the person's own is offered — from today's (planned for today or earlier, and My Day's picks), or from a
 * chosen project or label. "Another" offers a different one; "This one" opens it or starts its focus block. "This or that"
 * offers two and keeps the one chosen against the next, until one is left. It only offers: it never adds, moves or
 * removes a task. A task of a project on hold, one waiting its turn or for another task, and a subtask are not offered.
 * Pure; the chance comes in `random` (0 ≤ x < 1), so a test can fix it.
 */
export type PickScope = {kind: 'today'} | {kind: 'project'; id: string} | {kind: 'label'; name: string};
export function pickPool(record: Tasks, today: string, scope: PickScope, picked: ReadonlySet<string> = new Set()): Task[] {
  return record.tasks.filter(t => {
    if (t.doneAt || t.parentId || isOutOfPlay(record, t, today) || waitingFor(record, t).length) return false;
    if (scope.kind === 'today') return (!!t.due && t.due <= today) || picked.has(t.id);
    if (scope.kind === 'project') return t.projectId === scope.id;
    return (t.labels ?? []).includes(scope.name);
  });
}
/**
 * One task of the pool not offered yet this round (`seen`), chosen by `random`; once every task has been offered the round
 * starts again (only the one on show is left out). Null when the pool is empty.
 */
export function pickOne(pool: readonly Task[], seen: ReadonlySet<string>, random: number, showing?: string): Task | null {
  if (!pool.length) return null;
  const fresh = pool.filter(t => !seen.has(t.id) && t.id !== showing), from = fresh.length ? fresh : pool.filter(t => t.id !== showing);
  const list = from.length ? from : pool;
  return list[Math.min(list.length - 1, Math.floor(Math.max(0, random) * list.length))] ?? null;
}
/** This or that: two different tasks of the pool (or one when it holds only one). */
export function pickTwo(pool: readonly Task[], seen: ReadonlySet<string>, random: [number, number]): Task[] {
  const a = pickOne(pool, seen, random[0]);
  if (!a) return [];
  const b = pickOne(pool.filter(t => t.id !== a.id), new Set([...seen, a.id]), random[1]);
  return b ? [a, b] : [a];
}
/**
 * The person keeps `kept` of the two on show: it stays, and the other gives way to a task not offered yet; null when every
 * task of the pool has been weighed, so `kept` is the one.
 */
export function keepOne(pool: readonly Task[], seen: ReadonlySet<string>, kept: Task, random: number): Task | null {
  const next = pool.filter(t => t.id !== kept.id && !seen.has(t.id));
  return next.length ? next[Math.min(next.length - 1, Math.floor(Math.max(0, random) * next.length))]! : null;
}
