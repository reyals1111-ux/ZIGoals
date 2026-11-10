'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {formatDateLong} from '../../lib/visual-format';
import {zonedDay} from '../../lib/checklist/day';
import {restoreDay, restoreHabit} from '../../lib/checklist/habit-undo';
import {FILL_BACK_DAYS, countHabitFill, fillCustomDay, fillHabitDay, pastDayRows, type PastRow} from '../../lib/checklist/past-day';
import {ChecklistError} from '../../lib/checklist/store';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {showUndo} from '../ui/undo-toast';
import type {ChecklistState} from './use-checklist';

const said = (e: unknown, fallback: string) => e instanceof ChecklistError ? e.message : storageMessageOr(e, e instanceof Error && e.message.length < 200 ? e.message : fallback);

/**
 * Session AL fifth pass (LS-032 / C-LS-35): one past day's own items, opened from its square in the history (or the day
 * buttons under it). Each habit and own item that was on the path that day says how it stands, and one not done can be
 * marked done, with Undo. The rules live in lib/checklist/past-day.ts.
 */
export function PastDay({state, date, onClose}: {state: ChecklistState; date: string; onClose: () => void}) {
  const habits = state.stores.habits, [status, setStatus] = useState(''), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({preventScroll: false}); }, [date]);
  const addedDay = (at?: string) => at ? (state.dayZone ? zonedDay(new Date(at), state.dayZone) : at.slice(0, 10)) : null;
  const rows = habits.loaded && habits.today ? pastDayRows(state.record.data, state.days.data, habits.data, date, habits.today, addedDay) : [];
  const when = formatDateLong(date);
  const fill = async (row: PastRow) => {
    const daysBefore = state.days.data.days[date];
    if (row.kind === 'custom') {
      const own = state.record.data.items.filter(i => i.kind === 'custom' && (addedDay(i.addedAt) ?? date) <= date).length;
      try { state.days.update(d => fillCustomDay(d, date, row.id, own)); }
      catch (e) { setStatus(said(e, 'That day could not be changed on this device.')); return; }
      const words = `${row.label}: done on ${when}, counted in that day’s orbits.`;
      setStatus(words);
      showUndo({message: words, undone: `${row.label}: ${when} is as it was.`, restore: () => state.days.update(d => restoreDay(d, date, daysBefore))});
      return;
    }
    const before = habits.data.habits.find(h => h.id === row.habitId);
    try { await habits.update(h => fillHabitDay(h, row.habitId!, date)); }
    catch (e) { setStatus(said(e, 'That day could not be changed. Open Habits to change it.')); return; }
    // (The day's square counts it too, when the history sealed that day.)
    try { state.days.update(d => countHabitFill(d, date, row.id)); } catch { /* Habits has it; only the square stays as it was */ }
    const words = `${row.label}: done on ${when}, on Habits.`;
    setStatus(words);
    showUndo({message: words, undone: `${row.label}: ${when} is as it was.`, restore: async () => { await habits.update(h => restoreHabit(h, before)); state.days.update(d => restoreDay(d, date, daysBefore)); }});
  };
  return <section className="checklist-past-day" aria-labelledby="checklist-past-day-title">
    <div className="checklist-past-day-head">
      <h3 id="checklist-past-day-title" ref={heading} tabIndex={-1}>{when}</h3>
      <button type="button" className="quiet" onClick={onClose}>Close</button>
    </div>
    <p className="fine">Fill in what you did but did not tick. The last {FILL_BACK_DAYS} days can be filled in; older days stay as they were. Habits keep the record on Habits, so their streak and history follow; your own items add to that day’s count. Goals and Health items change on their own pages.</p>
    {!habits.loaded ? <p className="fine" role="status">Reading Habits…</p> : rows.length ? <ul className="checklist-past-day-rows">{rows.map(row => <li key={row.id} data-state={row.state}>
      <span className="checklist-past-day-name" dir="auto">{row.label}<small>{row.kind === 'habit' ? 'Habit' : 'Your own'} · {row.note}</small></span>
      {row.state === 'open' ? <button type="button" className="quiet" aria-label={`${row.label}: done on ${when}`} onClick={() => void fill(row)}>Done that day</button>
        : row.state === 'rest' && row.kind === 'habit' ? <Link className="text-link" href="/app/habits">Habits</Link> : <span aria-hidden="true">✓</span>}
    </li>)}</ul> : <p className="fine">No habits or own items were on your path that day.</p>}
    <p className="fine" role="status">{status}</p>
  </section>;
}
