'use client';
import {useCallback, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS, type Task, type Tasks} from '../../lib/tasks/schema';
import {addTask, editTask, finishTask, removeTask, reopenTask, restoreTask, type TaskInput} from '../../lib/tasks/engine';
import {localDate} from '../../lib/local-date';
import type {TaskPriority} from '../../lib/tasks/schema';

/**
 * Session AK (T1): the tasks record with its actions, each answered by one status line and, where it can be taken
 * back, an Undo. Used by the Tasks page, a goal's next actions, the Agenda and NOVA's widget, so every place says the
 * same words. Nothing is written over a record this device cannot read.
 */
export type TaskStatus = {text: string; undo?: () => void} | null;
export type TaskPatch = {title?: string; priority?: TaskPriority; due?: string | null; time?: string | null; goal?: string | null};
export function useTaskList() {
  const tasks = useDeviceRecord(TASKS), today = localDate();
  const [status, setStatus] = useState<TaskStatus>(null), [error, setError] = useState('');
  const change = useCallback((fn: (r: Tasks) => Tasks, text: string, undo?: () => void): boolean => {
    if (tasks.unreadable) { setError('Your tasks on this device could not be read, so nothing was changed.'); return false; }
    try { tasks.update(fn); setStatus({text, undo}); setError(''); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This could not be saved on this device.'); return false; }
  }, [tasks]);
  const add = useCallback((input: TaskInput): boolean => change(r => addTask(r, input, {id: `task_${crypto.randomUUID()}`, at: new Date(), today}), `Added “${input.title.trim()}”.`), [change, today]);
  const toggle = useCallback((t: Task, done: boolean) => done
    ? change(r => finishTask(r, t.id, new Date()), `Done: “${t.title}”.`, () => change(r => reopenTask(r, t.id), `“${t.title}” is open again.`))
    : change(r => reopenTask(r, t.id), `“${t.title}” is open again.`, () => change(r => finishTask(r, t.id, new Date()), `Done: “${t.title}”.`)), [change]);
  const remove = useCallback((t: Task) => change(r => removeTask(r, t.id), `Removed “${t.title}”.`, () => change(r => restoreTask(r, t), `“${t.title}” is back.`)), [change]);
  const edit = useCallback((t: Task, patch: TaskPatch) => change(r => editTask(r, t.id, patch, today), `Saved “${patch.title?.trim() || t.title}”.`, () => change(r => r.tasks.some(x => x.id === t.id) ? {...r, tasks: r.tasks.map(x => x.id === t.id ? t : x)} : r, `“${t.title}” is as it was.`)), [change, today]);
  const runUndo = useCallback(() => { const undo = status?.undo; setStatus(null); undo?.(); }, [status]);
  return {tasks, today, status, error, setError, add, toggle, remove, edit, runUndo};
}
