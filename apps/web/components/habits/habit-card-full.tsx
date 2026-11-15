"use client";
import type { LayoutAttrs } from "../layout-edit";
import { askZigi } from "../ai/ask";
import { Suspense, lazy, memo, useEffect, useRef, useState, useId} from "react";
import { takeConfirmDelete } from "../../lib/confirm-delete";
import Link from "next/link";
import {PinToToday} from "../pin-to-today";
import {LinkedGoalReview} from './linked-goal-review';
import type {PrivateGoal} from '../../lib/positions';
import { GlassBar } from "../progress/glass-progress";
import {earliestHabitChange,habitEditFingerprint} from "../../lib/habit-actions";
import {ConfirmInline} from "../ui/confirm-inline";
import { visualTone } from "../visual-tone";
import { habitDay, habitRuleOn, habitStats, habitTargetPeriod, habitTrends, latestHabitRule, measurementUnit, scheduleLabel, type Habit, type HabitGoalLink, type HabitRule } from "../../lib/habits";
import { addLocalDays } from "../../lib/local-date";
import { type HabitCardStore } from "./use-habits";
import { showUndo } from "../ui/undo-toast";
import { formatClock, formatDate, formatNumber } from "../../lib/visual-format";
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
const HabitDeleteForm = lazy(() => import("./habit-delete-form"));
// CI14 (weights): History & reflection renders only when its fold opens: its own chunk, asked for as the card loads.
const loadHistory = () => import('./habit-history');
if (typeof window !== 'undefined') void loadHistory().catch(() => undefined);
const HabitHistory = lazy(() => loadHistory().then(m => ({default: m.HabitHistory})));
// Session AD (weights): the patterns sit inside the closed "Consistency & trends" and load as their own chunk.
// Session AK (F5b): when and where, and the usual-time offer; its own chunk, loaded when the card's Details open.
const HabitIntention = lazy(() => import('./intention'));
// Session AL Part 15 (AL-COMPETITOR-GAP-105): a habit's own checklist, fetched only for a habit with steps or open Details.
const HabitChecklist = lazy(() => import('./habit-checklist'));
// The two checks below read the loose extras inline, so the card's first chunk gains no module (route weights).
const hasChecklist = (data: unknown, id: string) => !!(data as {checklists?: Record<string, unknown>} | null)?.checklists?.[id];
const habitWhy = (data: {intentions?: Record<string, {why?: string}>} | null, id: string) => data?.intentions?.[id]?.why ?? null;
const HabitPatterns = lazy(() => import('./habit-patterns').then(m => ({default: m.HabitPatterns})));
// Session AK (B3, lane B): the notes that link to this habit ([[title]]); its own chunk, loaded when the card's Details open.
const NoteBacklinks = lazy(() => import('../notes/note-backlinks'));
/** Which cards have their details open, by habit id: a card that remounts (the list re-keys after a save, a layout change, a client re-render) opens again as it was. Memory only. */
const DETAILS_OPEN = new Map<string, boolean>();
/**
 * Session AL (PR-045): the folds inside a card (History & reflection, Consistency & trends) stay open after an action
 * too: an action re-renders or remounts the card, and an uncontrolled fold closed itself. Memory only, by habit and fold.
 */
const INNER_OPEN = new Map<string, boolean>();
/**
 * Session AL (GAP-085): a habit's own page (/app/habits?habit=<id>) opens its card's details, History and Consistency.
 * Session AO (CO4): with `&date=<day>` (Today's week grid, Perfect days) its History opens on that day's check-in.
 */
export function openHabitPage(id: string, date?: string | null) { DETAILS_OPEN.set(id, true); INNER_OPEN.set(`${id}:history`, true); INNER_OPEN.set(`${id}:insights`, true); linkHistoryDay(id, date); }
/** Back on the whole list: no History keeps a day a link asked for. */
export function leaveHabitPage() { linkHistoryDay(null); }
function useKeptOpen(key: string, onOpen?: () => void) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (INNER_OPEN.get(key) && ref.current && !ref.current.open) { ref.current.open = true; onOpen?.(); } });
  return {ref, onToggle: (event: React.SyntheticEvent<HTMLDetailsElement>) => { const open = event.currentTarget.open; INNER_OPEN.set(key, open); if (open) onOpen?.(); }};
}

import {linkHistoryDay, plain, statusLabel} from './habit-card-words';
function targetCopy(habit: Habit,today:string) {
  const rule = habitRuleOn(habit,today)??habit.rules[0]!; const unit = measurementUnit(rule); const period = habitTargetPeriod(rule);
  // Session X P2.1: "Avoid times" and "3× per week · 1 per week" read wrong; a count unit says nothing on its own.
  const counted = !unit || unit === "time" || unit === "times";
  if (rule.type === "quit") return counted ? "Avoid completely" : `Avoid ${unit}`;
  if (rule.type === "limit") return `Limit ${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} per ${period}`;
  // A few-times-a-week habit: its target is what each of those days asks for (once a period, it is the period's).
  if (rule.schedule.kind === "frequency" && rule.schedule.times > 1) return rule.target === 1 && counted ? "" : `${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} each time`;
  // Session AL (DV-129, DV-130; P-DV-18, P-DV-122): once a day or once a period is what the schedule already says, so a
  // count of 1 adds nothing ("Every day · 1 time per day", "1× per week · 1 time per week" read twice). The counter keeps it.
  if (rule.target === 1 && counted && (rule.schedule.kind === "frequency" || period === "day")) return "";
  return `${plain(rule.target)}${unit ? ` ${unitFor(rule.target, unit)}` : ""} per ${period}`;
}

/**
 * Session AL (P-NB-24; NB-180, NB-223, N-078): what a scheduled rule changes, in words ("paused", "Weekdays · 1 time per
 * day"); empty when it changes nothing (a Restore that cancelled an archive), so no banner shows for it.
 */
function ruleChange(now: HabitRule, next: HabitRule): string {
  const parts: string[] = [];
  if (next.state !== now.state) parts.push(next.state === "active" ? "active again" : next.state);
  const sameCount = JSON.stringify([now.schedule, now.target, now.type, now.measurement, now.targetPeriod]) === JSON.stringify([next.schedule, next.target, next.type, next.measurement, next.targetPeriod]);
  if (!sameCount) parts.push(`${scheduleLabel(next.schedule)} · ${plain(next.target)} ${unitFor(next.target, measurementUnit(next))} per ${habitTargetPeriod(next)}`);
  return parts.join(" · ");
}
import {HabitCompletion} from './habit-completion';
import {markDayWithUndo} from './skip-undo';

function HabitInsights({ habit, today, zone }: { habit: Habit; today: string; zone: string }) {
  const stats = habitStats(habit, today); const trends = habitTrends(habit, today);
  // Session AL fourth pass (PR-010): a streak beside a day still open says so (26 days counted, today not yet).
  const todayNow = habitDay(habit, today, today), openToday = todayNow.scheduled && (todayNow.status === "due" || todayNow.status === "partial") && latestHabitRule(habit).type === "build";
  return <div className="habit-insights" role="group" aria-label={`${habit.title} insights`}>
    <div className="habit-metrics"><div><strong>{stats.currentStreak}<span> {unitFor(stats.currentStreak, stats.streakUnit)}</span></strong><small>Current streak</small>{openToday && stats.currentStreak > 0 && <small className="habit-streak-open">Up to yesterday; today is still open and counts once it is done.</small>}</div><div><strong>{stats.bestStreak}<span> {unitFor(stats.bestStreak, stats.streakUnit)}</span></strong><small>Personal best</small></div><div><strong>{stats.completionPercentage}<span>%</span></strong><small>Completion</small></div></div>
    <div className="habit-trends">{/* Session AH (HA6, L-074): a window with nothing to count yet is left out, never "0/0 · 0%" */}{trends.filter(trend => trend.total > 0).map((trend) => <div key={trend.period}><span><b>{trend.period}</b><small>{trend.success}/{trend.total}</small></span><GlassBar identity={`habit-trends:${habit.id}:${trend.period}`} className="habit-trend-track" aria-hidden="true" value={trend.percentage / 100} /><strong>{trend.percentage}%</strong></div>)}</div>
    <p className="habit-distribution"><span>✓ {stats.successCount} success</span><span>× {stats.failCount} failed</span><span>○ {stats.skipCount} skipped</span></p>
    <ShareHabit habit={habit} today={today} />
    <Suspense fallback={null}><HabitPatterns habit={habit} today={today} zone={zone} /></Suspense>
  </div>;
}

/** A stack suggestion: the habit to view next (lib/habit-linked-policy.ts). */
export type HabitStackNext = { id: string; title: string };
/**
 * Memoized (Session G, Part 2): every prop is a primitive or keeps its identity while this habit is unchanged, so a
 * check-in re-renders only its own card. "History & reflection" mounts when first opened and then stays mounted.
 */
export const HabitCard = memo(function HabitCard({ habit, store, scope, goalName, goalHref, stackName,privateGoal,stackNext,onViewStack, onEdit, onDeleteForGood, onDuplicate, reminderAt, ...layout }: LayoutAttrs & { /** Session AL fourth pass (NB-133): adds a copy of this habit (same rule, no history). */ onDuplicate?: (habit: Habit) => Promise<void>; /** Session AH (HA16, M-062): this device's reminder time, shown on the card. */ reminderAt?: string | null; habit: Habit; store: HabitCardStore; scope: Omit<HabitGoalLink, "goalId">; goalName?: string; goalHref?: string; stackName?: string;privateGoal?:PrivateGoal;stackNext?:readonly HabitStackNext[];onViewStack?:(id:string)=>void; onEdit: (id: string) => void; onDeleteForGood?: (habit: Habit) => Promise<void> }) {
  const rule = habitRuleOn(habit,store.today)??habit.rules[0]!,planned=latestHabitRule(habit); const [busy, setBusy] = useState(false);
  // Session AA-Local Part 1: the page's habit extras (areas, quit costs, bells) when the page provides them.
  const extras = useHabitExtrasContext(); const [error, setError] = useState(""); const [historyOpen, setHistoryOpen] = useState(() => !!INNER_OPEN.get(`${habit.id}:history`));
  const historyFold = useKeptOpen(`${habit.id}:history`, () => setHistoryOpen(true)), insightsFold = useKeptOpen(`${habit.id}:insights`);
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
  // Session AH (HA3; D-045, D-204, B-031, M-105): a change starts today when nothing is recorded for today, so a habit
  // made by mistake is archived at once and can then be deleted for good; Archive asks first, in place, from the card
  // or its ⋯ menu.
  const changeFrom = earliestHabitChange(habit, store.today, {allowToday: true});
  const [archiving, setArchiving] = useState(false);
  const openArchive = () => { setMoreOpen(true); DETAILS_OPEN.set(habit.id, true); if (moreRef.current) moreRef.current.open = true; setArchiving(true); };
  // Session AL (PR-043, MO-124, NB-132, NB-160): every pause, resume, archive and restore says what changes and from when,
  // in the toast (the old "Day saved." stayed on screen), with Undo that schedules the previous state back from the same day.
  async function state(next: "active" | "paused" | "archived") {
    const before = planned.state, when = changeFrom === store.today ? "today" : `from ${formatDate(changeFrom)}`;
    setBusy(true); setError("");
    try {
      await store.setState(habit.id, next,changeFrom,habitEditFingerprint(habit)); setArchiving(false);
      const said = next === "archived" ? `${habit.title} is archived ${when}.${changeFrom === store.today ? "" : " Today keeps its check-in; it leaves your lists tomorrow."}` : next === "paused" ? `${habit.title} is paused ${when}.` : before === "archived" ? `${habit.title} is restored.` : `${habit.title} is active again ${when}.`;
      showUndo({message: said, undoLabel: `Undo: ${said}`, restore: () => store.setState(habit.id, before, changeFrom), undone: `${habit.title} is back as it was.`});
    } catch (error) { setError(storageMessageOr(error, "The habit was not changed. Try again.")); } finally { setBusy(false); }
  }
  const [deleting, setDeleting] = useState(false);
  const openDelete = () => { setMoreOpen(true); DETAILS_OPEN.set(habit.id, true); if (moreRef.current) moreRef.current.open = true; setDeleting(true); };
  // Session AA-Local S5: on phones a swipe right completes today's check-in (never a quit or limit habit: their tap is a statement, not a tick); a swipe left reveals Edit, Skip and Archive; nothing deletes.
  const today = habitDay(habit, store.today, store.today);
  const canSwipeComplete = rule.state === "active" && rule.type === "build" && today.scheduled && today.status !== "complete";
  return <SwipeRow as="article" attrs={{...layout, tabIndex: -1, "data-tone": visualTone(habit.id)}} id={`habit-${habit.id}`} className={`panel habit-card habit-state-${rule.state}`} label={habit.title} completeLabel="Complete" onComplete={canSwipeComplete ? () => void store.smartDone(habit.id, store.today) : undefined} actions={rule.state === "active" ? [{label: "Edit", run: () => onEdit(habit.id)}, ...(today.scheduled && today.status !== "complete" && today.status !== "skipped" ? [{label: "Skip", run: () => void markDayWithUndo(store.update, habit, store.today, store.today, "skipped", "Skipped · swipe").catch(() => undefined)}] : []), {label: "Archive", danger: true, confirm: "Archive?", run: () => void state("archived")}] : []}>
    <div className="habit-card-heading"><div><p className="eyebrow"><span className={`habit-type habit-type-${rule.type}`}>{rule.type.toUpperCase()}</span><span className="habit-tag"> · {habit.category}</span><span className="habit-tag habit-tag-time"> · {habit.timeOfDay}</span></p><h2>{habit.title}</h2><small>{[scheduleLabel(rule.schedule, habit.id), targetCopy(habit,store.today), /* Session AL (P-NB-35; NB-221, NB-225): the end rule shows on the card */ habit.endCondition.kind === "date" ? `ends ${formatDate(habit.endCondition.date)}` : habit.endCondition.kind === "completions" ? `ends after ${formatNumber(habit.endCondition.count)} ${habit.endCondition.count === 1 ? "completion" : "completions"}` : "", reminderAt ? `reminder ${formatClock(reminderAt)} on this device` : ""].filter(Boolean).join(" · ")}</small></div>{/* B-201: an archived habit is not edited; Restore and Delete for good stay in its card and its ⋯ menu. */rule.state !== "archived" && <button className="quiet" onClick={() => onEdit(habit.id)} aria-label={`Edit ${habit.title}`}>Edit</button>}<StarToggle item={{kind:'habit',habitId:habit.id}} label={habit.title} section={habit.timeOfDay} note={rule.state!=='active'?'Paused habits rest off the path':undefined}/><PinToToday label={habit.title} choices={rule.state!=='archived'?[{kind:'habit',metric:'today',entity:habit.id,label:`${habit.title} check-in`,menu:'check-in'},{kind:'habit',metric:'streak',entity:habit.id,label:`${habit.title} streak`,menu:'streak'}]:[]} extra={<>{/* Session AL (P-NB-24; N-079, N-088, NB-133): Pause, Archive and Delete in the ⋯ menu. Third pass (D-203, P-DVR-34): the menu is named after the habit once, so its items use short words ("Add check-in to Today"); the full names stay in the buttons' accessible names. */}{planned.state !== "archived" && <button type="button" disabled={busy} onClick={() => void state(planned.state === "paused" ? "active" : "paused")}>{planned.state === "paused" ? "Resume habit" : changeFrom === store.today ? "Pause from today" : `Pause from ${formatDate(changeFrom, {year: false})}`}</button>}{planned.state !== "archived" && <button type="button" onClick={() => openArchive()}>Archive habit…</button>}{onDeleteForGood && <button type="button" onClick={() => planned.state === "archived" ? openDelete() : (setDeleting(true), openArchive())}>Delete habit…</button>}{onDuplicate && planned.state !== "archived" && <button type="button" disabled={busy} aria-label={`Duplicate ${habit.title}`} onClick={() => void onDuplicate(habit)}>Duplicate habit</button>}<button type="button" onClick={() => askZigi(`About my habit "${habit.title}": `)}>Ask ZIGi about this habit</button><Link href={`/app/habits?habit=${encodeURIComponent(habit.id)}`}>Open its own page</Link></>}/></div>
    {habit.description && <p className="habit-description">{habit.description}</p>}
    {/* Session AL Part 15 (AL-COMPETITOR-GAP-100): the person's own why, set in Details beside when and where */}
    {extras?.loaded && !extras.unreadable && habitWhy(extras.data, habit.id) && <p className="fine habit-why">Why: {habitWhy(extras.data, habit.id)}</p>}
    {/* Session AL fourth pass (N-171): the goal a habit supports is named on the card itself, not only behind Details. */}
    {habit.goalLink && <p className="habit-goal-link">{matchedGoal && goalHref ? <Link href={goalHref}>Supports {goalName} ↗</Link> : "Goal link retained · another scope or unavailable Goal"}</p>}{stackName && <p className="habit-stack">After {stackName} → {habit.title}</p>}
    {planned.from>store.today&&ruleChange(rule,planned)&&<p className="notice">Scheduled change from {formatDate(planned.from)}: {ruleChange(rule,planned)}. Today keeps its current rule.</p>}
    {(() => { const end = habit.endCondition; if (end.kind !== "completions") return null; const done = habit.entries.filter(e => e.date <= store.today && e.disposition === "logged" && habitDay(habit, e.date, store.today).status === "complete").length; return done >= end.count ? <p className="notice" role="status">{/* Session AL (P-NB-35; NB-222) */}All {formatNumber(end.count)} {end.count === 1 ? "completion" : "completions"} done: this habit has reached its end{today.status === "complete" ? " with today’s check-in. It rests from tomorrow." : "."}</p> : null; })()}
    <HabitCompletion habit={habit} store={store} part="controls" />
    {extras?.loaded && !extras.unreadable && rule.state !== "archived" && hasChecklist(extras.data, habit.id) && <Suspense fallback={null}><HabitChecklist habit={habit} store={store} extras={extras} keep={new Set((store.journalData?.().habits ?? [habit]).map(h => h.id))} part="ticks" /></Suspense>}
    {/* Session AC (owner finding 1 on Alpha #41): the 28-day grid sits on the folded card, under the counter row and above the fold, in the card's own tone. */}
    <div className="habit-cadence" role="img" aria-label={`Last 28 days of ${habit.title}. Open History to review each day.`}>{Array.from({ length: 28 }, (_, index) => { const date = addLocalDays(store.today, index - 27); const result = habitDay(habit, date, store.today); return <span key={date} className={`habit-dot habit-day-${result.status}`} title={`${formatDate(date)}: ${statusLabel[result.status]}${result.status === "skipped" || result.status === "planned-skip" ? " · a rest day: the streak holds" : ""}`} />; })}</div>
    {/* Session AB-Design (owner request 20, ADR-024 D17): the first view is the heading, the counter and today's progress; everything else waits behind one expander, in this order. */}
    {/* Uncontrolled on purpose: a tap on the summary before hydration must not be undone when React takes over (a controlled `open` re-applied its initial false); the ZIGi delete flow opens it through the ref. */}
    <details className="habit-more" ref={moreRef} onToggle={(event) => { setMoreOpen(event.currentTarget.open); DETAILS_OPEN.set(habit.id, event.currentTarget.open); }}>
     <summary aria-label={`Details for ${habit.title}`}><span className="habit-more-chevron" aria-hidden="true"><svg viewBox="0 0 22 12" width="18" height="10" focusable="false"><defs><linearGradient id={`${gid}-chev`} x1="0" x2="1"><stop offset="0" stopColor="var(--brand-cyan, #63e7ff)"/><stop offset=".5" stopColor="var(--brand-violet, #826cff)"/><stop offset="1" stopColor="var(--brand-magenta, #c664ff)"/></linearGradient></defs><path d="M3 3l8 6 8-6" fill="none" stroke={`url(#${gid}-chev)`} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span className="habit-more-word">{moreOpen ? "Less" : "Details"}</span><small>{[habit.timer ? "timer" : null, "notes", "trends", "history"].filter(Boolean).join(" · ")}</small></summary>
     <ChallengeLine habit={habit} today={store.today} /><ChallengeFinished habit={habit} store={store} />
     {moreOpen && rule.state === "active" && <Suspense fallback={null}><HabitIntention habit={habit} extras={extras} keep={new Set((store.journalData?.().habits ?? [habit]).map(h => h.id))} today={store.today} zone={habitsZone(store.data)} /></Suspense>}
     <HabitCompletion habit={habit} store={store} part="quick-log" />
     {moreOpen && rule.state === "active" && rule.type === "build" && extras && <Suspense fallback={null}><HabitChecklist habit={habit} store={store} extras={extras} keep={new Set((store.journalData?.().habits ?? [habit]).map(h => h.id))} part="editor" /></Suspense>}
     {/* Session AL Part 15 (AL-COMPETITOR-GAP-109; C-NB-31): habits go into a calendar app through the Agenda's .ics export (a file, no feed) */}
     {moreOpen && rule.state === "active" && <p className="fine habit-calendar-link"><Link href="/app/agenda?export=1">Put your habits in a calendar app</Link> · a .ics file from the Agenda, made on this device.</p>}
     {rule.type === "quit" && extras && <Suspense fallback={null}><QuitPanel habit={habit} today={store.today} extras={extras} /></Suspense>}
     {rule.state === "active" && <Suspense fallback={null}><TodayNote habit={habit} store={store} /></Suspense>}
     <Suspense fallback={null}><HabitTimer habit={habit} store={store}/></Suspense>
     {privateGoal&&<LinkedGoalReview habit={habit} goal={privateGoal} store={store}/>}
     {onViewStack&&stackNext?.map(next=><p className="habit-stack" key={next.id}>Next in your stack: <button className="quiet" type="button" onClick={()=>onViewStack(next.id)}>View {next.title}</button> · suggestion only; nothing logged.</p>)}
     <details className="habit-details habit-insight-details" {...insightsFold}><summary aria-label={`Consistency & trends for ${habit.title}`}>Consistency &amp; trends</summary><HabitInsights habit={habit} today={store.today} zone={habitsZone(store.data)} /></details>{rule.state !== "archived" && <ChallengeControls habit={habit} store={store} />}
     <details className="habit-details" {...historyFold}><summary aria-label={`History & reflection for ${habit.title}`}>History &amp; reflection</summary>{historyOpen && <Suspense fallback={null}><HabitHistory habit={habit} store={store} /></Suspense>}</details>
     {habit.notes && <details className="habit-details"><summary aria-label={`Private notes for ${habit.title}`}>Private habit notes</summary><p className="habit-notes">{habit.notes}</p></details>}
     {moreOpen && <Suspense fallback={null}><NoteBacklinks kind="habit" id={habit.id} name={habit.title}/></Suspense>}
     <p className="fine">Pause, resume and archive changes begin {changeFrom === store.today ? "today" : formatDate(changeFrom)}. {changeFrom === store.today ? "Nothing is recorded for today yet." : "Today’s recorded history stays unchanged."}</p><div className="habit-management">{extras && <Suspense fallback={null}><HabitAreaField habitId={habit.id} title={habit.title} extras={extras} keep={new Set((store.journalData?.().habits ?? [habit]).map(h => h.id))} /></Suspense>}<button className="quiet" disabled={busy} onClick={() => void state(planned.state === "active" ? "paused" : "active")}>{planned.state === "archived" ? "Restore habit" : planned.state === "paused" ? "Resume habit" : "Pause habit"}</button>{planned.state !== "archived" && <button className="quiet" disabled={busy} onClick={() => setArchiving(true)}>Archive habit</button>}</div>{archiving && planned.state !== "archived" && <ConfirmInline title={`Archive ${habit.title}?`} confirmLabel="Archive habit" busy={busy} onConfirm={() => void state("archived")} onCancel={() => setArchiving(false)}><p>It leaves your lists {changeFrom === store.today ? "today" : `from ${formatDate(changeFrom)}`}. Its history is kept; {/* Session AL (DV-186a, P-DV-121) */}you can restore it later, or delete it for good from Archived.</p></ConfirmInline>}{planned.state === "active" && changeFrom !== store.today && <p className="fine">Today already has a check-in, so a pause starts tomorrow. To rest today, use “Skip today…”.</p>}{/* Session AL (P-NB-24; NB-135, NB-160, NB-181): an archived habit can be deleted for good at once, also when its archive starts tomorrow (today held a check-in). */}{planned.state === "archived" && onDeleteForGood && <DeleteForGood habit={habit} onDelete={onDeleteForGood} asked={asked || deleting} />}{(asked || deleting) && planned.state !== "archived" && <p className="fine" role="status">To delete this habit for good, archive it first; then “Delete for good…” appears here.</p>}{error && <p role="alert">{error}</p>}
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

/**
 * Session AI (shareable habit card): an image of the habit's streak and counts, drawn on this device and handed to the
 * share sheet or saved. Loaded only on the tap; nothing is uploaded.
 */
function ShareHabit({ habit, today }: { habit: Habit; today: string }) {
  const [note, setNote] = useState("");
  const share = async () => {
    try {
      const [{habitShareCard}, {drawShareCard, shareOrSave}] = await Promise.all([import("../../lib/habits-share"), import("../../lib/share-image")]);
      const how = await shareOrSave(await drawShareCard(habitShareCard(habit, today)), `zigoals-habit-${today}.png`, habit.title);
      setNote(how === "shared" ? "Shared from your device." : "Saved as an image on this device.");
    } catch (cause) { setNote(cause instanceof Error ? cause.message : "The image could not be made here."); }
  };
  return <p className="habit-share"><button type="button" className="secondary" onClick={() => void share()} aria-label={`Share ${habit.title} as an image`}>Share as an image</button>{note && <span role="status" className="fine"> {note}</span>}</p>;
}
