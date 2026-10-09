"use client";
import { useState, type FormEvent } from "react";
import { habitTargetPeriod, latestHabitRule, upcomingVacation, type HabitData, type VacationRun } from "../../lib/habits";
import { addLocalDays } from "../../lib/local-date";
import { storageMessageOr } from "../../lib/storage-error-copy";

/** "12 Oct" or "12 Oct – 18 Oct", read in the day's own calendar (no zone shift). */
const dayText = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(Date.parse(`${date}T00:00:00Z`));
const runText = (run: VacationRun) => run.from === run.to ? dayText(run.from) : `${dayText(run.from)} – ${dayText(run.to)}`;
const dayCount = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
/**
 * H1: "Vacation days", from the Habits page header: every scheduled day in a range is marked skipped for the chosen
 * habits (today included, check-ins kept), so streaks hold and reminders stay quiet; the same range can be cleared.
 */
export function VacationPanel({ data, today, onMark, onClear, onClose }: { data: HabitData; today: string; onMark: (range: { from: string; to: string; habitIds: string[] }) => Promise<void>; onClear: (range: { from: string; to: string; habitIds: string[] }) => Promise<void>; onClose: () => void }) {
  const active = data.habits.filter((habit) => latestHabitRule(habit).state === "active");
  const [from, setFrom] = useState(today); const [to, setTo] = useState(addLocalDays(today, 6));
  const [chosen, setChosen] = useState(() => new Set(active.map((habit) => habit.id)));
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [marked, setMarked] = useState<{ from: string; to: string; habitIds: string[] } | null>(null);
  const max = addLocalDays(today, 366), ids = active.map((habit) => habit.id).filter((id) => chosen.has(id));
  async function mark(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    // Session X P2.1: a habit counted per week or month gets no skip days (its count spans the period), so the message
    // names only the habits that got them, and says what happened to the others.
    const periodic = ids.filter((id) => { const habit = active.find((h) => h.id === id); return !!habit && habitTargetPeriod(latestHabitRule(habit)) !== "day"; }).length, daily = ids.length - periodic, days = dayCount(from, to);
    try { await onMark({ from, to, habitIds: ids }); setMarked({ from, to, habitIds: ids }); setMessage(`${daily ? `Vacation marked for ${daily} ${daily === 1 ? "habit" : "habits"}, ${days} ${days === 1 ? "day" : "days"}.` : "No days were marked."}${periodic ? ` ${periodic} ${periodic === 1 ? "habit counts" : "habits count"} per week or month and ${periodic === 1 ? "keeps its" : "keep their"} own count; skip days don't apply to ${periodic === 1 ? "it" : "them"}.` : ""}`); }
    catch (e) { setError(storageMessageOr(e, "The vacation days were not saved. Choose days from today up to a year ahead.")); } finally { setBusy(false); }
  }
  // Session Y Part 8: vacation days marked earlier can be cleared later, stretch by stretch, from today on.
  const ahead = upcomingVacation(data, today);
  async function clearRun(run: VacationRun) {
    setBusy(true); setMessage(""); setError("");
    try { await onClear(run); if (marked && marked.from <= run.to && run.from <= marked.to) setMarked(null); setMessage(`Vacation days cleared: ${runText(run)}. Your own check-ins and skips were kept.`); } catch (e) { setError(storageMessageOr(e, "The vacation days were not cleared.")); } finally { setBusy(false); }
  }
  async function clear() {
    if (!marked) return; setBusy(true); setMessage(""); setError("");
    try { await onClear(marked); setMarked(null); setMessage("Vacation days cleared. Your own check-ins and skips were kept."); } catch (e) { setError(storageMessageOr(e, "The vacation days were not cleared.")); } finally { setBusy(false); }
  }
  return <section className="panel habit-vacation" aria-labelledby="habit-vacation-title">
    <div className="habit-section-heading"><div><p className="eyebrow">Time away</p><h2 id="habit-vacation-title">Vacation days</h2></div></div>
    <form onSubmit={mark}><fieldset disabled={busy} className="habit-form-fields">
      <div className="habit-form-grid"><label className="field">From<input type="date" required min={today} max={max} value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="field">To<input type="date" required min={from || today} max={max} value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
      <fieldset className="habit-vacation-habits"><legend>Habits</legend>{active.length ? active.map((habit) => <label key={habit.id}><input type="checkbox" checked={chosen.has(habit.id)} onChange={(event) => { const next = new Set(chosen); if (event.target.checked) next.add(habit.id); else next.delete(habit.id); setChosen(next); }} /><span>{habit.title}</span></label>) : <p className="fine">No active habits yet.</p>}</fieldset>
      <p className="fine">Scheduled days in this range are marked as skipped. Streaks don’t break on skipped days, and reminders stay quiet on them. Check-ins you already saved are kept.</p>
      <div className="actions"><button className="primary" type="submit" disabled={!ids.length}>{busy ? "Saving…" : "Mark vacation"}</button><button className="secondary" type="button" onClick={onClose}>{marked ? "Done" : "Cancel"}</button></div>
    </fieldset></form>
    {ahead.length > 0 && <div className="habit-vacation-ahead"><h3>Vacation days ahead</h3><ul>{ahead.map((run) => <li key={run.from}><span>{runText(run)} · {run.habitIds.length} {run.habitIds.length === 1 ? "habit" : "habits"}</span><button type="button" className="quiet" disabled={busy} aria-label={`Clear vacation days ${runText(run)}`} onClick={() => void clearRun(run)}>Clear</button></li>)}</ul></div>}
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {marked && <div className="habit-vacation-clear"><button type="button" className="quiet" disabled={busy} onClick={() => void clear()}>Clear vacation days</button><small>Removes the vacation entries of {marked.from} to {marked.to} from today on.</small></div>}
  </section>;
}
