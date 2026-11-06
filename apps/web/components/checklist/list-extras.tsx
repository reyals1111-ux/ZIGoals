'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {useTaskList} from '../tasks/use-task-list';
import {viewTasks} from '../../lib/tasks/engine';
import {dueText} from '../tasks/task-parts';
import {moveWithinSection, orderedItems, sectionsOf, sectionOfItem, removeItem, updateItem} from '../../lib/checklist/store';
import {ChecklistError} from '../../lib/checklist/store';
import {habitCalendarDay, logHabitValue, setHabitEntryStatus} from '../../lib/habits';
import {PATH_REMOVAL_STACK, fillOwnDay, keepPathPlaces, renameHabit, restoreDay, restoreHabit} from '../../lib/checklist/habit-undo';
import {zonedDay} from '../../lib/checklist/day';
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
 * - A row's More (P-LS-32, LS-019/LC-005): move it to another orbit, move it up or down (fourth pass, LS-H23), rename your
 *   own item or a habit (fourth pass), take it off the path (Undo), "Done yesterday" for your own item too (fourth pass),
 *   "Done yesterday" for a habit you forgot to tick (P-LS-30, LS-032) and "Skip today" (C-DVG-75); Habits keeps the record,
 *   so its history and streak follow.
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
  const habitId = dot.kind === 'habit' ? (dot.item.ref as {habitId?: string} | undefined)?.habitId : undefined;
  const habit = habitId ? state.stores.habits.data.habits.find(h => h.id === habitId) : undefined;
  const [name, setName] = useState(habit?.title ?? dot.label), [status, setStatus] = useState('');
  const write = (change: Parameters<typeof record.update>[0], words: string) => { try { record.update(change); setStatus(words); return true; } catch (e) { setStatus(said(e, 'Not saved on this device. Try again.')); return false; } };
  // Session AL fourth pass (LS-H23, C-LS-33): reorder in the List view too — Move up / Move down within the orbit (the
  // keyboard: Alt+↑/↓ on the row). The path shows the same order.
  const mates = orderedItems(record.data).filter(i => sectionOfItem(record.data, i) === section), at = mates.findIndex(i => i.id === dot.id);
  const move = (delta: -1 | 1) => { if (write(r => moveWithinSection(r, dot.id, delta), `${dot.label} moved ${delta < 0 ? 'up' : 'down'}.`)) requestAnimationFrame(() => document.querySelector<HTMLElement>(`.checklist-row-check[data-step="${CSS.escape(dot.id)}"]`)?.focus()); };
  const yesterday = async () => {
    if (!habitId) return;
    const habits = state.stores.habits, now = new Date(), day = addLocalDays(habitCalendarDay(habits.data, now), -1);
    const before = habits.data.habits.find(h => h.id === habitId);
    // Session AL fourth pass (LS-032): a habit made today has no yesterday; say so instead of doing nothing.
    if (before && before.startDate > day) { setStatus(`${dot.label} started today, so yesterday is not part of it.`); return; }
    try {
      await habits.update(h => logHabitValue(h, habitId, day, 1, {mode: 'add'}, now));
      const words = `${dot.label}: done yesterday, on Habits.`;
      setStatus(words);
      showUndo({message: words, undone: `${dot.label}: yesterday is as it was.`, restore: () => habits.update(h => restoreHabit(h, before))});
    } catch (e) { setStatus(said(e, 'Yesterday could not be changed. Open Habits to change it.')); }
  };
  // Session AL fourth pass (LS-032, C-LS-35): your own item done yesterday — yesterday's count goes up by one, with Undo.
  const ownYesterday = () => {
    if (!state.date) return;
    const day = addLocalDays(state.date, -1), addedDay = (at?: string) => at ? (state.dayZone ? zonedDay(new Date(at), state.dayZone) : at.slice(0, 10)) : null;
    const added = addedDay((dot.item as {addedAt?: string}).addedAt);
    if (added && added > day) { setStatus(`${dot.label} was added today, so yesterday is not part of it.`); return; }
    const own = record.data.items.filter(i => i.kind === 'custom' && (addedDay(i.addedAt) ?? day) <= day).length;
    const before = state.days.data.days[day];
    try {
      state.days.update(d => fillOwnDay(d, day, dot.id, own));
      const words = `${dot.label}: done yesterday, counted in yesterday’s orbits.`;
      setStatus(words);
      showUndo({message: words, undone: `${dot.label}: yesterday is as it was.`, restore: () => state.days.update(d => restoreDay(d, day, before))});
    } catch (e) { setStatus(said(e, 'Yesterday could not be changed on this device.')); }
  };
  // Session AL (C-DVG-75, C-LS-32, P-LS-32): skip today for a habit, as Habits records a skip (the streak follows its rule).
  const skipToday = async () => {
    if (!habitId) return;
    const habits = state.stores.habits, now = new Date(), day = habitCalendarDay(habits.data, now);
    const before = habits.data.habits.find(h => h.id === habitId);
    try {
      await habits.update(h => setHabitEntryStatus(h, habitId, day, 'skipped', 'Skipped from the Checklist', now));
      const words = `${dot.label}: skipped today, on Habits.`;
      setStatus(words);
      showUndo({message: words, undone: `${dot.label}: today is as it was.`, restore: () => habits.update(h => restoreHabit(h, before))});
    } catch (e) { setStatus(said(e, 'Today could not be skipped. Open Habits to change it.')); }
  };
  // Session AL fourth pass (LS-019 / LC-005): a habit is renamed here too; Habits keeps the name, with Undo.
  const renameOwnHabit = async () => {
    if (!habitId || !habit) return;
    const habits = state.stores.habits, before = habit, clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) { setStatus('A habit needs a name.'); return; }
    if (clean === before.title) { setStatus('That is its name already.'); return; }
    try {
      await habits.update(h => renameHabit(h, habitId, clean));
      const words = `Renamed to ${clean}, on Habits too.`;
      setStatus(words);
      showUndo({message: words, undone: `Its name is ${before.title} again.`, restore: () => habits.update(h => restoreHabit(h, before))});
    } catch (e) { setStatus(said(e, 'Not renamed. Open Habits to change it.')); }
  };
  return <div className="checklist-row-tools" role="group" aria-label={`More for ${dot.label}`}>
    <label className="field">Orbit<select value={section} onChange={e => write(r => updateItem(r, dot.id, {section: e.target.value}), `${dot.label} moved to ${sections.find(s => s.id === e.target.value)?.label ?? 'that orbit'}.`)}>{sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
    {mates.length > 1 && <span className="checklist-row-move" role="group" aria-label={`Order of ${dot.label}`}>
      <button type="button" className="quiet" disabled={at <= 0} aria-keyshortcuts="Alt+ArrowUp" onClick={() => move(-1)}>Move up</button>
      <button type="button" className="quiet" disabled={at < 0 || at >= mates.length - 1} aria-keyshortcuts="Alt+ArrowDown" onClick={() => move(1)}>Move down</button>
    </span>}
    {(dot.kind === 'custom' || habit) && <form className="checklist-row-rename" noValidate onSubmit={e => { e.preventDefault(); if (habit) { void renameOwnHabit(); return; } if (!name.trim()) { setStatus('An item needs a name.'); return; } write(r => updateItem(r, dot.id, {label: name}), `Renamed to ${name.trim()}.`); }}>
      <label className="field">Name<input dir="auto" value={name} maxLength={habit ? 100 : 60} onChange={e => setName(e.target.value)} /></label><button type="submit" className="quiet">Rename</button></form>}
    {habitId && <button type="button" className="quiet" onClick={() => void yesterday()}>Done yesterday</button>}
    {dot.kind === 'custom' && <button type="button" className="quiet" onClick={ownYesterday}>Done yesterday</button>}
    {habitId && dot.state !== 'done' && dot.counted && <button type="button" className="quiet" onClick={() => void skipToday()}>Skip today</button>}
    <button type="button" className="quiet" onClick={() => { removeWithUndo(keepPathPlaces(record.update), r => removeItem(r, dot.id), `${dot.label} is off your path. Its records stay on its page.`, 'Back on your path.', {stack: PATH_REMOVAL_STACK}).catch(e => setStatus(said(e, 'Not saved on this device. Try again.'))); }}>Take off the path</button>
    <p className="fine" role="status">{status}</p>
  </div>;
}
