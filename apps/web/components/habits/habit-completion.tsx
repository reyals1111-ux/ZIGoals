"use client";
import { showUndo } from "../ui/undo-toast";
import { habitStep } from "../../lib/habit-step";
import {AutoCheckInBadge} from "./auto-checkin-badge";
import {celebrateCompletion} from "../motion/completion";
import {CELEBRATIONS} from '../../lib/celebrations';
import {useId, useRef, useState, type FormEvent} from 'react';
import {ACTIVITY_CHOICES, activityOfNote, offersActivityType, withActivityNote} from "../../lib/habits-activity";
import {frequencyProgress, habitDay, habitRuleOn, habitTargetPeriod, limitPeriodProgress, logHabitValue, measurementUnit, type Habit, type HabitData} from "../../lib/habits";
import {habitCheckIn, type HabitCardStore} from "./use-habits";
import {allDoneNoteId, comebackNoteId, comebackSeenRecently, checkInFacts, streakNoteId} from '../../lib/habits-v2/zigi-facts';
import {appliedCheckIn, markAutoCheckInUndone} from "../../lib/habit-health-links/store";
import {checkInFailureMessage} from "../../lib/storage-error-copy";
import {formNumberText} from "../../lib/decimal-input";
import {durationCountText, readDurationText, readHabitNumber} from "../../lib/habit-number";
import {formatNumber} from "../../lib/visual-format";
import {unitFor} from "../../lib/plural";
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabitHealthLinks} from "./use-habit-health-links";
import {useHealthLinkContext} from "./health-link-context";
import {autoTickCount, healthSoFar} from "./auto-value";
import {formatMeasureValue, measureSource, measureValue} from "../../lib/habit-health-links/engine";
import {useAutoRulesContext} from "./auto-rules-context";
import {zigiSignals} from '../zigi/bus';
import {plainErrorMessage} from "../../lib/plain-error";

/**
 * The check-in control of a habit card (Session AA-Local Gate A, ADR-022 B41): its own small module, so Today, the Habits
 * widget and a tracked goal load it without the whole card; the card itself is a lazy chunk (habit-card.tsx).
 */
const statusLabel = { complete: "Complete", partial: "Partial", due: "Due", skipped: "Skipped", failed: "Failed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Future", "planned-skip": "Planned skip", "not-started": "Before you started" };
const healthSoFarValue = (link: Parameters<typeof measureValue>[2], health: Parameters<typeof measureValue>[0] | undefined, day: string) => { if (!health) return null; try { return measureValue(health, day, link); } catch { return null; } };
const plain = (value: number) => formatNumber(value, { maximumFractionDigits: 9 });
/** Session AL (P-NB-34; NB-047, N-NB-22): the step button names its unit ("+0.25 L", "+5 min"), so it reads as an amount. */
const stepUnit = (unit: string) => { const u = unit.trim().toLowerCase(); return /^(l|liters?|litres?)$/.test(u) ? "L" : u === "minutes" ? "min" : u === "hours" ? "h" : u === "ml" ? "mL" : u && u !== "times" && u !== "time" && u.length <= 8 ? unit.trim() : ""; };
function afterPaint(run: () => void) {
  // Session AH Part 2: a reload, a navigation or a closed tab inside that frame starts the waiting save at once
  // (pagehide), so a tap that already shows is not dropped on the way out.
  let done = false; const once = () => { if (!done) { done = true; window.removeEventListener("pagehide", once); run(); } };
  window.addEventListener("pagehide", once);
  requestAnimationFrame(() => setTimeout(once, 0)); setTimeout(once, 100);
}
export function HabitCompletion({part='both',  habit, store, compact = false }: {/** Session AB-Design (owner request 20): the card shows the counter first and keeps the form behind its expander. */ part?: 'both' | 'controls' | 'quick-log';  habit: Habit; store: HabitCardStore; compact?: boolean }) {
  // H7: this device's automatic check-in for today, if any (lib/habit-health-links); read once per card, written only by Undo.
  const healthContext = useHealthLinkContext();
  const links = useHabitHealthLinks(); const marker = links.loaded ? appliedCheckIn(links.data, habit.id, store.today) : undefined;
  // Session AK (5.6): a tick an auto-complete rule made today, with its Undo (Habits page only; null elsewhere).
  const autoRules = useAutoRulesContext();
  // Paint first, then save (Session I, Part 9): a tap shows its result on the next frame, and the save runs after that
  // frame. If the save fails, the card returns to what is saved and says why (Part 5's coded message), so a check-in is
  // never left showing as saved when it was not.
  const [pending, setPending] = useState<Habit | null>(null);
  const shown = pending ?? habit;
  const day = habitDay(shown, store.today, store.today); const rule = habitRuleOn(shown,store.today)??shown.rules[0]!; const unit = measurementUnit(rule); const step = habitStep(rule);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [manual, setManual] = useState(() => formNumberText(day.count));
  const withActivity = offersActivityType(shown, rule), [activity, setActivity] = useState(() => activityOfNote(day.note)), activityList = useId();
  const celebrations = useDeviceRecord(CELEBRATIONS);
  // Taps while a check-in saves (Session K, QA sweep 2). Paint-first keeps the buttons enabled during that save, and
  // such a tap used to be ignored without a word. Now it shows at once on top of what is shown and is saved right after
  // the save before it, in order. A refused save shows what is saved, says why, and drops the taps still waiting.
  const checkIns = useRef<{ saving: boolean; shown: Habit | null; waiting: ((data: HabitData) => HabitData)[] }>({ saving: false, shown: null, waiting: [] });
  async function run(action: () => Promise<void>) { setBusy(true); setError(""); try { await action(); } catch (error) { setError(checkInFailureMessage(error)); } finally { setBusy(false); } }
  // The change applied to this habit alone (only the changed habit is validated again, lib/habits.ts), or undefined if
  // it is refused: then nothing is painted early and the save reports why.
  function preview(change: (data: HabitData) => HabitData, base: Habit): Habit | undefined {
    try { return change({ schemaVersion: store.data.schemaVersion ?? 2, kind: "zigoals-habits", habits: [base], ...(store.data.timeZone ? { timeZone: store.data.timeZone } : {}) }).habits[0]; } catch { return undefined; }
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
    const queue = checkIns.current, before = store.data;
    try { await store.update(change); } catch (error) { queue.waiting = []; settled(); setError(checkInFailureMessage(error)); return; }
    // Session X-Local Part 4 (D5): what the saved check-in means for ZIGi, counted by the engine on the data before and
    // after the write: a streak milestone (proud), the day's last scheduled habit (celebrate, once a day), or a plain
    // completion (a small success). Signalled as validated facts; the controller applies its caps.
    try {
      // The card's store carries the full journal where the page built it from useHabits (then "all done" can be
      // counted); elsewhere (the knock's check-in) only this habit is known and the day's completeness is not judged.
      const journal: HabitData = store.journalData?.() ?? {schemaVersion: before.schemaVersion ?? 2, kind: 'zigoals-habits', habits: [habit], ...(before.timeZone ? {timeZone: before.timeZone} : {})};
      const facts = checkInFacts(journal, change(journal), habit.id, store.today);
      if (facts.streakMilestone) {
        // Session AI (mascot): a milestone celebrates once — an untick and a tick again the same day stays quiet.
        const id = streakNoteId(habit.id, facts.streakMilestone, store.today), seen = celebrations.loaded && !celebrations.unreadable ? !!celebrations.data.seen[id] : false;
        if (!seen) { if (celebrations.loaded && !celebrations.unreadable) { try { celebrations.update(n => ({...n, seen: {...n.seen, [id]: store.today}})); } catch { /* the reaction still plays once in this view */ } } zigiSignals.emitValidated('streak_milestone'); }
      }
      else if (facts.allDone && celebrations.loaded && !celebrations.unreadable && !celebrations.data.seen[allDoneNoteId(store.today)]) { try { celebrations.update(n => ({...n, seen: {...n.seen, [allDoneNoteId(store.today)]: store.today}})); } catch { /* remembered next time */ } zigiSignals.emitValidated('all_habits_done'); }
      // Session AJ (item 10; P4 moment 8): done again after a gap of 3 or more scheduled days — encouraging, once a day per habit.
      else if (facts.comeback && celebrations.loaded && !celebrations.unreadable && !comebackSeenRecently(celebrations.data.seen, habit.id, store.today)) { try { celebrations.update(n => ({...n, seen: {...n.seen, [comebackNoteId(habit.id, store.today)]: store.today}})); } catch { /* remembered next time */ } zigiSignals.emit('hint_encouraging'); }
      else if (facts.completed) zigiSignals.emitValidated('habit_completed');
    } catch { /* ZIGi's reaction is a convenience; the check-in is saved */ }
    const next = queue.waiting.shift();
    if (next) void save(next); else settled();
  }
  function settled() { const queue = checkIns.current; queue.saving = false; queue.shown = null; setPending(null); setBusy(false); }
  // Typed values follow Health's decimal-comma rule ("0,5" is 0.5; "1,234" is refused with a reason).
  // Session AL Part 15 (AL-COMPETITOR-GAP-121): a time habit also takes "1:30", "1 h 30 min" or "45 min", read into its unit.
  function typed() { try { const time = rule.measurement.kind === "duration" ? readDurationText(manual, rule.measurement.unit) : null; return time ?? readHabitNumber(manual, { max: 1_000_000_000, whole: rule.measurement.kind === "count" }); } catch (e) { setError(plainErrorMessage(e, "Enter a number.")); return null; } }
  // Session AL fourth pass (N-085): an exercise habit's value may name its activity (Health's list), kept in the day's note.
  const activityNote = () => withActivityNote(day.note, activity);
  async function saveManual(event: FormEvent) { event.preventDefault(); const value = typed(); if (value !== null) await run(() => withActivity ? store.setValue(habit.id, store.today, value, activityNote()) : store.setValue(habit.id, store.today, value)); }
  async function addManual() { const value = typed(); if (value !== null) await run(() => withActivity ? store.update(data => logHabitValue(data, habit.id, store.today, value, {mode: "add", note: activityNote()})) : store.addValue(habit.id, store.today, value)); }
  if (!day.scheduled) return part === 'quick-log' ? null : <span className={`habit-status habit-day-${day.status}`}>{statusLabel[day.status]}</span>;
  // Session AL fourth pass (PR-061, PR-093, NB-076, NB-158, H-008): an "X times a week" habit is counted in its week. Today's
  // check-in that meets the day's target is done for today ("✓ Done", its Undo), even while the week is still open, and a
  // one-a-day count reads "1 / 3 this week" instead of "1 / 1 time today · Partial". A limit counts "at most" per day.
  // Session AL fifth pass (PR-093): a limit counted over a week, month or year reads the period's amount and its verdict
  // ("3 of at most 2 times this week · Over the limit this week"), as its subtitle says; never today's count beside it.
  const limit = rule.type === "limit" ? limitPeriodProgress(shown, store.today) : null;
  const overLimit = rule.type === "limit" && (limit ? limit.over : day.count > day.target);
  const freq = rule.schedule.kind === "frequency" && rule.schedule.times > 1 && !limit ? frequencyProgress(shown, store.today) : null;
  const doneToday = rule.type === "build" && !!freq && day.status === "partial" && day.target > 0 && day.count >= day.target;
  // Session AL fourth pass (N-056, D-220): an automatic tick counts what Health holds now (components/habits/auto-value.ts).
  const link = links.loaded ? links.data.links[habit.id] : undefined;
  const autoCount = autoTickCount(shown, rule, store.today, marker, link, healthContext?.health) ?? healthSoFar(shown, rule, store.today, marker, link, healthContext?.health);
  // MO-123: Health's value so far, before the tick, says where the number comes from.
  const soFar = !marker && autoCount !== null && link ? `Counting from ${measureSource({measure: link.measure, exerciseId: link.exerciseId}, healthContext?.counters ?? [])} · ${formatMeasureValue(link.measure, healthSoFarValue(link, healthContext?.health, store.today) ?? 0, healthContext?.waterUnit)} so far; it ticks itself off at the target.` : null;
  const doneNow = day.status === "complete" || doneToday, weekCount = !!freq && rule.type === "build" && day.target === 1;
  const freqResult = !freq || rule.type !== "build" ? null : day.status === "complete" ? `Done: this ${freq.period}’s ${plain(freq.times)} reached` : doneToday ? "Done today" : day.status === "due" ? "Not done today" : day.status === "partial" ? "Partly done today" : null;
  const smartLabel = rule.type === "quit" ? `Stayed on track for ${habit.title}` : rule.type === "limit" ? `Stayed within limit for ${habit.title}` : `${doneNow ? "Undo completion for" : "Complete"} ${habit.title}`;
  return <div className={`habit-completion ${compact ? "habit-completion-compact" : ""}${part === 'quick-log' ? " habit-completion-quick-log" : ""}`}>
    {part !== 'quick-log' && <div><div className="habit-count"><strong>{/* Session AL (NB-063, P-NB-29): a part-minute in seconds ("49 s"), never "0.81" */}{weekCount ? plain(freq!.done) : limit ? plain(limit.amount) : durationCountText(autoCount ?? day.count, unit) ?? plain(autoCount ?? day.count)}</strong><span>{weekCount ? ` / ${plain(freq!.times)} this ${freq!.period}` : limit ? ` of at most ${plain(limit.target)}${unit ? ` ${unitFor(limit.target, unit)}` : ""} this ${limit.period}` : rule.type === "limit" ? ` of at most ${plain(day.target)}${unit ? ` ${unitFor(day.target, unit)}` : ""}${compact ? "" : " today"}` : rule.type === "quit" ? `${/* Session AL (DV-131, P-DV-122): a quit habit counts slips, never "0 times today" */ !unit || unit === "times" || unit === "time" ? ` ${day.count === 1 ? "slip" : "slips"}` : ` ${unitFor(day.count, unit)}`}${compact ? "" : " today"}` : ` / ${plain(day.target)}${unit ? ` ${unitFor(day.target, unit)}` : ""}${compact ? "" : rule.schedule.kind === "frequency" && rule.schedule.times > 1 ? " today" : ` per ${habitTargetPeriod(rule)}`}`}</span></div>{/* Session X P2.1: the day's new state is announced when a check-in changes it (nothing is read on arrival). */}{/* Session AL (P-NB-23; NB-076, NB-158, H-008): a few-times-a-week habit says how the week stands, not only today. */}{freq && !weekCount && <small className="habit-period-progress">{freq.done} of {freq.times} {rule.type === "build" ? "" : rule.type === "limit" ? "days within the limit " : "days on track "}this {freq.period}</small>}<small className={`habit-result habit-day-${day.status}`} aria-live="polite">{/* Session AH (HA6, BUG-082): a quit or limit habit with nothing logged today is on track so far, not "Due" beside "Stayed on track" */}{freqResult ?? (limit ? (limit.over ? `Over the limit this ${limit.period}` : "Within the limit so far") : rule.type === "limit" && day.status === "failed" ? "Over the limit today" : rule.type === "limit" && day.status === "complete" ? "Within the limit today" : rule.type !== "build" && day.status === "due" ? "On track so far" : rule.type === "quit" && day.status === "complete" ? "On track today" : rule.type === "quit" && day.status === "failed" ? "A slip today" : statusLabel[day.status])}</small></div>}
    {part !== 'quick-log' && <div className="habit-check-actions">
      {/* Session Y Part 8: every measured habit (count, duration, quantity, custom) gets "−" beside "+", never below 0. A
          "−" that takes an automatically ticked day below its target marks that check-in undone, as "Undo completion" does. */}
      {rule.measurement.kind !== "boolean" && <button className="quiet" aria-label={step === 1 ? `Remove one from ${habit.title}` : `Remove ${plain(step)} from ${habit.title}`} disabled={!pending && busy || day.count === 0} aria-busy={!!pending || undefined} onClick={() => { if (day.status === "complete" && rule.type === "build" && marker && !marker.undone && day.count - step < day.target) { links.update(current => markAutoCheckInUndone(current, habit.id, store.today)).catch(() => { /* the change itself still saves; the marker then keeps the day off through the entry */ }); } checkIn(habitCheckIn.adjustCount(habit.id, store.today, -step)); }}>−</button>}
      {rule.measurement.kind !== "boolean" && <button className="quiet" aria-label={rule.type === "quit" ? `Record one event for ${habit.title}` : step === 1 ? `Add one to ${habit.title}` : `Add ${plain(step)} to ${habit.title}`} title={step === 1 ? undefined : `+${plain(step)}`} disabled={!pending && busy} aria-busy={!!pending || undefined} onClick={() => checkIn(habitCheckIn.addValue(habit.id, store.today, rule.type === "quit" ? 1 : step))}>{step === 1 || rule.type === "quit" ? "+" : `+${plain(step)}${stepUnit(unit) ? `\u00a0${stepUnit(unit)}` : ""}`}</button>}
      {/* PR-093: over the limit, "Within limit" would say the opposite of the count; "−" corrects a wrong tap. */}
      {!overLimit && <button className={doneNow ? "secondary habit-done" : "primary"} aria-label={smartLabel} aria-pressed={doneNow} disabled={!pending && busy} aria-busy={!!pending || undefined} onClick={(event) => { /* Session AK M1: the completion moment, on the Habits page card only (never the PROTECTED Checklist) */ if (!doneNow && event.currentTarget.closest(".habit-card")) celebrateCompletion(event.currentTarget); if (doneNow && rule.type === "build" && marker && !marker.undone) { links.update(current => markAutoCheckInUndone(current, habit.id, store.today)).catch(() => { /* the undo itself still saves; the marker then keeps the day off through the entry */ }); } const undoing = doneNow && rule.type === "build", before = day.count; checkIn(undoing ? habitCheckIn.setValue(habit.id, store.today, 0) : habitCheckIn.smartDone(habit.id, store.today));
        // Session AH (HA13; D-042, N-069, M-036): the tap is said in the app's one toast, with Undo either way.
        if (rule.type === "build") showUndo(undoing ? {message: `${habit.title}: today is no longer complete.`, restore: () => store.update(habitCheckIn.setValue(habit.id, store.today, before)), undone: `${habit.title} is complete again.`} : {message: `${habit.title}: done for today.`, restore: () => store.update(habitCheckIn.setValue(habit.id, store.today, before)), undone: `${habit.title}: back to ${before === 0 ? "not done" : `${plain(before)} of ${plain(day.target)}`}.`,
          // Session AH (J3): a habit that supports a private Goal offers to record a contribution there; the person
          // chooses the amount on the Goal's own form, nothing is added by the tick itself.
          ...(habit.goalLink?.chainId === "private" ? {link: {href: `/app/goals/tracked/${encodeURIComponent(habit.goalLink.goalId)}?contribute=1`, label: "Add to its Goal"}} : {})}); }}>{busy && !pending ? "Saving…" : rule.type === "quit" ? "Stayed on track" : rule.type === "limit" ? "Within limit" : doneNow ? "✓ Done" : "Complete"}</button>}
    </div>}
    {!compact && part !== 'controls' && rule.measurement.kind !== "boolean" && <details className="habit-quick-log"><summary aria-label={`${habit.title}: set or add a value`}>Set or add a value</summary><form onSubmit={saveManual}><label className="field">Value for {habit.title}<input type="text" inputMode={rule.measurement.kind === "count" ? "numeric" : rule.measurement.kind === "duration" ? "text" : "decimal"} autoComplete="off" value={manual} onChange={(event) => setManual(event.target.value)} /></label>{rule.measurement.kind === "duration" && <small className="fine">{rule.measurement.unit === "hours" ? "Hours" : "Minutes"}, or a time like 1:30 or 1 h 30 min.</small>}{withActivity && <><label className="field">Activity (optional)<input list={activityList} maxLength={60} autoComplete="off" value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Run, Yoga, Cycling…" /><small>Kept in today’s note, as “Activity: …”.</small></label><datalist id={activityList}>{ACTIVITY_CHOICES.map(a => <option key={a} value={a} />)}</datalist></>}<div className="actions"><button className="secondary" type="submit">Set value</button><button className="quiet" type="button" onClick={() => void addManual()}>Add value</button></div><p className="fine">Set value replaces today’s total; Add value adds to it.</p></form></details>}
    {part !== 'quick-log' && <AutoCheckInBadge habitId={habit.id} marker={marker} link={links.data.links[habit.id]} />}
    {part !== 'quick-log' && soFar && <p className="habit-health-so-far" role="status">{soFar}</p>}
    {part !== 'quick-log' && autoRules?.badge(habit.id, habit.title)}
    {error && <p className="habit-inline-error" role="alert">{error}</p>}
  </div>;
}
