"use client";
import { useId, useState, type FormEvent } from "react";
import { habitInputSchema, latestHabitRule, type Habit, type HabitGoalLink, type HabitInput } from "../../lib/habits";

export type HabitGoalOption = { label: string; link: HabitGoalLink };
const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function HabitEditor({ habit, goals, onSave, onCancel }: { habit?: Habit; goals: HabitGoalOption[]; onSave: (input: HabitInput) => Promise<void>; onCancel: () => void }) {
  const formId = useId();
  const initialRule = habit ? latestHabitRule(habit) : undefined;
  const [scheduleKind, setScheduleKind] = useState<"daily" | "weekdays">(initialRule?.schedule.kind ?? "daily");
  const [days, setDays] = useState(initialRule?.schedule.kind === "weekdays" ? initialRule.schedule.days : [1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savedLink = habit?.goalLink;
  const savedGoalIndex = savedLink ? goals.findIndex((option) => option.link.chainId === savedLink.chainId && option.link.owner === savedLink.owner && option.link.goalId === savedLink.goalId) : -1;
  const unmatchedLink = !!savedLink && savedGoalIndex < 0;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const goal = String(form.get("goal"));
    const parsed = habitInputSchema.safeParse({
      title: String(form.get("title")), category: String(form.get("category")), description: String(form.get("description")), notes: String(form.get("notes")),
      target: Number(form.get("target")), schedule: scheduleKind === "daily" ? { kind: "daily" } : { kind: "weekdays", days: [...days].sort() },
      goalLink: goal === "keep" ? savedLink : goal === "" ? undefined : goals.find((option) => JSON.stringify(option.link) === goal)?.link ?? savedLink,
    });
    if (!parsed.success) { setError("Enter a title, category, whole-number target (1–10,000), and at least one scheduled day."); return; }
    setBusy(true); setError("");
    try { await onSave(parsed.data); } catch { setError("Your habit was not saved. Check the storage message and try again."); } finally { setBusy(false); }
  }
  return <section className="panel habit-editor" aria-labelledby={`${formId}-heading`}>
    <div className="habit-section-heading"><div><p className="eyebrow">Set your cadence</p><h2 id={`${formId}-heading`}>{habit ? "Edit habit" : "Create a habit"}</h2></div><span aria-hidden="true" className="habit-spark">✦</span></div>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="habit-form-fields">
        <label className="field">Habit title<input name="title" autoFocus required maxLength={100} defaultValue={habit?.title} placeholder="What would you like to make time for?" /></label>
        <div className="habit-form-grid">
          <label className="field">Category<input name="category" required maxLength={50} defaultValue={habit?.category ?? "Personal"} list={`${formId}-categories`} /></label>
          <datalist id={`${formId}-categories`}>{["Personal", "Movement", "Learning", "Mindfulness", "Financial", "Creative"].map((value) => <option key={value} value={value} />)}</datalist>
          <label className="field">Daily count target<input name="target" type="number" inputMode="numeric" min={1} max={10000} step={1} required defaultValue={initialRule?.target ?? 1} /></label>
        </div>
        <label className="field">Description (optional)<input name="description" maxLength={500} defaultValue={habit?.description} placeholder="A small action, a little more often." /></label>
        <label className="field">Schedule<select value={scheduleKind} onChange={(event) => setScheduleKind(event.target.value as "daily" | "weekdays")}><option value="daily">Every day</option><option value="weekdays">Selected weekdays</option></select></label>
        {scheduleKind === "weekdays" && <fieldset className="habit-weekdays"><legend>Scheduled weekdays</legend>{[1, 2, 3, 4, 5, 6, 0].map((day) => <label key={day}><input type="checkbox" checked={days.includes(day)} onChange={(event) => setDays(event.target.checked ? [...days, day] : days.filter((item) => item !== day))} /><span aria-hidden="true">{weekdayLabels[day]!.slice(0, 3)}</span><span className="sr-only">{weekdayLabels[day]}</span></label>)}</fieldset>}
        <label className="field">Linked Goal (optional)<select name="goal" defaultValue={unmatchedLink ? "keep" : savedGoalIndex < 0 ? "" : JSON.stringify(goals[savedGoalIndex]!.link)}><option value="">Standalone habit</option>{unmatchedLink && <option value="keep">Keep existing link · another Goal scope</option>}{goals.map((option) => <option key={JSON.stringify(option.link)} value={JSON.stringify(option.link)}>{option.label}</option>)}</select></label>
        <label className="field">Private notes (optional)<textarea name="notes" maxLength={2000} rows={3} defaultValue={habit?.notes} /></label>
        <p className="fine">{habit ? "Schedule, target, pause and archive changes apply today onward. Earlier days keep their rules." : "Your first scheduled day starts today. No previous days are marked missed."} Goal links are optional and never move funds.</p>
        {error && <p role="alert">{error}</p>}
        <div className="actions"><button className="primary" type="submit">{busy ? "Saving…" : habit ? "Save habit" : "Create habit"}</button><button type="button" className="secondary" onClick={onCancel}>Cancel</button></div>
      </fieldset>
    </form>
  </section>;
}
