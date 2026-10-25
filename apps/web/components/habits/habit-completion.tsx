"use client";
import {AutoCheckInBadge} from "./auto-checkin-badge";
import {CELEBRATIONS} from '../../lib/celebrations';
import {useRef, useState, type FormEvent} from 'react';
import {habitDay, habitRuleOn, habitTargetPeriod, measurementUnit, type Habit, type HabitData} from "../../lib/habits";
import {habitCheckIn, type HabitCardStore} from "./use-habits";
import {allDoneNoteId, checkInFacts} from '../../lib/habits-v2/zigi-facts';
import {appliedCheckIn, markAutoCheckInUndone} from "../../lib/habit-health-links/store";
import {checkInFailureMessage} from "../../lib/storage-error-copy";
import {formNumberText, readFormNumber} from "../../lib/decimal-input";
import {formatNumber} from "../../lib/visual-format";
import {unitFor} from "../../lib/plural";
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabitHealthLinks} from "./use-habit-health-links";
import {zigiSignals} from '../zigi/bus';

/**
 * The check-in control of a habit card (Session AA-Local Gate A, ADR-022 B41): its own small module, so Today, the Habits
 * widget and a tracked goal load it without the whole card; the card itself is a lazy chunk (habit-card.tsx).
 */
const statusLabel = { complete: "Complete", partial: "Partial", due: "Due", skipped: "Skipped", failed: "Failed", "not-scheduled": "Not scheduled", paused: "Paused", archived: "Archived", future: "Future", "planned-skip": "Planned skip", "not-started": "Before you started" };
const plain = (value: number) => formatNumber(value, { maximumFractionDigits: 9 });
function afterPaint(run: () => void) {
  // Session AH Part 2: a reload, a navigation or a closed tab inside that frame starts the waiting save at once
  // (pagehide), so a tap that already shows is not dropped on the way out.
  let done = false; const once = () => { if (!done) { done = true; window.removeEventListener("pagehide", once); run(); } };
  window.addEventListener("pagehide", once);
  requestAnimationFrame(() => setTimeout(once, 0)); setTimeout(once, 100);
}
export function HabitCompletion({part='both',  habit, store, compact = false }: {/** Session AB-Design (owner request 20): the card shows the counter first and keeps the form behind its expander. */ part?: 'both' | 'controls' | 'quick-log';  habit: Habit; store: HabitCardStore; compact?: boolean }) {
  // H7: this device's automatic check-in for today, if any (lib/habit-health-links); read once per card, written only by Undo.
  const links = useHabitHealthLinks(); const marker = links.loaded ? appliedCheckIn(links.data, habit.id, store.today) : undefined;
  // Paint first, then save (Session I, Part 9): a tap shows its result on the next frame, and the save runs after that
  // frame. If the save fails, the card returns to what is saved and says why (Part 5's coded message), so a check-in is
  // never left showing as saved when it was not.
  const [pending, setPending] = useState<Habit | null>(null);
  const shown = pending ?? habit;
  const day = habitDay(shown, store.today, store.today); const rule = habitRuleOn(shown,store.today)??shown.rules[0]!; const unit = measurementUnit(rule);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [manual, setManual] = useState(() => formNumberText(day.count));
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
      if (facts.streakMilestone) zigiSignals.emitValidated('streak_milestone');
      else if (facts.allDone && celebrations.loaded && !celebrations.unreadable && !celebrations.data.seen[allDoneNoteId(store.today)]) { try { celebrations.update(n => ({...n, seen: {...n.seen, [allDoneNoteId(store.today)]: store.today}})); } catch { /* remembered next time */ } zigiSignals.emitValidated('all_habits_done'); }
      else if (facts.completed) zigiSignals.emitValidated('habit_completed');
    } catch { /* ZIGi's reaction is a convenience; the check-in is saved */ }
    const next = queue.waiting.shift();
    if (next) void save(next); else settled();
  }
  function settled() { const queue = checkIns.current; queue.saving = false; queue.shown = null; setPending(null); setBusy(false); }
  // Typed values follow Health's decimal-comma rule ("0,5" is 0.5; "1,234" is refused with a reason).
  function typed() { try { return readFormNumber(manual, { max: 1_000_000_000, whole: rule.measurement.kind === "count" }); } catch (e) { setError(e instanceof Error ? e.message : "Enter a number."); return null; } }
  async function saveManual(event: FormEvent) { event.preventDefault(); const value = typed(); if (value !== null) await run(() => store.setValue(habit.id, store.today, value)); }
  async function addManual() { const value = typed(); if (value !== null) await run(() => store.addValue(habit.id, store.today, value)); }
  if (!day.scheduled) return part === 'quick-log' ? null : <span className={`habit-status habit-day-${day.status}`}>{statusLabel[day.status]}</span>;
  const smartLabel = rule.type === "quit" ? `Stayed on track for ${habit.title}` : rule.type === "limit" ? `Stayed within limit for ${habit.title}` : `${day.status === "complete" ? "Undo completion for" : "Complete"} ${habit.title}`;
  return <div className={`habit-completion ${compact ? "habit-completion-compact" : ""}${part === 'quick-log' ? " habit-completion-quick-log" : ""}`}>
    {part !== 'quick-log' && <div><div className="habit-count"><strong>{plain(day.count)}</strong><span>{rule.type === "quit" ? `${unit ? ` ${unitFor(day.count, unit)}` : ""}${compact ? "" : " today"}` : ` / ${plain(day.target)}${unit ? ` ${unitFor(day.target, unit)}` : ""}${compact ? "" : rule.schedule.kind === "frequency" && rule.schedule.times > 1 ? " today" : ` per ${habitTargetPeriod(rule)}`}`}</span></div>{/* Session X P2.1: the day's new state is announced when a check-in changes it (nothing is read on arrival). */}<small className={`habit-result habit-day-${day.status}`} aria-live="polite">{statusLabel[day.status]}</small></div>}
    {part !== 'quick-log' && <div className="habit-check-actions">
      {/* Session Y Part 8: every measured habit (count, duration, quantity, custom) gets "−" beside "+", never below 0. A
          "−" that takes an automatically ticked day below its target marks that check-in undone, as "Undo completion" does. */}
      {rule.measurement.kind !== "boolean" && <button className="quiet" aria-label={`Remove one from ${habit.title}`} disabled={!pending && busy || day.count === 0} aria-busy={!!pending || undefined} onClick={() => { if (day.status === "complete" && rule.type === "build" && marker && !marker.undone && day.count - 1 < day.target) { links.update(current => markAutoCheckInUndone(current, habit.id, store.today)).catch(() => { /* the change itself still saves; the marker then keeps the day off through the entry */ }); } checkIn(habitCheckIn.adjustCount(habit.id, store.today, -1)); }}>−</button>}
      {rule.measurement.kind !== "boolean" && <button className="quiet" aria-label={rule.type === "quit" ? `Record one event for ${habit.title}` : `Add one to ${habit.title}`} disabled={!pending && busy} aria-busy={!!pending || undefined} onClick={() => checkIn(habitCheckIn.addValue(habit.id, store.today, 1))}>+</button>}
      <button className={day.status === "complete" ? "secondary habit-done" : "primary"} aria-label={smartLabel} aria-pressed={day.status === "complete"} disabled={!pending && busy} aria-busy={!!pending || undefined} onClick={() => { if (day.status === "complete" && rule.type === "build" && marker && !marker.undone) { links.update(current => markAutoCheckInUndone(current, habit.id, store.today)).catch(() => { /* the undo itself still saves; the marker then keeps the day off through the entry */ }); } checkIn(day.status === "complete" && rule.type === "build" ? habitCheckIn.setValue(habit.id, store.today, 0) : habitCheckIn.smartDone(habit.id, store.today)); }}>{busy && !pending ? "Saving…" : rule.type === "quit" ? "Stayed on track" : rule.type === "limit" ? "Within limit" : day.status === "complete" ? "✓ Done" : "Complete"}</button>
    </div>}
    {!compact && part !== 'controls' && rule.measurement.kind !== "boolean" && <details className="habit-quick-log"><summary>Set or add a value</summary><form onSubmit={saveManual}><label className="field">Value for {habit.title}<input type="text" inputMode={rule.measurement.kind === "count" ? "numeric" : "decimal"} autoComplete="off" value={manual} onChange={(event) => setManual(event.target.value)} /></label><div className="actions"><button className="secondary" type="submit">Set value</button><button className="quiet" type="button" onClick={() => void addManual()}>Add value</button></div></form></details>}
    {part !== 'quick-log' && <AutoCheckInBadge habitId={habit.id} marker={marker} link={links.data.links[habit.id]} />}
    {error && <p className="habit-inline-error" role="alert">{error}</p>}
  </div>;
}
