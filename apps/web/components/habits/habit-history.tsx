"use client";
import { PlanSkip } from "./plan-skip";
import { Suspense, lazy, useState, type FormEvent } from "react";
import {moveHabitStart} from "../../lib/habit-actions";
import { habitDay, habitRuleOn, habitTargetPeriod, latestHabitRule, measurementUnit, scheduleLabel, type Habit } from "../../lib/habits";
import { addLocalDays, localWeekday } from "../../lib/local-date";
import {formNumberText} from "../../lib/decimal-input";
import {readHabitNumber} from "../../lib/habit-number";
import { type HabitCardStore } from "./use-habits";
import { formatDate, formatDateTime, formatMonth } from "../../lib/visual-format";
import { unitFor } from "../../lib/plural";
import { storageMessageOr } from "../../lib/storage-error-copy";
import {markDayWithUndo} from './skip-undo';
import {plainErrorMessage} from "../../lib/plain-error";
import {DAY_MARK, longDate, moveMonth, plain, statusLabel} from './habit-card-words';

/**
 * CI14 (page weights; budgets are never raised): a card's "History & reflection" (the month calendar, the day editor,
 * logging days before the start, planned skips and the rule history), moved here from habit-card-full.tsx unchanged. It
 * renders only once the person opens that fold, so it is a chunk of its own, asked for as the card's code loads.
 */
const Reflections = lazy(() => import('./today-note').then(m => ({default: m.Reflections})));
/** Session AH (HA18/J9, N-038): days from before the habit was made can be logged once its start moves back. */
function StartEarlier({ habit, store }: { habit: Habit; store: HabitCardStore }) {
  const [open, setOpen] = useState(false), [day, setDay] = useState(addLocalDays(habit.startDate, -7)), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  if (!open) return <p className="fine"><button type="button" className="text-link habit-start-earlier" onClick={() => setOpen(true)}>Log days before {formatDate(habit.startDate)}…</button></p>;
  return <form className="habit-start-earlier-form" aria-label={`Start ${habit.title} earlier`} onSubmit={event => { event.preventDefault(); setBusy(true); setError(""); store.update(data => moveHabitStart(data, habit.id, day)).then(() => setOpen(false), e => setError(plainErrorMessage(e, "The start was not moved."))).finally(() => setBusy(false)); }}>
    <label className="field">Start this habit on<input type="date" required min="1990-01-01" max={addLocalDays(habit.startDate, -1)} value={day} onChange={e => setDay(e.target.value)} /></label>
    <p className="fine">Then pick those days in the calendar to fill them in. A day you leave empty counts as missed, as any scheduled day does.</p>
    <div className="actions"><button className="secondary" type="submit" disabled={busy}>Move the start back</button><button className="quiet" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
export function HabitHistory({ habit, store }: { habit: Habit; store: HabitCardStore }) {
  const [month, setMonth] = useState(store.today.slice(0, 7)); const [selectedDate, setSelectedDate] = useState(store.today); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const first = `${month}-01`; const gridStart = addLocalDays(first, -((localWeekday(first) + 6) % 7)); const day = habitDay(habit, selectedDate, store.today); const rule = habitRuleOn(habit, selectedDate) ?? latestHabitRule(habit);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const mood = String(form.get("mood")) as "energized" | "good" | "neutral" | "difficult" | "calm" | "";
    let count: number; try { count = readHabitNumber(String(form.get("count")), { max: 1_000_000_000, whole: rule.measurement.kind === "count" }); } catch (e) { setMessage(""); setError(plainErrorMessage(e, "Enter a number.")); return; }
    setBusy(true); setMessage(""); setError(""); try { await store.setCount(habit.id, selectedDate, count, String(form.get("note")), mood || undefined); setMessage("Day saved."); } catch (error) { setError(storageMessageOr(error, "This day could not be saved. Choose a scheduled active day up to today.")); } finally { setBusy(false); }
  }
  async function mark(status: "skipped" | "failed") { setBusy(true); setMessage(""); setError(""); try { await markDayWithUndo(store.update, habit, selectedDate, store.today, status, day.note); /* Session AL (P-NB-26; PR-044): the toast offers Undo */ setMessage(status === "skipped" ? "Day skipped." : "Day marked failed."); } catch (error) { setError(storageMessageOr(error, "This day could not be changed.")); } finally { setBusy(false); } }
  function chooseDate(date: string) { if (!date) return; setSelectedDate(date); setMonth(date.slice(0, 7)); setMessage(""); setError(""); }
  return <div className="habit-history">
    <div className="habit-calendar-heading"><button className="quiet" aria-label={`Previous month for ${habit.title}`} disabled={month <= habit.startDate.slice(0, 7)} onClick={() => setMonth(moveMonth(month, -1))}>←</button><strong>{formatMonth(first)}</strong><button className="quiet" aria-label={`Next month for ${habit.title}`} disabled={month >= store.today.slice(0, 7)} onClick={() => setMonth(moveMonth(month, 1))}>→</button></div>
    <div className="habit-calendar" role="group" aria-label={`${habit.title} completion calendar`}>{["M", "T", "W", "T", "F", "S", "S"].map((label, index) => <small aria-hidden="true" key={`label-${index}`}>{label}</small>)}{Array.from({ length: 42 }, (_, index) => {
      const date = addLocalDays(gridStart, index); const result = habitDay(habit, date, store.today); if (!date.startsWith(month)) return <span key={date} />;
      return <button key={date} type="button" className={`habit-calendar-day habit-day-${result.status}`} disabled={date > store.today || date < habit.startDate} aria-pressed={selectedDate === date} aria-label={`${longDate(date)}: ${statusLabel[result.status]}, ${plain(result.count)} of ${plain(result.target)}`} onClick={() => chooseDate(date)}><span>{Number(date.slice(-2))}</span>{/* Session AH (C7, BUG-082; HA6): every state shows the mark its legend promises, a part-done failed day ◐ */}{DAY_MARK(result) && <span className={`habit-calendar-check habit-calendar-mark-${result.status}`} aria-hidden="true">{DAY_MARK(result)}</span>}</button>;
    })}</div>
    {/* Session AL (P-NB-33; NB-071, NB-249): greyed days before the start say why, right under the calendar. */}
    {first <= habit.startDate && <p className="fine habit-prestart-hint">Days before {formatDate(habit.startDate)} are greyed: this habit started then. To fill them in, use “Log days before {formatDate(habit.startDate)}…” below.</p>}
    <p className="habit-calendar-legend"><span>✓ Complete</span><span>◐ Partly done</span><span>× Failed</span><span>○ Skipped</span><span>◌ Planned skip</span><span>— Not scheduled</span></p>
    {/* Session AH (HA18/J9; T-020, N-163): the streak rule and its grace, said where the days are. */}
    <p className="fine habit-streak-legend">Streak: each ✓ adds a day; ○ and ◌ are rest days that keep it; × ends it. A freeze (Journey) can turn one missed day of the last week into a rest day.</p>
    <StartEarlier habit={habit} store={store} />
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
    <details className="habit-rule-history"><summary aria-label={`Rule history for ${habit.title}`}>Rule history</summary><ul>{habit.rules.map((item) => <li key={item.from}><time dateTime={item.from}>{formatDate(item.from)}</time> · {item.state} · {item.type.toUpperCase()} · {scheduleLabel(item.schedule)} · {plain(item.target)} {unitFor(item.target, measurementUnit(item))} per {habitTargetPeriod(item)}</li>)}</ul>{!!habit.ruleRevisions?.length&&<details><summary>Retained rule revisions ({habit.ruleRevisions.length})</summary><p className="fine">Original and scheduled terms are retained, including superseded future terms. Earlier same-day edits before this record were not retained.</p><ol>{habit.ruleRevisions.map(r=><li key={r.id}>Effective {formatDate(r.rule.from)} · {r.rule.state} · {plain(r.rule.target)} {unitFor(r.rule.target, measurementUnit(r.rule))} per {habitTargetPeriod(r.rule)} · {scheduleLabel(r.rule.schedule)}<p className="fine">Recorded {formatDateTime(r.recordedAt)} · {r.source==='retained'?'Existing rule captured':'Scheduled edit'}</p></li>)}</ol></details>}</details>
  </div>;
}
