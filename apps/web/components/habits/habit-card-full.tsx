"use client";
import type { LayoutAttrs } from "../layout-edit";
import { askZigi } from "../ai/ask";
import { PlanSkip } from "./plan-skip";
import { Suspense, lazy, memo, useEffect, useRef, useState, type FormEvent, useId} from "react";
import { takeConfirmDelete } from "../../lib/confirm-delete";
import Link from "next/link";
import {PinToToday} from "../pin-to-today";
import {LinkedGoalReview} from './linked-goal-review';
import type {PrivateGoal} from '../../lib/positions';
import { GlassBar } from "../progress/glass-progress";
import {earliestHabitChange,habitEditFingerprint} from "../../lib/habit-actions";
import { visualTone } from "../visual-tone";
import { habitDay, habitRuleOn, habitStats, habitTargetPeriod, habitTrends, latestHabitRule, measurementUnit, scheduleLabel, type Habit, type HabitGoalLink } from "../../lib/habits";
import { addLocalDays, localDate, localWeekday } from "../../lib/local-date";
import { formNumberText, readFormNumber } from "../../lib/decimal-input";
import { type HabitCardStore } from "./use-habits";
import { formatDate, formatDateTime, formatMonth, formatNumber } from "../../lib/visual-format";
import { unitFor } from "../../lib/plural";
import { storageMessageOr } from "../../lib/storage-error-copy";
import { ChallengeControls, ChallengeFinished, ChallengeLine } from "./habit-challenge";
import { habitsZone } from "../../lib/habits-v2/stats";
import {useHabitExtrasContext} from './habit-extras-context';
import './habits-aa.css';
import './habits-ab.css';
import {StarToggle} from '../checklist/star-toggle';
import {SwipeRow} from '../swipe/swipe-row';
// Gate A (weight budgets never rise, ADR-022 B41): the timer, the area field, the quit panel and the note sheets are their own chunks, loaded when a card shows them.
const HabitTimer = lazy(() => import('./habit-timer').then(m => ({default: m.HabitTimer})));
const HabitAreaField = lazy(() => import('./habit-area-field').then(m => ({default: m.HabitAreaField})));
const QuitPanel = lazy(() => import('./quit-panel').then(m => ({default: m.QuitPanel})));
const TodayNote = lazy(() => import('./today-note').then(m => ({default: m.TodayNote})));
const Reflections = lazy(() => import('./today-note').then(m => ({default: m.Reflections})));
const HabitDeleteForm = lazy(() => import("./habit-delete-form"));
// Session AD (weights): the patterns sit inside the closed "Consistency & trends" and load as their own chunk.
const HabitPatterns = lazy(() => import('./habit-patterns').then(m => ({default: m.HabitPatterns})));
/** Which cards have their details open, by habit id: a card that remounts (the list re-keys after a save, a layout change, a client re-render) opens again as it was. Memory only. */
const DETAILS_OPEN = new Map<string, boolean>();

const statusLabel = { complete: "Complete", partial: "Partial", due: "Due", skipped: "Skipped", failed: "Failed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Future", "planned-skip": "Planned skip", "not-started": "Before you started" };
/** A count or amount as typed data shows it ("1.5"), with the display locale's decimal sign. */
// Grouped as every other figure (Session X P2.1: "8000" sat beside "8,800 steps"), every decimal kept.
const plain = (value: number) => formatNumber(value, { maximumFractionDigits: 9 });
function longDate(date: string) { return formatDate(date); }
function moveMonth(month: string, amount: number) { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth() + amount); return localDate(date).slice(0, 7); }
function targetCopy(habit: Habit,today:string) {
  const rule = habitRuleOn(habit,today)??habit.rules[0]!; const unit = measurementUnit(rule); const period = habitTargetPeriod(rule);
  // Session X P2.1: "Avoid times" and "3× per week · 1 per week" read wrong; a count unit says nothing on its own.
  const counted = !unit || unit === "time" || unit === "times";
  if (rule.type === "quit") return counted ? "Avoid completely" : `Avoid ${unit}`;
  if (rule.type === "limit") return `Limit ${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} per ${period}`;
  // A few-times-a-week habit: its target is what each of those days asks for (once a period, it is the period's).
  if (rule.schedule.kind === "frequency" && rule.schedule.times > 1) return rule.target === 1 && counted ? "" : `${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} each time`;
  return `${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} per ${period}`;
}

import {HabitCompletion} from './habit-completion';

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
    <div className="habit-calendar-heading"><button className="quiet" aria-label={`Previous month for ${habit.title}`} disabled={month <= habit.startDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>←</button><strong>{formatMonth(first)}</strong><button className="quiet" aria-label={`Next month for ${habit.title}`} disabled={month >= store.today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>→</button></div>
    <div className="habit-calendar" role="group" aria-label={`${habit.title} completion calendar`}>{["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <small aria-hidden="true" key={`label-${index}`}>{label}</small>)}{Array.from({ length: 42 }, (_, index) => {
      const date = addLocalDays(gridStart, index); const result = habitDay(habit, date, store.today); if (!date.startsWith(month)) return <span key={date} />;
      return <button key={date} type="button" className={`habit-calendar-day habit-day-${result.status}`} disabled={date > store.today || date < habit.startDate} aria-pressed={selectedDate === date} aria-label={`${longDate(date)}: ${statusLabel[result.status]}, ${plain(result.count)} of ${plain(result.target)}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{result.status === "complete" && <span className="habit-calendar-check" aria-hidden="true">✓</span>}</button>;
    })}</div>
    <p className="habit-calendar-legend"><span>● Complete</span><span>◐ Partial</span><span>× Failed</span><span>○ Skipped</span><span>◌ Planned skip</span><span>— Not scheduled</span></p>
    <Suspense fallback={null}><Reflections habit={habit} today={store.today} /></Suspense>
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
    <PlanSkip habit={habit} store={store} />
    <details className="habit-rule-history"><summary>Rule history</summary><ul>{habit.rules.map((item) => <li key={item.from}><time dateTime={item.from}>{formatDate(item.from)}</time> · {item.state} · {item.type.toUpperCase()} · {scheduleLabel(item.schedule)} · {plain(item.target)} {unitFor(item.target, measurementUnit(item))} per {habitTargetPeriod(item)}</li>)}</ul>{!!habit.ruleRevisions?.length&&<details><summary>Retained rule revisions ({habit.ruleRevisions.length})</summary><p className="fine">Original and scheduled terms are retained, including superseded future terms. Earlier same-day edits before this record were not retained.</p><ol>{habit.ruleRevisions.map(r=><li key={r.id}>Effective {r.rule.from} · {r.rule.state} · {plain(r.rule.target)} {unitFor(r.rule.target, measurementUnit(r.rule))} per {habitTargetPeriod(r.rule)} · {scheduleLabel(r.rule.schedule)}<p className="fine">Recorded {formatDateTime(r.recordedAt)} · {r.source==='retained'?'Existing rule captured':'Scheduled edit'}</p></li>)}</ol></details>}</details>
  </div>;
}

function HabitInsights({ habit, today, zone }: { habit: Habit; today: string; zone: string }) {
  const stats = habitStats(habit, today); const trends = habitTrends(habit, today);
  return <div className="habit-insights" role="group" aria-label={`${habit.title} insights`}>
    <div className="habit-metrics"><div><strong>{stats.currentStreak}<span> {unitFor(stats.currentStreak, stats.streakUnit)}</span></strong><small>Current streak</small></div><div><strong>{stats.bestStreak}<span> {unitFor(stats.bestStreak, stats.streakUnit)}</span></strong><small>Personal best</small></div><div><strong>{stats.completionPercentage}<span>%</span></strong><small>Completion</small></div></div>
    <div className="habit-trends">{trends.map((trend) => <div key={trend.period}><span><b>{trend.period}</b><small>{trend.success}/{trend.total}</small></span><GlassBar identity={`habit-trends:${habit.id}:${trend.period}`} className="habit-trend-track" aria-hidden="true" value={trend.percentage / 100} /><strong>{trend.percentage}%</strong></div>)}</div>
    <p className="habit-distribution"><span>✓ {stats.successCount} success</span><span>× {stats.failCount} failed</span><span>○ {stats.skipCount} skipped</span></p>
    <Suspense fallback={null}><HabitPatterns habit={habit} today={today} zone={zone} /></Suspense>
  </div>;
}

/** A stack suggestion: the habit to view next (lib/habit-linked-policy.ts). */
export type HabitStackNext = { id: string; title: string };
/**
 * Memoized (Session G, Part 2): every prop is a primitive or keeps its identity while this habit is unchanged, so a
 * check-in re-renders only its own card. "History & reflection" mounts when first opened and then stays mounted.
 */
export const HabitCard = memo(function HabitCard({ habit, store, scope, goalName, goalHref, stackName,privateGoal,stackNext,onViewStack, onEdit, onDeleteForGood, ...layout }: LayoutAttrs & { habit: Habit; store: HabitCardStore; scope: Omit<HabitGoalLink, "goalId">; goalName?: string; goalHref?: string; stackName?: string;privateGoal?:PrivateGoal;stackNext?:readonly HabitStackNext[];onViewStack?:(id:string)=>void; onEdit: (id: string) => void; onDeleteForGood?: (habit: Habit) => Promise<void> }) {
  const rule = habitRuleOn(habit,store.today)??habit.rules[0]!,planned=latestHabitRule(habit); const [busy, setBusy] = useState(false);
  // Session AA-Local Part 1: the page's habit extras (areas, quit costs, bells) when the page provides them.
  const extras = useHabitExtrasContext(); const [error, setError] = useState(""); const [historyOpen, setHistoryOpen] = useState(false);
  const matchedGoal = habit.goalLink && habit.goalLink.chainId === scope.chainId && habit.goalLink.owner === scope.owner && goalName;
  // Session Z-Cloud Gate B (Z-Local's `plan.confirm`): a ZIGi card that asks to delete this habit opens the page with
  // #confirm-delete=habit:<id>; the card is brought into view and its own confirmation opens. Nothing is deleted here.
  const [asked, setAsked] = useState(false), [moreOpen, setMoreOpen] = useState(false), gid = useId(), moreRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const look = () => { if (!takeConfirmDelete("habit", habit.id)) return; setAsked(true); setMoreOpen(true); DETAILS_OPEN.set(habit.id, true); if (moreRef.current) moreRef.current.open = true; const card = document.getElementById(`habit-${habit.id}`); card?.scrollIntoView({ block: "center" }); card?.focus({ preventScroll: true }); };
    look(); window.addEventListener("hashchange", look); return () => window.removeEventListener("hashchange", look);
  }, [habit.id]);
  // A remounted or re-rendered card opens its details again if they were open (see DETAILS_OPEN); runs after every render on purpose.
  useEffect(() => { if (DETAILS_OPEN.get(habit.id) && moreRef.current && !moreRef.current.open) { moreRef.current.open = true; setMoreOpen(true); } });
  async function state(next: "active" | "paused" | "archived") { setBusy(true); setError(""); try { await store.setState(habit.id, next,earliestHabitChange(habit,store.today),habitEditFingerprint(habit)); } catch (error) { setError(storageMessageOr(error, "The habit was not changed. Try again.")); } finally { setBusy(false); } }
  // Session AA-Local S5: on phones a swipe right completes today's check-in (never a quit or limit habit: their tap is a statement, not a tick); a swipe left reveals Edit, Skip and Archive; nothing deletes.
  const today = habitDay(habit, store.today, store.today);
  const canSwipeComplete = rule.state === "active" && rule.type === "build" && today.scheduled && today.status !== "complete";
  return <SwipeRow as="article" attrs={{...layout, tabIndex: -1, "data-tone": visualTone(habit.id)}} id={`habit-${habit.id}`} className={`panel habit-card habit-state-${rule.state}`} label={habit.title} completeLabel="Complete" onComplete={canSwipeComplete ? () => void store.smartDone(habit.id, store.today) : undefined} actions={rule.state === "active" ? [{label: "Edit", run: () => onEdit(habit.id)}, ...(today.scheduled && today.status !== "complete" && today.status !== "skipped" ? [{label: "Skip", run: () => void store.markDay(habit.id, store.today, "skipped", "Skipped · swipe")}] : []), {label: "Archive", danger: true, confirm: "Archive?", run: () => void state("archived")}] : []}>
    <div className="habit-card-heading"><div><p className="eyebrow"><span className={`habit-type habit-type-${rule.type}`}>{rule.type.toUpperCase()}</span><span className="habit-tag"> · {habit.category}</span><span className="habit-tag habit-tag-time"> · {habit.timeOfDay}</span></p><h2>{habit.title}</h2><small>{[scheduleLabel(rule.schedule), targetCopy(habit,store.today)].filter(Boolean).join(" · ")}</small></div><button className="quiet" onClick={() => onEdit(habit.id)} aria-label={`Edit ${habit.title}`}>Edit</button><StarToggle item={{kind:'habit',habitId:habit.id}} label={habit.title} section={habit.timeOfDay} note={rule.state!=='active'?'Paused habits rest off the path':undefined}/><PinToToday label={habit.title} choices={rule.state!=='archived'?[{kind:'habit',metric:'today',entity:habit.id,label:`${habit.title} check-in`},{kind:'habit',metric:'streak',entity:habit.id,label:`${habit.title} streak`}]:[]} extra={<button type="button" onClick={() => askZigi(`About my habit "${habit.title}": `)}>Ask ZIGi about this habit</button>}/></div>
    {habit.description && <p className="habit-description">{habit.description}</p>}{stackName && <p className="habit-stack">After {stackName} → {habit.title}</p>}
    {planned.from>store.today&&<p className="notice">Scheduled change from {formatDate(planned.from)}: {planned.state} · {plain(planned.target)} {unitFor(planned.target, measurementUnit(planned))} per {habitTargetPeriod(planned)}. Today keeps its current rule.</p>}
    <HabitCompletion habit={habit} store={store} part="controls" />
    {/* Session AC (owner finding 1 on Alpha #41): the 28-day grid sits on the folded card, under the counter row and above the fold, in the card's own tone. */}
    <div className="habit-cadence" role="img" aria-label={`Last 28 days of ${habit.title}. Open History to review each day.`}>{Array.from({ length: 28 }, (_, index) => { const date = addLocalDays(store.today, index - 27); const result = habitDay(habit, date, store.today); return <span key={date} className={`habit-dot habit-day-${result.status}`} title={`${formatDate(date)}: ${statusLabel[result.status]}`} />; })}</div>
    {/* Session AB-Design (owner request 20, ADR-024 D17): the first view is the heading, the counter and today's progress; everything else waits behind one expander, in this order. */}
    {/* Uncontrolled on purpose: a tap on the summary before hydration must not be undone when React takes over (a controlled `open` re-applied its initial false); the ZIGi delete flow opens it through the ref. */}
    <details className="habit-more" ref={moreRef} onToggle={(event) => { setMoreOpen(event.currentTarget.open); DETAILS_OPEN.set(habit.id, event.currentTarget.open); }}>
     <summary aria-label={`Details for ${habit.title}`}><span className="habit-more-chevron" aria-hidden="true"><svg viewBox="0 0 22 12" width="18" height="10" focusable="false"><defs><linearGradient id={`${gid}-chev`} x1="0" x2="1"><stop offset="0" stopColor="var(--brand-cyan, #63e7ff)"/><stop offset=".5" stopColor="var(--brand-violet, #826cff)"/><stop offset="1" stopColor="var(--brand-magenta, #c664ff)"/></linearGradient></defs><path d="M3 3l8 6 8-6" fill="none" stroke={`url(#${gid}-chev)`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span className="habit-more-word">{moreOpen ? "Less" : "Details"}</span><small>{[habit.timer ? "timer" : null, "notes", "trends", "history"].filter(Boolean).join(" · ")}</small></summary>
     <ChallengeLine habit={habit} today={store.today} /><ChallengeFinished habit={habit} store={store} />
     <HabitCompletion habit={habit} store={store} part="quick-log" />
     {rule.type === "quit" && extras && <Suspense fallback={null}><QuitPanel habit={habit} today={store.today} extras={extras} /></Suspense>}
     {rule.state === "active" && <Suspense fallback={null}><TodayNote habit={habit} store={store} /></Suspense>}
     <Suspense fallback={null}><HabitTimer habit={habit} store={store}/></Suspense>
     {privateGoal&&<LinkedGoalReview habit={habit} goal={privateGoal} store={store}/>}
     {onViewStack&&stackNext?.map(next=><p className="habit-stack" key={next.id}>Next in your stack: <button className="quiet" type="button" onClick={()=>onViewStack(next.id)}>View {next.title}</button> · suggestion only; nothing logged.</p>)}
     <details className="habit-details habit-insight-details"><summary>Consistency &amp; trends</summary><HabitInsights habit={habit} today={store.today} zone={habitsZone(store.data)} /></details>{rule.state !== "archived" && <ChallengeControls habit={habit} store={store} />}
     {habit.goalLink && <p className="habit-goal-link">{matchedGoal && goalHref ? <Link href={goalHref}>Supports {goalName} ↗</Link> : "Goal link retained · another scope or unavailable Goal"}</p>}
     <details className="habit-details" onToggle={(event) => { if (event.currentTarget.open) setHistoryOpen(true); }}><summary>History &amp; reflection</summary>{historyOpen && <HabitHistory habit={habit} store={store} />}</details>
     {habit.notes && <details className="habit-details"><summary>Private habit notes</summary><p className="habit-notes">{habit.notes}</p></details>}
     <p className="fine">Pause, resume and archive changes begin {earliestHabitChange(habit,store.today)}. Today’s recorded history stays unchanged.</p><div className="habit-management">{extras && <Suspense fallback={null}><HabitAreaField habitId={habit.id} title={habit.title} extras={extras} keep={new Set((store.journalData?.().habits ?? [habit]).map(h => h.id))} /></Suspense>}<button className="quiet" disabled={busy} onClick={() => void state(planned.state === "active" ? "paused" : "active")}>{planned.state === "archived" ? "Restore habit" : planned.state === "paused" ? "Resume habit" : "Pause habit"}</button>{planned.state !== "archived" && <button className="quiet" disabled={busy} onClick={() => void state("archived")}>Archive habit</button>}</div>{rule.state === "archived" && onDeleteForGood && <DeleteForGood habit={habit} onDelete={onDeleteForGood} asked={asked} />}{planned.state === "archived" && rule.state !== "archived" && <p className="fine">“Delete for good…” appears here once the archive starts ({formatDate(planned.from)}).</p>}{asked && planned.state !== "archived" && <p className="fine" role="status">To delete this habit for good, archive it first; then “Delete for good…” appears here.</p>}{error && <p role="alert">{error}</p>}
    </details>
  </SwipeRow>;
});
/**
 * Session Z-Cloud Part 4.6 (persona item 6): "Delete for good" in an archived habit. The confirmation (its typed name and
 * the warning) loads when the person opens it (habit-delete-form.tsx).
 */
function DeleteForGood({ habit, onDelete, asked }: { habit: Habit; onDelete: (habit: Habit) => Promise<void>; asked: boolean }) {
  const [open, setOpen] = useState(asked);
  useEffect(() => { if (asked) setOpen(true); }, [asked]);
  if (!open) return <div className="habit-delete"><button type="button" className="quiet habit-delete-open" onClick={() => setOpen(true)}>Delete for good…</button></div>;
  return <Suspense fallback={null}><HabitDeleteForm habit={habit} onDelete={onDelete} onCancel={() => setOpen(false)} /></Suspense>;
}
