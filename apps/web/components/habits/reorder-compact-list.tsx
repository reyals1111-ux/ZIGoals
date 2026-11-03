'use client';
import {useState} from 'react';
import {cellWords, type CompactRow} from '../../lib/habits-order/compact';
import {formatDate, formatWeekday} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import './reorder.css';

/**
 * Session AK (5.7): the Habits page's compact list mode: one row per habit (in the person's order) with its last five
 * days as 44 px check boxes, today last, so a missed day is one tap (Loop). A tap calls `onToggle` with the habit and the
 * day; the caller writes it through the habits store (complete → its target; done → back to not done) with the app's
 * toast and Undo. Days that cannot change (not scheduled, skipped, paused, a quit or limit habit) are shown, not tappable.
 */
export function CompactHabitList({rows, onToggle, onOpen}: {rows: readonly CompactRow[]; onToggle: (habitId: string, date: string, done: boolean) => void | Promise<void>; onOpen?: (habitId: string) => void}) {
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState('');
  if (!rows.length) return <p className="habit-compact-empty">No habits yet. Start with one small one, for example “Drink a glass of water”.</p>;
  const days = rows[0]!.cells.map(c => c.date);
  async function toggle(row: CompactRow, date: string, done: boolean) {
    const key = `${row.id}:${date}`;
    setBusy(key); setError('');
    try { await onToggle(row.id, date, done); } catch (cause) { setError(plainErrorMessage(cause, 'That day was not saved.')); } finally { setBusy(null); }
  }
  return <div className="habit-compact">
    <table className="habit-compact-table">
      <caption className="sr-only">Your habits over the last {days.length} days</caption>
      <thead><tr><th scope="col">Habit</th>{days.map((d, i) => <th scope="col" key={d}><abbr title={formatDate(d, {weekday: true})}>{i === days.length - 1 ? 'Today' : formatWeekday(d)}</abbr></th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} data-today={row.today}>
        <th scope="row">{onOpen ? <button type="button" className="habit-compact-title" onClick={() => onOpen(row.id)}>{row.title}</button> : <span className="habit-compact-title">{row.title}</span>}</th>
        {row.cells.map(cell => {
          const label = `${row.title}, ${formatDate(cell.date, {weekday: true})}: ${cellWords(cell.status)}`;
          return <td key={cell.date} data-status={cell.status}>{cell.tappable
            ? <button type="button" className="habit-compact-cell" aria-pressed={cell.done} aria-label={label} disabled={busy !== null} aria-busy={busy === `${row.id}:${cell.date}` || undefined} onClick={() => void toggle(row, cell.date, !cell.done)}><span aria-hidden="true">{cell.done ? '✓' : cell.status === 'partial' ? '◐' : ''}</span></button>
            : <span className="habit-compact-cell is-static" role="img" aria-label={label}><span aria-hidden="true">{cell.status === 'skipped' || cell.status === 'planned-skip' ? '–' : cell.done ? '✓' : '·'}</span></span>}</td>;
        })}
      </tr>)}</tbody>
    </table>
    {error && <p role="alert" className="habit-reorder-error">{error}</p>}
  </div>;
}
/** The switch between the cards and the compact list (a display choice on this device). */
export function HabitListModeSwitch({mode, onChange}: {mode: 'cards' | 'compact'; onChange: (mode: 'cards' | 'compact') => void}) {
  return <div className="habit-list-mode" role="group" aria-label="Show habits as">
    <button type="button" className="quiet" aria-pressed={mode === 'cards'} onClick={() => onChange('cards')}>Cards</button>
    <button type="button" className="quiet" aria-pressed={mode === 'compact'} onClick={() => onChange('compact')}>Compact</button>
  </div>;
}
export default CompactHabitList;
