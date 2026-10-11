"use client";
import { useState, type FormEvent } from "react";
import type { Habit } from "../../lib/habits";
import { addLocalDays } from "../../lib/local-date";
import { storageMessageOr } from "../../lib/storage-error-copy";
import type { HabitCardStore } from "./use-habits";

const longDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
/** H1: "Plan a skip" under History & reflection: a future scheduled day marked skipped ahead of time, listed with its reason, removable. */
export function PlanSkip({ habit, store }: { habit: Habit; store: HabitCardStore }) {
  const [open, setOpen] = useState(false); const [date, setDate] = useState(""); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const planned = habit.entries.filter((entry) => entry.disposition === "skipped" && entry.date > store.today);
  const min = addLocalDays(store.today, 1), max = addLocalDays(store.today, 366);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try { await store.planSkip(habit.id, date, reason); setMessage(`Skip planned for ${longDate(date)}.`); setOpen(false); setDate(""); setReason(""); }
    catch (e) { setError(storageMessageOr(e, "The skip was not saved. Choose a scheduled day within the next year.")); } finally { setBusy(false); }
  }
  async function remove(day: string) {
    setBusy(true); setMessage(""); setError("");
    try { await store.unplanSkip(habit.id, day); setMessage(`Planned skip on ${longDate(day)} removed.`); } catch (e) { setError(storageMessageOr(e, "The planned skip was not removed.")); } finally { setBusy(false); }
  }
  return <div className="habit-plan-skip">
    {!open && <button type="button" className="quiet" disabled={busy} onClick={() => { setOpen(true); setMessage(""); }}>Plan a skip</button>}
    {open && <form onSubmit={save} className="habit-plan-skip-form" aria-label={`Plan a skip for ${habit.title}`}><fieldset disabled={busy} className="habit-form-fields">
      <label className="field">Day to skip<input type="date" required min={min} max={max} value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="field">Reason (optional)<input type="text" maxLength={100} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="A trip, a rest day" /></label>
      <p className="fine">A planned skip never breaks a streak, and no reminder shows that day. You can remove it any time.</p>
      <div className="actions"><button className="secondary" type="submit">{busy ? "Saving…" : "Save skip"}</button><button className="quiet" type="button" onClick={() => { setOpen(false); setError(""); }}>Cancel</button></div>
    </fieldset></form>}
    {planned.length > 0 && <ul className="habit-planned-skips" aria-label={`Planned skips for ${habit.title}`}>{planned.map((entry) => <li key={entry.date}><span>Planned: {entry.date}{entry.note && entry.note !== "Planned skip" ? ` · ${entry.note.replace(/^Planned skip · /, "")}` : ""}</span><button type="button" className="quiet" disabled={busy} onClick={() => void remove(entry.date)} aria-label={`Remove the planned skip on ${entry.date}`}>Remove</button></li>)}</ul>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
