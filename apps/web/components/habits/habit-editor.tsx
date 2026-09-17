"use client";
import { useId, useState, type FormEvent } from "react";
import { habitInputSchema, latestHabitRule, type Habit, type HabitGoalLink, type HabitInput, type HabitRule } from "../../lib/habits";

export type HabitGoalOption = { label: string; link: HabitGoalLink };
type MeasurementKind = HabitRule["measurement"]["kind"];
type ScheduleKind = HabitRule["schedule"]["kind"];
const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const templates = {
  walk: { title: "Walk", category: "Movement", type: "build", measurement: "quantity", unit: "steps", target: 8000, targetPeriod: "day", schedule: "daily" },
  exercise: { title: "Exercise", category: "Movement", type: "build", measurement: "duration", unit: "minutes", target: 30, targetPeriod: "day", schedule: "weekdays" },
  water: { title: "Drink water", category: "Health", type: "build", measurement: "quantity", unit: "liters", target: 2, targetPeriod: "day", schedule: "daily" },
  read: { title: "Read", category: "Learning", type: "build", measurement: "duration", unit: "minutes", target: 30, targetPeriod: "day", schedule: "daily" },
  study: { title: "Study", category: "Learning", type: "build", measurement: "duration", unit: "hours", target: 1, targetPeriod: "day", schedule: "weekdays" },
  buyzig: { title: "Buy ZIG", category: "Finance", type: "build", measurement: "quantity", unit: "USD", target: 500, targetPeriod: "month", schedule: "frequency" },
  budget: { title: "Review budget", category: "Finance", type: "build", measurement: "boolean", unit: "", target: 1, targetPeriod: "day", schedule: "frequency" },
  savings: { title: "Add to savings", category: "Finance", type: "build", measurement: "quantity", unit: "USD", target: 100, targetPeriod: "month", schedule: "daily" },
  nospend: { title: "No-spend day", category: "Finance", type: "quit", measurement: "count", unit: "purchases", target: 0, targetPeriod: "day", schedule: "daily" },
} as const;

export function HabitEditor({ habit, goals, habits, onSave, onCancel }: { habit?: Habit; goals: HabitGoalOption[]; habits: Habit[]; onSave: (input: HabitInput) => Promise<void>; onCancel: () => void }) {
  const formId = useId();
  const rule = habit ? latestHabitRule(habit) : undefined;
  const [title, setTitle] = useState(habit?.title ?? "");
  const [category, setCategory] = useState(habit?.category ?? "Personal");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [notes, setNotes] = useState(habit?.notes ?? "");
  const [type, setType] = useState<HabitRule["type"]>(rule?.type ?? "build");
  const [measurement, setMeasurement] = useState<MeasurementKind>(rule?.measurement.kind ?? "count");
  const [unit, setUnit] = useState(rule?.measurement.kind === "boolean" ? "" : rule?.measurement.unit ?? "times");
  const [target, setTarget] = useState(rule?.target ?? 1);
  const [targetPeriod, setTargetPeriod] = useState<HabitRule["targetPeriod"]>(rule?.targetPeriod ?? "day");
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>(rule?.schedule.kind ?? "daily");
  const [days, setDays] = useState(rule?.schedule.kind === "weekdays" ? rule.schedule.days : [1, 2, 3, 4, 5]);
  const [interval, setInterval] = useState(rule?.schedule.kind === "interval" ? rule.schedule.every : 2);
  const [frequency, setFrequency] = useState(rule?.schedule.kind === "frequency" ? rule.schedule.times : 1);
  const [frequencyPeriod, setFrequencyPeriod] = useState<"week" | "month" | "year">(rule?.schedule.kind === "frequency" ? rule.schedule.period : "week");
  const [monthDates, setMonthDates] = useState(rule?.schedule.kind === "month-dates" ? rule.schedule.days.join(", ") : "1, 15");
  const [timeOfDay, setTimeOfDay] = useState(habit?.timeOfDay ?? "anytime");
  const [endKind, setEndKind] = useState(habit?.endCondition.kind ?? "none");
  const [endDate, setEndDate] = useState(habit?.endCondition.kind === "date" ? habit.endCondition.date : "");
  const [endCount, setEndCount] = useState(habit?.endCondition.kind === "completions" ? habit.endCondition.count : 30);
  const [stackAfterId, setStackAfterId] = useState(habit?.stackAfterId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savedLink = habit?.goalLink;
  const savedGoalIndex = savedLink ? goals.findIndex((option) => JSON.stringify(option.link) === JSON.stringify(savedLink)) : -1;
  const unmatchedLink = !!savedLink && savedGoalIndex < 0;
  const frequencyMaximum = { week: 7, month: 28, year: 365 }[frequencyPeriod];

  function applyTemplate(key: string) {
    const template = templates[key as keyof typeof templates]; if (!template) return;
    setTitle(template.title); setCategory(template.category); setType(template.type); setMeasurement(template.measurement); setUnit(template.unit); setTarget(template.target);
    setTargetPeriod(template.targetPeriod); setScheduleKind(template.schedule); setDays([1, 2, 3, 4, 5]); setFrequency(1); setFrequencyPeriod(template.title === "Buy ZIG" ? "month" : "week");
  }
  function measurementValue() {
    if (measurement === "boolean") return { kind: "boolean" as const };
    if (measurement === "duration") return { kind: "duration" as const, unit: unit === "hours" ? "hours" as const : "minutes" as const };
    return { kind: measurement, unit } as const;
  }
  function scheduleValue(): HabitRule["schedule"] {
    if (scheduleKind === "daily") return { kind: "daily" };
    if (scheduleKind === "weekdays") return { kind: "weekdays", days: [...days].sort() };
    if (scheduleKind === "interval") return { kind: "interval", every: interval, anchor: rule?.schedule.kind === "interval" ? rule.schedule.anchor : new Date().toLocaleDateString("en-CA") };
    if (scheduleKind === "frequency") return { kind: "frequency", times: frequency, period: frequencyPeriod };
    return { kind: "month-dates", days: [...new Set(monthDates.split(",").map(Number).filter((day) => Number.isInteger(day) && day >= 1 && day <= 31))].sort((a, b) => a - b) };
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const goal = String(form.get("goal"));
    const goalLink = goal === "keep" ? savedLink : goal ? goals.find((option) => JSON.stringify(option.link) === goal)?.link : undefined;
    if (endKind === "goal" && !goalLink) { setError("Choose a linked Goal before using the Goal target end condition."); return; }
    const endCondition = endKind === "date" ? { kind: "date" as const, date: endDate } : endKind === "completions" ? { kind: "completions" as const, count: endCount } : endKind === "goal" && goalLink ? { kind: "goal" as const, goal: goalLink } : { kind: "none" as const };
    const parsed = habitInputSchema.safeParse({ title, category, description, notes, goalLink, type, measurement: measurementValue(), target: type === "quit" ? 0 : target, targetPeriod: scheduleKind === "frequency" ? "day" : targetPeriod, schedule: scheduleValue(), timeOfDay, endCondition, stackAfterId: stackAfterId || undefined });
    if (!parsed.success) { setError("Check the title, target, unit, recurrence, end condition, and selected days."); return; }
    setBusy(true); setError(""); try { await onSave(parsed.data); } catch { setError("Your habit was not saved. Check the storage message and try again."); } finally { setBusy(false); }
  }
  return <section className="panel habit-editor" aria-labelledby={`${formId}-heading`}>
    <div className="habit-section-heading"><div><p className="eyebrow">Set your cadence</p><h2 id={`${formId}-heading`}>{habit ? "Edit habit" : "Create a habit"}</h2></div><span aria-hidden="true" className="habit-spark">✦</span></div>
    <form onSubmit={submit}><fieldset disabled={busy} className="habit-form-fields">
      {!habit && <label className="field">Start from template<select defaultValue="" onChange={(event) => applyTemplate(event.target.value)}><option value="">Blank habit</option>{Object.entries(templates).map(([key, template]) => <option key={key} value={key}>{template.title}</option>)}</select></label>}
      <label className="field">Habit title<input autoFocus required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What would you like to make time for?" /></label>
      <div className="habit-form-grid">
        <label className="field">Habit type<select value={type} onChange={(event) => { const next = event.target.value as HabitRule["type"]; setType(next); if (next === "quit") setTarget(0); else if (target === 0) setTarget(1); }}><option value="build">BUILD · reach a target</option><option value="quit">QUIT · avoid an event</option><option value="limit">LIMIT · stay at or below</option></select></label>
        <label className="field">Time of day<select value={timeOfDay} onChange={(event) => setTimeOfDay(event.target.value as typeof timeOfDay)}><option value="anytime">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label>
        <label className="field">Category / area<input required maxLength={50} value={category} onChange={(event) => setCategory(event.target.value)} list={`${formId}-categories`} /></label>
        <datalist id={`${formId}-categories`}>{["Personal", "Movement", "Health", "Learning", "Mindfulness", "Finance", "Creative"].map((value) => <option key={value} value={value} />)}</datalist>
        <label className="field">Measurement<select value={measurement} onChange={(event) => { const next = event.target.value as MeasurementKind; setMeasurement(next); if (next === "boolean") { setUnit(""); setTarget(type === "quit" ? 0 : 1); } else if (next === "duration") setUnit("minutes"); else if (!unit) setUnit("times"); }}><option value="boolean">Yes / no</option><option value="count">Count</option><option value="duration">Duration</option><option value="quantity">Quantity</option><option value="custom">Custom unit</option></select></label>
        {measurement !== "boolean" && <label className="field">Unit{measurement === "duration" ? <select value={unit} onChange={(event) => setUnit(event.target.value)}><option value="minutes">minutes</option><option value="hours">hours</option></select> : <input required maxLength={24} value={unit} onChange={(event) => setUnit(event.target.value)} />}</label>}
        <label className="field">Target value<input aria-label="Target value" type="number" min={type === "build" ? measurement === "count" || measurement === "boolean" ? 1 : 0.000001 : 0} max={1_000_000_000} step={measurement === "count" || measurement === "boolean" ? 1 : "any"} disabled={type === "quit" || measurement === "boolean"} value={type === "quit" ? 0 : target} onChange={(event) => setTarget(Number(event.target.value))} /></label>
        <label className="field">Target period<select value={scheduleKind === "frequency" ? frequencyPeriod : targetPeriod} disabled={scheduleKind === "frequency"} onChange={(event) => setTargetPeriod(event.target.value as HabitRule["targetPeriod"])}><option value="day">Per day</option><option value="week">Per week</option><option value="month">Per month</option><option value="year">Per year</option></select></label>
      </div>
      <label className="field">Description (optional)<input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A small action, a little more often." /></label>
      <label className="field">Schedule<select value={scheduleKind} onChange={(event) => setScheduleKind(event.target.value as ScheduleKind)}><option value="daily">Every day</option><option value="weekdays">Selected weekdays</option><option value="interval">Every N days</option><option value="frequency">X times per period</option><option value="month-dates">Specific dates each month</option></select></label>
      {scheduleKind === "weekdays" && <fieldset className="habit-weekdays"><legend>Scheduled weekdays</legend>{[1, 2, 3, 4, 5, 6, 0].map((day) => <label key={day}><input type="checkbox" checked={days.includes(day)} onChange={(event) => setDays(event.target.checked ? [...days, day] : days.filter((item) => item !== day))} /><span aria-hidden="true">{weekdayLabels[day]!.slice(0, 3)}</span><span className="sr-only">{weekdayLabels[day]}</span></label>)}</fieldset>}
      {scheduleKind === "interval" && <label className="field">Repeat every (days)<input type="number" min={2} max={365} step={1} value={interval} onChange={(event) => setInterval(Number(event.target.value))} /></label>}
      {scheduleKind === "frequency" && <div className="habit-form-grid"><label className="field">Times per period<input type="number" min={1} max={frequencyMaximum} step={1} value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} /></label><label className="field">Frequency period<select value={frequencyPeriod} onChange={(event) => { const next = event.target.value as typeof frequencyPeriod; setFrequencyPeriod(next); setTargetPeriod(next); setFrequency((current) => Math.min(current, { week: 7, month: 28, year: 365 }[next])); }}><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label></div>}
      {scheduleKind === "month-dates" && <label className="field">Dates in month<input value={monthDates} onChange={(event) => setMonthDates(event.target.value)} placeholder="1, 15, 28" /><small>Comma-separated dates from 1 to 31. Months without that date simply skip it.</small></label>}
      <label className="field">Linked Goal (optional)<select name="goal" defaultValue={unmatchedLink ? "keep" : savedGoalIndex < 0 ? "" : JSON.stringify(goals[savedGoalIndex]!.link)}><option value="">Standalone habit</option>{unmatchedLink && <option value="keep">Keep existing link · another Goal scope</option>}{goals.map((option) => <option key={JSON.stringify(option.link)} value={JSON.stringify(option.link)}>{option.label}</option>)}</select></label>
      <label className="field">Stack after (optional)<select value={stackAfterId} onChange={(event) => setStackAfterId(event.target.value)}><option value="">No habit stack</option>{habits.filter((item) => item.id !== habit?.id).map((item) => <option value={item.id} key={item.id}>After {item.title}</option>)}</select></label>
      <div className="habit-form-grid"><label className="field">End condition<select value={endKind} onChange={(event) => setEndKind(event.target.value as typeof endKind)}><option value="none">No end date</option><option value="date">End date</option><option value="completions">Number of completions</option><option value="goal" disabled>Linked Goal target · metadata only</option></select></label>{endKind === "date" && <label className="field">End date<input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>}{endKind === "completions" && <label className="field">Completion count<input type="number" min={1} max={100000} step={1} value={endCount} onChange={(event) => setEndCount(Number(event.target.value))} /></label>}</div>
      <label className="field">Private notes (optional)<textarea maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <p className="fine">{habit ? "Type, measurement, recurrence, target, end, pause and archive changes apply today onward. Earlier dates keep their rules." : "Your first scheduled period starts today."} Goal links, Goal target endings, and stacking are organizational metadata only; no funds move and no automation is implied.</p>
      {error && <p role="alert">{error}</p>}<div className="actions"><button className="primary" type="submit">{busy ? "Saving…" : habit ? "Save habit" : "Create habit"}</button><button type="button" className="secondary" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}
