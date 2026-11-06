"use client";
import {LEVEL_NAMES, levelProgress} from "../../lib/game/levels";
/* Opening Showcase reloads the page on purpose, as in Settings: every store hook must switch data profiles. */
/* eslint-disable @next/next/no-location-assign-relative-destination */
import { exitShowcase } from "../../lib/showcase-storage";
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
import { FOCUSES, LANDING_NOTE, ONBOARDING_SETUP, PROFILE_NAME, SAVING_HABIT, cleanProfileName, focusHabitInput, focusHabitRhythm, setupUndoable, suggestionsFor, type FocusId } from "../../lib/onboarding-setup";
import { setHabitState } from "../../lib/habits";
import { readDeviceRecord, updateDeviceRecord } from "../../lib/device-record";
import { WIDGET_CATALOG, removeWidget, saveWidget, type WidgetKind } from "../../lib/dashboard-settings";
import { deletePrivateGoal } from "../../lib/positions";
import { formatNumber } from "../../lib/visual-format";
import { createHabit } from "../../lib/habits";
import { setHealthTargets } from "../../lib/health";
import { dailyData, saveHealthPreferences } from "../../lib/health-daily";
import { GOAL_TEMPLATES } from "../../lib/templates/goals";
import { SLEEP_GOALS, STEP_TARGETS, WATER_TARGETS_ML } from "../../lib/templates/health";
import { setSleepGoal } from "../../lib/sleep/engine";
import { formatMinutes } from "../../lib/zone-time";
import { updateHealthGroup } from "../../lib/w-homes-store";
import { HABIT_GROUP_LABEL, habitTemplateInputOf, hasHabitLike } from "../../lib/templates/habits";
import { EXTRA_PILLARS, MAIN_PILLARS, PILLAR_TEXT, pagesForPillars, pagesShownFor, presetForPillars, starterHabits, type Pillar } from "../../lib/templates/pillars";
import { PAGE_LABEL, startHref, viewOf, withChoice } from "../../lib/pages/visibility";
import type { VisibilityId } from "../../lib/pages/schema";
import { settingsGroupIn, withSettingsGroup } from "../../lib/vault/w-homes";
import { announceModuleChange, updateSettings } from "../../lib/sync-homes-store";
import { getAppStorage } from "../../lib/showcase-storage";
import { documentAllowsCamera, healthNavigation } from "../../lib/health-navigation";
import { isAccountLocked } from "../../lib/account-session";
import { currentInstallContext } from "../../lib/install/platform";
import { GlassBar } from "../progress/glass-progress";
import { BullGlyph, ButterflyGlyph, HeartGlyph, LotusGlyph } from "../footer/pillar-glyphs";
import {plainErrorMessage} from "../../lib/plain-error";
import { showStatus } from "../ui/undo-toast";

/**
 * The first-run welcome v2 (Session W Part 3; Session E's flow before it): ZIGi says hello, the person picks what they
 * want to improve, chooses starters, may take a short tour, sees how to install and meet ZIGi, and reads how their data
 * is kept. Every choice stays in this page until Finish, which saves them together through the same stores and schemas
 * as the rest of the app; Skip setup writes only the device-only "seen" flag. Re-running it never adds a habit twice.
 */
const STEPS = ["welcome", "pillars", "focuses", "starters", "tour", "install", "zigi", "data"] as const;
type Step = typeof STEPS[number];
const READ_ONLY_STEPS: ReadonlySet<Step> = new Set(["tour", "install"]);
const TITLES: Record<Step, string> = {
  welcome: "Welcome to ZIGoals.",
  pillars: "What do you want to improve?",
  focuses: "Two or three things to focus on.",
  starters: "A few things to start with.",
  tour: "A quick look around.",
  install: "Keep ZIGoals on your Home Screen.",
  zigi: "Meet ZIGi.",
  data: "Your data, your control.",
};
const TOUR: {title: string; text: string}[] = [
  {title: "Today", text: "Your day at a glance: the habits, health and goals you chose, and a few calm suggestions under For you."},
  {title: "Your pages", text: "The navigation shows the pages you picked. Settings → Your pages & buttons shows or hides any of them later."},
  {title: "Quick add", text: "+ Quick add, at the top of every page, logs a meal, a habit or a contribution from wherever you are."},
  {title: "Settings", text: "Backups, privacy, encrypted sync, your time zone and ZIGi all live in Settings, with Help one tap away."},
];
type GoalDraft = {category: NonNullable<PrivateGoal["category"]> | ""; name: string; target: string; currency: "USD" | "EUR"; date: string};
const NO_GOAL: GoalDraft = {category: "", name: "", target: "", currency: "USD", date: ""};
/** Session AL (P-NB-09): the wizard draft in this tab (`zigoals:welcome-draft:v1`, session storage only; tolerant reads). */
const WELCOME_DRAFT_KEY = "zigoals:welcome-draft:v1";
type WelcomeDraft = {step?: string; name?: string; pillars?: string[]; focuses?: string[]; habitIds?: string[]; skipped?: string[]; goal?: Partial<GoalDraft>; steps?: number | null; water?: number | null; sleep?: number | null};
function readWelcomeDraft(): WelcomeDraft | null {
  try {
    const raw = window.sessionStorage.getItem(WELCOME_DRAFT_KEY); if (!raw) return null;
    const d = JSON.parse(raw) as Record<string, unknown>; if (!d || typeof d !== "object") return null;
    const strings = (v: unknown) => Array.isArray(v) && v.length <= 60 && v.every(x => typeof x === "string" && x.length <= 100) ? v as string[] : undefined;
    const num = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1_000_000) ? v as number | null : undefined;
    const g = d.goal && typeof d.goal === "object" ? d.goal as Record<string, unknown> : null;
    const goal: Partial<GoalDraft> | undefined = g ? {...(typeof g.category === "string" && (g.category === "" || GOAL_TEMPLATES.some(t => t.category === g.category)) ? {category: g.category as GoalDraft["category"]} : {}), ...(typeof g.name === "string" && g.name.length <= 100 ? {name: g.name} : {}), ...(typeof g.target === "string" && g.target.length <= 40 ? {target: g.target} : {}), ...(g.currency === "USD" || g.currency === "EUR" ? {currency: g.currency as GoalDraft["currency"]} : {}), ...(typeof g.date === "string" && /^(\d{4}-\d{2}-\d{2})?$/.test(g.date) ? {date: g.date} : {})} : undefined;
    return {step: typeof d.step === "string" ? d.step : undefined, name: typeof d.name === "string" && d.name.length <= 60 ? d.name : undefined, pillars: strings(d.pillars), focuses: strings(d.focuses), habitIds: strings(d.habitIds), skipped: strings(d.skipped), goal, steps: num(d.steps), water: num(d.water), sleep: num(d.sleep)};
  } catch { return null; }
}
function writeWelcomeDraft(draft: WelcomeDraft | null) {
  try { if (draft === null) window.sessionStorage.removeItem(WELCOME_DRAFT_KEY); else window.sessionStorage.setItem(WELCOME_DRAFT_KEY, JSON.stringify(draft)); } catch { /* the draft is a convenience */ }
}
/** Session AL fourth pass (N-NB-02): the small apps show beside the pages; the preview names them, not only the pages. */
const APPS_LINE = "The Checklist and the small apps (NOVA, Tasks, Notes, Journal, Agenda) show too while they are switched on; Settings → Your pages & buttons turns any of them off.";
/** Session AL (P-NB-15; NB-017): a first goal's currency starts in euros where the device's time zone is in Europe. */
function homeCurrency(): "USD" | "EUR" { try { return Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith("Europe/") ? "EUR" : "USD"; } catch { return "USD"; } }
const litres = (ml: number) => `${formatNumber(ml / 1000, {maximumFractionDigits: 1})} L`;

/** Session AL (N-NB-09): "2 habits, a goal and 3 widgets", never "2 habits, a goal can be…". */
function setupLine(s: {habitIds: readonly string[]; goalId?: string; widgetIds: readonly string[]}): string {
  const parts = [s.habitIds.length ? `${s.habitIds.length} ${s.habitIds.length === 1 ? "habit" : "habits"}` : "", s.goalId ? "a goal" : "", s.widgetIds.length ? `${s.widgetIds.length} ${s.widgetIds.length === 1 ? "widget" : "widgets"}` : ""].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0] ?? "Nothing";
}
function exploreDemo() {
  writeWelcomeDraft(null);
  markOnboardingSeen(window.localStorage);
  void loadShowcase().then(() => window.location.assign("/app"), () => undefined);
}
function Choice({name, checked, onChange, label, note, disabled, type = "checkbox"}: {name: string; checked: boolean; onChange: () => void; label: string; note?: ReactNode; disabled?: boolean; type?: "checkbox" | "radio"}) {
  return <label className="onboarding-choice"><input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} /><span><strong>{label}</strong>{note && <small>{note}</small>}</span></label>;
}

/** Session AL (GAP-103): the first level as the game layer would show it (a preview; nothing is stored). */
const GAME_PREVIEW = levelProgress(0);
export function OnboardingFlow() {
  const router = useRouter(), showcase = useShowcase(), legacy = useGoals(), platform = usePlatform(), habits = useHabits(), health = useHealth();
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const install = useInstallPrompt();
  const [step, setStep] = useState<Step>("welcome"), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [pillars, setPillars] = useState<Pillar[]>([]), [habitIds, setHabitIds] = useState<string[]>([]);
  // Session AA-Local S4: two or three focuses, which pre-select starters, a goal and Today's widgets; the setup is recorded for a day so it can be undone.
  const [focuses, setFocuses] = useState<FocusId[]>([]), [setupDone, setSetupDone] = useState(() => { try { return readDeviceRecord(getAppStorage(), ONBOARDING_SETUP).data; } catch { return null; } }), [undoBusy, setUndoBusy] = useState(false);
  const [draft, setDraft] = useState<GoalDraft>(NO_GOAL), [goal, setGoal] = useState<PrivateGoal | null>(null);
  useEffect(() => { const home = homeCurrency(); if (home !== NO_GOAL.currency) setDraft(d => d.currency === NO_GOAL.currency && !d.target ? {...d, currency: home} : d); }, []);
  const [goalError, setGoalError] = useState<{field: 'name' | 'target' | 'date'; text: string} | null>(null);
  const [steps, setSteps] = useState<number | null>(null), [water, setWater] = useState<number | null>(null), [sleepGoal, setSleepGoalChoice] = useState<number | null>(null);
  const [skippedFocusHabits, setSkippedFocusHabits] = useState<string[]>([]);
  // Session AL fourth pass (NB-006): an optional name for ZIGi to use, saved on Finish (device only).
  const [name, setName] = useState("");
  const [tour, setTour] = useState<number | null>(null), [syncNext, setSyncNext] = useState(false), [installed, setInstalled] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null), first = useRef(true), id = useId();
  const index = STEPS.indexOf(step);
  // Session AL fourth pass (NB-019): the tour's Quick add card points at the real button: each visible "+ Quick add" is
  // marked while that card shows (a ring, onboarding.css; still under reduced motion and Motion Off).
  const tourSpot = step === "tour" && tour !== null ? TOUR[tour]?.title : undefined;
  useEffect(() => {
    if (tourSpot !== "Quick add") return;
    const marked = [...document.querySelectorAll<HTMLElement>(".quick-add-trigger")].filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden");
    for (const el of marked) el.dataset.tourSpot = "";
    return () => { for (const el of marked) delete el.dataset.tourSpot; };
  }, [tourSpot]);
  // Session AH (TO4, N-106): each step opens at its top (a step had opened mid-page, where the last one's button was).
  useEffect(() => { if (first.current) { first.current = false; return; } window.scrollTo({top: 0}); heading.current?.focus({preventScroll: true}); }, [step]);
  const [installContext, setInstallContext] = useState<ReturnType<typeof currentInstallContext> | null>(null);
  useEffect(() => { const context = currentInstallContext(); setInstallContext(context); setInstalled(context === "installed"); }, []);

  const ready = settings.loaded && platform.loaded && habits.loaded && health.loaded;
  // Session AH (TO4, N-045): a read that never ends says so after a while, with a way on (it had waited forever).
  const [slow, setSlow] = useState(false);
  useEffect(() => { if (ready) { setSlow(false); return; } const t = window.setTimeout(() => setSlow(true), 8000); return () => window.clearTimeout(t); }, [ready]);
  const storeError = settings.error || platform.error || habits.error || health.error;
  const demoAvailable = legacy.loaded && legacy.mode === "local";
  const currentPages = ready && !settings.error ? settingsGroupIn(settings.data, "pages") : undefined;
  const existingTitles = habits.data.habits.map(h => h.title);
  const suggested = suggestionsFor(focuses);
  // Session AK P4 (FR-8): "Put money aside" from the "Save for something" focus is weekly and linked to the setup's goal
  // (focusHabitInput). The Money starter of the same name (no goal link) hid it whenever "Goals & money" was picked; the
  // focus's habit now takes that starter's place.
  const savingFromFocus = suggested.habits.includes(SAVING_HABIT);
  const starters = starterHabits(pillars).filter(t => !(savingFromFocus && t.title.toLowerCase() === SAVING_HABIT.toLowerCase())), preset = presetForPillars(pillars);
  const focusPillars = new Set(pillars.flatMap(p => p === "goals-money" ? ["goals", "wealth"] : p === "habits" ? ["habits"] : p === "health-food" ? ["health"] : p === "sleep-mind" ? ["health", "habits"] : []));
  const focusChoices = FOCUSES.filter(f => focusPillars.size === 0 || focusPillars.has(f.pillar));
  /** Starters the focuses ask for that no template carries: created as plain daily habits. */
  const focusHabits = suggested.habits.filter(title => !starters.some(t => t.title.toLowerCase() === title.toLowerCase()) && !existingTitles.some(e => e.trim().toLowerCase() === title.toLowerCase()));
  // Session AK G2 (RELEASE_REVIEW R21): a habit that came from a focus is a normal choice, ticked to start with (it had been
  // a dimmed, disabled tick that looked unavailable); unticking it leaves it out of the setup.
  const extraHabits = focusHabits.filter(title => !skippedFocusHabits.includes(title.toLowerCase()));
  // Only the starters on screen, in their order: a pick hidden by a later change of pillars is not saved.
  const pickedHabits = starters.filter(t => habitIds.includes(t.id) && !hasHabitLike(existingTitles, t));
  // Session AK G2 (RELEASE_REVIEW_2 R2-12): a habit this setup creates keeps the Habits page shown, whatever was picked.
  const also = pickedHabits.length || extraHabits.length ? ["habits" as const] : [];
  const shown = pagesShownFor(pillars, currentPages, also);
  const pagesChange = pagesForPillars(pillars, new Date(0).toISOString(), currentPages, also) !== null;
  const showGoal = !pillars.length || pillars.includes("goals-money"), showHealth = !pillars.length || pillars.includes("health-food") || pillars.includes("sleep-mind"), showSleep = !pillars.length || pillars.includes("sleep-mind");
  // Session AH (TO4, N-094): the targets follow the habits picked above (Walk is 8,000 steps a day, Drink water 2 L)
  // until the person chooses a target themselves.
  const touched = useRef({steps: false, water: false});
  const pickedTitles = [...pickedHabits.map(t => t.title), ...extraHabits].map(t => t.toLowerCase()).join("|");
  useEffect(() => {
    const titles = pickedTitles.split("|");
    if (!touched.current.steps) setSteps(titles.includes("walk") ? 8000 : null);
    if (!touched.current.water) setWater(titles.includes("drink water") ? 2000 : null);
  }, [pickedTitles]);
  // Session AL (P-NB-09; NB-011): the wizard's step and picks survive a reload in this tab (session storage, cleared on
  // Finish, Skip setup and Explore the demo); read after mount, so the server's first render and the client's agree.
  // Fourth pass (NB-011 en-GB): writing waits for the render that holds the restored picks. In any locale but en-US the
  // Shell remounts the page once in the hydration commit (components/display-locale.ts); React runs this instance's
  // effects first, and a ref set here let the write effect save the empty first state over the draft before the remount
  // read it. State, unlike a ref, is thrown away with the unmounted instance, so nothing is written until the picks are in.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const d = readWelcomeDraft(); setRestored(true); if (!d) return;
    if (d.pillars) setPillars(d.pillars as Pillar[]); if (d.focuses) setFocuses(d.focuses as FocusId[]); if (d.habitIds) setHabitIds(d.habitIds); if (d.skipped) setSkippedFocusHabits(d.skipped);
    if (d.goal) setDraft(g => ({...g, ...d.goal})); if (d.steps !== undefined) { touched.current.steps = true; setSteps(d.steps); } if (d.water !== undefined) { touched.current.water = true; setWater(d.water); } if (d.sleep !== undefined) setSleepGoalChoice(d.sleep);
    if (d.name !== undefined) setName(d.name);
    if (d.step && STEPS.includes(d.step as Step)) setStep(d.step as Step);
  }, []);
  useEffect(() => { if (restored) writeWelcomeDraft({step, ...(name ? {name} : {}), pillars, focuses, habitIds, skipped: skippedFocusHabits, goal: draft, ...(touched.current.steps ? {steps} : {}), ...(touched.current.water ? {water} : {}), sleep: sleepGoal}); }, [restored, step, name, pillars, focuses, habitIds, skippedFocusHabits, draft, steps, water, sleepGoal]);
  // Release review R7: the goal's own problem is said next to its field (aria-invalid, aria-describedby), in plain words.
  function go(next: Step) { setError(""); setGoalError(null); setStep(next); }
  function leaveFocuses() {
    const wanted = starters.filter(t => suggested.habits.some(h => h.toLowerCase() === t.title.toLowerCase())).map(t => t.id);
    setHabitIds(list => [...new Set([...list, ...wanted])]);
    if (suggested.goal && !draft.category && showGoal) setDraft(d => ({...d, category: suggested.goal!.category, name: suggested.goal!.name}));
    go("starters");
  }
  async function undoSetup() {
    if (!setupDone) return; setUndoBusy(true); setError("");
    try {
      const done = setupDone;
      // Delete for good needs the archive in effect (Session Z-Cloud's guard), so each habit is archived from today first; both go through the journal's own writers.
      if (done.habitIds.length) { const { deleteHabitForGood } = await import("../../lib/habit-delete-write"); const now = new Date(); await habits.update(data => done.habitIds.reduce((acc, id) => acc.habits.some(h => h.id === id) ? deleteHabitForGood(setHabitState(acc, id, "archived", now), id, now).data : acc, data)); }
      if (done.goalId) { const goalId = done.goalId; await platform.update(data => data.goals.some(g => g.id === goalId) ? deletePrivateGoal(data, goalId) : data); }
      if (done.widgetIds.length) { await updateSettings(getAppStorage(), latest => done.widgetIds.reduce((acc, id) => acc.widgets.some(w => w.id === id) ? removeWidget(acc, id) : acc, latest)); announceModuleChange([DASHBOARD_SETTINGS_KEY]); }
      // Session AL fourth pass (NB-241): the pages and buttons the setup switched go back as they were, each only while it is
      // still as the setup left it (a page switched since stays as the person set it). A new choice, stamped now.
      let restoredPages = 0, keptPages = 0;
      if (done.pages?.length) {
        const flips = done.pages, stamp = new Date().toISOString();
        await updateSettings(getAppStorage(), latest => {
          const current = settingsGroupIn(latest, "pages") ?? {version: 1 as const, items: {}}, view = viewOf(current);
          let pages = current; restoredPages = 0; keptPages = 0;
          for (const f of flips) { const shownNow = !view.hidden.includes(f.id as VisibilityId); if (shownNow === f.was) continue; try { pages = withChoice(pages, f.id as VisibilityId, f.was, stamp); restoredPages++; } catch { keptPages++; } }
          return pages === current ? latest : withSettingsGroup(latest, "pages", pages, false);
        });
        announceModuleChange([DASHBOARD_SETTINGS_KEY]);
      }
      const next = updateDeviceRecord(getAppStorage(), ONBOARDING_SETUP, r => ({...r, undone: true})); setSetupDone(next);
      // Session AL (P-NB-09; NB-241): Undo setup says what it took back.
      showStatus(`Setup undone: ${setupLine(done)} removed${restoredPages ? `, and the ${restoredPages === 1 ? "page it switched is" : "pages it switched are"} back as they were` : ""}.${keptPages ? " A page you changed since stays as you set it." : ""}`);
    } catch (e) { setError(plainErrorMessage(e, "The setup was not undone.")); } finally { setUndoBusy(false); }
  }
  function skip() { writeWelcomeDraft(null); markOnboardingSeen(window.localStorage); router.push("/app"); }
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  /** The goal draft, checked when leaving the starters step: a kind chosen means a name and a target are needed. */
  function checkGoal(): boolean {
    setGoalError(null);
    if (!showGoal || !draft.category) { setGoal(null); return true; }
    // Session AK P4 (FR-7): the refused field takes the focus and comes into view (its message is next to it, styled).
    const fail = (field: 'name' | 'target' | 'date', text: string) => { setGoalError({field, text}); requestAnimationFrame(() => { const el = document.querySelector<HTMLElement>(`[data-goal-field="${field}"]`); el?.focus({preventScroll: true}); el?.scrollIntoView({block: 'center'}); }); return false; };
    if (!draft.name.trim()) return fail('name', 'Give your goal a name, or choose No goal for now.');
    if (!hasVisibleText(draft.name)) return fail('name', 'Give your goal a name with at least one visible character.');
    if (draft.date && draft.date < localDate()) return fail('date', 'Choose today or a future target date.');
    if (!draft.target.trim()) return fail('target', 'Add a target amount, or choose No goal for now.');
    let units: bigint;
    try { units = parseAmountInput(draft.target, 2); } catch { return fail('target', 'Enter a target amount such as 1500 or 1500.50.'); }
    if (units <= 0n) return fail('target', 'Enter a target above zero.');
    try {
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
      let pagesAfter = currentPages, pageFlips: {id: VisibilityId; was: boolean}[] = [];
      if (preset || pagesChange) {
        await updateSettings(getAppStorage(), latest => {
          let next = preset ? applyDashboardPreset(latest, preset) : latest;
          const before = settingsGroupIn(next, "pages"), change = pagesForPillars(pillars, at, before, also);
          if (change) {
            // Session AL fourth pass (NB-241): what the setup switched, and how it was, so Undo setup can put it back.
            const was = viewOf(before), now = viewOf(change);
            pageFlips = [...new Set([...was.hidden, ...now.hidden])].filter(id => was.hidden.includes(id) !== now.hidden.includes(id)).map(id => ({id, was: !was.hidden.includes(id)}));
            next = withSettingsGroup(next, "pages", change, false);
          }
          pagesAfter = settingsGroupIn(next, "pages");
          return next;
        });
        announceModuleChange([DASHBOARD_SETTINGS_KEY]);
      }
      const createdHabitIds: string[] = [], createdWidgetIds: string[] = [];
      if (pickedHabits.length || extraHabits.length) await habits.update(data => { let acc = data; for (const t of pickedHabits) { if (hasHabitLike(acc.habits.map(h => h.title), t)) continue; const id = crypto.randomUUID(); acc = createHabit(acc, habitTemplateInputOf(t), new Date(), id); createdHabitIds.push(id); } for (const title of extraHabits) { if (acc.habits.some(h => h.title.toLowerCase() === title.toLowerCase())) continue; const id = crypto.randomUUID(); acc = createHabit(acc, focusHabitInput(title, goal?.id) /* Session AK P4 (FR-8) */, new Date(), id); createdHabitIds.push(id); } return acc; });
      if (suggested.widgets.length) { await updateSettings(getAppStorage(), latest => { let acc = latest; for (const kind of suggested.widgets) { if (acc.widgets.some(w => w.kind === kind && !w.hidden)) continue; const id = crypto.randomUUID(); const metric = (WIDGET_CATALOG[kind as WidgetKind].metrics as readonly string[])[0]!; try { acc = saveWidget(acc, {id, kind: kind as WidgetKind, metric, title: "", size: "compact", hidden: false, revision: 1}); createdWidgetIds.push(id); } catch { /* a widget that needs a record waits for Today */ } } return acc; }); announceModuleChange([DASHBOARD_SETTINGS_KEY]); }
      if (goal) { const saved = goal; await platform.update(data => data.goals.some(g => g.id === saved.id) ? data : createAllocatedGoal(data, saved, [])); }
      if (showHealth && (steps !== null || water !== null)) await health.update(data => {
        let next = data;
        if (steps !== null) next = setHealthTargets(next, {...next.targets, steps});
        if (water !== null) next = saveHealthPreferences(next, {...dailyData(next).preferences, waterTargetMl: water});
        return next;
      });
      // Session W Part 4: the sleep goal, in Health v4's sleep group (written only when one was chosen).
      if (showSleep && sleepGoal !== null) { const minutes = sleepGoal; await updateHealthGroup("sleep", current => setSleepGoal(current, {minutes, ...(current.goal?.bedFrom && current.goal.bedTo ? {bedFrom: current.goal.bedFrom, bedTo: current.goal.bedTo} : {})}, new Date())); }
      // Session AL fourth pass (NB-006): the name, only when one was given (device only; an empty field writes nothing).
      const kept = cleanProfileName(name);
      if (kept) { try { updateDeviceRecord(getAppStorage(), PROFILE_NAME, () => ({version: 1 as const, name: kept, at})); } catch { /* a name is a nicety */ } }
      // Written only when the setup made something; choosing nothing anywhere leaves only the seen flag behind.
      if (createdHabitIds.length || goal || createdWidgetIds.length) { try { updateDeviceRecord(getAppStorage(), ONBOARDING_SETUP, () => ({version: 1 as const, at, habitIds: createdHabitIds, ...(goal ? {goalId: goal.id} : {}), widgetIds: createdWidgetIds, focuses, ...(pageFlips.length ? {pages: pageFlips} : {})})); } catch { /* the undo is a convenience */ } }
      markOnboardingSeen(window.localStorage); writeWelcomeDraft(null);
      // Session AK P4 (FR-4): Today greets the finished setup with "You're set" and moves the focus to it, once (tab only).
      if (createdHabitIds.length || goal) { try { window.sessionStorage.setItem(LANDING_NOTE, at); } catch { /* the card still shows; only the focus waits */ } }
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
    {/* Session AH (DE4, H6; M-021, M-015, N-002, T-009): one clear way from the demo to your own start. The demo's records stay
        in this tab's Showcase and never mix with yours; Settings can load the demo again at any time. */}
    <div className="onboarding-actions"><button type="button" className="primary" onClick={() => { try { exitShowcase(); } catch { /* a refused store keeps the tab as it is */ } window.location.assign("/app/welcome"); }}>Start my own</button><Link className="secondary" href="/app">Back to the demo</Link></div>
    <p className="fine">Your own records start empty. The demo stays one tap away in Settings → Load Showcase Demo.</p>
  </section>;

  const picked = pillars.length + focuses.length + habitIds.length > 0 || !!draft.category;
  const escape = <div className="onboarding-escape">
    {/* Session AL (P-NB-09; NB-246): skipping after picks says they are not kept. */}
    {picked && <p className="fine onboarding-skip-note">Skip setup leaves without saving what you picked.</p>}
    <button type="button" className="text-link" onClick={skip}>Skip setup</button>
    <button type="button" className="text-link" disabled={!demoAvailable} onClick={exploreDemo}>Explore the demo</button>
  </div>;
  const back = (to: Step) => <button type="button" className="secondary" onClick={() => go(to)}>Back</button>;
  const summary = [
    focuses.length > 0 && `Your focuses: ${focuses.map(f => FOCUSES.find(x => x.id === f)!.title).join(", ")}.`,
    preset && `Today starts with ${PRESETS.find(p => p.id === preset)?.label ?? preset}.`,
    // Session AL (P-NB-13; NB-040): every habit the setup adds, on one line, as Today counts them.
    (extraHabits.length + pickedHabits.length) > 0 && `${extraHabits.length + pickedHabits.length === 1 ? "A habit" : `${extraHabits.length + pickedHabits.length} habits`}: ${[...extraHabits, ...pickedHabits.map(t => t.title)].join(", ")}.`,
    suggested.widgets.length > 0 && `Widgets on Today: ${suggested.widgets.join(", ")}.`,
    pagesChange && `Your pages: ${[...shown.map(p => PAGE_LABEL[p]), "Settings"].join(", ")}.`,
    goal && `Your goal “${goal.name}”.`,
    cleanProfileName(name) && `ZIGi calls you “${cleanProfileName(name)}” (on this device only).`,
    showHealth && steps !== null && `A daily step target of ${steps.toLocaleString("en")}.`,
    showHealth && water !== null && `A daily water target of ${litres(water)}.`,
    showSleep && sleepGoal !== null && `A sleep goal of ${formatMinutes(sleepGoal)}.`,
    // An empty answer ("" from a blank name) is no line: the summary then says nothing new is added (CI 1539).
  ].filter((line): line is string => typeof line === "string" && line.length > 0);

  const undoable = setupDone && setupUndoable(setupDone, new Date());
  return <section className="onboarding panel" aria-labelledby={`${id}-title`} data-step={step}>
    {undoable && <section className="onboarding-undo" aria-label="Undo the last setup"><p><strong>Your last setup is still fresh.</strong> {setupLine(setupDone)} can be taken back for a day.</p><button type="button" className="secondary" disabled={undoBusy} onClick={() => void undoSetup()}>{undoBusy ? "Undoing…" : "Undo setup"}</button></section>}
    <div className="onboarding-progress">
      {/* Session AL fourth pass (NB-234): a step with nothing to choose says so beside its number. */}
      <p className="eyebrow">Step {index + 1} of {STEPS.length}{READ_ONLY_STEPS.has(step) && <span className="onboarding-step-kind"> · nothing to choose here</span>}</p>
      <GlassBar identity="onboarding-steps" className="onboarding-track" aria-hidden="true" value={(index + 1) / STEPS.length} />
    </div>
    <h1 id={`${id}-title`} ref={heading} tabIndex={-1}><NebulaFlow identity="welcome-title">{TITLES[step]}</NebulaFlow></h1>
    {!ready && !storeError && <p role="status">{slow ? <>Your records are taking longer than usual to open. If your account is locked, unlock it in <Link className="text-link" href="/app/settings">Settings</Link>, or <button type="button" className="text-link" onClick={() => window.location.reload()}>try again</button>.</> : 'Opening your private records…'}</p>}
    {storeError && <p role="alert">{storeError} <Link href="/app/settings">Open Settings</Link></p>}

    {ready && !storeError && <div className="onboarding-step" key={step}>
      {step === "welcome" && <>
        <div className="onboarding-zigi"><ZigiFigure state="idle" /><p><strong>Hi, I’m ZIGi.</strong> Let’s make ZIGoals yours. It takes about a minute, every step can be skipped, and nothing is saved until you finish.</p></div>
        {/* Phase 2, Part 10 (owner request 36): the four pillars, illustrated with their fold marks, as one line: Goals, Habits & Health = Wealth. */}
        <ol className="onboarding-pillars" aria-label="ZIGoals in four pillars">
          <li data-pillar="goals"><span className="onboarding-pillar-art" aria-hidden="true"><LotusGlyph size={34}/></span><strong>Goals</strong><small>What matters, with a plan</small></li>
          <li data-pillar="habits"><span className="onboarding-pillar-art" aria-hidden="true"><ButterflyGlyph size={34}/></span><strong>Habits</strong><small>Small daily steps</small></li>
          <li data-pillar="health"><span className="onboarding-pillar-art" aria-hidden="true"><HeartGlyph size={34}/></span><strong>Health</strong><small>Care for the body</small></li>
          <li data-pillar="wealth"><span className="onboarding-pillar-art" aria-hidden="true"><BullGlyph size={34}/></span><strong>= Wealth</strong><small>A life that adds up</small></li>
        </ol>
        <ul className="onboarding-points">
          <li><strong>Private by design.</strong> What you add stays on this device. Encrypted sync between your devices is optional and off until you set it up.</li>
          <li><strong>No ads, no trackers.</strong> ZIGoals shows no advertising and runs no app analytics.</li>
          <li><strong>No crypto needed.</strong> Nothing to connect, nothing to buy.</li>{/* Session AK P4 (FR-23) */}
        </ul>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("pillars")}>Let’s begin</button></div>
      </>}

      {step === "pillars" && <>
        <p className="onboarding-lede">Pick as many as you like. ZIGoals shows the pages for them; Settings → Your pages & buttons changes this any time.</p>
        <fieldset className="onboarding-choices"><legend className="sr-only">What you want to improve</legend>
          {MAIN_PILLARS.map(p => <Choice key={p} name="onboarding-pillar" checked={pillars.includes(p)} onChange={() => setPillars(list => toggle(list, p))} label={PILLAR_TEXT[p].label} note={PILLAR_TEXT[p].note} />)}
        </fieldset>
        {/* Session AK G2 (RELEASE_REVIEW_2 R2-6, R2-12): Chess, Music and the chain are extras on their own line. "Crypto &
            ZIGChain" is the welcome's one chain choice (lib/templates/pillars.ts); "Goals & money" never chooses it. */}
        <fieldset className="onboarding-choices onboarding-extras"><legend>Extras</legend>
          {EXTRA_PILLARS.map(p => <Choice key={p} name="onboarding-pillar" checked={pillars.includes(p)} onChange={() => setPillars(list => toggle(list, p))} label={PILLAR_TEXT[p].label} note={PILLAR_TEXT[p].note} />)}
        </fieldset>
        <p className="fine onboarding-shown" aria-live="polite">{pagesChange ? `You’ll see: ${[...shown.map(p => PAGE_LABEL[p]), "Settings"].join(", ")}.` : "Every page stays as it is."}</p>
        <p className="fine onboarding-apps">{APPS_LINE}</p>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("focuses")}>{pillars.length ? "Continue" : "Skip this step"}</button>{back("welcome")}</div>
      </>}

      {step === "focuses" && <>
        <p className="onboarding-lede">Pick two or three. Each one suggests a habit, a goal or a widget for Today; nothing is saved until Finish.</p>
        <fieldset className="onboarding-choices"><legend className="sr-only">Your focuses</legend>
          {focusChoices.map(f => <Choice key={f.id} name="onboarding-focus" checked={focuses.includes(f.id)} disabled={!focuses.includes(f.id) && focuses.length >= 3} onChange={() => setFocuses(list => toggle(list, f.id))} label={f.title} note={f.blurb} />)}
        </fieldset>
        {/* Session AL (P-NB-11; NB-007, NB-035): the count, and the cap said, not a silent fourth tap. */}
        <p className="onboarding-count" aria-live="polite">{focuses.length} of 3 chosen{focuses.length >= 3 ? " · that’s the most for now: untick one to pick another" : ""}</p>
        <p className="fine onboarding-shown" aria-live="polite">{focuses.length ? `Suggested: ${[...suggested.habits, ...(suggested.goal ? [`the goal “${suggested.goal.name}”`] : [])].join(", ") || "widgets on Today"}.` : "Skip this and choose by hand on the next step."}</p>
        <div className="onboarding-actions"><button type="button" className="primary" onClick={leaveFocuses}>{focuses.length ? "Continue" : "Skip this step"}</button>{back("pillars")}</div>
      </>}

      {step === "starters" && <>
        <p className="onboarding-lede">Tick what you’d like to begin with. You can change targets and schedules later, or skip this.</p>
        <fieldset className="onboarding-choices"><legend>Habits <small className="onboarding-count" aria-live="polite">{pickedHabits.length + extraHabits.length} selected</small></legend>
          {focusHabits.map(title => <Choice key={`focus-${title}`} name="onboarding-habit" checked={!skippedFocusHabits.includes(title.toLowerCase())} onChange={() => setSkippedFocusHabits(list => toggle(list, title.toLowerCase()))} label={title} note={`From your focus · ${focusHabitRhythm(title)}`} />)}
          {starters.map(t => { const exists = hasHabitLike(existingTitles, t); return <Choice key={t.id} name="onboarding-habit" checked={exists || habitIds.includes(t.id)} disabled={exists} onChange={() => setHabitIds(list => toggle(list, t.id))} label={t.title} note={exists ? "Already in your Habits" : `${t.note} · ${HABIT_GROUP_LABEL[t.group]}`} />; })}
        </fieldset>
        {showGoal && <fieldset className="onboarding-goal"><legend>A first goal (optional)</legend>
          <div className="onboarding-choices onboarding-goal-types">
            {GOAL_TEMPLATES.map(t => <Choice key={t.category} type="radio" name="onboarding-goal" checked={draft.category === t.category} onChange={() => setDraft(d => ({...d, category: t.category}))} label={t.label} />)}
          </div>
          <fieldset className="onboarding-fields" disabled={!draft.category}><legend className="sr-only">Goal details</legend>
            <label className="field">Goal name<input data-goal-field="name" required maxLength={100} value={draft.name} aria-invalid={goalError?.field === 'name' || undefined} aria-describedby={goalError?.field === 'name' ? 'onboarding-goal-error' : undefined} onChange={e => { setDraft(d => ({...d, name: e.target.value})); if (goalError?.field === 'name') setGoalError(null); /* Session AL (NB-016): fixed fields clear their message */ }} placeholder={GOAL_TEMPLATES.find(t => t.category === draft.category)?.placeholder ?? "Name your goal"} autoComplete="off" /></label>
            <div className="onboarding-row">
              <label className="field">Target amount<input data-goal-field="target" required inputMode="decimal" value={draft.target} aria-invalid={goalError?.field === 'target' || undefined} aria-describedby={goalError?.field === 'target' ? 'onboarding-goal-error' : undefined} onChange={e => { setDraft(d => ({...d, target: e.target.value})); if (goalError?.field === 'target') setGoalError(null); }} placeholder="0.00" autoComplete="off" /></label>
              <fieldset className="onboarding-currency"><legend>Currency</legend>{(["USD", "EUR"] as const).map(c => <label key={c}><input type="radio" name="onboarding-currency" value={c} checked={draft.currency === c} onChange={() => setDraft(d => ({...d, currency: c}))} /><span>{c}</span></label>)}</fieldset>
            </div>
            <label className="field">Target date (optional)<input data-goal-field="date" type="date" min={localDate()} value={draft.date} aria-invalid={goalError?.field === 'date' || undefined} aria-describedby={goalError?.field === 'date' ? 'onboarding-goal-error' : undefined} onChange={e => { setDraft(d => ({...d, date: e.target.value})); if (goalError?.field === 'date') setGoalError(null); }} /></label>
          </fieldset>
          {goalError && <p id="onboarding-goal-error" className="field-error" role="alert">{goalError.text}</p>}
          <p className="fine">A plan, not a promise: nothing is invested or moved.</p>
          {draft.category && <button type="button" className="secondary onboarding-no-goal" onClick={() => { setDraft(d => ({...NO_GOAL, currency: d.currency})); setGoal(null); setGoalError(null); }}>No goal for now</button>}
        </fieldset>}
        {showHealth && <fieldset className="onboarding-targets"><legend>Health targets (optional)</legend>
          <div className="onboarding-choices" role="radiogroup" aria-label="Daily steps">
            <Choice type="radio" name="onboarding-steps" checked={steps === null} onChange={() => { touched.current.steps = true; setSteps(null); }} label="No step target" />
            {STEP_TARGETS.map(n => <Choice key={n} type="radio" name="onboarding-steps" checked={steps === n} onChange={() => { touched.current.steps = true; setSteps(n); }} label={`${n.toLocaleString("en")} steps a day`} />)}
          </div>
          <div className="onboarding-choices" role="radiogroup" aria-label="Daily water">
            <Choice type="radio" name="onboarding-water" checked={water === null} onChange={() => { touched.current.water = true; setWater(null); }} label="No water target" />
            {WATER_TARGETS_ML.map(ml => <Choice key={ml} type="radio" name="onboarding-water" checked={water === ml} onChange={() => { touched.current.water = true; setWater(ml); }} label={`${litres(ml)} of water a day`} />)}
          </div>
          <p className="fine">Common starting points, not advice. Calorie, weight and nutrient targets are yours to set on the Health page if you want them.</p>
        </fieldset>}
        {showSleep && <fieldset className="onboarding-targets"><legend>A sleep goal (optional)</legend>
          <div className="onboarding-choices" role="radiogroup" aria-label="Sleep goal">
            <Choice type="radio" name="onboarding-sleep" checked={sleepGoal === null} onChange={() => setSleepGoalChoice(null)} label="No sleep goal" />
            {SLEEP_GOALS.map(m => <Choice key={m} type="radio" name="onboarding-sleep" checked={sleepGoal === m} onChange={() => setSleepGoalChoice(m)} label={`${formatMinutes(m)} asleep`} />)}
          </div>
          <p className="fine">Your own aim for Health → Sleep, where you can add a bedtime window. Not advice.</p>
        </fieldset>}
        {error && <p role="alert">{error}</p>}
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => { if (checkGoal()) go("tour"); }}>Continue</button>{back("focuses")}</div>
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
          {/* Session AL (P-NB-14; NB-019): Back inside the tour, and the buttons stay put (the card keeps one height, onboarding.css). */}
          {tour > 0 && <button type="button" className="secondary" onClick={() => setTour(tour - 1)}>Back</button>}
          {tour < TOUR.length - 1 ? <button type="button" className="primary" onClick={() => setTour(tour + 1)}>Next</button> : <button type="button" className="primary" onClick={() => { setTour(null); go("install"); }}>Done</button>}
          <button type="button" className="secondary" onClick={() => { setTour(null); go("install"); }}>End the tour</button>
        </div>
      </>)}

      {step === "install" && <>
        {installed ? <p className="onboarding-lede">You’re already using the installed app. Keep opening ZIGoals from its icon.</p> : <>
          <p className="onboarding-lede">Opened from its icon, ZIGoals feels like an app and keeps its own copy of your data.</p>
          {install.available && <div className="onboarding-actions"><button type="button" className="primary" onClick={() => void install.install().then(outcome => { if (outcome === "accepted") setInstalled(true); })}>Install ZIGoals</button></div>}
          {/* Session AH (TO4, N-108): the iPhone steps only where they apply; elsewhere the browser's own words. */}
          {installContext === "apple-browser" ? <InstallGuide /> : <p>{installContext === null ? " " : "In Chrome or Edge on a computer, use Install in the address bar or the browser’s menu; on an Android phone, the menu’s Install app or Add to Home screen. On an iPhone, open ZIGoals in Safari, tap Share, then Add to Home Screen."}</p>}
        </>}
        <div className="onboarding-actions"><button type="button" className="primary" onClick={() => go("zigi")}>Continue</button>{back("tour")}</div>
      </>}

      {step === "zigi" && <>
        <div className="onboarding-zigi"><ZigiFigure state="idle" /><p><strong>I’m here when you want me.</strong> Tap my button, or press ⌘/Ctrl+Shift+Z, to ask about your own records.</p></div>
        {/* Session AL fourth pass (NB-006): an optional name, kept on this device only; empty is fine. */}
        <label className="field onboarding-name">What should ZIGi call you? (optional)<input value={name} maxLength={40} autoComplete="given-name" aria-describedby={`${id}-name-hint`} onChange={e => setName(e.target.value)} placeholder="Your first name, or nothing" /><small id={`${id}-name-hint`}>Kept on this device only, never synced or sent. Leave it empty and ZIGi simply says hello.</small></label>
        <ul className="onboarding-points">
          <li><strong>Your own AI, later.</strong> Connect the AI you already use in Settings → ZIGi · Your Personal AI Companion. Until you do, nothing is sent anywhere.</li>
          <li><strong>You stay in charge.</strong> I only suggest; anything I propose waits for your confirmation.</li>
          {/* Session AL (P-NB-13; NB-022): NOVA, in the sidebar from the start, named here so it is not a stranger. */}
          <li><strong>NOVA is my full-page view.</strong> NOVA in the sidebar shows your whole day on one screen and answers the same way I do: from your own records, and asking before it changes anything.</li>
          <li><strong>Out of the way when you like.</strong> Hide my button with the chevron below it, or in Settings → Your pages & buttons.</li>
        </ul>
        {/* Session AL (GAP-103, P-NB-C05): a look at the optional game layer before it is chosen. A preview only: setup writes
            nothing until Finish, and the layer stays off until it is switched on (Settings or the Journey page). */}
        <aside className="onboarding-game-preview" aria-labelledby={`${id}-game`}>
          <p className="eyebrow">Optional · off until you turn it on</p>
          <h3 id={`${id}-game`}>A game layer, if you like one</h3>
          <div className="onboarding-game-level" aria-hidden="true"><span className="onboarding-game-pill">Lv {GAME_PREVIEW.level}</span><span><strong>{GAME_PREVIEW.name}</strong><small>{GAME_PREVIEW.into} of {GAME_PREVIEW.span} XP to level {GAME_PREVIEW.level + 1}</small></span></div>
          <p>Every check-in and log you make earns XP, from your own records. Levels ({LEVEL_NAMES.slice(0, 4).join(', ')} and on), three small quests a day and badges. Switch it on later in Settings → Your pages &amp; buttons, or on the Journey page; streaks stay a plain habit feature either way.</p>
        </aside>
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
