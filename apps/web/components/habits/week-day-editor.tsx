'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {restoreHabitEntry, type Habit} from '../../lib/habits';
import {readHabitValueText} from '../../lib/habit-number';
import {applyDayChoice, dayChoiceWords, dayEdit, entryBefore, type DayChoice} from '../../lib/habits-order/week-day-edit';
import {cellWords} from '../../lib/habits-order/compact';
import {formatDate} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {showUndo} from '../ui/undo-toast';
import type {HabitsStore} from './use-habits';

/**
 * Session AV lane 2 (habits pillar; QUALITY "Not fixed", q4 #30 — Habitify's per-cell menu): one day of the week grid,
 * opened from its cell while "A tap on a day opens Skip and amount" is chosen (or with a right-click or a long press on
 * a phone): Done, Skip this day, an amount for a habit that counts (times, minutes, a quantity), Clear the day, each
 * with the app's toast and Undo. The focus moves to the panel's heading, and back to the cell on Close or Escape.
 * Lazy: its own chunk, loaded on the first open.
 */
export default function WeekDayEditor({habit, date, store, onClose}: {habit: Habit; date: string; store: Pick<HabitsStore, 'data' | 'today' | 'update'>; onClose: () => void}) {
  const edit = dayEdit(habit, date, store.today), heading = useRef<HTMLHeadingElement>(null);
  const [amount, setAmount] = useState(() => edit && edit.count > 0 && !edit.skipped ? String(edit.count) : ''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { heading.current?.focus(); }, [habit.id, date]);
  const dayWords = date === store.today ? 'today' : formatDate(date, {weekday: true, year: false});
  async function choose(choice: DayChoice) {
    setError(''); setBusy(true);
    const before = entryBefore(store.data, habit.id, date);
    try {
      await store.update(d => applyDayChoice(d, habit.id, date, choice));
      showUndo({message: dayChoiceWords(habit.title, dayWords, choice, edit?.unit ?? ''), undone: `${habit.title}: ${dayWords} is back as it was.`, restore: () => store.update(d => restoreHabitEntry(d, habit.id, date, before))});
      onClose();
    } catch (e) { setError(plainErrorMessage(e, 'This day could not be changed.')); }
    finally { setBusy(false); }
  }
  function saveAmount(event: FormEvent) {
    event.preventDefault();
    if (!edit) return;
    let value: number;
    try { value = readHabitValueText(amount, {kind: edit.kind, unit: edit.unit}); } catch (e) { setError(plainErrorMessage(e, 'Enter a number.')); return; }
    void choose({kind: 'amount', value});
  }
  const id = `week-day-${habit.id}-${date}`;
  if (!edit) return <section className="habit-week-day" aria-labelledby={`${id}-title`} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <h3 id={`${id}-title`} tabIndex={-1} ref={heading}>{habit.title}, {formatDate(date, {weekday: true, year: false})}</h3>
    <p>This day cannot be changed from the week: it is not a scheduled day up to today of an active habit you build. Its History has every day.</p>
    <div className="actions"><button type="button" className="secondary" onClick={onClose}>Close</button></div>
  </section>;
  const unitWords = edit.kind === 'duration' ? (edit.unit === 'hours' ? 'hours' : 'minutes') : edit.unit;
  return <section className="habit-week-day" aria-labelledby={`${id}-title`} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}>
    <h3 id={`${id}-title`} tabIndex={-1} ref={heading}>{habit.title}, {formatDate(date, {weekday: true, year: false})}</h3>
    <p className="fine">Now: {cellWords(edit.status as Parameters<typeof cellWords>[0])}{edit.amount && edit.count > 0 && !edit.skipped ? ` · ${edit.count.toLocaleString('en-US', {maximumFractionDigits: 2})} of ${edit.target.toLocaleString('en-US', {maximumFractionDigits: 2})}${unitWords ? ` ${unitWords}` : ''}` : ''}</p>
    <div className="actions">
      <button type="button" className="primary" disabled={busy || edit.status === 'complete'} onClick={() => void choose({kind: 'done'})}>Done</button>
      {edit.canSkip && <button type="button" className="secondary" disabled={busy || edit.skipped} onClick={() => void choose({kind: 'skip'})}>Skip this day</button>}
      <button type="button" className="quiet" disabled={busy || (edit.count === 0 && edit.status !== 'skipped' && edit.status !== 'complete')} onClick={() => void choose({kind: 'clear'})}>Clear the day</button>
      <button type="button" className="quiet" onClick={onClose}>Close</button>
    </div>
    {edit.amount && <form className="habit-week-amount" onSubmit={saveAmount}>
      <label className="field">Amount{unitWords ? ` (${unitWords})` : ''}<input type="text" inputMode={edit.kind === 'count' ? 'numeric' : edit.kind === 'duration' ? 'text' : 'decimal'} autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)}/></label>
      {edit.kind === 'duration' && <small className="fine">{edit.unit === 'hours' ? 'Hours' : 'Minutes'}, or a time like 1:30 or 1 h 30 min.</small>}
      <button type="submit" className="secondary" disabled={busy}>Set amount</button>
    </form>}
    {!edit.canSkip && <p className="fine">This habit counts per week or month, so a day is skipped in its History.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
