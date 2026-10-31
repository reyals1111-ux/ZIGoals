'use client';
import {useId, useRef, useState, type KeyboardEvent} from 'react';
import {dropOn, moveById, movedWords, reorderKey} from '../../lib/habits-order/reorder';
import {plainErrorMessage} from '../../lib/plain-error';
import './reorder.css';

/**
 * Session AK (5.7): put habits in your own order. Every row has Move up and Move down buttons (44 px); a focused row also
 * moves with Alt + ↑/↓ (Alt + Home/End: top or bottom); dragging a row onto another works with a mouse as an extra. Each
 * move is said in a live region and saved at once through `onReorder` (the caller writes the habit extras' `order`).
 */
export function HabitReorderList({habits, onReorder, onDone}: {habits: readonly {id: string; title: string}[]; onReorder: (ids: string[]) => void | Promise<void>; onDone?: () => void}) {
  const id = useId();
  const [said, setSaid] = useState(''), [error, setError] = useState(''), [dragged, setDragged] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const ids = habits.map(h => h.id), title = (habitId: string) => habits.find(h => h.id === habitId)?.title ?? 'Habit';
  async function move(next: string[], movedId: string) {
    if (next.join() === ids.join()) return;
    setError('');
    try { await onReorder(next); setSaid(movedWords(title(movedId), next, movedId)); requestAnimationFrame(() => rows.current.get(movedId)?.focus()); }
    catch (cause) { setError(plainErrorMessage(cause, 'The new order was not saved.')); }
  }
  function onKey(event: KeyboardEvent<HTMLLIElement>, habitId: string) {
    const by = reorderKey(event);
    if (by === null) return;
    event.preventDefault();
    void move(moveById(ids, habitId, by), habitId);
  }
  return <section className="habit-reorder" aria-labelledby={`${id}-title`}>
    <div className="habit-reorder-head"><h3 id={`${id}-title`}>Reorder habits</h3>{onDone && <button type="button" className="secondary" onClick={onDone}>Done</button>}</div>
    <p id={`${id}-hint`} className="habit-reorder-hint">Use the arrows, or focus a habit and press Alt with ↑ or ↓.</p>
    <ol className="habit-reorder-list" aria-describedby={`${id}-hint`}>
      {habits.map((habit, index) => <li key={habit.id} ref={el => { if (el) rows.current.set(habit.id, el); else rows.current.delete(habit.id); }} tabIndex={0} aria-label={`${habit.title}, position ${index + 1} of ${habits.length}`}
        data-dragging={dragged === habit.id ? 'true' : undefined} draggable onKeyDown={e => onKey(e, habit.id)}
        onDragStart={e => { setDragged(habit.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', habit.id); }}
        onDragOver={e => { if (dragged) e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); const from = dragged ?? e.dataTransfer.getData('text/plain'); setDragged(null); if (from) void move(dropOn(ids, from, habit.id), from); }}
        onDragEnd={() => setDragged(null)}>
        <span className="habit-reorder-grip" aria-hidden="true">⋮⋮</span>
        <span className="habit-reorder-title">{habit.title}</span>
        <span className="habit-reorder-buttons">
          <button type="button" className="quiet" disabled={index === 0} aria-label={`Move ${habit.title} up`} onClick={() => void move(moveById(ids, habit.id, -1), habit.id)}>↑</button>
          <button type="button" className="quiet" disabled={index === habits.length - 1} aria-label={`Move ${habit.title} down`} onClick={() => void move(moveById(ids, habit.id, 1), habit.id)}>↓</button>
        </span>
      </li>)}
    </ol>
    <p className="sr-only" role="status" aria-live="polite">{said}</p>
    {error && <p role="alert" className="habit-reorder-error">{error}</p>}
  </section>;
}
export default HabitReorderList;
