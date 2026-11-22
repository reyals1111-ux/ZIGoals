'use client';
import {lazy, Suspense, useMemo, useRef, useState} from 'react';
import {logHabitValue, type Habit} from '../../lib/habits';
import {cellWords} from '../../lib/habits-order/compact';
import {compactToggle, compactToggleWords} from '../../lib/habits-order/compact-toggle';
import {weekGrid} from '../../lib/habits-order/week-grid';
import {dayEdit} from '../../lib/habits-order/week-day-edit';
import {formatDate, formatWeekday} from '../../lib/visual-format';
import {showUndo} from '../ui/undo-toast';
import type {HabitsStore} from './use-habits';
import {useHabitExtrasContext} from './habit-extras-context';
import {HabitLookMark} from './habit-look-mark';
import './habit-week-grid.css';

const MissedWhy = lazy(() => import('./week-missed-why'));
const WeekDayEditor = lazy(() => import('./week-day-editor'));

/**
 * Session AV (owner follow-up 1, F-WEEK-GRID; Habitify): "This week, Monday to Sunday" on the Habits page — a table of
 * every habit by day, each open, missed or done day one tap (done fills it to its target, again takes it back), with the
 * app's toast and Undo, as the compact list does; the week before is one tap away. Skips and amounts stay in each
 * habit's History. Words in every cell's name, not only the mark. Lazy: loaded when the fold opens.
 * Session AV (q4 #30, #26, #32): the habit's name stays in view while the days scroll (a sticky first column that breaks
 * only between words), short day heads on a phone with a cue that the week goes on; a quit or limit habit's slip draws
 * a × (it was a blank like a future day); each name has its symbol; and the week's missed days offer "What got in the
 * way?" (its own chunk).
 * Session AV lane 2 (habits; QUALITY "Not fixed", q4 #30 Minor — Habitify skips and logs amounts per cell): "A tap on a
 * day" chooses between marking it done (as before, the default) and opening that day's Skip and amount panel
 * (week-day-editor.tsx, its own chunk); a right-click or a long press on a cell opens the panel in either mode.
 */
export default function HabitWeekGrid({habits, store}: {habits: readonly Habit[]; store: Pick<HabitsStore, 'data' | 'today' | 'update'>}) {
  const [offset, setOffset] = useState(0), [mode, setMode] = useState<'done' | 'day'>('done'), [open, setOpen] = useState<{habitId: string; date: string} | null>(null);
  const table = useRef<HTMLDivElement>(null);
  const close = () => { const was = open; setOpen(null); if (was) requestAnimationFrame(() => table.current?.querySelector<HTMLElement>(`[data-cell="${was.habitId}|${was.date}"]`)?.focus()); };
  const openDay = (habitId: string, date: string) => setOpen({habitId, date});
  const openHabit = open && habits.find(h => h.id === open.habitId);
  const grid = useMemo(() => weekGrid(habits, store.today, offset), [habits, store.today, offset]);
  const extras = useHabitExtrasContext(), looks = extras?.loaded && !extras.unreadable ? extras.data : null;
  async function toggle(habitId: string, date: string, done: boolean) {
    const habit = store.data.habits.find(h => h.id === habitId), change = habit && compactToggle(habit, date, store.today, done);
    if (!change) return;
    await store.update(d => logHabitValue(d, habitId, date, change.value));
    const words = compactToggleWords(change, date === store.today ? 'today' : formatDate(date, {weekday: true}));
    showUndo({message: words.message, undone: words.undone, restore: () => store.update(d => logHabitValue(d, habitId, date, change.before))});
  }
  return <div className="habit-week">
    <div className="habit-week-nav" role="group" aria-label="Which week">
      <button type="button" className="quiet" onClick={() => setOffset(o => Math.max(-12, o - 1))}>← Week before</button>
      <span>{formatDate(grid.days[0]!, {year: false})} – {formatDate(grid.days[6]!, {year: false})}</span>
      <button type="button" className="quiet" disabled={offset >= 0} onClick={() => setOffset(o => Math.min(0, o + 1))}>Next week →</button>
    </div>
    <fieldset className="habit-week-mode"><legend>A tap on a day</legend>
      <label className="checkbox"><input type="radio" name="habit-week-mode" checked={mode === 'done'} onChange={() => setMode('done')}/><span>Marks it done</span></label>
      <label className="checkbox"><input type="radio" name="habit-week-mode" checked={mode === 'day'} onChange={() => setMode('day')}/><span>Opens Skip and amount</span></label>
    </fieldset>
    <div ref={table} className="habit-week-scroll" role="region" tabIndex={0} aria-label="Habits this week, by day">
      <table className="habit-week-table"><caption className="sr-only">Each habit, Monday to Sunday: done, open, missed, skipped or not scheduled</caption>
        <thead><tr><th scope="col">Habit</th>{grid.days.map(d => <th key={d} scope="col" data-today={d === store.today || undefined}><span className="habit-week-day-long">{formatWeekday(d)}</span><span className="habit-week-day-short" aria-hidden="true">{formatWeekday(d).slice(0, 2)}</span><small> {Number(d.slice(8))}</small></th>)}</tr></thead>
        <tbody>{grid.rows.map(r => <tr key={r.id}><th scope="row" dir="auto"><HabitLookMark extras={looks} habitId={r.id}/>{r.title}</th>{r.cells.map(c => {
          const label = `${r.title}, ${formatDate(c.date, {weekday: true, year: false})}: ${cellWords(c.status)}`;
          const habit = habits.find(h => h.id === r.id), editable = !!habit && !!dayEdit(habit, c.date, store.today);
          const mark = c.status === 'skipped' || c.status === 'planned-skip' ? '–' : c.done ? '✓' : c.status === 'failed' ? (c.tappable ? '·' : '×') : '○';
          const isOpen = open?.habitId === r.id && open.date === c.date;
          return <td key={c.date} data-status={c.status}>{mode === 'day' && editable
            ? <button type="button" className="habit-week-cell" data-cell={`${r.id}|${c.date}`} aria-expanded={isOpen} aria-label={`${label}. Open Skip and amount`} onClick={() => openDay(r.id, c.date)}><span aria-hidden="true">{mark}</span></button>
            : c.tappable
            ? <button type="button" className="habit-week-cell" data-cell={`${r.id}|${c.date}`} aria-pressed={c.done} aria-label={label} onClick={() => void toggle(r.id, c.date, !c.done)} onContextMenu={e => { if (!editable) return; e.preventDefault(); openDay(r.id, c.date); }}><span aria-hidden="true">{c.done ? '✓' : c.status === 'failed' ? '·' : '○'}</span></button>
            : <span className="habit-week-cell is-still" role="img" aria-label={label}><span aria-hidden="true">{c.status === 'skipped' || c.status === 'planned-skip' ? '–' : c.done ? '✓' : c.status === 'failed' ? '×' : ''}</span></span>}</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
    <p className="habit-week-cue fine" aria-hidden="true">Swipe sideways for the rest of the week →</p>
    {mode === 'day' && !open && <p className="fine">Choose a day to skip it, set an amount, mark it done or clear it. Days after today and days not scheduled stay as they are.</p>}
    {open && openHabit && <Suspense fallback={<p className="fine">Opening the day…</p>}><WeekDayEditor key={`${open.habitId}|${open.date}`} habit={openHabit} date={open.date} store={store} onClose={close}/></Suspense>}
    <Suspense fallback={null}><MissedWhy rows={grid.rows} store={store}/></Suspense>
  </div>;
}
