'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {addTask, editTask, finishTask, removeTask, reopenTask, restoreTasks, type TaskInput, type TaskPatch as EnginePatch} from '../../lib/tasks/engine';
import {deviceDay, tasksClock, tasksToday} from '../../lib/tasks/device';
import {undoOfChange} from '../../lib/tasks/undo';
import {showStatus, showUndo, shownToasts} from '../ui/undo-toast';
import {changeWithUndo} from '../ui/remove-with-undo';

/**
 * Session AK (T1): the tasks record with its actions, each answered by one status line and, where it can be taken
 * back, an Undo. Used by the Tasks page, a goal's next actions, the Agenda and NOVA's widget, so every place says the
 * same words. Nothing is written over a record this device cannot read.
 *
 * Session AL (Part 8):
 * - Undo is the app's one toast (showUndo / changeWithUndo, PRIMITIVES 3e): its restore puts the STORE record back (P-LS-52,
 *   LS-H07/H31; no blank status line under the list). Removals made while that toast is up join it: "Removed 3 tasks ·
 *   Undo" puts all three back (LS-051).
 * - Today is the app's day (the journal zone, P-LS-13), and it moves on by itself: the hook re-reads the clock every 30 s
 *   and when the tab comes back, so groups turn overdue at midnight and a timed task turns late after its time (P-LS-12,
 *   LS-011, LS-065).
 * - `status` stays for the callers that read it (Agenda, NOVA); its words are the toast's.
 */
export type TaskStatus = {text: string; undo?: () => void} | null;
export type TaskPatch = EnginePatch;
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
/** The open removal toast that a next removal joins (one per page). */
let removal: {toast: number; before: Task[]; count: number} | null = null;

/** The app's day and wall-clock time, kept current (every 30 s, on focus and when the tab is shown again). */
export function useTaskClock(): {today: string; clock: string} {
  const read = () => ({today: tasksToday(), clock: tasksClock()});
  const [now, setNow] = useState(read);
  useEffect(() => {
    const tick = () => setNow(prev => { const next = read(); return next.today === prev.today && next.clock === prev.clock ? prev : next; });
    const timer = window.setInterval(tick, 30_000);
    const onShow = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onShow); window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onShow); window.removeEventListener('focus', tick); };
  }, []);
  return now;
}

/**
 * `toast` (the Tasks page): Undo in the app's toast. Without it (a goal's next actions, the Agenda, NOVA's widget, Today's
 * card) the surface keeps its own status line with Undo, as their specs read it.
 */
export function useTaskList({toast = false}: {toast?: boolean} = {}) {
  const tasks = useDeviceRecord(TASKS), {today, clock} = useTaskClock();
  const [status, setStatus] = useState<TaskStatus>(null), [error, setError] = useState('');
  const latest = useRef(tasks); latest.current = tasks;
  const guard = useCallback((): boolean => {
    if (latest.current.unreadable) { setError('Your tasks on this device could not be read, so nothing was changed.'); return false; }
    return true;
  }, []);
  const fail = (cause: unknown) => { setError(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; };
  /** A change with the toast's Undo (changeWithUndo reverses exactly the tasks it changed, in the latest record). */
  const change = useCallback((fn: (r: Tasks) => Tasks, text: string, undone = 'Undone.'): boolean => {
    if (!guard()) return false;
    if (!toast) {
      // The surface's own line: the Undo puts back exactly the tasks this change touched (the latest record otherwise kept).
      try {
        const before = latest.current.data, after = latest.current.update(fn), reverse = undoOfChange(before, after);
        setStatus({text, undo: () => { try { latest.current.update(reverse); setStatus({text: undone}); } catch (cause) { fail(cause); } }}); setError(''); return true;
      } catch (cause) { return fail(cause); }
    }
    try {
      let thrown: unknown = null;
      void changeWithUndo<Tasks>(updater => { try { return latest.current.update(updater); } catch (e) { thrown = e; throw e; } }, fn, text, {undone}).catch(() => undefined);
      if (thrown) throw thrown;
      setStatus({text}); setError(''); return true;
    } catch (cause) { return fail(cause); }
  }, [guard, toast]);
  /** A change that says what happened, with no Undo. */
  const quiet = useCallback((fn: (r: Tasks) => Tasks, text: string): boolean => {
    if (!guard()) return false;
    try { latest.current.update(fn); setStatus({text}); setError(''); if (text && toast) showStatus(text); return true; } catch (cause) { return fail(cause); }
  }, [guard, toast]);
  const add = useCallback((input: TaskInput): boolean => {
    if (!guard()) return false;
    try {
      // Session AL (DV-164): the Tasks page takes a past day; it shows as overdue.
      latest.current.update(r => addTask(r, input, {id: `task_${crypto.randomUUID()}`, at: new Date(), today: tasksToday(), allowPast: true}));
      const text = `Added “${input.title.trim()}”.`;
      setStatus({text}); setError(''); if (toast) showStatus(text); return true;
    } catch (cause) { return fail(cause); }
  }, [guard, toast]);
  const toggle = useCallback((t: Task, done: boolean) => done
    ? change(r => finishTask(r, t.id, new Date(), {today: tasksToday(), doneDay: tasksToday()}), t.recur ? `Done: “${t.title}”. It comes back on its next day.` : `Done: “${t.title}”.`, `“${t.title}” is open again.`)
    : change(r => reopenTask(r, t.id), `“${t.title}” is open again.`, `Done: “${t.title}”.`), [change]);
  /** Removes tasks (with their subtasks). A removal made while the last removal's toast is up joins its Undo. */
  const removeIds = useCallback((ids: readonly string[], label: string): boolean => {
    if (!guard() || !ids.length) return false;
    try {
      const record = latest.current.data, gone = new Set<string>();
      for (const id of ids) { gone.add(id); for (const t of record.tasks) { let p = t.parentId, n = 0; while (p && n++ < 50) { if (p === id) { gone.add(t.id); break; } p = record.tasks.find(x => x.id === p)?.parentId; } } }
      const before = record.tasks.filter(t => gone.has(t.id));
      latest.current.update(r => ids.reduce((acc, id) => removeTask(acc, id), r));
      if (!toast) {
        const text = ids.length > 1 ? `Removed ${plural(ids.length, 'task')}.` : `Removed “${label}”.`;
        setStatus({text, undo: () => { try { latest.current.update(r => restoreTasks(r, before)); setStatus({text: ids.length > 1 ? `${plural(ids.length, 'task')} put back.` : `“${label}” is back.`}); } catch (cause) { fail(cause); } }}); setError(''); return true;
      }
      const joined = removal && shownToasts().some(t => t.id === removal!.toast) ? removal : null;
      const all = [...(joined?.before ?? []), ...before], count = (joined?.count ?? 0) + ids.length;
      const text = count > 1 ? `Removed ${plural(count, 'task')}.` : `Removed “${label}”.`;
      const toastId = showUndo({message: text, undone: count > 1 ? `${plural(count, 'task')} put back.` : `“${label}” is back.`, undoLabel: count > 1 ? `Undo: put back ${plural(count, 'task')}` : `Undo: put back “${label}”`,
        restore: () => { removal = null; latest.current.update(r => restoreTasks(r, all)); }});
      removal = {toast: toastId, before: all, count};
      setStatus({text}); setError(''); return true;
    } catch (cause) { return fail(cause); }
  }, [guard, toast]);
  const remove = useCallback((t: Task) => removeIds([t.id], t.title), [removeIds]);
  const edit = useCallback((t: Task, patch: TaskPatch) => change(r => editTask(r, t.id, patch, tasksToday(), {allowPast: true}), `Saved “${patch.title?.trim() || t.title}”.`, `“${t.title}” is as it was.`), [change]);
  // Kept for the callers that still render an Undo next to their status line (now the toast carries it).
  const runUndo = useCallback(() => { const undo = status?.undo; setStatus(null); undo?.(); }, [status]);
  return {tasks, today, clock, status, error, setError, add, toggle, remove, removeIds, edit, change, quiet, runUndo, doneDay: deviceDay};
}
/** Restores exactly these tasks (and drops `added`), for a caller with its own snapshot. */
export const putBack = (before: readonly Task[], added: readonly string[] = []) => (r: Tasks) => restoreTasks(r, before, added);
