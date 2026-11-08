"use client";
import { MONTH_WEEKDAY_NTH, monthWeekdayLabel, type MonthWeekdayNth } from "../../lib/habit-month-weekday/rule";
import { lazy, Suspense, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {earliestHabitChange,earliestHabitEdit,habitEditFingerprint} from "../../lib/habit-actions";
import { habitInputSchema, latestHabitRule, type Habit, type HabitGoalLink, type HabitInput, type HabitRule } from "../../lib/habits";
import {formNumberText} from "../../lib/decimal-input";
import {readHabitNumber} from "../../lib/habit-number";
import { unitFor } from "../../lib/plural";
import { INVISIBLE_NAME, isInvisibleName } from "../../lib/visible-text";
import { ReminderTimeField } from "../reminders/reminder-time-field";
import { HealthLinkField, healthLinkDraft, healthLinkFromDraft, suggestedHealthLink, waterTargetFromLitres } from "./health-link-field";
import type { HabitHealthLinkV4 as HabitHealthLink } from "../../lib/habit-health-links/schema";
import type { ExerciseCounter } from "../../lib/health-counters";
import { useFieldErrors } from "../field-errors";
import { useChainChoice } from "../chain/use-chain-choice";
import {plainErrorMessage} from "../../lib/plain-error";
import { foldHoldsError, habitCountingDiffers } from "../../lib/habit-form-fold";
import type { PhraseChoice } from "./recurrence-phrase";
import { formatNumber } from "../../lib/visual-format";
// Session AK (item 21): "Type the schedule in words" loads only when that fold is opened.
const RecurrencePhrase = lazy(() => import("./recurrence-phrase"));

export type HabitGoalOption = { label: string; link: HabitGoalLink };
/** Session AL (P-NB-19): the new-habit draft in this tab's session storage (`zigoals:habit-draft:v1`); tolerant reads, never synced or exported. */
const HABIT_DRAFT_KEY = "zigoals:habit-draft:v1";
type HabitDraft = { title: string; category: string; type: HabitRule["type"]; measurement: HabitRule["measurement"]["kind"]; unit: string; target: string; scheduleKind: HabitRule["schedule"]["kind"]; days: number[]; timeOfDay: Habit["timeOfDay"] };
function readHabitDraft(): Partial<HabitDraft> | null {
  try {
    const raw = window.sessionStorage.getItem(HABIT_DRAFT_KEY); if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>; if (!d || typeof d !== "object") return null;
    const str = (k: string, max: number) => typeof d[k] === "string" && (d[k] as string).length <= max ? d[k] as string : undefined;
    const pick = <T extends string>(k: string, allowed: readonly T[]) => allowed.includes(d[k] as T) ? d[k] as T : undefined;
    const days = Array.isArray(d.days) && d.days.every(n => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6) ? [...new Set(d.days as number[])] : undefined;
    return { title: str("title", 100), category: str("category", 50), unit: str("unit", 24), target: str("target", 30), type: pick("type", ["build", "quit", "limit"] as const), measurement: pick("measurement", ["boolean", "count", "duration", "quantity", "custom"] as const), scheduleKind: pick("scheduleKind", ["daily", "weekdays", "interval", "frequency", "month-dates"] as const), timeOfDay: pick("timeOfDay", ["anytime", "morning", "afternoon", "evening"] as const), days };
  } catch { return null; }
}
function writeHabitDraft(draft: HabitDraft | null) {
  try { if (draft === null || !draft.title.trim()) window.sessionStorage.removeItem(HABIT_DRAFT_KEY); else window.sessionStorage.setItem(HABIT_DRAFT_KEY, JSON.stringify(draft)); } catch { /* a draft is a convenience */ }
}
type MeasurementKind = HabitRule["measurement"]["kind"];
type ScheduleKind = HabitRule["schedule"]["kind"];
const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const templates = {
  walk: { title: "Walk", category: "Movement", type: "build", measurement: "quantity", unit: "steps", target: 8000, targetPeriod: "day", schedule: "daily" },
  exercise: { title: "Exercise", category: "Movement", type: "build", measurement: "duration", unit: "minutes", target: 30, targetPeriod: "day", schedule: "weekdays" },
  water: { title: "Drink water", category: "Health", type: "build", measurement: "quantity", unit: "liters", target: 2, targetPeriod: "day", schedule: "daily" },
  read: { title: "Read", category: "Learning", type: "build", measurement: "duration", unit: "minutes", target: 30, targetPeriod: "day", schedule: "daily" },
  study: { title: "Study", category: "Learning", type: "build", measurement: "duration", unit: "hours", target: 1, targetPeriod: "day", schedule: "weekdays" },
  buyzig: { title: "My ZIG plan", category: "Finance", type: "build", measurement: "quantity", unit: "USD", target: 500, targetPeriod: "month", schedule: "frequency" },
  budget: { title: "Review budget", category: "Finance", type: "build", measurement: "boolean", unit: "", target: 1, targetPeriod: "day", schedule: "frequency" },
  savings: { title: "My savings plan", category: "Finance", type: "build", measurement: "quantity", unit: "USD", target: 100, targetPeriod: "month", schedule: "daily" },
  nospend: { title: "No-spend day", category: "Finance", type: "quit", measurement: "count", unit: "purchases", target: 0, targetPeriod: "day", schedule: "daily" },
} as const;
/** Session AK P4 (FR-17): templates in the chain's words wait until the chain is chosen (lib/chain-choice.ts), as page templates do. */
const CHAIN_TEMPLATES: ReadonlySet<string> = new Set(["buyzig"]);
export type HabitTemplateKey = keyof typeof templates;
export const HABIT_TEMPLATE_TITLES: Record<HabitTemplateKey, string> = Object.fromEntries(Object.entries(templates).map(([key, t]) => [key, t.title])) as Record<HabitTemplateKey, string>;
/** A template as a complete new habit, exactly as the editor would save it after choosing that template and nothing else. */
export function habitTemplateInput(key: HabitTemplateKey): HabitInput {
  const t = templates[key];
  const measurement = t.measurement === "boolean" ? { kind: "boolean" as const } : t.measurement === "duration" ? { kind: "duration" as const, unit: t.unit === "hours" ? "hours" as const : "minutes" as const } : { kind: t.measurement, unit: t.unit };
  const schedule: HabitRule["schedule"] = t.schedule === "daily" ? { kind: "daily" } : t.schedule === "weekdays" ? { kind: "weekdays", days: [1, 2, 3, 4, 5] } : { kind: "frequency", times: 1, period: t.title === "My ZIG plan" ? "month" : "week" };
  return habitInputSchema.parse({ title: t.title, category: t.category, description: "", notes: "", type: t.type, measurement, target: t.type === "quit" ? 0 : t.target, targetPeriod: schedule.kind === "frequency" ? "day" : t.targetPeriod, schedule, timeOfDay: "anytime", endCondition: { kind: "none" } });
}

/**
 * `reminder` is this device's reminder time for the habit ("" for none) and `healthLink` its "done automatically from
 * Health" rule (null for none); both are saved apart from the habit (lib/reminders, lib/habit-health-links) through
 * onSave's trailing arguments. `counters` and `waterUnit` come from the Health journal for the link's choices.
 */
export function HabitEditor({ monthWeekday = null, habit, goals, habits,today, reminder = "", healthLink = null, counters = [], waterUnit = "ml", healthLinksUnreadable = false, onStartOverHealthLinks, onSave, onCancel, onIdeas }: { /** Session AB-Design (owner request 19): opens the habit ideas ("Start from an idea") while creating. */ onIdeas?: () => void; habit?: Habit; goals: HabitGoalOption[]; habits: Habit[];today:string; reminder?: string; healthLink?: HabitHealthLink | null; counters?: readonly ExerciseCounter[]; waterUnit?: "ml" | "fl-oz-us"; healthLinksUnreadable?: boolean; onStartOverHealthLinks?: () => void; onSave: (input: HabitInput,from?:string,expected?:string,reminder?:string,healthLink?:HabitHealthLink|null,monthWeekday?:{weekday:number;nth:MonthWeekdayNth}|null) => Promise<void>; /** Session AK F0 (5.1): this habit's "which one of the month" (habit extras), null for every week. */ monthWeekday?: {weekday:number;nth:MonthWeekdayNth}|null; onCancel: () => void }) {
  const formId = useId(), chain = useChainChoice().chosen;
  const [titleCut, setTitleCut] = useState(0);
  const [effectiveFrom,setEffectiveFrom]=useState(()=>habit?earliestHabitChange(habit,today,{allowToday:true}):""),[fromTouched,setFromTouched]=useState(false);
  const [expected]=useState(()=>habit?habitEditFingerprint(habit):undefined);
  const rule = habit ? latestHabitRule(habit) : undefined;
  const [draft0] = useState(() => habit ? null : readHabitDraft());
  const [title, setTitle] = useState(habit?.title ?? draft0?.title ?? "");
  const [category, setCategory] = useState(habit?.category ?? draft0?.category ?? "Personal");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [notes, setNotes] = useState(habit?.notes ?? "");
  const [type, setType] = useState<HabitRule["type"]>(rule?.type ?? draft0?.type ?? "build");
  const [measurement, setMeasurement] = useState<MeasurementKind>(rule?.measurement.kind ?? draft0?.measurement ?? "count");
  const [unit, setUnit] = useState(rule?.measurement.kind === "boolean" ? "" : rule?.measurement.unit ?? draft0?.unit ?? "times");
  const [target, setTarget] = useState(() => draft0?.target ?? formNumberText(rule?.target ?? 1));
  const [targetPeriod, setTargetPeriod] = useState<HabitRule["targetPeriod"]>(rule?.targetPeriod ?? "day");
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>(rule?.schedule.kind ?? draft0?.scheduleKind ?? "daily");
  const [days, setDays] = useState(rule?.schedule.kind === "weekdays" ? rule.schedule.days : draft0?.days ?? [1, 2, 3, 4, 5]);
  const [interval, setInterval] = useState(String(rule?.schedule.kind === "interval" ? rule.schedule.every : 2));
  const [frequency, setFrequency] = useState(String(rule?.schedule.kind === "frequency" ? rule.schedule.times : 1));
  const [frequencyPeriod, setFrequencyPeriod] = useState<"week" | "month" | "year">(rule?.schedule.kind === "frequency" ? rule.schedule.period : "week");
  const [monthDates, setMonthDates] = useState(rule?.schedule.kind === "month-dates" ? rule.schedule.days.join(", ") : "1, 15");
  // Session AK F0 (5.1): one weekday may be "the first … of the month" (or second, third, fourth, last); "every" is every week.
  const [monthNth, setMonthNth] = useState<"every" | `${MonthWeekdayNth}`>(monthWeekday && rule?.schedule.kind === "weekdays" && rule.schedule.days.length === 1 && rule.schedule.days[0] === monthWeekday.weekday ? `${monthWeekday.nth}` : "every");
  // Session AL (DV-188c, P-DV-123): editing a habit, Cancel with unsaved changes asks once before it drops them.
  const fields = JSON.stringify([title, category, description, notes, type, measurement, unit, target, targetPeriod, scheduleKind, days, interval, frequency, frequencyPeriod, monthDates]);
  const [initialFields] = useState(fields), [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = !!habit && fields !== initialFields;
  const [timeOfDay, setTimeOfDay] = useState(habit?.timeOfDay ?? draft0?.timeOfDay ?? "anytime");
  // Session AK (item 21): "every other tue" starts on the next Tuesday; null keeps the form's own start (today).
  const [phraseAnchor, setPhraseAnchor] = useState<string | null>(null), [phraseOpen, setPhraseOpen] = useState(false);
  const [endKind, setEndKind] = useState(habit?.endCondition.kind ?? "none");
  const [endDate, setEndDate] = useState(habit?.endCondition.kind === "date" ? habit.endCondition.date : "");
  const [endCount, setEndCount] = useState(String(habit?.endCondition.kind === "completions" ? habit.endCondition.count : 30));
  const [stackAfterId, setStackAfterId] = useState(habit?.stackAfterId ?? "");
  const [reminderTime, setReminderTime] = useState(reminder);
  const [linkDraft, setLinkDraft] = useState(() => healthLinkDraft(healthLink, waterUnit));
  // Session AH (TR9/HA2): a new habit whose unit Health records starts with that link, until the person changes the field.
  const [linkTouched, setLinkTouched] = useState(false);
  const suggested = !habit && !linkTouched && !healthLink && linkDraft.measure === '' ? suggestedHealthLink({title, unit, target, measurement}, waterUnit) : null;
  const shownLink = suggested ?? linkDraft;
  const [busy, setBusy] = useState(false);
  // Session AL (P-NB-19; NB-077, BUG-077): a new habit's typed fields survive a reload or a remount in this tab (session
  // storage, cleared on Create and Cancel); editing an existing habit keeps nothing.
  useEffect(() => { if (habit) return; writeHabitDraft({title, category, type, measurement, unit, target, scheduleKind, days, timeOfDay}); }, [habit, title, category, type, measurement, unit, target, scheduleKind, days, timeOfDay]);
  // Session AL (P-NB-22; NB-072, NB-147, NB-250): the form comes into view with the focus on its title every time it opens.
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => { const el = sectionRef.current; if (!el) return; el.scrollIntoView?.({block: "start", behavior: "auto"}); el.querySelector<HTMLInputElement>("input[data-sheet-focus]")?.focus({preventScroll: true}); }, []);
  // Session Y Part 9: each refusal names its field (aria-invalid, aria-describedby) and the first takes the focus.
  // Session AL (P-NB-17; NB-053, NB-056, BUG-026, N-164): the message shows right under the field it names (it had sat
  // ~600 px below, by the button); a message about the whole form stays by the button.
  const [errField, setErrField] = useState("");
  const fe = useFieldErrors(), error = fe.error, setError = (message: string) => { setErrField(""); if (message) fe.fail(message); else fe.clear(); };
  const errorAt = (name: string) => error && errField === name ? <p role="alert" id={fe.messageId} className="field-error">{error}</p> : null;
  // Session AK D1 (FR-17): "More options" holds how the habit is counted. Closed for a new habit, open on edit, and it
  // opens by itself when a template fills it or a refusal names a field inside it (opened first, so that field takes the focus).
  const [moreOpen, setMoreOpen] = useState(!!habit), moreRef = useRef<HTMLDetailsElement>(null);
  const fail = (message: string, ...fields: string[]) => { if (foldHoldsError(fields)) setMoreOpen(true); setErrField(fields[0] ?? ""); fe.fail(message, ...fields); };
  // Session AL (P-NB-17; NB-177, N-150): the same name twice is allowed but said; a cut at 100 characters is said too.
  const duplicateTitle = !!title.trim() && habits.some(h => h.id !== habit?.id && h.title.trim().toLowerCase() === title.trim().toLowerCase());
  // Session AL third pass (LS-054, P-LS-67): creating a second habit with a name already in use asks once ("Create it
  // anyway" or change the name); the hint above stays for edits. `sameNameOk` is the name the person confirmed.
  const [sameNameAsked, setSameNameAsked] = useState(false), [sameNameOk, setSameNameOk] = useState(""), formRef = useRef<HTMLFormElement>(null);
  const askSameName = !habit && duplicateTitle && sameNameOk !== title.trim().toLowerCase();
  const savedLink = habit?.goalLink;
  const savedGoalIndex = savedLink ? goals.findIndex((option) => JSON.stringify(option.link) === JSON.stringify(savedLink)) : -1;
  const unmatchedLink = !!savedLink && savedGoalIndex < 0;
  const frequencyMaximum = { week: 7, month: 28, year: 365 }[frequencyPeriod];
  const wholeTarget = measurement === "count" || measurement === "boolean";

  function applyTemplate(key: string) {
    const template = templates[key as keyof typeof templates]; if (!template) return;
    setTitle(template.title); setCategory(template.category); setType(template.type); setMeasurement(template.measurement); setUnit(template.unit); setTarget(String(template.target));
    setTargetPeriod(template.targetPeriod); setScheduleKind(template.schedule); if (template.schedule === "weekdays") setDays([1, 2, 3, 4, 5]); /* Session AL (P-NB-18; NB-058): days the person ticked stay unless the template is a weekdays one */ setFrequency("1"); setFrequencyPeriod(template.title === "My ZIG plan" ? "month" : "week");
    if (habitCountingDiffers(template)) setMoreOpen(true);
  }
  /** Session AK (item 21): the phrase box fills the schedule fields (and the reminder and part of the day it read); nothing is saved until Create habit. */
  function applyPhrase({ schedule, time, partOfDay }: PhraseChoice) {
    setScheduleKind(schedule.kind); setPhraseAnchor(schedule.kind === "interval" ? schedule.anchor : null);
    if (schedule.kind === "weekdays") setDays(schedule.days);
    if (schedule.kind === "interval") setInterval(String(schedule.every));
    if (schedule.kind === "frequency") { setFrequency(String(schedule.times)); setFrequencyPeriod(schedule.period); }
    if (schedule.kind === "month-dates") setMonthDates(schedule.days.join(", "));
    if (time) setReminderTime(time);
    if (partOfDay) setTimeOfDay(partOfDay);
  }
  function measurementValue() {
    if (measurement === "boolean") return { kind: "boolean" as const };
    if (measurement === "duration") return { kind: "duration" as const, unit: unit === "hours" ? "hours" as const : "minutes" as const };
    return { kind: measurement, unit } as const;
  }
  function scheduleValue(every: number, times: number): HabitRule["schedule"] {
    if (scheduleKind === "daily") return { kind: "daily" };
    if (scheduleKind === "weekdays") return { kind: "weekdays", days: [...days].sort() };
    if (scheduleKind === "interval") return { kind: "interval", every, anchor: rule?.schedule.kind === "interval" ? rule.schedule.anchor : phraseAnchor ?? today };
    if (scheduleKind === "frequency") return { kind: "frequency", times, period: frequencyPeriod };
    return { kind: "month-dates", days: [...new Set(monthDates.split(",").map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b) };
  }
  // Session AL fifth pass (D-044): the day field shows the day a save will use. Until it is chosen by hand, that is today
  // when the edit as it stands keeps today's record as it is (earliestHabitEdit), else the first free day; it was always
  // tomorrow on a day with a record, while the save then started today.
  const editFrom = (() => {
    if (!habit || fromTouched) return effectiveFrom;
    try {
      const targetValue = type === "quit" ? 0 : readHabitNumber(target, { min: type === "build" && wholeTarget ? 1 : 0, max: 1_000_000_000, whole: wholeTarget, positive: type === "build" });
      const every = scheduleKind === "interval" ? readHabitNumber(interval, { min: 2, max: 365, whole: true }) : 2, times = scheduleKind === "frequency" ? readHabitNumber(frequency, { min: 1, max: frequencyMaximum, whole: true }) : 1;
      const endCondition = endKind === "date" ? { kind: "date" as const, date: endDate } : endKind === "completions" ? { kind: "completions" as const, count: readHabitNumber(endCount, { min: 1, max: 100_000, whole: true }) } : endKind === "goal" && habit.endCondition.kind === "goal" ? habit.endCondition : { kind: "none" as const };
      const parsed = habitInputSchema.safeParse({ title: title.trim() || habit.title, category, description, notes, type, measurement: measurementValue(), target: targetValue, targetPeriod: scheduleKind === "frequency" ? "day" : targetPeriod, schedule: scheduleValue(every, times), timeOfDay, endCondition });
      return parsed.success ? [effectiveFrom, earliestHabitEdit(habit, parsed.data, today)].sort()[0]! : effectiveFrom;
    } catch { return effectiveFrom; }
  })();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const goal = String(form.get("goal"));
    const goalLink = goal === "keep" ? savedLink : goal ? goals.find((option) => JSON.stringify(option.link) === goal)?.link : undefined;
    if (!title.trim()) { fail("Habit title: Give the habit a name.", "title"); return; }
    if (isInvisibleName(title)) { fail(`Habit title: ${INVISIBLE_NAME}`, "title"); return; }
    if (askSameName) { setSameNameAsked(true); return; }
    if (scheduleKind === "weekdays" && days.length === 0) { fail("Scheduled weekdays: Choose at least one day.", "weekdays"); return; }
    if (endKind === "goal" && !goalLink) { fail("Choose a linked Goal before using the Goal target end condition.", "goal"); return; }
    // Typed numbers follow Health's decimal-comma rule; each refusal names its field.
    let targetValue = 0, every = 2, times = 1, count = 30, failed = "";
    try {
      const field = (label: string, read: () => number) => { try { return read(); } catch (e) { failed = ({ "Target value": "target", "Repeat every (days)": "interval", "Times per period": "frequency", "Completion count": "endCount" } as Record<string, string>)[label] ?? ""; throw new Error(`${label}: ${plainErrorMessage(e, "Enter a number.")}`); } };
      if (type !== "quit") targetValue = field("Target value", () => readHabitNumber(target, { min: type === "build" && wholeTarget ? 1 : 0, max: 1_000_000_000, whole: wholeTarget, positive: type === "build" }));
      if (scheduleKind === "interval") every = field("Repeat every (days)", () => readHabitNumber(interval, { min: 2, max: 365, whole: true }));
      if (scheduleKind === "frequency") times = field("Times per period", () => readHabitNumber(frequency, { min: 1, max: frequencyMaximum, whole: true }));
      if (endKind === "completions") count = field("Completion count", () => readHabitNumber(endCount, { min: 1, max: 100_000, whole: true }));
    } catch (e) { fail(plainErrorMessage(e, "Check the numbers in this habit."), ...(failed ? [failed] : [])); return; }
    const endCondition = endKind === "date" ? { kind: "date" as const, date: endDate } : endKind === "completions" ? { kind: "completions" as const, count } : endKind === "goal" && goalLink ? { kind: "goal" as const, goal: goalLink } : { kind: "none" as const };
    const parsed = habitInputSchema.safeParse({ title, category, description, notes, goalLink, type, measurement: measurementValue(), target: targetValue, targetPeriod: scheduleKind === "frequency" ? "day" : targetPeriod, schedule: scheduleValue(every, times), timeOfDay, endCondition, stackAfterId: stackAfterId || undefined });
    if (!parsed.success) { setMoreOpen(true); setError("Check the title, target, unit, recurrence, end condition, and selected days."); return; }
    // The Health link is checked after the habit itself, so its message names its own field; a quit or limit habit has none.
    let link: HabitHealthLink | null = null;
    if (type === "build" && !healthLinksUnreadable) { try { link = healthLinkFromDraft(shownLink, waterUnit); } catch (e) { setError(`Done automatically from Health: ${plainErrorMessage(e, "Check the link.")}`); return; } }
    setBusy(true); setError(""); try { const schedule = parsed.data.schedule, oneDay = schedule.kind === "weekdays" && schedule.days.length === 1 ? schedule.days[0]! : null; /* Session AL sweep 3 (D-044): a day not chosen by hand starts today when the change keeps today's record as it is */const from=habit&&!fromTouched?[editFrom,earliestHabitEdit(habit,parsed.data,today)].sort()[0]!:effectiveFrom;await onSave(parsed.data,habit?from:undefined,expected,reminderTime,healthLinksUnreadable?undefined:link,oneDay !== null && monthNth !== "every" ? { weekday: oneDay, nth: Number(monthNth) as MonthWeekdayNth } : null); if (!habit) writeHabitDraft(null); } catch(e) { setError(plainErrorMessage(e, "Your habit was not saved. Check the storage message and try again.")); } finally { setBusy(false); }
  }
  return <section ref={sectionRef} className="panel habit-editor" aria-labelledby={`${formId}-heading`}>
    <div className="habit-section-heading"><div><p className="eyebrow">Set your cadence</p><h2 id={`${formId}-heading`}>{habit ? "Edit habit" : "Create a habit"}</h2></div>{onIdeas ? <button type="button" className="secondary habit-ideas-button" onClick={onIdeas}>Start from an idea</button> : <span aria-hidden="true" className="habit-spark">✦</span>}</div>
    <form ref={formRef} onSubmit={submit} onInvalidCapture={(event) => { /* D1: a required field inside a closed "More options" (a cleared unit, an end date) opens it, so the browser can point at it */ const details = moreRef.current; if (details && !details.open && details.contains(event.target as Node)) { details.open = true; setMoreOpen(true); } }}><fieldset disabled={busy} className="habit-form-fields">
      {habit&&<label className="field">Changes effective from<input type="date" required min={[today,latestHabitRule(habit).from].sort().at(-1)} value={editFrom} onChange={event=>{setEffectiveFrom(event.target.value);setFromTouched(true);}}/><small>Rule changes begin on this day: today when nothing is recorded for today yet, or when the change keeps today’s type, unit and target and today stays on the schedule; else tomorrow or later. Days already recorded keep their units and targets. Names and notes update now.</small></label>}
      {!habit && draft0?.title && title === draft0.title && <p className="fine habit-draft-note" role="status">Your unsaved habit from earlier in this tab is filled in. <button type="button" className="text-link" onClick={() => { writeHabitDraft(null); setTitle(""); setCategory("Personal"); setType("build"); setMeasurement("count"); setUnit("times"); setTarget("1"); setScheduleKind("daily"); setDays([1, 2, 3, 4, 5]); setTimeOfDay("anytime"); }}>Start blank</button></p>}
      {!habit && <label className="field">Start from template<select defaultValue="" onChange={(event) => applyTemplate(event.target.value)}><option value="">Blank habit</option>{Object.entries(templates).filter(([key]) => chain || !CHAIN_TEMPLATES.has(key)).map(([key, template]) => <option key={key} value={key}>{template.title}</option>)}</select></label>}
      <label className="field">Habit title<input {...fe.field("title")} autoFocus data-sheet-focus aria-required="true" value={title} onChange={(event) => { const next = event.target.value; /* Session AL fourth pass (NB-177): a longer paste is cut here and the cut is said, never silently */ if (next.length > 100) { setTitleCut(next.length); setTitle(next.slice(0, 100)); } else { setTitleCut(0); setTitle(next); } }} placeholder="What would you like to make time for?" /></label>{errorAt("title")}{titleCut > 0 ? <p className="fine habit-title-cut" role="status">Your title had {formatNumber(titleCut)} characters; a habit title holds 100, so it was cut after the 100th. Check the end of it.</p> : title.length >= 100 && <p className="fine" role="status">A habit title holds 100 characters; anything longer is not kept.</p>}{duplicateTitle && <p className="fine habit-duplicate-hint" role="status">You already have a habit called “{title.trim()}”. Saving makes a second one; pick another name to tell them apart.</p>}
      {/* Session AK P4 (FIRST_RUN_REVIEW FR-17): what a habit needs comes first (title, time of day, schedule); how it is counted follows. */}
      <label className="field">Time of day<select value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value as typeof timeOfDay)}><option value="anytime">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label>
      {!habit && <details className="habit-phrase" onToggle={(event) => setPhraseOpen((event.currentTarget as HTMLDetailsElement).open)}><summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>Type the schedule in words</summary>{phraseOpen && <Suspense fallback={<p className="fine">Opening…</p>}><RecurrencePhrase today={today} onUse={applyPhrase} /></Suspense>}</details>}
      <label className="field">Schedule<select value={scheduleKind} onChange={(event) => setScheduleKind(event.target.value as ScheduleKind)}><option value="daily">Every day</option><option value="weekdays">Selected weekdays</option><option value="interval">Every N days</option><option value="frequency">X times per period</option><option value="month-dates">Specific dates each month</option></select></label>
      <div className="fine habit-rest-days">Rest days are simply the days off your schedule: choose the weekdays you do this, or X times per period. Days off the schedule never count against you. <button type="button" className="quiet" onClick={() => { setScheduleKind("weekdays"); setDays([1, 2, 3, 4, 5]); }}>Weekdays only</button></div>
      {scheduleKind === "weekdays" && <fieldset className="habit-weekdays"><legend>Scheduled weekdays</legend>{[1, 2, 3, 4, 5, 6, 0].map((day, i) => <label key={day}><input type="checkbox" {...(i === 0 ? fe.field("weekdays") : {})} checked={days.includes(day)} onChange={(event) => setDays(event.target.checked ? [...days, day] : days.filter((item) => item !== day))} /><span aria-hidden="true">{weekdayLabels[day]!.slice(0, 3)}</span><span className="sr-only">{weekdayLabels[day]}</span></label>)}{errorAt("weekdays")}</fieldset>}
      {scheduleKind === "weekdays" && days.length === 1 && <label className="field">Which {weekdayLabels[days[0]!]}s<select value={monthNth} onChange={(event) => setMonthNth(event.target.value as typeof monthNth)}><option value="every">Every week</option>{MONTH_WEEKDAY_NTH.map((nth) => <option key={nth} value={String(nth)}>{monthWeekdayLabel({ weekday: days[0]!, nth })}</option>)}</select><small>A monthly one is due only on that day; the others are days off.</small></label>}
      {scheduleKind === "interval" && <><label className="field">Repeat every (days)<input {...fe.field("interval")} type="text" inputMode="numeric" autoComplete="off" value={interval} onChange={(event) => setInterval(event.target.value)} /></label>{errorAt("interval")}</>}
      {scheduleKind === "frequency" && <div className="habit-form-grid"><label className="field">Times per period<input {...fe.field("frequency")} type="text" inputMode="numeric" autoComplete="off" value={frequency} onChange={(event) => setFrequency(event.target.value)} /></label>{errorAt("frequency")}<label className="field">Frequency period<select value={frequencyPeriod} onChange={(event) => { const next = event.target.value as typeof frequencyPeriod; setFrequencyPeriod(next); setTargetPeriod(next); setFrequency((current) => { const limit = { week: 7, month: 28, year: 365 }[next]; return /^\d+$/.test(current.trim()) && Number(current) > limit ? String(limit) : current; }); }}><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label></div>}
      {scheduleKind === "month-dates" && <label className="field">Dates in month<input value={monthDates} onChange={(event) => setMonthDates(event.target.value)} placeholder="1, 15, 28" /><small>Comma-separated dates from 1 to 31. Months without that date simply skip it.</small></label>}
      <label className="field">Category / area<input required maxLength={50} value={category} onChange={(event) => setCategory(event.target.value)} list={`${formId}-categories`} /></label>
      <datalist id={`${formId}-categories`}>{["Personal", "Movement", "Health", "Learning", "Mindfulness", "Finance", "Creative"].map((value) => <option key={value} value={value} />)}</datalist>
      {/* Session AL fifth pass (DV-132, DV-243): the fold (FR-17, ADR-036) comes before Reminder time, so its first field,
          Habit type, is the next choice after the schedule and area, never after the reminder. */}
      {/* Session AH (HA12; D-007, B-028, Denver S-06): the first view asks only what a habit needs; the rest waits here (open when editing). */}
      <details ref={moreRef} className="habit-more-options" open={moreOpen} onToggle={(event) => setMoreOpen((event.currentTarget as HTMLDetailsElement).open)}><summary>More options <small>how it is counted, description, linked Goal, stack, end, notes</small></summary>
      {/* Session AK D1 (FR-17, owner decision 5): how it is counted, with a blank habit's defaults (build, count, 1 time a day). */}
      <div role="group" aria-label="How it is counted" className="habit-form-grid">
        <label className="field">Habit type<select value={type} onChange={(event) => { const next = event.target.value as HabitRule["type"]; setType(next); if (next === "quit") { setTarget("0"); /* Session AL fourth pass (DV-242): a quit habit counts events */ if (measurement === "boolean" || measurement === "duration") { setMeasurement("count"); setUnit("times"); } } else if (target.trim() === "0") setTarget("1"); }}><option value="build">BUILD · reach a target</option><option value="quit">QUIT · avoid an event</option><option value="limit">LIMIT · stay at or below</option></select></label>
        {/* Session AL fourth pass (DV-242): a quit habit always counts the events it records, so it has no measurement to
            choose; its unit stays, as it names a slip ("2 purchases"). */}
        {type !== "quit" && <label className="field">Measurement<select value={measurement} onChange={(event) => { const next = event.target.value as MeasurementKind; setMeasurement(next); if (next === "boolean") { setUnit(""); setTarget("1"); /* this control shows only for build and limit habits */ } else if (next === "duration") setUnit("minutes"); else if (!unit) setUnit("times"); }}><option value="boolean">Yes / no</option><option value="count">Count</option><option value="duration">Duration</option><option value="quantity">Quantity</option><option value="custom">Custom unit</option></select></label>}
        {measurement !== "boolean" && <label className="field">Unit{measurement === "duration" ? <select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="minutes">minutes</option><option value="hours">hours</option></select> : <input required maxLength={24} value={unit} onChange={(event) => setUnit(event.target.value)} />}</label>}
        {/* Session AL (DV-132, DV-242; P-DV-123): a quit habit has no target to set, so its target fields give way to why. */}
        {type === "quit" ? <p className="fine habit-quit-note">A quit habit has no target: you aim for none, and each event you record is a slip, counted in the unit above.</p> : <>
        <label className="field">Target value<input {...fe.field("target")} aria-label="Target value" type="text" inputMode={wholeTarget ? "numeric" : "decimal"} autoComplete="off" disabled={measurement === "boolean"} value={target} onChange={(event) => setTarget(event.target.value)} onKeyDown={(event) => { /* Session AL (NB-155): Enter in the target saves, as Enter in the title does */ if (event.key === "Enter") { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /></label>{errorAt("target")}
        <label className="field">Target period<select value={scheduleKind === "frequency" ? "each" : targetPeriod} disabled={scheduleKind === "frequency"} onChange={(event) => setTargetPeriod(event.target.value as HabitRule["targetPeriod"])}>{scheduleKind === "frequency" && <option value="each">Each time</option>}<option value="day">Per day</option><option value="week">Per week</option><option value="month">Per month</option><option value="year">Per year</option></select>{/* Session AH (HA10, L-065): with X times per period the target is for each time, said plainly, never shown as "per week" */}{scheduleKind === "frequency" && <small>{/* Session AL (DV-241, P-DV-18): one plain sentence, no "1 times each time" */}{(() => { const n = Number(target.trim().replace(",", ".")), shown = target.trim() || "…"; if (type === "limit") return /* Session AL fifth pass (PR-093): a limit counts the whole period, as the card does */ `A limit counts the whole ${frequencyPeriod}: at most ${shown}${unit ? ` ${Number.isFinite(n) ? unitFor(n, unit) : unit}` : ""} in all, however many days you log.`; const each = measurement === "boolean" ? "Each check-in counts once" : `Each check-in counts ${shown}${unit ? ` ${Number.isFinite(n) ? unitFor(n, unit) : unit}` : ""}`; const times = frequency.trim() || "…"; return `${each}; you aim for ${times} ${times === "1" ? "check-in" : "check-ins"} a ${frequencyPeriod}.`; })()}</small>}</label>
        </>}
      </div>
      <label className="field">Description (optional)<input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A small action, a little more often." /></label>
      <label className="field">Linked Goal (optional)<select {...fe.field("goal")} name="goal" defaultValue={unmatchedLink ? "keep" : savedGoalIndex < 0 ? "" : JSON.stringify(goals[savedGoalIndex]!.link)}><option value="">Standalone habit</option>{unmatchedLink && <option value="keep">Keep existing link · another Goal scope</option>}{goals.map((option) => <option key={JSON.stringify(option.link)} value={JSON.stringify(option.link)}>{option.label}</option>)}</select></label>
      <label className="field">Stack after (optional)<select value={stackAfterId} onChange={(event) => setStackAfterId(event.target.value)}><option value="">No habit stack</option>{habits.filter((item) => item.id !== habit?.id).map((item) => <option value={item.id} key={item.id}>After {item.title}</option>)}</select></label>
      <div className="habit-form-grid"><label className="field">End condition<select value={endKind} onChange={(event) => setEndKind(event.target.value as typeof endKind)}><option value="none">No end date</option><option value="date">End date</option><option value="completions">Number of completions</option><option value="goal" disabled>Linked Goal target · metadata only</option></select></label>{endKind === "date" && <label className="field">End date<input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>}{endKind === "completions" && <div style={{ display: "grid", gap: 6, alignContent: "start", minWidth: 0 }}><label className="field">Completion count{/* Session AL (CI2, WCAG 2.5.3 label in name): the field is named by its visible label; the range is its description (an aria-label that dropped the visible words is gone) */}<input {...fe.field("endCount", { describedBy: "habit-end-count-hint" })} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={endCount} onChange={(event) => setEndCount(event.target.value)} /></label>{/* Session AL (CI8): the range sits beside the label, not inside it, so the label's own words are exactly the field's name */}<small id="habit-end-count-hint">A whole number from 1 to 100,000. The habit ends once it is completed that many times.</small>{errorAt("endCount")}</div>}</div>
      <label className="field">Private notes (optional)<textarea maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      </details>
      <ReminderTimeField value={reminderTime} onChange={setReminderTime} note={/* Session AH (HA16, N-096): the note fits the habit's kind */ `After this time, Today shows a reminder card ${type === "build" ? "until today’s check-in is done" : type === "quit" ? "until you record today (an event, or “Stayed on track”)" : "until you record today (your amount, or “Within limit”)"}. Kept on this device only, never synced; leave empty for none. Quiet hours (Settings → Reminders) hold it back.`} />
      {type === "build" && <HealthLinkField draft={shownLink} onChange={next => { setLinkTouched(true); setLinkDraft(next); }} counters={counters} waterUnit={waterUnit} unreadable={healthLinksUnreadable} onStartOver={onStartOverHealthLinks} defaultTarget={m => m === "water" ? waterTargetFromLitres(unit, target, waterUnit) ?? (unit.trim().toLowerCase() === (waterUnit === "ml" ? "ml" : "fl oz") ? target : null) : m === "steps" && unit.trim().toLowerCase() === "steps" ? target : null} />}
      <p className="fine">{habit ? "Type, measurement, recurrence, target and end changes use your chosen future day. Earlier rules remain retained." : "Your first scheduled period starts today."} Goal links, Goal target endings, and stacking are organizational metadata only; no funds move and no automation is implied.</p>
      {error && !errField && <p role="alert" id={fe.messageId}>{error}</p>}{error && errField && !["title", "weekdays", "interval", "frequency", "target", "endCount"].includes(errField) && <p role="alert" id={fe.messageId}>{error}</p>}{sameNameAsked && askSameName && <div className="habit-same-name" role="alert"><p>You already have a habit called “{title.trim()}”. Create a second one with the same name?</p><div className="actions"><button type="button" className="secondary" onClick={() => { setSameNameOk(title.trim().toLowerCase()); setSameNameAsked(false); requestAnimationFrame(() => formRef.current?.requestSubmit()); }}>Create it anyway</button><button type="button" className="secondary" onClick={() => { setSameNameAsked(false); formRef.current?.querySelector<HTMLInputElement>('input[aria-required="true"]')?.focus(); }}>Change the name</button></div></div>}<div className="actions"><button className="primary" type="submit">{busy ? "Saving…" : habit ? "Save habit" : "Create habit"}</button><button type="button" className="secondary" onClick={() => { if (dirty && !confirmDiscard) { setConfirmDiscard(true); return; } if (!habit) writeHabitDraft(null); onCancel(); }}>{confirmDiscard && dirty ? "Discard changes" : "Cancel"}</button></div>{confirmDiscard && dirty && <p className="fine habit-discard-note" role="status">You changed this habit. Press “Discard changes” to close without saving, or save it.</p>}
    </fieldset></form>
  </section>;
}
