"use client";
import type { LayoutAttrs } from "../layout-edit";
import { memo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {PinToToday} from "../pin-to-today";
import {LinkedGoalReview} from './linked-goal-review';
import type {PrivateGoal} from '../../lib/positions';
import {HabitTimer} from "./habit-timer";
import { GlassBar } from "../progress/glass-progress";
import {earliestHabitChange,habitEditFingerprint} from "../../lib/habit-actions";
import { visualTone } from "../visual-tone";
import { habitDay, habitRuleOn, habitStats, habitTargetPeriod, habitTrends, latestHabitRule, measurementUnit, scheduleLabel, type Habit, type HabitData, type HabitGoalLink } from "../../lib/habits";
import { addLocalDays, localDate, localWeekday } from "../../lib/local-date";
import { formNumberText, readFormNumber } from "../../lib/decimal-input";
import { habitCheckIn, type HabitCardStore } from "./use-habits";
import { formatDate, formatDateTime, formatPlainDecimal } from "../../lib/visual-format";
import { unitFor } from "../../lib/plural";
import { checkInFailureMessage, storageMessageOr } from "../../lib/storage-error-copy";

const statusLabel = { complete: "Complete", partial: "Partial", due: "Due", skipped: "Skipped", failed: "Failed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Future", "not-started": "Before you started" };
/** A count or amount as typed data shows it ("1.5"), with the display locale's decimal sign. */
const plain = (value: number) => formatPlainDecimal(String(value));
function longDate(date: string) { return formatDate(`${date}T12:00:00`, { month: "long", day: "numeric", year: "numeric" }); }
function moveMonth(month: string, amount: number) { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() + amount); return localDate(date).slice(0, 7); }
function targetCopy(habit: Habit,today:string) {
  const rule = habitRuleOn(habit,today)??habit.rules[0]!; const unit = measurementUnit(rule); const period = habitTargetPeriod(rule);
  if (rule.type === "quit") return `Avoid ${unit || "the behavior"}`;
  if (rule.type === "limit") return `Limit ${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} per ${period}`;
  return `${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} per ${period}`;
}

/** Runs once the next frame has painted; a hidden tab paints no frames, so a short timer stands in. */
function afterPaint(run: () => void) {
  let done = false; const once = () => { if (!done) { done = true; run(); } };
  requestAnimationFrame(() => setTimeout(once, 0)); setTimeout(once, 100);
}
export function HabitCompletion({ habit, store, compact = false }: { habit: Habit; store: HabitCardStore; compact?: boolean }) {
  // Paint first, then save (Session I, Part 9): a tap shows its result on the next frame, and the save runs after that
  // frame. If the save fails, the card returns to what is saved and says why (Part 5's coded message), so a check-in is
  // never left showing as saved when it was not.
  const [pending, setPending] = useState<Habit | null>(null);
  const shown = pending ?? habit;
  const day = habitDay(shown, store.today, store.today); const rule = habitRuleOn(shown,store.today)??shown.rules[0]!; const unit = measurementUnit(rule);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [manual, setManual] = useState(() => formNumberText(day.count));
  // Taps while a check-in saves (Session K, QA sweep 2). Paint-first keeps the buttons enabled during that save, and
  // such a tap used to be ignored without a word. Now it shows at once on top of what is shown and is saved right after
  // the save before it, in order. A refused save shows what is saved, says why, and drops the taps still waiting.
  const checkIns = useRef<{ saving: boolean; shown: Habit | null; waiting: ((data: HabitData) => HabitData)[] }>({ saving: false, shown: null, waiting: [] });
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (error) { setError(checkInFailureMessage(error)); } finally { setBusy(false); } }
  // The change applied to this habit alone (only the changed habit is validated again, lib/habits.ts), or undefined if
  // it is refused: then nothing is painted early and the save reports why.
  function preview(change: (data: HabitData) => HabitData, base: Habit): Habit | undefined {
    try { return change({ schemaVersion: 2, kind: "zigoals-habits", habits: [base], ...(store.data.timeZone ? { timeZone: store.data.timeZone } : {}) }).habits[0]; } catch { return undefined; }
  }
  function checkIn(change: (data: HabitData) => HabitData) {
    const queue = checkIns.current;
    if (queue.saving) {
      const next = queue.shown ? preview(change, queue.shown) : undefined;
      queue.waiting.push(change);
      if (next) { queue.shown = next; setPending(next); }
      return;
    }
    if (busy) return;
    const next = preview(change, habit);
    queue.saving = true; queue.shown = next ?? null;
    setBusy(true); setError(""); setPending(next ?? null);
    afterPaint(() => void save(change));
  }
  async function save(change: (data: HabitData) => HabitData) {
    const queue = checkIns.current;
    try { await store.update(change); } catch (error) { queue.waiting = []; settled(); setError(checkInFailureMessage(error)); return; }
    const next = queue.waiting.shift();
    if (next) void save(next); else settled();
  }
  function settled() { const queue = checkIns.current; queue.saving = false; queue.shown = null; setPending(null); setBusy(false); }
  // Typed values follow Health's decimal-comma rule ("0,5" is 0.5; "1,234" is refused with a reason).
  function typed() { try { return readFormNumber(manual, { max: 1_000_000_000, whole: rule.measurement.kind === "count" }); } catch (e) { setError(e instanceof Error ? e.message : "Enter a number."); return null; } }
  async function saveManual(event: FormEvent) { event.preventDefault(); const value = typed(); if (value !== null) await run(() => store.setValue(habit.id, store.today, value)); }
  async function addManual() { const value = typed(); if (value !== null) await run(() => store.addValue(habit.id, store.today, value)); }
  if (!day.scheduled) return <span className={`habit-status habit-day-${day.status}`}>{statusLabel[day.status]}</span>;
  const smartLabel = rule.type === "quit" ? `Stayed on track for ${habit.title}` : rule.type === "limit" ? `Stayed within limit for ${habit.title}` : `${day.status === "complete" ? "Undo completion for" : "Complete"} ${habit.title}`;
  return <div className={`habit-completion ${compact ? "habit-completion-compact" : ""}`}>
    <div><div className="habit-count"><strong>{plain(day.count)}</strong><span> / {plain(day.target)}{unit ? ` ${unitFor(day.target, unit)}` : ""}{compact ? "" : ` per ${habitTargetPeriod(rule)}`}</span></div><small className={`habit-result habit-day-${day.status}`}>{statusLabel[day.status]}</small></div>
    <div className="habit-check-actions">
      {rule.measurement.kind === "count" && <button className="quiet" aria-label={`Remove one from ${habit.title}`} disabled={!pending && busy || day.count === 0} aria-busy={!!pending || undefined} onClick={() => checkIn(habitCheckIn.adjustCount(habit.id, store.today, -1))}>−</button>}
      {rule.measurement.kind !== "boolean" && <button className="quiet" aria-label={rule.type === "quit" ? `Record one event for ${habit.title}` : `Add one to ${habit.title}`} disabled={!pending && busy} aria-busy={!!pending || undefined} onClick={() => checkIn(habitCheckIn.addValue(habit.id, store.today, 1))}>+</button>}
      <button className={day.status === "complete" ? "secondary habit-done" : "primary"} aria-label={smartLabel} aria-pressed={day.status === "complete"} disabled={!pending && busy} aria-busy={!!pending || undefined} onClick={() => checkIn(day.status === "complete" && rule.type === "build" ? habitCheckIn.setValue(habit.id, store.today, 0) : habitCheckIn.smartDone(habit.id, store.today))}>{busy && !pending ? "Saving…" : rule.type === "quit" ? "Stayed on track" : rule.type === "limit" ? "Within limit" : day.status === "complete" ? "✓ Done" : "Complete"}</button>
    </div>
    {!compact && rule.measurement.kind !== "boolean" && <details className="habit-quick-log"><summary>Set or add a value</summary><form onSubmit={saveManual}><label className="field">Value for {habit.title}<input type="text" inputMode={rule.measurement.kind === "count" ? "numeric" : "decimal"} autoComplete="off" value={manual} onChange={(event) => setManual(event.target.value)} /></label><div className="actions"><button className="secondary" type="submit">Set value</button><button className="quiet" type="button" onClick={() => void addManual()}>Add value</button></div></form></details>}
    {error && <p className="habit-inline-error" role="alert">{error}</p>}
  </div>;
}

function HabitHistory({ habit, store }: { habit: Habit; store: HabitCardStore }) {
  const [month, setMonth] = useState(store.today.slice(0, 7)); const [selectedDate, setSelectedDate] = useState(store.today); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const first = `${month}-01`; const gridStart = addLocalDays(first, -((localWeekday(first) + 6) % 7)); const day = habitDay(habit, selectedDate, store.today); const rule = habitRuleOn(habit, selectedDate) ?? latestHabitRule(habit);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const mood = String(form.get("mood")) as "energized" | "good" | "neutral" | "difficult" | "calm" | "";
    let count: number; try { count = readFormNumber(String(form.get("count")), { max: 1_000_000_000, whole: rule.measurement.kind === "count" }); } catch (e) { setMessage(""); setError(e instanceof Error ? e.message : "Enter a number."); return; }
    setBusy(true); setMessage(""); setError(""); try { await store.setCount(habit.id, selectedDate, count, String(form.get("note")), mood || undefined); setMessage("Day saved."); } catch (error) { setError(storageMessageOr(error, "This day could not be saved. Choose a scheduled active day up to today.")); } finally { setBusy(false); }
  }
  async function mark(status: "skipped" | "failed") { setBusy(true); setMessage(""); setError(""); try { await store.markDay(habit.id, selectedDate, status, day.note); setMessage(status === "skipped" ? "Day skipped." : "Day marked failed."); } catch (error) { setError(storageMessageOr(error, "This day could not be changed.")); } finally { setBusy(false); } }
  function chooseDate(date: string) { if (!date) return; setSelectedDate(date); setMonth(date.slice(0, 7)); setMessage(""); setError(""); }
  return <div className="habit-history">
    <div className="habit-calendar-heading"><button className="quiet" aria-label={`Previous month for ${habit.title}`} disabled={month <= habit.startDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>←</button><strong>{formatDate(`${first}T12:00:00`, { month: "long", year: "numeric" })}</strong><button className="quiet" aria-label={`Next month for ${habit.title}`} disabled={month >= store.today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>→</button></div>
    <div className="habit-calendar" role="group" aria-label={`${habit.title} completion calendar`}>{["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <small aria-hidden="true" key={`label-${index}`}>{label}</small>)}{Array.from({ length: 42 }, (_, index) => {
      const date = addLocalDays(gridStart, index); const result = habitDay(habit, date, store.today); if (!date.startsWith(month)) return <span key={date} />;
      return <button key={date} type="button" className={`habit-calendar-day habit-day-${result.status}`} disabled={date > store.today || date < habit.startDate} aria-pressed={selectedDate === date} aria-label={`${longDate(date)}: ${statusLabel[result.status]}, ${plain(result.count)} of ${plain(result.target)}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{result.status === "complete" && <span className="habit-calendar-check" aria-hidden="true">✓</span>}</button>;
    })}</div>
    <p className="habit-calendar-legend"><span>● Complete</span><span>◐ Partial</span><span>× Failed</span><span>○ Skipped</span><span>— Not scheduled</span></p>
    <form onSubmit={save} className="habit-day-editor" key={`${selectedDate}-${day.count}-${day.note}-${day.mood ?? ""}`}>
      <label className="field">Day to review<input type="date" required min={habit.startDate} max={store.today} value={selectedDate} onChange={(event) => chooseDate(event.target.value)} /></label>
      <p className={`habit-status habit-day-${day.status}`}>{statusLabel[day.status]} · Target {plain(day.target)} {unitFor(day.target, measurementUnit(rule))}</p>
      <fieldset className="habit-form-fields" disabled={busy || !day.scheduled || selectedDate > store.today}>
        <label className="field">Value for this day<input name="count" aria-label="Count for this day" type="text" inputMode={rule.measurement.kind === "count" ? "numeric" : "decimal"} autoComplete="off" required defaultValue={formNumberText(day.count)} /></label>
        <label className="field">Mood (optional)<select name="mood" defaultValue={day.mood ?? ""}><option value="">No mood tag</option><option value="energized">Energized</option><option value="good">Good</option><option value="calm">Calm</option><option value="neutral">Neutral</option><option value="difficult">Difficult</option></select></label>
        <label className="field">Day reflection (optional)<textarea name="note" rows={2} maxLength={2000} defaultValue={day.note} /></label>
        <div className="habit-history-actions"><button className="secondary" type="submit">{busy ? "Saving…" : "Save day"}</button><button className="quiet" type="button" onClick={() => void mark("skipped")}>Skip day</button><button className="quiet" type="button" onClick={() => void mark("failed")}>Mark failed</button></div>
      </fieldset>{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    </form>
    <details className="habit-rule-history"><summary>Rule history</summary><ul>{habit.rules.map((item) => <li key={item.from}><time>{item.from}</time> · {item.state} · {item.type.toUpperCase()} · {scheduleLabel(item.schedule)} · {plain(item.target)} {unitFor(item.target, measurementUnit(item))} per {habitTargetPeriod(item)}</li>)}</ul>{!!habit.ruleRevisions?.length&&<details><summary>Retained rule revisions ({habit.ruleRevisions.length})</summary><p className="fine">Original and scheduled terms are retained, including superseded future terms. Earlier same-day edits before this record were not retained.</p><ol>{habit.ruleRevisions.map(r=><li key={r.id}>Effective {r.rule.from} · {r.rule.state} · {plain(r.rule.target)} {unitFor(r.rule.target, measurementUnit(r.rule))} per {habitTargetPeriod(r.rule)} · {scheduleLabel(r.rule.schedule)}<p className="fine">Recorded {formatDateTime(r.recordedAt)} · {r.source==='retained'?'Existing rule captured':'Scheduled edit'}</p></li>)}</ol></details>}</details>
  </div>;
}

function HabitInsights({ habit, today }: { habit: Habit; today: string }) {
  const stats = habitStats(habit, today); const trends = habitTrends(habit, today);
  return <div className="habit-insights" aria-label={`${habit.title} insights`}>
    <div className="habit-metrics"><div><strong>{stats.currentStreak}<span> {unitFor(stats.currentStreak, stats.streakUnit)}</span></strong><small>Current streak</small></div><div><strong>{stats.bestStreak}<span> {unitFor(stats.bestStreak, stats.streakUnit)}</span></strong><small>Personal best</small></div><div><strong>{stats.completionPercentage}<span>%</span></strong><small>Completion</small></div></div>
    <div className="habit-trends">{trends.map((trend) => <div key={trend.period}><span><b>{trend.period}</b><small>{trend.success}/{trend.total}</small></span><GlassBar identity={`habit-trends:${habit.id}:${trend.period}`} className="habit-trend-track" aria-hidden="true" value={trend.percentage / 100} /><strong>{trend.percentage}%</strong></div>)}</div>
    <p className="habit-distribution"><span>✓ {stats.successCount} success</span><span>× {stats.failCount} failed</span><span>○ {stats.skipCount} skipped</span></p>
  </div>;
}

/** A stack suggestion: the habit to view next (lib/habit-linked-policy.ts). */
export type HabitStackNext = { id: string; title: string };
/**
 * Memoized (Session G, Part 2): every prop is a primitive or keeps its identity while this habit is unchanged, so a
 * check-in re-renders only its own card. "History & reflection" mounts when first opened and then stays mounted.
 */
export const HabitCard = memo(function HabitCard({ habit, store, scope, goalName, goalHref, stackName,privateGoal,stackNext,onViewStack, onEdit, ...layout }: LayoutAttrs & { habit: Habit; store: HabitCardStore; scope: Omit<HabitGoalLink, "goalId">; goalName?: string; goalHref?: string; stackName?: string;privateGoal?:PrivateGoal;stackNext?:readonly HabitStackNext[];onViewStack?:(id:string)=>void; onEdit: (id: string) => void }) {
  const rule = habitRuleOn(habit,store.today)??habit.rules[0]!,planned=latestHabitRule(habit); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [historyOpen, setHistoryOpen] = useState(false);
  const matchedGoal = habit.goalLink && habit.goalLink.chainId === scope.chainId && habit.goalLink.owner === scope.owner && goalName;
  async function state(next: "active" | "paused" | "archived") { setBusy(true); setError(""); try { await store.setState(habit.id, next,earliestHabitChange(habit,store.today),habitEditFingerprint(habit)); } catch (error) { setError(storageMessageOr(error, "The habit was not changed. Try again.")); } finally { setBusy(false); } }
  return <article {...layout} id={`habit-${habit.id}`} tabIndex={-1} className={`panel habit-card habit-state-${rule.state}`} aria-label={habit.title} data-tone={visualTone(habit.id)}>
    <div className="habit-card-heading"><div><p className="eyebrow"><span className={`habit-type habit-type-${rule.type}`}>{rule.type.toUpperCase()}</span> · {habit.category} · {habit.timeOfDay}</p><h2>{habit.title}</h2><small>{scheduleLabel(rule.schedule)} · {targetCopy(habit,store.today)}</small></div><button className="quiet" onClick={() => onEdit(habit.id)} aria-label={`Edit ${habit.title}`}>Edit</button>{rule.state!=='archived'&&<PinToToday label={habit.title} choices={[{kind:'habit',metric:'today',entity:habit.id,label:`${habit.title} today`},{kind:'habit',metric:'streak',entity:habit.id,label:`${habit.title} streak`}]}/>}</div>
    {habit.description && <p className="habit-description">{habit.description}</p>}{stackName && <p className="habit-stack">After {stackName} → {habit.title}</p>}
    {planned.from>store.today&&<p className="notice">Scheduled change from {planned.from}: {planned.state} · {plain(planned.target)} {unitFor(planned.target, measurementUnit(planned))} per {habitTargetPeriod(planned)}. Today keeps its current rule.</p>}
    <HabitCompletion habit={habit} store={store} />
    <HabitTimer habit={habit} store={store}/>
    {privateGoal&&<LinkedGoalReview habit={habit} goal={privateGoal} store={store}/>}
    {onViewStack&&stackNext?.map(next=><p className="habit-stack" key={next.id}>Next in your stack: <button className="quiet" type="button" onClick={()=>onViewStack(next.id)}>View {next.title}</button> · suggestion only; nothing logged.</p>)}
    <details className="habit-details habit-insight-details"><summary>Consistency &amp; trends</summary><HabitInsights habit={habit} today={store.today} /></details>
    <div className="habit-cadence" role="img" aria-label={`Last 28 days of ${habit.title}. Open History to review each day.`}>{Array.from({ length: 28 }, (_, index) => { const date = addLocalDays(store.today, index - 27); const result = habitDay(habit, date, store.today); return <span key={date} className={`habit-dot habit-day-${result.status}`} title={`${date}: ${statusLabel[result.status]}`} />; })}</div>
    {habit.goalLink && <p className="habit-goal-link">{matchedGoal && goalHref ? <Link href={goalHref}>Supports {goalName} ↗</Link> : "Goal link retained · another scope or unavailable Goal"}</p>}
    <details className="habit-details" onToggle={(event) => { if (event.currentTarget.open) setHistoryOpen(true); }}><summary>History &amp; reflection</summary>{historyOpen && <HabitHistory habit={habit} store={store} />}</details>
    {habit.notes && <details className="habit-details"><summary>Private habit notes</summary><p className="habit-notes">{habit.notes}</p></details>}
    <p className="fine">Pause, resume and archive changes begin {earliestHabitChange(habit,store.today)}. Today’s recorded history stays unchanged.</p><div className="habit-management"><button className="quiet" disabled={busy} onClick={() => void state(planned.state === "active" ? "paused" : "active")}>{planned.state === "archived" ? "Restore habit" : planned.state === "paused" ? "Resume habit" : "Pause habit"}</button>{planned.state !== "archived" && <button className="quiet" disabled={busy} onClick={() => void state("archived")}>Archive habit</button>}</div>{error && <p role="alert">{error}</p>}
  </article>;
});
