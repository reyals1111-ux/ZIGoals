'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useTaskList} from '../tasks/use-task-list';
import {viewTasks} from '../../lib/tasks/engine';
import {dueText} from '../tasks/task-parts';
import {sectionsOf, sectionOfItem, removeItem, updateItem} from '../../lib/checklist/store';
import {ChecklistError} from '../../lib/checklist/store';
import {habitCalendarDay, logHabitValue} from '../../lib/habits';
import {addLocalDays} from '../../lib/local-date';
import {storageMessageOr} from '../../lib/storage-error-copy';
import type {DerivedDot} from '../../lib/checklist/derive';
import {removeWithUndo} from '../ui/remove-with-undo';
import {showUndo} from '../ui/undo-toast';
import type {ChecklistState} from './use-checklist';

/**
 * Session AL (Part 8) additions to the Checklist's List view only (O6: the path, river, labels, top bar and layout are
 * unchanged):
 * - "Tasks due today" (P-LS-54, LS-074): the to-do list's tasks due today or overdue, ticked here, opened in Tasks. The
 *   Checklist stays the daily routine; Tasks is the to-do list (DV-162).
 * - A row's More (P-LS-32, LS-019/LC-005): move it to another orbit, rename your own item, take it off the path (Undo),
 *   and "Done yesterday" for a habit you forgot to tick (P-LS-30, LS-032; Habits keeps the record, so its history and
 *   streak follow).
 */
const said = (e: unknown, fallback: string) => e instanceof ChecklistError ? e.message : storageMessageOr(e, e instanceof Error && e.message.length < 200 ? e.message : fallback);

export function ChecklistTasksToday() {
  const list = useTaskList(), {tasks, today, clock} = list;
  const due = useMemo(() => tasks.loaded && !tasks.unreadable ? viewTasks(tasks.data, {kind: 'today'}, today, clock) : [], [tasks.loaded, tasks.unreadable, tasks.data, today, clock]);
  if (!tasks.loaded || tasks.unreadable || (!due.length && !tasks.data.tasks.length)) return null;
  return <section className="checklist-list-section checklist-list-tasks" aria-labelledby="checklist-tasks-today">
    <div className="checklist-list-tasks-head"><h3 id="checklist-tasks-today">Tasks due today</h3><Link className="text-link" href="/app/tasks?view=today">Open Tasks →</Link></div>
    <p className="fine">From your to-do list. The Checklist is your daily routine; one-off to-dos live in Tasks.</p>
    {due.length ? <ul className="checklist-list-task-rows">{due.map(t => <li key={t.id}>
      <label><input type="checkbox" checked={false} onChange={() => list.toggle(t, true)} /><span dir="auto">{t.title}</span></label>
      <small>{dueText(t, today, clock)}</small></li>)}</ul> : <p className="fine">Nothing due today in Tasks.</p>}
    {list.error && <p role="alert">{list.error}</p>}
  </section>;
}

export function ListRowTools({state, dot}: {state: ChecklistState; dot: DerivedDot}) {
  const record = state.record, sections = sectionsOf(record.data), section = sectionOfItem(record.data, dot.item);
  const [name, setName] = useState(dot.label), [status, setStatus] = useState('');
  const write = (change: Parameters<typeof record.update>[0], words: string) => { try { record.update(change); setStatus(words); return true; } catch (e) { setStatus(said(e, 'Not saved on this device. Try again.')); return false; } };
  const habitId = dot.kind === 'habit' ? (dot.item.ref as {habitId?: string} | undefined)?.habitId : undefined;
  const yesterday = async () => {
    if (!habitId) return;
    const habits = state.stores.habits, now = new Date(), day = addLocalDays(habitCalendarDay(habits.data, now), -1);
    const before = habits.data.habits.find(h => h.id === habitId);
    try {
      await habits.update(h => logHabitValue(h, habitId, day, 1, {mode: 'add'}, now));
      const words = `${dot.label}: done yesterday, on Habits.`;
      setStatus(words);
      showUndo({message: words, undone: `${dot.label}: yesterday is as it was.`, restore: () => habits.update(h => before && h.habits.some(x => x.id === habitId) ? {...h, habits: h.habits.map(x => x.id === habitId ? before : x)} : h)});
    } catch (e) { setStatus(said(e, 'Yesterday could not be changed. Open Habits to change it.')); }
  };
  return <div className="checklist-row-tools" role="group" aria-label={`More for ${dot.label}`}>
    <label className="field">Orbit<select value={section} onChange={e => write(r => updateItem(r, dot.id, {section: e.target.value}), `${dot.label} moved to ${sections.find(s => s.id === e.target.value)?.label ?? 'that orbit'}.`)}>{sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    {dot.kind === 'custom' && <form className="checklist-row-rename" noValidate onSubmit={e => { e.preventDefault(); if (!name.trim()) { setStatus('An item needs a name.'); return; } write(r => updateItem(r, dot.id, {label: name}), `Renamed to ${name.trim()}.`); }}>
      <label className="field">Name<input dir="auto" value={name} maxLength={60} onChange={e => setName(e.target.value)} /></label><button type="submit" className="quiet">Rename</button></form>}
    {habitId && <button type="button" className="quiet" onClick={() => void yesterday()}>Done yesterday</button>}
    <button type="button" className="quiet" onClick={() => { removeWithUndo(record.update, r => removeItem(r, dot.id), `${dot.label} is off your path. Its records stay on its page.`, 'Back on your path.').catch(e => setStatus(said(e, 'Not saved on this device. Try again.'))); }}>Take off the path</button>
    <p className="fine" role="status">{status}</p>
  </div>;
}
