'use client';
import { useId, useState } from "react";
import type { Habit } from "../../lib/habits";
import {plainErrorMessage} from "../../lib/plain-error";

/**
 * Session Z-Cloud Part 4.6 (persona item 6): the confirmation of "Delete for good", after the habit's name is typed. Its
 * name, notes and check-ins go everywhere this account syncs, and its settings stay without its name (what stays is listed in
 * lib/habit-delete.ts); the page offers Undo for ten seconds.
 * Loaded when the person opens it from an archived habit (habit-card.tsx).
 */
export default function HabitDeleteForm({ habit, onDelete, onCancel }: { habit: Habit; onDelete: (habit: Habit) => Promise<void>; onCancel: () => void }) {
  const [typed, setTyped] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), id = useId();
  // Session AL (DV-187b, P-DV-121): the name matches whatever its letter case (its emoji and spaces still count); the hint shows it.
  const matches = typed.trim().toLocaleLowerCase() === habit.title.trim().toLocaleLowerCase();
  return <form className="habit-delete habit-delete-confirm" aria-label={`Delete ${habit.title} for good`} onSubmit={(event) => { event.preventDefault(); if (!matches || busy) return; setBusy(true); setError(""); onDelete(habit).catch((cause) => { setError(plainErrorMessage(cause, "The habit was not deleted. Try again.")); setBusy(false); }); }}>
    {/* Session AL (DV-187a/c, P-DV-121): the promise first, short; what stays is said plainly after it. */}
    <p><strong>Delete “{habit.title}” for good?</strong> Its name, notes and every check-in are removed here and on every device you sync. You can undo for ten seconds.</p>
    <p className="fine">Goals and Health stop using it. Only an unnamed placeholder stays, so your devices stay in step. Older protected copies, and ZIGi’s chats and notes on this device, keep what they already hold.</p>
    <label className="field" htmlFor={id}>Type the habit’s name to confirm<small className="habit-delete-hint">Type “{habit.title}” (capital letters don’t matter)</small><input id={id} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} placeholder={habit.title} autoFocus /></label>
    <div className="actions"><button type="submit" className="primary" disabled={!matches || busy}>Delete for good</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
