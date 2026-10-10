'use client';
import { useId, useState } from "react";
import type { Habit } from "../../lib/habits";

/**
 * Session Z-Cloud Part 4.6 (persona item 6): the confirmation of "Delete for good", after the habit's name is typed. Its
 * name, notes and check-ins go everywhere this account syncs; the page offers Undo for ten seconds (lib/habit-delete.ts).
 * Loaded when the person opens it from an archived habit (habit-card.tsx).
 */
export default function HabitDeleteForm({ habit, onDelete, onCancel }: { habit: Habit; onDelete: (habit: Habit) => Promise<void>; onCancel: () => void }) {
  const [typed, setTyped] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), id = useId();
  const matches = typed.trim() === habit.title.trim();
  return <form className="habit-delete habit-delete-confirm" aria-label={`Delete ${habit.title} for good`} onSubmit={(event) => { event.preventDefault(); if (!matches || busy) return; setBusy(true); setError(""); onDelete(habit).catch((cause) => { setError(cause instanceof Error ? cause.message : "The habit was not deleted. Try again."); setBusy(false); }); }}>
    <p>This removes the habit’s name, notes and every check-in on every device you sync. Goals linked to it lose the link. You can undo for ten seconds.</p>
    <label className="field" htmlFor={id}>Type the habit’s name to confirm<input id={id} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} placeholder={habit.title} autoFocus /></label>
    <div className="actions"><button type="submit" className="primary" disabled={!matches || busy}>Delete for good</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
