"use client";
/* Opening Showcase reloads the page on purpose, as in Settings: every store hook must switch data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import "./onboarding.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {parseAmountInput} from "../../lib/amount-input";
import { hasVisibleText } from "../../lib/visible-text";
import { NebulaFlow } from "../nebula-flow";
import { useGoals } from "../goal-provider";
import { usePlatform } from "../platform/use-platform";
import { useHabits } from "../habits/use-habits";
import { useHealth } from "../health/use-health";
import { usePrivateStore } from "../use-private-store";
import { useShowcase } from "../showcase-controls";
import { ZigiFigure } from "../zigi/zigi-figure";
import { InstallGuide } from "../help/install-guide";
import { useInstallPrompt } from "./use-install-prompt";
import { DASHBOARD_SETTINGS_KEY, PRESETS, applyDashboardPreset, dashboardSettingsSchema, emptyDashboardSettings } from "../../lib/dashboard-settings";
import { privateGoalSchema, type PrivateGoal } from "../../lib/positions";
import { createAllocatedGoal } from "../../lib/wealth";
import { localDate } from "../../lib/local-date";
import { loadShowcase } from "../../lib/showcase";
import { markOnboardingSeen } from "../../lib/onboarding";
import { createHabit } from "../../lib/habits";
import { setHealthTargets } from "../../lib/health";
import { dailyData, saveHealthPreferences } from "../../lib/health-daily";
import { GOAL_TEMPLATES } from "../../lib/templates/goals";
import { STEP_TARGETS, WATER_TARGETS_ML } from "../../lib/templates/health";
import { HABIT_GROUP_LABEL, habitTemplateInputOf, hasHabitLike } from "../../lib/templates/habits";
import { PILLARS, PILLAR_TEXT, pagesForPillars, pagesShownFor, presetForPillars, starterHabits, type Pillar } from "../../lib/templates/pillars";
import { PAGE_LABEL, startHref, viewOf } from "../../lib/pages/visibility";
import { settingsGroupIn, withSettingsGroup } from "../../lib/vault/w-homes";
import { announceModuleChange, updateSettings } from "../../lib/sync-homes-store";
import { getAppStorage } from "../../lib/showcase-storage";
import { documentAllowsCamera, healthNavigation } from "../../lib/health-navigation";
import { isAccountLocked } from "../../lib/account-session";
import { currentInstallContext } from "../../lib/install/platform";
import { GlassBar } from "../progress/glass-progress";

/**
 * The first-run welcome v2 (Session W Part 3; Session E's flow before it): ZIGi says hello, the person picks what they
 * want to improve, chooses starters, may take a short tour, sees how to install and meet ZIGi, and reads how their data
 * is kept. Every choice stays in this page until Finish, which saves them together through the same stores and schemas
 * as the rest of the app; Skip setup writes only the device-only "seen" flag. Re-running it never adds a habit twice.
 */
const STEPS = ["welcome", "pillars", "starters", "tour", "install", "zigi", "data"] as const;
type Step = typeof STEPS[number];
const TITLES: Record<Step, string> = {
  welcome: "Welcome to ZIGoals.",
  pillars: "What do you want to improve?",
  starters: "A few things to start with.",
  tour: "A quick look around.",
  install: "Keep ZIGoals on your Home Screen.",
  zigi: "Meet ZIGi.",
  data: "Your data, your control.",
};
const TOUR: {title: string; text: string}[] = [
  {title: "Today", text: "Your day at a glance: the habits, health and goals you chose, and a few calm suggestions under For you."},
  {title: "Your pages", text: "The navigation shows the pages you picked. Settings → Your pages & buttons shows or hides any of them later."},
  {title: "Quick add", text: "+ Quick add logs a meal, a habit or a contribution from wherever you are."},
  {title: "Settings", text: "Backups, privacy, encrypted sync, your time zone and ZIGi all live in Settings, with Help one tap away."},
];
type GoalDraft = {category: NonNullable<PrivateGoal["category"]> | ""; name: string; target: string; currency: "USD" | "EUR"; date: string};
const NO_GOAL: GoalDraft = {category: "", name: "", target: "", currency: "USD", date: ""};
const litres = (ml: number) => `${(ml / 1000).toLocaleString("en", {maximumFractionDigits: 1})} L`;

function exploreDemo() {
  markOnboardingSeen(window.localStorage);
  loadShowcase();
  window.location.assign("/app");
}
function Choice({name, checked, onChange, label, note, disabled, type = "checkbox"}: {name: string; checked: boolean; onChange: () => void; label: string; note?: ReactNode; disabled?: boolean; type?: "checkbox" | "radio"}) {
  return <label className="onboarding-choice"><input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} /><span><strong>{label}</strong>{note && <small>{note}</small>}</span></label>;
}

export function OnboardingFlow() {
  const router = useRouter(), showcase = useShowcase(), legacy = useGoals(), platform = usePlatform(), habits = useHabits(), health = useHealth();
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const install = useInstallPrompt();
  const [step, setStep] = useState<Step>("welcome"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [pillars, setPillars] = useState<Pillar[]>([]), [habitIds, setHabitIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<GoalDraft>(NO_GOAL), [goal, setGoal] = useState<PrivateGoal | null>(null);
  const [steps, setSteps] = useState<number | null>(null), [water, setWater] = useState<number | null>(null);
  const [tour, setTour] = useState<number | null>(null), [syncNext, setSyncNext] = useState(false), [installed, setInstalled] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), first = useRef(true), id = useId();
  const index = STEPS.indexOf(step);
  useEffect(() => { if (first.current) { first.current = false; return; } heading.current?.focus(); }, [step]);
  useEffect(() => { setInstalled(currentInstallContext() === "installed"); }, []);

  const ready = settings.loaded && platform.loaded && habits.loaded && health.loaded;
  const storeError = settings.error || platform.error || habits.error || health.error;
  const demoAvailable = legacy.loaded && legacy.mode === "local";
  const currentPages = ready && !settings.error ? settingsGroupIn(settings.data, "pages") : undefined;
  const existingTitles = habits.data.habits.map(h => h.title);
  const starters = starterHabits(pillars), preset = presetForPillars(pillars);
  // Only the starters on screen, in their order: a pick hidden by a later change of pillars is not saved.
  const pickedHabits = starters.filter(t => habitIds.includes(t.id) && !hasHabitLike(existingTitles, t));
  const shown = pagesShownFor(pillars, currentPages);
  const pagesChange = pagesForPillars(pillars, new Date(0).toISOString(), currentPages) !== null;
  const showGoal = !pillars.length || pillars.includes("goals-money"), showHealth = !pillars.length || pillars.includes("health-food") || pillars.includes("sleep-mind");
  function go(next: Step) { setError(""); setStep(next); }
  function skip() { markOnboardingSeen(window.localStorage); router.push("/app"); }
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  /** The goal draft, checked when leaving the starters step: a kind chosen means a name and a target are needed. */
  function checkGoal(): boolean {
    if (!showGoal || !draft.category) { setGoal(null); return true; }
    try {
      if (!draft.name.trim()) throw Error("Give your Goal a name.");
      if (!hasVisibleText(draft.name)) throw Error("Give your Goal a name with at least one visible character.");
      if (draft.date && draft.date < localDate()) throw Error("Choose today or a future target date.");
      const units = parseAmountInput(draft.target, 2);
      if (units <= 0n) throw Error("Enter a positive target.");
      // One id per draft, so finishing again after a partial save never creates the Goal twice.
      const goalId = goal?.id ?? BigInt("0x" + crypto.randomUUID().replaceAll("-", "")).toString();
      setGoal(privateGoalSchema.parse({ id: goalId, name: draft.name, category: draft.category, network: "zigchain-1", type: "VALUE", status: "active", asset: draft.currency, denom: draft.currency, decimals: 2, target: units.toString(), notes: "", createdAt: goal?.createdAt ?? new Date().toISOString(), targetDate: draft.date || undefined, milestones: [] }));
      return true;
    } catch (e) { setError(e instanceof Error && e.message && !e.message.startsWith("[") ? e.message : "Enter a target with up to two decimal places."); return false; }
  }

  async function finishSetup() {
    setBusy(true); setError("");
    const at = new Date().toISOString();
    try {
      let pagesAfter = currentPages;
      if (preset || pagesChange) {
        await updateSettings(getAppStorage(), latest => {
          let next = preset ? applyDashboardPreset(latest, preset) : latest;
          const change = pagesForPillars(pillars, at, settingsGroupIn(next, "pages"));
          if (change) next = withSettingsGroup(next, "pages", change, false);
          pagesAfter = settingsGroupIn(next, "pages");
          return next;
        });
        announceModuleChange([DASHBOARD_SETTINGS_KEY]);
      }
      if (pickedHabits.length) await habits.update(data => pickedHabits.reduce((acc, t) => hasHabitLike(acc.habits.map(h => h.title), t) ? acc : createHabit(acc, habitTemplateInputOf(t)), data));
      if (goal) { const saved = goal; await platform.update(data => data.goals.some(g => g.id === saved.id) ? data : createAllocatedGoal(data, saved, [])); }
      if (showHealth && (steps !== null || water !== null)) await health.update(data => {
        let next = data;
        if (steps !== null) next = setHealthTargets(next, {...next.targets, steps});
        if (water !== null) next = saveHealthPreferences(next, {...dailyData(next).preferences, waterTargetMl: water});
        return next;
      });
      markOnboardingSeen(window.localStorage);
      const target = syncNext ? "/app/settings#encrypted-sync" : startHref(viewOf(pagesAfter));
      let accountOpen: boolean;
      try { accountOpen = !isAccountLocked(); } catch { accountOpen = false; }
      if (healthNavigation({href: target, origin: window.location.origin, cameraAllowed: documentAllowsCamera(document), accountOpen, button: 0, modified: false, target: "", download: false}) === "document") window.location.assign(target);
      else router.push(target);
    } catch (e) { setError(e instanceof Error ? `${e.message} What was saved stays saved; Finish again to save the rest.` : "Not everything was saved. Finish again to save the rest."); setBusy(false); }
  }

  if (showcase) return <section className="onboarding panel" aria-labelledby={`${id}-title`}>
    <h1 id={`${id}-title`}><NebulaFlow identity="welcome-title">Welcome to ZIGoals.</NebulaFlow></h1>
    <p>You’re exploring Showcase data. The welcome sets up your own records, so it opens outside Showcase.</p>
    <div className="onboarding-actions"><Link className="primary" href="/app/settings#showcase">Showcase settings</Link><Link className="secondary" href="/app">Back to Today</Link></div>
  </section>;

  const escape = <div className="onboarding-escape">
    <button type="button" className="text-link" onClick={skip}>Skip setup</button>
    <button type="button" className="text-link" disabled={!demoAvailable} onClick={exploreDemo}>Explore the demo</button>
  </div>;
  const back = (to: Step) => <button type="button" className="secondary" onClick={() => go(to)}>Back</button>;
  const summary = [
    preset && `Today starts with ${PRESETS.find(p => p.id === preset)?.label ?? preset}.`,
    pagesChange && `Your pages: ${[...shown.map(p => PAGE_LABEL[p]), "Settings"].join(", ")}.`,
    pickedHabits.length > 0 && `${pickedHabits.length === 1 ? "A habit" : `${pickedHabits.length} habits`}: ${pickedHabits.map(t => t.title).join(", ")}.`,
    goal && `Your goal “${goal.name}”.`,
    showHealth && steps !== null && `A daily step target of ${steps.toLocaleString("en")}.`,
    showHealth && water !== null && `A daily water target of ${litres(water)}.`,
  ].filter((line): line is string => typeof line === "string");

  return <section className="onboarding panel" aria-labelledby={`${id}-title`} data-step={step}>
    <div className="onboarding-progress">
      <p className="eyebrow">Step {index + 1} of {STEPS.length}</p>
      <GlassBar identity="onboarding-steps" className="onboarding-track" aria-hidden="true" value={(index + 1) / STEPS.length} />
    </div>
    <h1 id={`${id}-title`} ref={heading} tabIndex={-1}><NebulaFlow identity="welcome-title">{TITLES[step]}</NebulaFlow></h1>
    {!ready && !storeError && <p role="status">Opening your private records…</p>}
    {storeError && <p role="alert">{storeError} <Link href="/app/settings">Open Settings</Link></p>}

    {ready && !storeError && <div className="onboarding-step" key={step}>
      {step === "welcome" && <>
        <div className="onboarding-zigi"><ZigiFigure state="idle" /><p><strong>Hi, I’m ZIGi.</strong> Let’s make ZIGoals yours. It takes about two minutes, every step can be skipped, and nothing is saved until you finish.</p></div>
        <ul className="onboarding-points">
          <li><strong>Private by design.</strong> What you add stays on this device. Encrypted sync between your devices is optional and off until you set it up.</li>
          <li><strong>No ads, no trackers.</strong> ZIGoals shows no advertising and runs no app analytics.</li>
          <li><strong>No crypto needed.</strong> The blockchain stays out of sight; a wallet is optional and can come later.</li>
        </ul>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("pillars")}>Let’s begin</button></div>
      </>}

      {step === "pillars" && <>
        <p className="onboarding-lede">Pick as many as you like. ZIGoals shows the pages for them; Settings → Your pages & buttons changes this any time.</p>
        <fieldset className="onboarding-choices"><legend className="sr-only">What you want to improve</legend>
          {PILLARS.map(p => <Choice key={p} name="onboarding-pillar" checked={pillars.includes(p)} onChange={() => setPillars(list => toggle(list, p))} label={PILLAR_TEXT[p].label} note={PILLAR_TEXT[p].note} />)}
        </fieldset>
        <p className="fine onboarding-shown" aria-live="polite">{pagesChange ? `You’ll see: ${[...shown.map(p => PAGE_LABEL[p]), "Settings"].join(", ")}.` : "Every page stays as it is."}</p>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("starters")}>{pillars.length ? "Continue" : "Continue without choosing"}</button>{back("welcome")}</div>
      </>}

      {step === "starters" && <>
        <p className="onboarding-lede">Tick what you’d like to begin with. You can change targets and schedules later, or skip this.</p>
        <fieldset className="onboarding-choices"><legend>Habits</legend>
          {starters.map(t => { const exists = hasHabitLike(existingTitles, t); return <Choice key={t.id} name="onboarding-habit" checked={exists || habitIds.includes(t.id)} disabled={exists} onChange={() => setHabitIds(list => toggle(list, t.id))} label={t.title} note={exists ? "Already in your Habits" : `${t.note} · ${HABIT_GROUP_LABEL[t.group]}`} />; })}
        </fieldset>
        {showGoal && <fieldset className="onboarding-goal"><legend>A first goal (optional)</legend>
          <div className="onboarding-choices onboarding-goal-types">
            {GOAL_TEMPLATES.map(t => <Choice key={t.category} type="radio" name="onboarding-goal" checked={draft.category === t.category} onChange={() => setDraft(d => ({...d, category: t.category}))} label={t.label} />)}
          </div>
          <fieldset className="onboarding-fields" disabled={!draft.category}><legend className="sr-only">Goal details</legend>
            <label className="field">Goal name<input required maxLength={100} value={draft.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))} placeholder={GOAL_TEMPLATES.find(t => t.category === draft.category)?.placeholder ?? "Name your goal"} autoComplete="off" /></label>
            <div className="onboarding-row">
              <label className="field">Target amount<input required inputMode="decimal" value={draft.target} onChange={e => setDraft(d => ({...d, target: e.target.value}))} placeholder="0.00" autoComplete="off" /></label>
              <fieldset className="onboarding-currency"><legend>Currency</legend>{(["USD", "EUR"] as const).map(c => <label key={c}><input type="radio" name="onboarding-currency" value={c} checked={draft.currency === c} onChange={() => setDraft(d => ({...d, currency: c}))} /><span>{c}</span></label>)}</fieldset>
            </div>
            <label className="field">Target date (optional)<input type="date" min={localDate()} value={draft.date} onChange={e => setDraft(d => ({...d, date: e.target.value}))} /></label>
          </fieldset>
          <p className="fine">A plan, not a promise: nothing is invested or moved.{draft.category && <> <button type="button" className="text-link" onClick={() => { setDraft(NO_GOAL); setGoal(null); }}>No goal for now</button></>}</p>
        </fieldset>}
        {showHealth && <fieldset className="onboarding-targets"><legend>Health targets (optional)</legend>
          <div className="onboarding-choices" role="radiogroup" aria-label="Daily steps">
            <Choice type="radio" name="onboarding-steps" checked={steps === null} onChange={() => setSteps(null)} label="No step target" />
            {STEP_TARGETS.map(n => <Choice key={n} type="radio" name="onboarding-steps" checked={steps === n} onChange={() => setSteps(n)} label={`${n.toLocaleString("en")} steps a day`} />)}
          </div>
          <div className="onboarding-choices" role="radiogroup" aria-label="Daily water">
            <Choice type="radio" name="onboarding-water" checked={water === null} onChange={() => setWater(null)} label="No water target" />
            {WATER_TARGETS_ML.map(ml => <Choice key={ml} type="radio" name="onboarding-water" checked={water === ml} onChange={() => setWater(ml)} label={`${litres(ml)} of water a day`} />)}
          </div>
          <p className="fine">Common starting points, not advice. Calorie, weight and nutrient targets are yours to set on the Health page if you want them.</p>
        </fieldset>}
        {error && <p role="alert">{error}</p>}
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => { if (checkGoal()) go("tour"); }}>Continue</button>{back("pillars")}</div>
      </>}

      {step === "tour" && (tour === null ? <>
        <p className="onboarding-lede">Four short cards about where things are. Take them now or skip; the tour never repeats on its own.</p>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => setTour(0)}>Show me</button><button type="button" className="secondary" onClick={() => go("install")}>Skip the tour</button>{back("starters")}</div>
      </> : <>
        <section className="onboarding-tour-card" aria-labelledby={`${id}-tour`} aria-live="polite">
          <p className="eyebrow">{tour + 1} of {TOUR.length}</p>
          <h2 id={`${id}-tour`}>{TOUR[tour]!.title}</h2>
          <p>{TOUR[tour]!.text}</p>
        </section>
        <div className="onboarding-actions">
          {tour < TOUR.length - 1 ? <button type="button" className="primary" onClick={() => setTour(tour + 1)}>Next</button> : <button type="button" className="primary" onClick={() => { setTour(null); go("install"); }}>Done</button>}
          <button type="button" className="secondary" onClick={() => { setTour(null); go("install"); }}>End the tour</button>
        </div>
      </>)}

      {step === "install" && <>
        {installed ? <p className="onboarding-lede">You’re already using the installed app. Keep opening ZIGoals from its icon.</p> : <>
          <p className="onboarding-lede">Opened from its icon, ZIGoals feels like an app and keeps its own copy of your data.</p>
          {install.available && <div className="onboarding-actions"><button type="button" className="primary" onClick={() => void install.install().then(outcome => { if (outcome === "accepted") setInstalled(true); })}>Install ZIGoals</button></div>}
          <InstallGuide />
          <p className="fine">On a computer or an Android phone, the browser’s menu offers Install app or Add to Home screen where it supports it.</p>
        </>}
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("zigi")}>Continue</button>{back("tour")}</div>
      </>}

      {step === "zigi" && <>
        <div className="onboarding-zigi"><ZigiFigure state="idle" /><p><strong>I’m here when you want me.</strong> Tap my button, or press ⌘K or Ctrl+K, to ask about your own records.</p></div>
        <ul className="onboarding-points">
          <li><strong>Your own AI, later.</strong> Connect the AI you already use in Settings → ZIGi · your AI. Until you do, nothing is sent anywhere.</li>
          <li><strong>You stay in charge.</strong> I only suggest; anything I propose waits for your confirmation.</li>
          <li><strong>Out of the way when you like.</strong> Hide my button with the chevron below it, or in Settings → Your pages & buttons.</li>
        </ul>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("data")}>Continue</button>{back("install")}</div>
      </>}

      {step === "data" && <>
        <ul className="onboarding-points">
          <li><strong>It lives on this device.</strong> Your goals, habits and health journal are kept in this browser. Browser storage is not a backup.</li>
          <li><strong>Back up what matters.</strong> Settings makes backup files. They contain personal information, so keep them somewhere private.</li>
          <li><strong>Sync is optional.</strong> Encrypted account sync is off until you set it up in Settings, and it can come later. Health records sync only if you also allow Health there.</li>
          <li><strong>Keep your recovery secret safe.</strong> Your sign-in email is not a recovery key, and email access cannot recover a lost secret.</li>
        </ul>
        <label className="onboarding-choice onboarding-sync"><input type="checkbox" checked={syncNext} onChange={() => setSyncNext(v => !v)} /><span><strong>After setup, take me to encrypted sync</strong><small>Optional. Nothing is turned on until you set it up there.</small></span></label>
        <section className="onboarding-summary" aria-labelledby={`${id}-summary`}>
          <h2 id={`${id}-summary`}>When you finish</h2>
          {summary.length ? <ul>{summary.map(line => <li key={line}>{line}</li>)}</ul> : <p>Nothing new is added; ZIGoals opens as it is.</p>}
        </section>
        {error && <p role="alert">{error}</p>}
        <div className="onboarding-actions"><button type="button" className="primary" disabled={busy} onClick={() => void finishSetup()}>{busy ? "Saving…" : "Finish setup"}</button>{back("zigi")}</div>
      </>}
    </div>}
    {step !== "data" && escape}
  </section>;
}
