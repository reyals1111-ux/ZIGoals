'use client';
import {useId, useState} from 'react';
import {addLocalDays} from '../../lib/local-date';
import {COPY_MAX, clearDay, clearPlan, copyDay, copyPlan, dayTasks} from '../../lib/tasks/day-tools';
import type {Tasks} from '../../lib/tasks/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import '../tasks/tasks-r3.css';

/**
 * Session AV lane 2 (r3-plan, LEDGER #261; Structured's copy day and clear day): on the Agenda's day view (its own chunk),
 * "Copy this day to…" (the day's tasks made again on another day, keeping times and minutes) and "Clear this day" (its open
 * tasks to no day; nothing deleted). Each is one change with Undo in the Agenda's status line. Nothing when the day has no
 * task.
 */
type Change = (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
const newId = () => `task_${crypto.randomUUID()}`;
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export default function AgendaDayTools({day, today, record, change}: {day: string; today: string; record: Tasks; change: Change}) {
  const id = useId(), [to, setTo] = useState(() => addLocalDays(day, 1)), [error, setError] = useState('');
  // Review B3A-7: the buttons count what the change will do (subtasks in a copy; no repeating task in a clear).
  const all = dayTasks(record, day), willCopy = copyPlan(record, day), willClear = clearPlan(record, day);
  if (!all.length) return null;
  const words = (d: string) => d === today ? 'today' : formatDate(d, {weekday: true, year: d.slice(0, 4) !== today.slice(0, 4)});
  const copy = () => {
    setError('');
    let said = '';
    try {
      const probe = copyDay(record, day, to, {today, newId});
      said = `Copied ${plural(probe.copied, 'task')} to ${words(to)}${probe.repeating ? ` (${plural(probe.repeating, 'repeating task')} copied once, without the repeat)` : ''}.${probe.left ? ` A copy makes at most ${COPY_MAX} tasks: ${plural(probe.left, 'task was', 'tasks were')} left out.` : ''}`;
    } catch (e) { setError(e instanceof Error ? e.message : 'The day could not be copied on this device.'); return; }
    change(r => copyDay(r, day, to, {today, newId}).record, said, 'The copies are taken away.');
  };
  const clear = () => {
    setError('');
    const probe = clearDay(record, day);
    if (!probe.cleared) { setError(probe.repeating ? 'Only repeating tasks are open on this day; a repeat needs its day, so they stay.' : 'No open task on this day.'); return; }
    change(r => clearDay(r, day).record, `Cleared ${words(day)}: ${plural(probe.cleared, 'task')} moved to no day${probe.repeating ? `; ${plural(probe.repeating, 'repeating task')} kept ${probe.repeating === 1 ? 'its' : 'their'} day` : ''}. Nothing was deleted.`, 'The tasks are back on their day.');
  };
  return <details className="agenda-day-tools">
    <summary>Copy or clear this day</summary>
    <div className="agenda-day-tools-row">
      <label className="field" htmlFor={`${id}-to`}><span>Copy to</span><input id={`${id}-to`} type="date" value={to} onChange={e => { setTo(e.target.value); setError(''); }} /></label>
      <button type="button" className="secondary" disabled={!to || to === day} onClick={copy}>Copy {plural(willCopy.copied, 'task')} to {to && to !== day ? words(to) : 'that day'}</button>
    </div>
    {willCopy.left > 0 && <p className="fine" role="note">A copy makes at most {COPY_MAX} tasks, so {plural(willCopy.left, 'task')} of this day would be left out.</p>}
    <p className="fine">New tasks on that day with the same times, minutes, labels and notes. Subtasks come along; finished ones are copied open.</p>
    <div className="agenda-day-tools-row">
      <button type="button" className="secondary" disabled={!willClear.cleared} onClick={clear}>Clear this day{willClear.cleared ? ` (${plural(willClear.cleared, 'open task')})` : ''}</button>
      {willClear.repeating > 0 && <small className="fine">{plural(willClear.repeating, 'repeating task')} keep{willClear.repeating === 1 ? 's' : ''} {willClear.repeating === 1 ? 'its' : 'their'} day.</small>}
    </div>
    <p className="fine">Clearing moves the open tasks to no day (they stay in Tasks), with Undo. A repeating task keeps its day.</p>
    {error && <p className="tasks-field-error" role="alert">{error}</p>}
  </details>;
}
