'use client';
import {useId} from 'react';
import {minutesWords} from '../../lib/tasks/minutes';
import {MAX_AFTER, type Task, type Tasks} from '../../lib/tasks/schema';
import './tasks-r4.css';

/**
 * Session AV lane 2 (r4-plan; Motion), in the task editor, its own chunk: how Plan my day and Plan my week treat the task —
 * in pieces of at least a length (LEDGER #303, Motion's chunks), waiting for up to three other tasks (LEDGER #304, Motion's
 * blockers: not in Today and not placed until they are done) and "after hours" (LEDGER #301: placed in the evening hours).
 * The editor keeps the values and saves them with the rest.
 */
export const CHUNK_CHOICES = [15, 30, 45, 60, 90, 120, 180, 240] as const;
export type PlanFields = {chunk: string; after: string[]; afterHours: boolean};
export default function TaskPlanFields({task, record, minutes, value, onChange}: {task: Task; record?: Tasks; minutes: number | null; value: PlanFields; onChange: (v: PlanFields) => void}) {
  const id = useId();
  // Only one-off open tasks can be waited for (a repeat never finishes for good), never this task, and never one that waits for it.
  const choices = (record?.tasks ?? []).filter(t => t.id !== task.id && !t.doneAt && !t.recur && !t.after?.includes(task.id));
  const slots = value.after.length < MAX_AFTER ? [...value.after, ''] : value.after;
  const setAfter = (i: number, v: string) => { const next = [...value.after]; if (v) next[i] = v; else next.splice(i, 1); onChange({...value, after: [...new Set(next.filter(Boolean))]}); };
  const chunk = Number(value.chunk) || 0;
  return <fieldset className="task-plan-fields" aria-describedby={`${id}-note`}>
    <legend>Planning — optional</legend>
    <label className="field"><span>In pieces of</span><select value={value.chunk} aria-describedby={`${id}-chunk`} onChange={e => onChange({...value, chunk: e.target.value})}>
      <option value="">Whole (one block)</option>{CHUNK_CHOICES.map(n => <option key={n} value={n}>{minutesWords(n)} or more</option>)}</select>
      <small id={`${id}-chunk`} className="tasks-field-note">{chunk ? minutes && minutes > chunk ? `Placed in ${Math.ceil(minutes / chunk)} pieces (“part 1 of ${Math.ceil(minutes / chunk)}”); time spent counts against the whole.` : `Pieces apply once it takes longer than ${minutesWords(chunk)} (set “Takes”).` : 'A long task can go in pieces across the free time of the week.'}</small></label>
    {slots.map((v, i) => <label key={i} className="field"><span>{i === 0 ? 'Waits for' : `Also waits for`}</span><select value={v} onChange={e => setAfter(i, e.target.value)}>
      <option value="">{i === 0 || !v ? 'Nothing' : 'Remove this one'}</option>
      {v && !choices.some(t => t.id === v) && <option value={v}>{record?.tasks.find(t => t.id === v)?.title ?? 'A task no longer here'}</option>}
      {choices.filter(t => t.id === v || !value.after.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>)}
    <label className="task-editor-check"><input type="checkbox" checked={value.afterHours} onChange={e => onChange({...value, afterHours: e.target.checked})} /> <span>After hours: plan it in my evening hours, not my working hours</span></label>
    <small id={`${id}-note`} className="tasks-field-note">{value.after.length ? 'While those are open, this task waits: it is not in Today and is not placed. It joins its day once they are done.' : 'Waiting for another task keeps this one out of Today until that one is done.'}</small>
  </fieldset>;
}
