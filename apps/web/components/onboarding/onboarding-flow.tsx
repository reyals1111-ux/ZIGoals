"use client";
/* Opening Showcase reloads the page on purpose, as in Settings: every store hook must switch data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import "./onboarding.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {parseAmountInput} from "../../lib/amount-input";
import { NebulaFlow } from "../nebula-flow";
import { useGoals } from "../goal-provider";
import { usePlatform } from "../platform/use-platform";
import { useHabits } from "../habits/use-habits";
import { usePrivateStore } from "../use-private-store";
import { useShowcase } from "../showcase-controls";
import { HABIT_TEMPLATE_TITLES, habitTemplateInput, type HabitTemplateKey } from "../habits/habit-editor";
import { DASHBOARD_SETTINGS_KEY, PRESETS, applyDashboardPreset, dashboardSettingsSchema, emptyDashboardSettings, type DashboardPreset } from "../../lib/dashboard-settings";
import { privateGoalSchema, type PrivateGoal } from "../../lib/positions";
import { createAllocatedGoal } from "../../lib/wealth";
import { localDate } from "../../lib/local-date";
import { loadShowcase } from "../../lib/showcase";
import { markOnboardingSeen } from "../../lib/onboarding";

/**
 * The first-run welcome (Session E): five short steps to a first goal and habit. Every record is created by the
 * person's own choice through the same stores and schemas the rest of the app uses; skipping writes only the
 * device-only "seen" flag. Skip and Explore the demo are on every step.
 */
const STEPS = ["welcome", "matters", "goal", "habit", "data"] as const;
type Step = typeof STEPS[number];
const TITLES: Record<Step, string> = {
  welcome: "Welcome to ZIGoals.",
  matters: "What matters to you?",
  goal: "Your first goal.",
  habit: "Your first habit.",
  data: "Your data, your control.",
};
const GOAL_TEMPLATES: { category: NonNullable<PrivateGoal["category"]>; label: string; placeholder: string }[] = [
  { category: "Emergency Fund", label: "A safety net", placeholder: "Emergency fund" },
  { category: "Travel", label: "A trip", placeholder: "A trip I’m planning" },
  { category: "First Home", label: "A home", placeholder: "My first home" },
  { category: "Education", label: "Learning", placeholder: "A course I want to take" },
  { category: "Financial Freedom", label: "Freedom", placeholder: "More freedom, later" },
  { category: "Custom", label: "Something else", placeholder: "Name your goal" },
];
const HABIT_CHOICES: { key: HabitTemplateKey; note: string }[] = [
  { key: "walk", note: "8000 steps a day" },
  { key: "water", note: "2 liters a day" },
  { key: "read", note: "30 minutes a day" },
  { key: "exercise", note: "30 minutes on weekdays" },
  { key: "study", note: "1 hour on weekdays" },
  { key: "budget", note: "Once a week" },
];

function exploreDemo() {
  markOnboardingSeen(window.localStorage);
  loadShowcase();
  window.location.assign("/app");
}

export function OnboardingFlow() {
  const router = useRouter(), showcase = useShowcase(), legacy = useGoals(), platform = usePlatform(), habits = useHabits();
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const [step, setStep] = useState<Step>("welcome"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [preset, setPreset] = useState<DashboardPreset | "">(""), [presetSaved, setPresetSaved] = useState(false);
  const [category, setCategory] = useState<NonNullable<PrivateGoal["category"]> | "">(""), [name, setName] = useState(""), [target, setTarget] = useState(""), [currency, setCurrency] = useState<"USD" | "EUR">("USD"), [date, setDate] = useState("");
  const [savedGoal, setSavedGoal] = useState(""), [habitKey, setHabitKey] = useState<HabitTemplateKey | "">(""), [savedHabit, setSavedHabit] = useState("");
  const heading = useRef<HTMLHeadingElement>(null), first = useRef(true), id = useId();
  const index = STEPS.indexOf(step);
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus(); }, [step]);

  const ready = settings.loaded && platform.loaded && habits.loaded;
  const storeError = settings.error || platform.error || habits.error;
  const demoAvailable = legacy.loaded && legacy.mode === "local";
  function go(next: Step) { setError(""); setStep(next); }
  function finish() { markOnboardingSeen(window.localStorage); router.push("/app"); }

  async function savePreset() {
    if (!preset || presetSaved) return go("goal");
    setBusy(true); setError("");
    try { await settings.update(s => applyDashboardPreset(s, preset)); setPresetSaved(true); go("goal"); }
    catch (e) { setError(e instanceof Error ? e.message : "Your Today layout was not saved."); }
    finally { setBusy(false); }
  }
  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savedGoal) return go("habit");
    setError("");
    let goal: PrivateGoal;
    try {
      if (!category) throw Error("Choose what your goal is for.");
      if (!name.trim()) throw Error("Give your Goal a name.");
      if (date && date < localDate()) throw Error("Choose today or a future target date.");
      const units = parseAmountInput(target, 2);
      if (units <= 0n) throw Error("Enter a positive target.");
      const goalId = BigInt("0x" + crypto.randomUUID().replaceAll("-", "")).toString();
      goal = privateGoalSchema.parse({ id: goalId, name, category, network: "zigchain-1", type: "VALUE", status: "active", asset: currency, denom: currency, decimals: 2, target: units.toString(), notes: "", createdAt: new Date().toISOString(), targetDate: date || undefined, milestones: [] });
    } catch (e) { setError(e instanceof Error && e.message && !e.message.startsWith("[") ? e.message : "Enter a target with up to two decimal places."); return; }
    setBusy(true);
    try { await platform.update(data => data.goals.some(g => g.id === goal.id) ? data : createAllocatedGoal(data, goal, [])); setSavedGoal(goal.name); }
    catch (e) { setError(e instanceof Error ? e.message : "Your Goal was not saved."); }
    finally { setBusy(false); }
  }
  async function saveHabit() {
    if (savedHabit) return go("data");
    if (!habitKey) { setError("Choose a habit to start with, or skip this step."); return; }
    setBusy(true); setError("");
    try { await habits.create(habitTemplateInput(habitKey)); setSavedHabit(HABIT_TEMPLATE_TITLES[habitKey]); }
    catch (e) { setError(e instanceof Error ? e.message : "Your habit was not saved."); }
    finally { setBusy(false); }
  }

  if (showcase) return <section className="onboarding panel" aria-labelledby={`${id}-title`}>
    <h1 id={`${id}-title`}><NebulaFlow identity="welcome-title">Welcome to ZIGoals.</NebulaFlow></h1>
    <p>You’re exploring Showcase data. The welcome sets up your own records, so it opens outside Showcase.</p>
    <div className="onboarding-actions"><Link className="primary" href="/app/settings#showcase">Showcase settings</Link><Link className="secondary" href="/app">Back to Today</Link></div>
  </section>;

  const escape = <div className="onboarding-escape">
    <button type="button" className="text-link" onClick={finish}>Skip setup</button>
    <button type="button" className="text-link" disabled={!demoAvailable} onClick={exploreDemo}>Explore the demo</button>
  </div>;

  return <section className="onboarding panel" aria-labelledby={`${id}-title`} data-step={step}>
    <div className="onboarding-progress">
      <p className="eyebrow">Step {index + 1} of {STEPS.length}</p>
      <div className="onboarding-track" aria-hidden="true"><span style={{ transform: `scaleX(${(index + 1) / STEPS.length})` }} /></div>
    </div>
    <h1 id={`${id}-title`} ref={heading} tabIndex={-1}><NebulaFlow identity="welcome-title">{TITLES[step]}</NebulaFlow></h1>
    {!ready && !storeError && <p role="status">Opening your private records…</p>}
    {storeError && <p role="alert">{storeError} <Link href="/app/settings">Open Settings</Link></p>}

    {ready && !storeError && <div className="onboarding-step" key={step}>
      {step === "welcome" && <>
        <p className="onboarding-lede">Plan goals, build habits and look after your health, together in one private place.</p>
        <ul className="onboarding-points">
          <li><strong>About a minute.</strong> A first goal and a first habit, each one tap to skip.</li>
          <li><strong>No wallet needed.</strong> A wallet is optional, and you can connect one later.</li>
          <li><strong>Private by default.</strong> What you add stays in this browser on this device.</li>
        </ul>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("matters")}>Let’s begin</button></div>
      </>}

      {step === "matters" && <>
        <p className="onboarding-lede">Choose what Today shows first. You can change it any time with Customize Today.</p>
        <fieldset className="onboarding-choices" disabled={busy}><legend className="sr-only">Choose a starting point</legend>
          {PRESETS.map(p => <label key={p.id} className="onboarding-choice"><input type="radio" name="onboarding-preset" value={p.id} checked={preset === p.id} onChange={() => { setPreset(p.id); setPresetSaved(false); }} /><span><strong>{p.label}</strong><small>{p.description}</small></span></label>)}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className="onboarding-actions"><button type="button" className="primary" disabled={busy} onClick={savePreset}>{busy ? "Saving…" : preset ? "Continue" : "Continue without choosing"}</button><button type="button" className="secondary" onClick={() => go("welcome")}>Back</button></div>
      </>}

      {step === "goal" && <form onSubmit={saveGoal} noValidate>
        {savedGoal ? <p className="onboarding-saved" role="status"><strong>{savedGoal}</strong> is saved in your Goals. You can fund and plan it from Goals whenever you like.</p> : <>
          <p className="onboarding-lede">What would you like to work toward? Pick one, then name it and set a target.</p>
          <fieldset className="onboarding-choices onboarding-goal-types" disabled={busy}><legend className="sr-only">What your goal is for</legend>
            {GOAL_TEMPLATES.map(t => <label key={t.category} className="onboarding-choice"><input type="radio" name="onboarding-goal" value={t.category} checked={category === t.category} onChange={() => setCategory(t.category)} /><span><strong>{t.label}</strong></span></label>)}
          </fieldset>
          <fieldset className="onboarding-fields" disabled={busy || !category}><legend className="sr-only">Goal details</legend>
            <label className="field">Goal name<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder={GOAL_TEMPLATES.find(t => t.category === category)?.placeholder ?? "Name your goal"} autoComplete="off" /></label>
            <div className="onboarding-row">
              <label className="field">Target amount<input required inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00" autoComplete="off" /></label>
              <fieldset className="onboarding-currency"><legend>Currency</legend>{(["USD", "EUR"] as const).map(c => <label key={c}><input type="radio" name="onboarding-currency" value={c} checked={currency === c} onChange={() => setCurrency(c)} /><span>{c}</span></label>)}</fieldset>
            </div>
            <label className="field">Target date (optional)<input type="date" min={localDate()} value={date} onChange={e => setDate(e.target.value)} /></label>
          </fieldset>
          <p className="fine">A plan, not a promise: nothing is invested or moved. You can add wealth and contributions later.</p>
        </>}
        {error && <p role="alert">{error}</p>}
        <div className="onboarding-actions">
          {savedGoal ? <button type="button" className="primary" onClick={() => go("habit")}>Continue</button> : <button type="submit" className="primary" disabled={busy || !category}>{busy ? "Saving…" : "Create goal"}</button>}
          {!savedGoal && <button type="button" className="secondary" onClick={() => go("habit")}>Skip this step</button>}
        </div>
      </form>}

      {step === "habit" && <>
        {savedHabit ? <p className="onboarding-saved" role="status"><strong>{savedHabit}</strong> is on your Habits page. Check in from Today or Habits.</p> : <>
          <p className="onboarding-lede">Start small. Pick one habit; you can change its target and schedule later.</p>
          <fieldset className="onboarding-choices" disabled={busy}><legend className="sr-only">Choose a habit</legend>
            {HABIT_CHOICES.map(h => <label key={h.key} className="onboarding-choice"><input type="radio" name="onboarding-habit" value={h.key} checked={habitKey === h.key} onChange={() => setHabitKey(h.key)} /><span><strong>{HABIT_TEMPLATE_TITLES[h.key]}</strong><small>{h.note}</small></span></label>)}
          </fieldset>
        </>}
        {error && <p role="alert">{error}</p>}
        <div className="onboarding-actions">
          {savedHabit ? <button type="button" className="primary" onClick={() => go("data")}>Continue</button> : <button type="button" className="primary" disabled={busy || !habitKey} onClick={saveHabit}>{busy ? "Saving…" : "Add habit"}</button>}
          {!savedHabit && <button type="button" className="secondary" onClick={() => go("data")}>Skip this step</button>}
        </div>
      </>}

      {step === "data" && <>
        <ul className="onboarding-points">
          <li><strong>It lives on this device.</strong> Your goals, habits and health journal are kept in this browser. Browser storage is not a backup.</li>
          <li><strong>Back up what matters.</strong> Settings makes backup files. They contain personal information, so keep them somewhere private.</li>
          <li><strong>Sync is optional.</strong> Encrypted account sync is off until you set it up in Settings, and it can come later.</li>
          <li><strong>Keep your recovery secret safe.</strong> Your sign-in email is not a recovery key, and email access cannot recover a lost secret.</li>
        </ul>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={finish}>Go to Today</button><Link className="secondary" href="/app/settings#private-vault" onClick={() => markOnboardingSeen(window.localStorage)}>Open backups</Link></div>
      </>}
    </div>}
    {step !== "data" && escape}
  </section>;
}
