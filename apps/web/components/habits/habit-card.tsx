"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { visualTone } from "../visual-tone";
import { habitDay, habitStats, latestHabitRule, type Habit, type HabitGoalLink } from "../../lib/habits";
import { addLocalDays, localDate, localWeekday } from "../../lib/local-date";
import type { HabitsStore } from "./use-habits";

const statusLabel = { complete: "Complete", due: "Ready for today", missed: "Missed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Upcoming", "not-started": "Before you started" };
function formatDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }); }
function moveMonth(month: string, amount: number) {
  const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() + amount); return localDate(date).slice(0, 7);
}

export function HabitCompletion({ habit, store, compact = false }: { habit: Habit; store: HabitsStore; compact?: boolean }) {
  const day = habitDay(habit, store.today, store.today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch { setError("Could not save this check-in. Try again."); } finally { setBusy(false); } }
  if (!day.scheduled) return <span className="habit-status">{statusLabel[day.status]}</span>;
  return <div className={`habit-completion ${compact ? "habit-completion-compact" : ""}`}>
    <div className="habit-count"><strong>{day.count}</strong><span> / {day.target}{compact ? "" : " today"}</span></div>
    <div className="habit-check-actions">
      {day.target > 1 && <><button className="quiet" aria-label={`Remove one from ${habit.title}`} disabled={busy || day.count === 0} onClick={() => void run(() => store.adjustCount(habit.id, store.today, -1))}>−</button><button className="quiet" aria-label={`Add one to ${habit.title}`} disabled={busy || day.count >= 10000} onClick={() => void run(() => store.adjustCount(habit.id, store.today, 1))}>+</button></>}
      <button className={day.status === "complete" ? "secondary habit-done" : "primary"} aria-label={`${day.status === "complete" ? "Undo completion for" : "Complete"} ${habit.title}`} aria-pressed={day.status === "complete"} disabled={busy} onClick={() => void run(() => store.toggle(habit.id, store.today))}>{busy ? "Saving…" : day.status === "complete" ? "✓ Done" : "Complete"}</button>
    </div>
    {error && <p className="habit-inline-error" role="alert">{error}</p>}
  </div>;
}

function HabitHistory({ habit, store }: { habit: Habit; store: HabitsStore }) {
  const [month, setMonth] = useState(store.today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(store.today);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const first = `${month}-01`;
  const gridStart = addLocalDays(first, -((localWeekday(first) + 6) % 7));
  const day = habitDay(habit, selectedDate, store.today);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage(""); setError("");
    try { await store.setCount(habit.id, selectedDate, Number(form.get("count")), String(form.get("note"))); setMessage("Day saved."); } catch { setError("This day could not be saved. Choose a scheduled active day up to today."); } finally { setBusy(false); }
  }
  function chooseDate(date: string) { if (!date) return; setSelectedDate(date); setMonth(date.slice(0, 7)); setMessage(""); setError(""); }
  return <div className="habit-history">
    <div className="habit-calendar-heading"><button className="quiet" aria-label={`Previous month for ${habit.title}`} disabled={month <= habit.startDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>←</button><strong>{new Date(`${first}T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button className="quiet" aria-label={`Next month for ${habit.title}`} disabled={month >= store.today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>→</button></div>
    <div className="habit-calendar" role="group" aria-label={`${habit.title} completion calendar`}>
      {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <small aria-hidden="true" key={`label-${index}`}>{label}</small>)}
      {Array.from({ length: 42 }, (_, index) => {
        const date = addLocalDays(gridStart, index); const result = habitDay(habit, date, store.today);
        if (!date.startsWith(month)) return <span key={date} />;
        return <button key={date} type="button" className={`habit-calendar-day habit-day-${result.status}`} disabled={date > store.today || date < habit.startDate} aria-pressed={selectedDate === date} aria-label={`${formatDate(date)}: ${statusLabel[result.status]}, ${result.count} of ${result.target}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{result.status === "complete" && <span className="habit-calendar-check" aria-hidden="true">✓</span>}</button>;
      })}
    </div>
    <p className="habit-calendar-legend"><span>● Complete</span><span>◌ Missed</span><span>— Rest or paused</span></p>
    <form onSubmit={save} className="habit-day-editor" key={`${selectedDate}-${day.count}-${day.note}`}>
      <label className="field">Day to review<input type="date" required min={habit.startDate} max={store.today} value={selectedDate} onChange={(event) => chooseDate(event.target.value)} /></label>
      <p className="habit-status">{statusLabel[day.status]} · Target {day.target}{!day.scheduled && day.count > 0 ? ` · ${day.count} previously logged` : ""}</p>
      <fieldset className="habit-form-fields" disabled={busy || !day.scheduled || selectedDate > store.today}>
        <label className="field">Count for this day<input name="count" type="number" inputMode="numeric" min={0} max={10000} step={1} required defaultValue={day.count} /></label>
        <label className="field">Day note (optional)<textarea name="note" rows={2} maxLength={2000} defaultValue={day.note} /></label>
        <button className="secondary" type="submit">{busy ? "Saving…" : "Save day"}</button>
      </fieldset>
      {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </form>
    <details className="habit-rule-history"><summary>Schedule and pause history</summary><ul>{habit.rules.map((rule) => <li key={rule.from}><time>{rule.from}</time> · {rule.state} · {rule.schedule.kind === "daily" ? "Every day" : rule.schedule.days.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")} · Target {rule.target}</li>)}</ul></details>
  </div>;
}

export function HabitCard({ habit, store, scope, goalName, onEdit }: { habit: Habit; store: HabitsStore; scope: Omit<HabitGoalLink, "goalId">; goalName?: string; onEdit: () => void }) {
  const rule = latestHabitRule(habit);
  const stats = habitStats(habit, store.today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matchedGoal = habit.goalLink && habit.goalLink.chainId === scope.chainId && habit.goalLink.owner === scope.owner && goalName;
  async function state(next: "active" | "paused" | "archived") { setBusy(true); setError(""); try { await store.setState(habit.id, next); } catch { setError("The habit was not changed. Try again."); } finally { setBusy(false); } }
  return <article className={`panel habit-card habit-state-${rule.state}`} aria-label={habit.title} data-tone={visualTone(habit.id)}>
    <div className="habit-card-heading"><div><p className="eyebrow">{habit.category}<span aria-hidden="true"> · </span>{rule.schedule.kind === "daily" ? "Every day" : rule.schedule.days.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(" · ")}</p><h2>{habit.title}</h2></div><button className="quiet" onClick={onEdit} aria-label={`Edit ${habit.title}`}>Edit</button></div>
    {habit.description && <p className="habit-description">{habit.description}</p>}
    <HabitCompletion habit={habit} store={store} />
    <div className="habit-metrics"><div><strong>{stats.currentStreak}<span> days</span></strong><small>Current streak</small></div><div><strong>{stats.bestStreak}<span> days</span></strong><small>Personal best</small></div><div><strong>{stats.weeklyConsistency}<span>%</span></strong><small>{stats.weeklyCompleted}/{stats.weeklyScheduled} this week</small></div></div>
    <div className="habit-cadence" role="img" aria-label={`Last 28 days of ${habit.title}. Open History to review each day.`}>{Array.from({ length: 28 }, (_, index) => { const date = addLocalDays(store.today, index - 27); const result = habitDay(habit, date, store.today); return <span key={date} className={`habit-dot habit-day-${result.status}`} title={`${date}: ${statusLabel[result.status]}`} />; })}</div>
    {habit.goalLink && <p className="habit-goal-link">{matchedGoal ? <Link href={`/app/goals/${encodeURIComponent(habit.goalLink.goalId)}`}>Supports {goalName} ↗</Link> : "Goal link retained · another scope or unavailable Goal"}</p>}
    <details className="habit-details"><summary>History &amp; day notes</summary><HabitHistory habit={habit} store={store} /></details>
    {habit.notes && <details className="habit-details"><summary>Private habit notes</summary><p className="habit-notes">{habit.notes}</p></details>}
    <div className="habit-management"><button className="quiet" disabled={busy} onClick={() => void state(rule.state === "active" ? "paused" : "active")}>{rule.state === "archived" ? "Restore habit" : rule.state === "paused" ? "Resume habit" : "Pause habit"}</button>{rule.state !== "archived" && <button className="quiet" disabled={busy} onClick={() => void state("archived")}>Archive habit</button>}</div>
    {error && <p role="alert">{error}</p>}
  </article>;
}
