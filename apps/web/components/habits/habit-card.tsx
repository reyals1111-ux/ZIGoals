"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { visualTone } from "../visual-tone";
import { habitDay, habitRuleOn, habitStats, habitTargetPeriod, habitTrends, latestHabitRule, measurementUnit, scheduleLabel, type Habit, type HabitGoalLink } from "../../lib/habits";
import { addLocalDays, localDate, localWeekday } from "../../lib/local-date";
import type { HabitsStore } from "./use-habits";

const statusLabel = { complete: "Complete", partial: "Partial", due: "Due", skipped: "Skipped", failed: "Failed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Future", "not-started": "Before you started" };
function formatDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }); }
function moveMonth(month: string, amount: number) { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() + amount); return localDate(date).slice(0, 7); }
function targetCopy(habit: Habit) {
  const rule = latestHabitRule(habit); const unit = measurementUnit(rule); const period = habitTargetPeriod(rule);
  if (rule.type === "quit") return `Avoid ${unit || "the behavior"}`;
  if (rule.type === "limit") return `Limit ${rule.target}${unit ? ` ${unit}` : ""} per ${period}`;
  return `${rule.target}${unit ? ` ${unit}` : ""} per ${period}`;
}

export function HabitCompletion({ habit, store, compact = false }: { habit: Habit; store: HabitsStore; compact?: boolean }) {
  const day = habitDay(habit, store.today, store.today); const rule = latestHabitRule(habit); const unit = measurementUnit(rule);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [manual, setManual] = useState(String(day.count)); const timerStarted = useRef<number | null>(null); const [timing, setTiming] = useState(false);
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch { setError("Could not save this check-in. Try again."); } finally { setBusy(false); } }
  async function saveManual(event: FormEvent) { event.preventDefault(); await run(() => store.setValue(habit.id, store.today, Number(manual))); }
  function toggleTimer() {
    if (!timing) { timerStarted.current = Date.now(); setTiming(true); return; }
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - (timerStarted.current ?? Date.now())) / 60000)); setTiming(false); timerStarted.current = null;
    const value = rule.measurement.kind === "duration" && rule.measurement.unit === "hours" ? elapsedMinutes / 60 : elapsedMinutes;
    void run(() => store.addValue(habit.id, store.today, value));
  }
  if (!day.scheduled) return <span className={`habit-status habit-day-${day.status}`}>{statusLabel[day.status]}</span>;
  const smartLabel = rule.type === "quit" ? `Stayed on track for ${habit.title}` : rule.type === "limit" ? `Stayed within limit for ${habit.title}` : `${day.status === "complete" ? "Undo completion for" : "Complete"} ${habit.title}`;
  return <div className={`habit-completion ${compact ? "habit-completion-compact" : ""}`}>
    <div><div className="habit-count"><strong>{day.count}</strong><span> / {day.target}{unit ? ` ${unit}` : ""}{compact ? "" : ` per ${habitTargetPeriod(rule)}`}</span></div><small className={`habit-result habit-day-${day.status}`}>{statusLabel[day.status]}</small></div>
    <div className="habit-check-actions">
      {rule.measurement.kind === "count" && <button className="quiet" aria-label={`Remove one from ${habit.title}`} disabled={busy || day.count === 0} onClick={() => void run(() => store.adjustCount(habit.id, store.today, -1))}>−</button>}
      {rule.measurement.kind !== "boolean" && <button className="quiet" aria-label={rule.type === "quit" ? `Record one event for ${habit.title}` : `Add one to ${habit.title}`} disabled={busy} onClick={() => void run(() => store.addValue(habit.id, store.today, 1))}>+</button>}
      <button className={day.status === "complete" ? "secondary habit-done" : "primary"} aria-label={smartLabel} aria-pressed={day.status === "complete"} disabled={busy} onClick={() => void run(() => day.status === "complete" && rule.type === "build" ? store.setValue(habit.id, store.today, 0) : store.smartDone(habit.id, store.today))}>{busy ? "Saving…" : rule.type === "quit" ? "Stayed on track" : rule.type === "limit" ? "Within limit" : day.status === "complete" ? "✓ Done" : "Complete"}</button>
      {rule.measurement.kind === "duration" && !compact && <button className="quiet habit-timer" type="button" onClick={toggleTimer}>{timing ? "Stop & add timer" : "Start timer"}</button>}
    </div>
    {!compact && rule.measurement.kind !== "boolean" && <details className="habit-quick-log"><summary>Set or add a value</summary><form onSubmit={saveManual}><label className="field">Value for {habit.title}<input type="number" min={0} max={1_000_000_000} step={rule.measurement.kind === "count" ? 1 : "any"} value={manual} onChange={(event) => setManual(event.target.value)} /></label><div className="actions"><button className="secondary" type="submit">Set value</button><button className="quiet" type="button" onClick={() => void run(() => store.addValue(habit.id, store.today, Number(manual)))}>Add value</button></div></form></details>}
    {timing && <p className="fine habit-timer-note">Timer runs only while this page remains open. It is not a background reminder or native timer.</p>}
    {error && <p className="habit-inline-error" role="alert">{error}</p>}
  </div>;
}

function HabitHistory({ habit, store }: { habit: Habit; store: HabitsStore }) {
  const [month, setMonth] = useState(store.today.slice(0, 7)); const [selectedDate, setSelectedDate] = useState(store.today); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const first = `${month}-01`; const gridStart = addLocalDays(first, -((localWeekday(first) + 6) % 7)); const day = habitDay(habit, selectedDate, store.today); const rule = habitRuleOn(habit, selectedDate) ?? latestHabitRule(habit);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const mood = String(form.get("mood")) as "energized" | "good" | "neutral" | "difficult" | "calm" | "";
    setBusy(true); setMessage(""); setError(""); try { await store.setCount(habit.id, selectedDate, Number(form.get("count")), String(form.get("note")), mood || undefined); setMessage("Day saved."); } catch { setError("This day could not be saved. Choose a scheduled active day up to today."); } finally { setBusy(false); }
  }
  async function mark(status: "skipped" | "failed") { setBusy(true); setMessage(""); setError(""); try { await store.markDay(habit.id, selectedDate, status, day.note); setMessage(status === "skipped" ? "Day skipped." : "Day marked failed."); } catch { setError("This day could not be changed."); } finally { setBusy(false); } }
  function chooseDate(date: string) { if (!date) return; setSelectedDate(date); setMonth(date.slice(0, 7)); setMessage(""); setError(""); }
  return <div className="habit-history">
    <div className="habit-calendar-heading"><button className="quiet" aria-label={`Previous month for ${habit.title}`} disabled={month <= habit.startDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>←</button><strong>{new Date(`${first}T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button className="quiet" aria-label={`Next month for ${habit.title}`} disabled={month >= store.today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>→</button></div>
    <div className="habit-calendar" role="group" aria-label={`${habit.title} completion calendar`}>{["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <small aria-hidden="true" key={`label-${index}`}>{label}</small>)}{Array.from({ length: 42 }, (_, index) => {
      const date = addLocalDays(gridStart, index); const result = habitDay(habit, date, store.today); if (!date.startsWith(month)) return <span key={date} />;
      return <button key={date} type="button" className={`habit-calendar-day habit-day-${result.status}`} disabled={date > store.today || date < habit.startDate} aria-pressed={selectedDate === date} aria-label={`${formatDate(date)}: ${statusLabel[result.status]}, ${result.count} of ${result.target}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{result.status === "complete" && <span className="habit-calendar-check" aria-hidden="true">✓</span>}</button>;
    })}</div>
    <p className="habit-calendar-legend"><span>● Complete</span><span>◐ Partial</span><span>× Failed</span><span>○ Skipped</span><span>— Not scheduled</span></p>
    <form onSubmit={save} className="habit-day-editor" key={`${selectedDate}-${day.count}-${day.note}-${day.mood ?? ""}`}>
      <label className="field">Day to review<input type="date" required min={habit.startDate} max={store.today} value={selectedDate} onChange={(event) => chooseDate(event.target.value)} /></label>
      <p className={`habit-status habit-day-${day.status}`}>{statusLabel[day.status]} · Target {day.target} {measurementUnit(rule)}</p>
      <fieldset className="habit-form-fields" disabled={busy || !day.scheduled || selectedDate > store.today}>
        <label className="field">Value for this day<input name="count" aria-label="Count for this day" type="number" inputMode="decimal" min={0} max={1_000_000_000} step={rule.measurement.kind === "count" ? 1 : "any"} required defaultValue={day.count} /></label>
        <label className="field">Mood (optional)<select name="mood" defaultValue={day.mood ?? ""}><option value="">No mood tag</option><option value="energized">Energized</option><option value="good">Good</option><option value="calm">Calm</option><option value="neutral">Neutral</option><option value="difficult">Difficult</option></select></label>
        <label className="field">Day reflection (optional)<textarea name="note" rows={2} maxLength={2000} defaultValue={day.note} /></label>
        <div className="habit-history-actions"><button className="secondary" type="submit">{busy ? "Saving…" : "Save day"}</button><button className="quiet" type="button" onClick={() => void mark("skipped")}>Skip day</button><button className="quiet" type="button" onClick={() => void mark("failed")}>Mark failed</button></div>
      </fieldset>{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </form>
    <details className="habit-rule-history"><summary>Rule history</summary><ul>{habit.rules.map((item) => <li key={item.from}><time>{item.from}</time> · {item.state} · {item.type.toUpperCase()} · {scheduleLabel(item.schedule)} · {item.target} {measurementUnit(item)} per {habitTargetPeriod(item)}</li>)}</ul></details>
  </div>;
}

function HabitInsights({ habit, today }: { habit: Habit; today: string }) {
  const stats = habitStats(habit, today); const trends = habitTrends(habit, today);
  return <div className="habit-insights" aria-label={`${habit.title} insights`}>
    <div className="habit-metrics"><div><strong>{stats.currentStreak}<span> {stats.streakUnit}</span></strong><small>Current streak</small></div><div><strong>{stats.bestStreak}<span> {stats.streakUnit}</span></strong><small>Personal best</small></div><div><strong>{stats.completionPercentage}<span>%</span></strong><small>Completion</small></div></div>
    <div className="habit-trends">{trends.map((trend) => <div key={trend.period}><span><b>{trend.period}</b><small>{trend.success}/{trend.total}</small></span><i><span style={{ width: `${trend.percentage}%` }} /></i><strong>{trend.percentage}%</strong></div>)}</div>
    <p className="habit-distribution"><span>✓ {stats.successCount} success</span><span>× {stats.failCount} failed</span><span>○ {stats.skipCount} skipped</span></p>
  </div>;
}

export function HabitCard({ habit, store, scope, goalName, goalHref, stackName, onEdit }: { habit: Habit; store: HabitsStore; scope: Omit<HabitGoalLink, "goalId">; goalName?: string; goalHref?: string; stackName?: string; onEdit: () => void }) {
  const rule = latestHabitRule(habit); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const matchedGoal = habit.goalLink && habit.goalLink.chainId === scope.chainId && habit.goalLink.owner === scope.owner && goalName;
  async function state(next: "active" | "paused" | "archived") { setBusy(true); setError(""); try { await store.setState(habit.id, next); } catch { setError("The habit was not changed. Try again."); } finally { setBusy(false); } }
  return <article className={`panel habit-card habit-state-${rule.state}`} aria-label={habit.title} data-tone={visualTone(habit.id)}>
    <div className="habit-card-heading"><div><p className="eyebrow"><span className={`habit-type habit-type-${rule.type}`}>{rule.type.toUpperCase()}</span> · {habit.category} · {habit.timeOfDay}</p><h2>{habit.title}</h2><small>{scheduleLabel(rule.schedule)} · {targetCopy(habit)}</small></div><button className="quiet" onClick={onEdit} aria-label={`Edit ${habit.title}`}>Edit</button></div>
    {habit.description && <p className="habit-description">{habit.description}</p>}{stackName && <p className="habit-stack">After {stackName} → {habit.title}</p>}
    <HabitCompletion habit={habit} store={store} />
    <details className="habit-details habit-insight-details"><summary>Consistency &amp; trends</summary><HabitInsights habit={habit} today={store.today} /></details>
    <div className="habit-cadence" role="img" aria-label={`Last 28 days of ${habit.title}. Open History to review each day.`}>{Array.from({ length: 28 }, (_, index) => { const date = addLocalDays(store.today, index - 27); const result = habitDay(habit, date, store.today); return <span key={date} className={`habit-dot habit-day-${result.status}`} title={`${date}: ${statusLabel[result.status]}`} />; })}</div>
    {habit.goalLink && <p className="habit-goal-link">{matchedGoal && goalHref ? <Link href={goalHref}>Supports {goalName} ↗</Link> : "Goal link retained · another scope or unavailable Goal"}</p>}
    <details className="habit-details"><summary>History &amp; reflection</summary><HabitHistory habit={habit} store={store} /></details>
    {habit.notes && <details className="habit-details"><summary>Private habit notes</summary><p className="habit-notes">{habit.notes}</p></details>}
    <div className="habit-management"><button className="quiet" disabled={busy} onClick={() => void state(rule.state === "active" ? "paused" : "active")}>{rule.state === "archived" ? "Restore habit" : rule.state === "paused" ? "Resume habit" : "Pause habit"}</button>{rule.state !== "archived" && <button className="quiet" disabled={busy} onClick={() => void state("archived")}>Archive habit</button>}</div>{error && <p role="alert">{error}</p>}
  </article>;
}
