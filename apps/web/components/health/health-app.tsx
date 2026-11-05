"use client";
import { removedItems, reinsertItems } from "../../lib/undo-removal";
import { announceHealthRemoval, measuresOfPaths } from "../../lib/health-events";
import { showUndo } from "../ui/undo-toast";
import { ProgressSlot } from "../progress/slot";
import { HealthTrends } from "../bottom-health-trends";
import { useHealthToday } from "./use-health-today";
import { INVISIBLE_NAME, visibleName } from "../../lib/visible-text";
import { foodIssue, validateValue, within } from "../../lib/limits/plausibility";
import { ExerciseCounters } from "./exercise-counters";
import { NebulaFlow } from "../nebula-flow";
import {PillarHero} from "../pillar-hero";
import {OrbitArt} from "../header-art/orbit-art";
import {HealthGlyph} from "../header-art/glyphs/health";
import { fastingHistory } from "../../lib/fasting/engine";
import "./health-aa.css";
import { SwipeRow } from "../swipe/swipe-row";
// Session AA-Local Part 3: the planner, the insights, the recipe import and the measurement charts load when their view opens.
const PlannerView = lazy(() => import("./planner-view").then((m) => ({ default: m.PlannerView })));
const InsightsView = lazy(() => import("./insights-view").then((m) => ({ default: m.InsightsView })));
const RecipeImport = lazy(() => import("./recipe-import").then((m) => ({ default: m.RecipeImport })));
const MeasurementsAa = lazy(() => import("./measurements-aa").then((m) => ({ default: m.MeasurementsAa })));
// Gate A (weight budgets never rise): the AA cards load as their own chunks after the page's first paint.
const BarcodeFoodLookup = lazy(() => import("./barcode-food-lookup").then((m) => ({ default: m.BarcodeFoodLookup }))); // Gate A (B41): the barcode lookup loads when its fold opens
// Session AB-Cloud Part 4 (ADR-023 C20): vitamins beside the label nutrients, each loaded with the form or recipe that shows it.
const VitaminFields = lazy(() => import("./vitamin-fields").then((m) => ({ default: m.VitaminFields })));
// Session AK (item 3): "Read the label from a photo" in New food, loaded when its fold opens.
const LabelScan = lazy(() => import("./label-scan"));
// Session AK (item 15): the food quality letters and "A and B foods first" in the library, loaded with the library (off by default).
const FoodQualityLibrary = lazy(() => import("./nutri-score").then((m) => ({ default: m.FoodQualityLibrary })));
const VitaminRecipeLine = lazy(() => import("./vitamin-recipe-line").then((m) => ({ default: m.VitaminRecipeLine })));
// Session AK (final run, health-aa N1, 1 in 11): the Weight view's three cards are one lazy part. As three lazy parts in one
// Suspense boundary each suspended in turn, and each turn waited for React's low-priority retry (or sibling pre-warm),
// which a busy page puts off: the chunks were asked for about 3 s apart and the cards showed after 5 s, nothing in their
// place. Now one import fetches the three chunks at once and one retry shows them together.
const WeightCards = lazy(() => Promise.all([import("./weight-trend"), import("./energy-card"), import("./coach-card")]).then(([{ WeightTrendCard }, { EnergyCard }, { CoachCard }]) => ({
  default: function WeightCards({ data, date, today, perform }: { data: HealthData; date: string; today: string; perform: Perform }) {
    const unit = dailyData(data).preferences.weightUnit;
    return <><WeightTrendCard data={data} today={date} unit={unit} /><EnergyCard data={data} today={today} unit={unit} perform={perform} /><CoachCard data={data} today={today} perform={perform} /></>;
  },
})));
const HealthHighlights = lazy(() => import("./health-highlights"));
// Targets' macro mode and micronutrient panels: one lazy part, as the Weight cards above.
const TargetPanels = lazy(() => Promise.all([import("./macro-mode-panel"), import("./micro-panel")]).then(([{ MacroModePanel }, { MicroPanel }]) => ({
  default: function TargetPanels({ data, date }: { data: HealthData; date: string }) { return <><MacroModePanel data={data} date={date} /><MicroPanel data={data} date={date} /></>; },
})));
const MaintenanceEstimator = lazy(() => import("./maintenance-estimator").then((m) => ({ default: m.MaintenanceEstimator }))); // Session AL fourth pass: loaded when its fold opens
const CalorieWeekCard = lazy(() => import("./calorie-week-card").then((m) => ({ default: m.CalorieWeekCard }))); // Session AK (P2 #7): optional, loaded when its fold opens
const SupplementsCard = lazy(() => import("./supplements")); // Session AK (F5b): loaded when its fold opens
const MealPhotoPanel = lazy(() => import("./meal-photo-panel").then((m) => ({ default: m.MealPhotoPanel }))); // Session AK (4.2): loaded when its fold opens
const FastingTimeline = lazy(() => import("./fasting-timeline").then((m) => ({ default: m.FastingTimeline })));
const YourNumbers = lazy(() => import("../health-numbers/your-numbers")); // Session AK (BUILD list 2 #4): loaded when its fold opens
const CycleEntry = lazy(() => import("../cycle/cycle-entry")); // Session AK (BUILD list 2 #16): nothing until turned on in Settings; the log loads when its fold opens
import { LayoutLockButton, LayoutPage, LayoutRegion, type LayoutAttrs } from "../layout-edit";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, lazy, useState, useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { Checked, FeedbackSlot, HealthFieldProvider, useHealthFieldChecks } from "./health-field";
import type { HealthCheck } from "../../lib/health-field-rules";
import {
  HEALTH_MEALS,foodSnapshot,recipeSnapshot,formatServingMeasure,formatNutrient,nutritionSummaryText, dailyHealthSummary, editDiaryEntry, formatHealthGrams,
  logHealthItem, newHealthId, parseHealthNumber, quickLogFood, recipeNutrition,
  removeHealthItem, saveActivity, saveFood, saveRecipe, saveWeight, scaleNutrition,
  searchFoods, setHealthTargets, weightTrend, healthSchema, type HealthData, type HealthDiaryEntry,
  type HealthFood, type HealthRecipe, type HealthTargets, type Nutrition, type RecipeDraft,
} from "../../lib/health";
import { GlassBar, GlassRing } from "../progress/glass-progress";
import { useHealth } from "./use-health";
import { useHabits } from "../habits/use-habits";
import { useAutoCheckIns } from "../habits/use-auto-checkins";
import { useFasting } from "./use-fasting";
import { FastingTimer } from "./fasting-timer";
import { useImportUndo } from "../import/use-import-undo";
import { ImportBanner } from "../import/import-banner"; // CI13: not the CSV steps
import { NutritionImportPanel } from "../import/nutrition-import";
import { MealNamesEditor, useHealthExtras } from "./meal-names";
import { MoodChip } from "./mood-chip";
import { SERVING_UNITS, conversionNote, servingUnit, toBaseAmount } from "../../lib/health-serving-units";
import { ACTIVITY_TYPES, activityKcalEstimate } from "../../lib/health-activity-types";
import { mealHeading, mealKcalTarget, mealLabel, mealTime } from "../../lib/health-extras";
import { undoNutritionImport } from "../../lib/import/nutrition";
import type { ImportRecord } from "../../lib/import/undo-schema";
import {AdditionalNutrition} from "./additional-nutrition";
import {additionalNutrients} from "../../lib/health";
import {normalizeDecimalInput} from "../../lib/decimal-input";
// CI13 (weights): the Measurements view's own card (and its chart) loads with that view, as MeasurementsAa does.
const BodyMeasurements = lazy(() => import("./body-measurements").then((m) => ({ default: m.BodyMeasurements })));
import { NutritionDashboard } from "./nutrition-dashboard";
import { HealthQuickPicks, WaterJournal, MealsAndPlanning, HealthJournalSettings } from "./daily-tools";
import { MealQuick, RepeatDay } from "./quick-log";
import { dailyData, servingsFromMeasure, waterOn } from "../../lib/health-daily";
// CI13 (weights): the weight chart (Weight view only) loads with that view, as its cards do.
const EvidenceChart = lazy(() => import("../platform/evidence-chart").then((m) => ({ default: m.EvidenceChart })));
import { weightChangeText, weightChartValue, weightText, type WaterUnit, type WeightUnit } from "../../lib/health-units";
import { healthWeek, loggedDaysOfWeek } from "../../lib/bottom-health-week"; // CI13: not Wealth's composition
import {PinToToday} from "../pin-to-today";
import { PHONE_QUERY, usePhoneActive } from "../phone/use-phone-layout";
import { PhoneFormSheet } from "../phone/phone-form-sheet";
import { PhoneFold } from "../phone/phone-fold";
import { formatDate, formatNumber, formatTime } from "../../lib/visual-format";
// Session AK (WIRING_AUDIT_3, G3): Health's own empty lists carry the pillar art like its other empty states.
import {ArtNote} from '../illustrations/art-note';
import { saveMeasurement } from "../../lib/body-measurements";
import { plural } from "../../lib/plural";
import { updateRefusalMessage } from "../../lib/storage-error-copy";
import { SleepCard } from "./sleep/sleep-card";
import { healthGroupIn } from "../../lib/vault/w-homes";
import { MeditationCard } from "./meditation/meditation-card";
import { WorkoutsCard } from "./workouts/workouts-card";
import { useDeviceRecord } from "../ai/use-device-record";
import { MEAL_ESTIMATES, estimateLine } from "../../lib/meal-estimates/schema";
import { MEDITATION_RUN } from "../../lib/meditation/schema";
import { MACRO_MODE, netCarbs, splitGrams } from "../../lib/health-aa/macro-mode";
import { zigiSignals } from "../zigi/bus";
import { LoadBoundary } from "../load-boundary";
import {Skeleton} from "../ui/skeleton";
import {SlowReload} from "./slow-reload";
// CI13 (weights): the Weight view's file import and the Insights view's week digest load with their views.
const WeightCsvImport = lazy(() => import("./weight-csv-import").then((m) => ({ default: m.WeightCsvImport })));
const WeekDigestCard = lazy(() => import("./week-digest-card").then((m) => ({ default: m.WeekDigestCard })));
import {formatMacroGrams, servingsWarning, weightAsEntered, weightJumpWarning} from "../../lib/health-plausible";
import {useScrollEdges} from '../ui/use-scroll-edges';
import { StarToggle } from '../checklist/star-toggle';
import {plainErrorMessage} from '../../lib/plain-error';
import { isShowcase } from "../../lib/showcase-storage";
import {diaryDayIssue, journalDay, JOURNAL_MIN_DAY} from "../../lib/health-day";
import {HealthDateBar, HealthDayProvider, LoggingFor} from "./health-day";

/** Session W Part 4: Sleep's full view, a view of this page (/app/health?view=sleep), loaded when opened. */
const SleepView = lazy(() => import("./sleep/sleep-view"));
const MeditationView = lazy(() => import("./meditation/meditation-view"));
/** Session AH Part 6 (DE8): the workout log, a view of this page (/app/health?view=workouts), loaded when opened. */
const WorkoutsView = lazy(() => import("./workouts/workouts-view"));
const DevicesView = lazy(() => import("./devices/devices-view"));
/** Session W Part 7: an activity line an import or a device link brought in (its id names the source). */
const SOURCE_NAMES: Record<string, string> = {"apple-health": "Apple Health", fitbit: "Fitbit / Google Health", samsung: "Samsung Health", oura: "Oura", garmin: "Garmin", "oura-link": "Oura (linked)", "withings-link": "Withings (linked)", "polar-link": "Polar (linked)", "strava-link": "Strava (linked)"};
function importedFrom(id: string): string | null { const m = /^health_imp-([a-z]+(?:-[a-z]+)?)-[0-9a-f]{16}$/.exec(id); return m ? SOURCE_NAMES[m[1]!] ?? null : null; }

type Update = ReturnType<typeof useHealth>["update"];
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const views = ["Diary", "Foods & recipes", "Meals & planning", "Planner", "Weight", "Measurements", "Activity", "Targets", "Insights", "Import", "Journal settings"] as const;
/** Session AA-Local Part 5: a ZIGi open-page card names a tab by hash (#planner, #insights, #import); the page reads it once. */
// Session AH (C9, BUG-080): every view answers to a link, as ?tab=<name> or #<name>; the full views (sleep, meditation,
// workouts, devices) answer to ?tab= and # too.
// Session AK RB (RELEASE_REVIEW_2 R2-8): the weight trend, energy and coach cards live in the Weight view, and the 30-day
// nutrition patterns in Insights (one place each); the highlight tiles' anchors and #nutrition-history open those views.
const HASH_VIEWS: Record<string, View> = {diary: "Diary", foods: "Foods & recipes", recipes: "Foods & recipes", planning: "Meals & planning", meals: "Meals & planning", planner: "Planner", weight: "Weight", measurements: "Measurements", activity: "Activity", targets: "Targets", insights: "Insights", import: "Import", settings: "Journal settings", "health-weight-trend": "Weight", "health-energy": "Weight", "health-coach": "Weight", "nutrition-history": "Insights", "diary-breakfast": "Diary", "diary-lunch": "Diary", "diary-dinner": "Diary", "diary-snacks": "Diary"};
/** Scrolls to an element once its view has rendered it (the cards load as their own chunks), for about two seconds. */
function revealWhenShown(id: string, focusField = false, tries = 120) {
  const el = document.getElementById(id);
  if (el) { el.scrollIntoView({ block: "start", behavior: "instant" }); if (focusField) el.querySelector<HTMLElement>("input, select")?.focus({ preventScroll: true }); return; }
  if (tries > 0) requestAnimationFrame(() => revealWhenShown(id, focusField, tries - 1));
}
const FULL_VIEWS = new Set(["sleep", "meditation", "workouts", "devices"]);
/** The address name of each view (?view=<name>), read back through HASH_VIEWS. */
const VIEW_KEYS: Record<View, string> = {"Diary": "diary", "Foods & recipes": "foods", "Meals & planning": "planning", "Planner": "planner", "Weight": "weight", "Measurements": "measurements", "Activity": "activity", "Targets": "targets", "Insights": "insights", "Import": "import", "Journal settings": "settings"};
type View = typeof views[number];
const foodFields = [
  ["kcal", "Calories (kcal)", 1, 1_000_000], ["proteinMg", "Protein (g)", 1000, 1_000_000_000],
  ["carbsMg", "Carbs (g)", 1000, 1_000_000_000], ["fatMg", "Fat (g)", 1000, 1_000_000_000],
] as const;

/**
 * A Health amount, read by parseHealthNumber when its form is saved (which enforces the range and decimals). Plain text
 * with a decimal keypad, not type="number": an English Chrome drops a typed decimal comma from a number field, so
 * "72,5" reached the app as 725 (QA-01).
 */
function NumberField({ label, name, value, onChange, step = "1", required = true, check, unit, id: given }: {
  label: string; name?: string; value?: string; onChange?: (value: string) => void; step?: string; required?: boolean; check?: HealthCheck; unit?: string; id?: string;
}) {
  // Session AL fourth pass (AL-FIELD-ERROR-003): every amount has an id and its sentence right under it (health-field.tsx).
  const auto = useId(), id = given ?? `hf${auto.replace(/[^a-zA-Z0-9]/g, "")}`;
  return <Checked of={id}><label className="field"><span>{label}</span><input id={id} type="text" inputMode={step === "1" ? "numeric" : "decimal"} autoComplete="off" name={name} value={value} onChange={onChange ? e => onChange(e.target.value) : undefined} required={required} data-check={check} data-unit={unit} /></label></Checked>;
}
function MealField({ name = "meal", value, onChange }: { name?: string; value?: string; onChange?: (value: HealthDiaryEntry["meal"]) => void }) {
  // Session AL third pass (GAP-045): the option's value stays the stored meal; its words are your name for it.
  const { extras } = useHealthExtras();
  return <label className="field"><span>Meal</span><select aria-label="Meal" name={name} value={value} onChange={onChange ? e => onChange(e.target.value as HealthDiaryEntry["meal"]) : undefined}>{HEALTH_MEALS.map(meal => <option key={meal} value={meal}>{mealHeading(extras, meal)}</option>)}</select></label>;
}
function NutrientLine({ nutrients }: { nutrients: Nutrition }) {
  return <span className="health-nutrient-line">{formatNutrient(nutrients.kcal)} kcal <span>· P {formatMacroGrams(nutrients.proteinMg)} g · C {formatMacroGrams(nutrients.carbsMg)} g · F {formatMacroGrams(nutrients.fatMg)} g</span></span>;
}
function FormBox({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  // Session AL fourth pass: the page checks each field first (data-health-check), in the app's words, not the browser's
  // bubble (noValidate), and the page's feedback line shows at the end of this form after its submit.
  return <form aria-label={title} className="health-form" onSubmit={onSubmit} noValidate data-health-check="">{children}<FeedbackSlot title={title} /></form>;
}
const formString = (form: FormData, key: string) => String(form.get(key) ?? "");
/** How many meal groups (Breakfast, Lunch…) have entries on a date. */
const groupsOn = (data: HealthData, date: string) => new Set(data.diary.filter(entry => entry.date === date).map(entry => entry.meal)).size;
const formNumber = (form: FormData, key: string, scale: 1 | 1000, min: number, max: number) => parseHealthNumber(formString(form, key), scale, min, max);
/** Session AL (P-MO-44, MO-104): a name of only spaces is refused at its field like an invisible one (it reached the store
 *  and came back as "Could not save… available browser storage"). */
const healthName = (value: string) => { if (!value.trim()) throw new Error(INVISIBLE_NAME); return visibleName(value); };
/** Session AL (P-MO-81, MO-040): a movement field starts blank (a "0" was typed after); blank counts as none. */
const blankZero = (form: FormData, key: string, max: number) => formString(form, key).trim() ? formNumber(form, key, 1, 0, max) : 0;

export function HealthApp() {
  const store = useHealth();
  // H7: linked habits tick themselves off from this journal while it is open.
  const habits = useHabits();
  useAutoCheckIns({ habits, health: store });
  const params = useSearchParams();
  // Session W Part 8: a linked service sends the person back to /app/health with its code (or refusal) and the state;
  // the Devices view reads and removes them.
  const tab = params.get("tab")?.toLowerCase() ?? null;
  const [hashView, setHashView] = useState<string | null>(null);
  useEffect(() => { const read = () => { const h = window.location.hash.slice(1).toLowerCase(); setHashView(FULL_VIEWS.has(h) ? h : null); }; read(); window.addEventListener("hashchange", read); return () => window.removeEventListener("hashchange", read); }, []);
  const view = params.get("view") ?? (tab && FULL_VIEWS.has(tab) ? tab : null) ?? hashView ?? (params.has("state") && (params.has("code") || params.has("error")) ? "devices" : null);
  if (!store.loaded) return <section className="panel route-loading-reserve"><h1>Health</h1><p>Loading your private health journal…</p><Skeleton label="Loading your Health journal" lines={3}/><SlowReload/></section>;
  if (store.error) return <section className="panel"><h1>Health</h1><p role="alert">{store.error}</p><div className="actions"><button className="secondary" onClick={store.refresh}>Retry reading data</button><Link className="secondary" href="/app/settings">Open backup settings</Link></div></section>;
  if (view === "sleep") return <LoadBoundary title="Sleep" label="Sleep"><Suspense fallback={<section className="panel"><h1>Sleep</h1><Skeleton label="Opening Sleep…" block/></section>}><SleepView /></Suspense></LoadBoundary>;
  if (view === "meditation") return <LoadBoundary title="Meditation" label="Meditation"><Suspense fallback={<section className="panel"><h1>Meditation</h1><Skeleton label="Opening Meditation…" block/></section>}><MeditationView /></Suspense></LoadBoundary>;
  if (view === "workouts") return <LoadBoundary title="Workouts" label="Workouts"><Suspense fallback={<section className="panel"><h1>Workouts</h1><Skeleton label="Opening Workouts…" block/></section>}><WorkoutsView /></Suspense></LoadBoundary>;
  if (view === "devices") return <LoadBoundary title="Devices" label="Devices"><Suspense fallback={<section className="panel"><h1>Devices</h1><Skeleton label="Opening Devices…" block/></section>}><DevicesView /></Suspense></LoadBoundary>;
  return <HealthWorkspace data={store.data} update={store.update} />;
}

function HealthWorkspace({ data, update }: { data: HealthData; update: Update }) {
  const startParams = useSearchParams(), tabParam = startParams.get("tab")?.toLowerCase() ?? "", viewParam = startParams.get("view")?.toLowerCase() ?? "";
  // Session AL (P-MO-21; MO-018, MO-083, MO-096, BUG-080): every view answers to ?view=<name> too (?view=weight opened the
  // Diary), and the view chosen is written back to the address, so a reload or a shared link opens the same view.
  const [view, setViewState] = useState<View>(() => HASH_VIEWS[tabParam] ?? HASH_VIEWS[viewParam] ?? "Diary");
  const setView = (next: View) => {
    setViewState(next); fields.clear();
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab"); url.searchParams.set("view", VIEW_KEYS[next]);
      if (HASH_VIEWS[url.hash.slice(1).toLowerCase()]) url.hash = "";
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    } catch { /* the view still changes; only the address is not updated */ }
  };
  useEffect(() => { const follow = () => { const hash = window.location.hash.slice(1).toLowerCase(), v = HASH_VIEWS[hash]; if (!v) return; setViewState(v); if (hash.includes("-")) revealWhenShown(hash); }; follow(); window.addEventListener("hashchange", follow); return () => window.removeEventListener("hashchange", follow); }, []);
  const router = useRouter(), phone = usePhoneActive();
  // Session AL (P-MO-27, MO-080): the view strip scrolls sideways on a phone; its edges say there is more ("Imp…").
  const viewEdges = useScrollEdges<HTMLElement>();
  // HE6: the fasting timer, this device's own record.
  const fasting = useFasting();
  // Session W Part 4: on a phone the Sleep card folds like the fasting timer, and stays open while a night runs.
  const sleepRunning = (healthGroupIn(data, "sleep")?.nights ?? []).some(n => n.end === null);
  // Session W Part 5: the Meditation card folds the same way, open while a session runs on this device.
  const meditationRunning = !!useDeviceRecord(MEDITATION_RUN).data.run;
  // I1: meals from a nutrition CSV (phone: a sheet; desktop: inside the Diary details), with this device's undo ledger.
  const [importingCsv, setImportingCsv] = useState(false), [importFold, setImportFold] = useState(false), imports = useImportUndo();
  // Session AK: a barcode kept while offline (or from ZIGi's scan card) arrives as ?barcode=…; the scanner opens with it.
  const [barcodeOpen, setBarcodeOpen] = useState(() => typeof window !== 'undefined' && /^\d{8,14}$/.test(new URLSearchParams(window.location.search).get('barcode') ?? ''));
  const undoRecord = async (record: ImportRecord) => { await update(d => undoNutritionImport(d, record).data); imports.forget(record.id); };
  // On a phone, Log a meal is a bottom sheet (Session I, Part 9); a Quick Add for a meal opens it.
  const [logging, setLogging] = useState(false);
  const searchParams=useSearchParams();
  const addIntent = searchParams.get("add") === "entry";
  const [handledIntent, setHandledIntent] = useState(false);
  // A same-page Quick Add is a new intent, not a new Health store.
  if (addIntent !== handledIntent) {
    setHandledIntent(addIntent);
    if (addIntent) setViewState("Diary");
  }
  // Session W Part 7: Settings → Switch to ZIGoals sends MyFitnessPal and Cronometer files here (?import=meals).
  const importIntent = searchParams.get("import") === "meals";
  const [handledImport, setHandledImport] = useState(false);
  if (importIntent !== handledImport) {
    setHandledImport(importIntent);
    if (importIntent) { setViewState("Diary"); setImportingCsv(true); }
  }
  useEffect(() => { if (importIntent) document.getElementById("import-meals")?.scrollIntoView({ block: "start", behavior: "instant" }); }, [importIntent]);
  // Session AL (NB-254): "Log a weight →" (Today's coach, a weight goal) sends ?add=weight: the Weight view opens with its
  // field focused; the intent then leaves the address like ?add=entry.
  const weightIntent = searchParams.get("add") === "weight";
  const [handledWeight, setHandledWeight] = useState(false);
  if (weightIntent !== handledWeight) { setHandledWeight(weightIntent); if (weightIntent) setViewState("Weight"); }
  useEffect(() => {
    if (!weightIntent) return;
    revealWhenShown("health-weight-entry", true);
    const url = new URL(window.location.href); url.searchParams.delete("add"); url.searchParams.set("view", "weight");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [weightIntent, router]);
  useEffect(() => {
    if (!addIntent) return;
    const entry = document.getElementById("health-entry-action");
    // The form itself is brought to the middle: the quick picks above it can make the section taller than the screen.
    (entry?.querySelector<HTMLElement>('form[aria-label="Log a meal"]') ?? entry)?.scrollIntoView({ block: "center", behavior: "instant" });
    const entryControl = entry?.querySelector<HTMLElement>('form[aria-label="Log a meal"] select')
      ?? entry?.querySelector<HTMLElement>("select, input, button");
    entryControl?.focus({ preventScroll: true });
    if (window.matchMedia(PHONE_QUERY).matches) setLogging(true);
    // Only the Quick Add intent leaves the address; any other part of it (a date, a view) stays.
    const url = new URL(window.location.href); url.searchParams.delete("add");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [addIntent, router]);
  const today = useHealthToday(dailyData(data).preferences.timezone);
  // Session AH Part 17: a `?date=` deep link opens that day; a future or malformed one opens today.
  const [date, setDate] = useState(() => journalDay(searchParams.get("date"), today));
  // Forms are keyed by the reader's own date choices, not by the date itself: when the open page follows midnight
  // (QA-16), a half-typed entry stays and is logged on the new day; choosing another date still starts afresh.
  const [dateChoice, setDateChoice] = useState(0);
  const chooseDate = (next: string) => { setDate(next); setDateChoice(n => n + 1); };
  const [seenToday, setSeenToday] = useState(today);
  if (today !== seenToday) {
    setSeenToday(today);
    if (date === seenToday) setDate(today);
  }
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fields = useHealthFieldChecks();
  const [error, setError] = useState("");
  const perform: Perform = async (updater, success, after) => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setErrorForm(null); setMessage(""); unmark();
    // Session AH Part 3 (DS5): a save that only removed items (water, a diary row, a food, a weight…) offers a labelled
    // Undo in the app's one toast, which puts exactly those items back into the latest record (lib/undo-removal.ts).
    let before: HealthData | undefined, saved: HealthData | undefined;
    try { await update(latest => { const next = updater(latest); before = latest; saved = next; return next; }); const removed = before === undefined ? null : removedItems(before, saved); if (removed) announceHealthRemoval({measures: measuresOfPaths(removed.map(r => r.path)), dates: [...new Set(removed.map(r => (r.item as {date?: unknown}).date).filter((d): d is string => typeof d === 'string'))]}); if (removed) showUndo({message: success, undone: "Put back.", restore: () => update(latest => reinsertItems(latest, removed))}); else setMessage(success); after?.(); }
    // Session AL fourth pass (D-077, MO-001): a limit the store refused is said in its own words (99,999 kcal read as the
    // "available browser storage" text); only a real storage refusal keeps that text.
    catch (error) { let limit: unknown = error; for (let i = 0; limit && i < 8 && (limit as Error).name !== "LimitError"; i++) limit = (limit as { cause?: unknown }).cause; setErrorForm(lastForm.current?.isConnected ? lastForm.current : null); setError(limit instanceof Error && limit.name === "LimitError" ? limit.message : updateRefusalMessage(error, "Could not save this change. Check your entries and available browser storage, then try again.")); }
    finally { saving.current = false; setBusy(false); }
  };
  // Session Y Part 9 (persona row 19): the form a refusal is about marks the fields it can tell apart (a number that does
  // not read, a required one left empty, a name with nothing visible) with aria-invalid and the error's id, and the first
  // takes the focus. The forms keep their own parsing; this reads only what the person typed.
  // A number reads when it is plain digits with one optional decimal point or comma, and the comma is not the ambiguous
  // "1,234" the Health forms refuse (normalizeDecimalInput).
  const readsAsNumber = (text: string) => { if (!/^\s*\d+(?:[.,]\d+)?\s*$/.test(text)) return false; try { normalizeDecimalInput(text); return true; } catch { return false; } };
  const errorId = "health-page-error", lastForm = useRef<HTMLFormElement | null>(null), marked = useRef<HTMLElement[]>([]);
  const unmark = () => { for (const el of marked.current) { el.removeAttribute("aria-invalid"); const rest = (el.getAttribute("aria-describedby") ?? "").split(" ").filter(id => id && id !== errorId).join(" "); if (rest) el.setAttribute("aria-describedby", rest); else el.removeAttribute("aria-describedby"); } marked.current = []; };
  const mark = (nameOnly: boolean) => {
    unmark(); const form = lastForm.current; if (!form?.isConnected) return 0;
    const fields = [...form.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not([disabled])")].filter(input => nameOnly
      ? !input.inputMode && input.type === "text" && input.value !== "" && !/[\p{L}\p{N}\p{P}\p{S}]/u.test(input.value)
      : (input.inputMode === "numeric" || input.inputMode === "decimal") && ((input.required && !input.value.trim()) || (!!input.value.trim() && !readsAsNumber(input.value))));
    for (const el of fields) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", [el.getAttribute("aria-describedby"), errorId].filter(Boolean).join(" ")); }
    marked.current = fields; fields[0]?.focus(); return fields.length;
  };
  // Session AL (P-MO-42; MO-001, MO-020, MO-036, BUG-009, BUG-020, BUG-084, N-MO-31): the message names the marked fields
  // and says what each takes, instead of "grams, kilograms and servings" for any form, and it is shown at the end of the
  // form that was submitted (beside its button), not ~1,500 px away under the tabs.
  const fieldNames = () => marked.current.map(el => (el.closest("label")?.querySelector("span")?.textContent ?? el.getAttribute("aria-label") ?? "").trim()).filter(Boolean);
  const [errorForm, setErrorForm] = useState<HTMLFormElement | null>(null);
  // A name with nothing visible gets its own message (QA-32); every other refusal keeps the fields message.
  const invalid = (cause?: unknown) => { setMessage(""); const name = cause instanceof Error && cause.message === INVISIBLE_NAME, count = mark(name); /* Session AH (C2, C3): the reason itself when the app wrote one (a limit, a range with its unit) */ const said = cause instanceof Error && (cause.name === "LimitError" || /^Enter |^Choose /.test(cause.message)) ? plainErrorMessage(cause, "") : ""; const names = fieldNames(); setErrorForm(lastForm.current?.isConnected ? lastForm.current : null); setError(name ? cause.message : said ? said : count ? `Check the highlighted fields: ${names.length ? `${names.join(", ")} ${names.length === 1 ? "needs" : "need"} a number (digits, with one decimal point or comma), not below zero.` : "each needs a number (digits, with one decimal point or comma), not below zero."}` : "Check the numbers: each needs a number (digits, with one decimal point or comma), within the range shown beside it."); };
  const summary = dailyHealthSummary(data, date);
  // Session AL fourth pass (MO-028): the hero's one primary button is the log still missing for the day (food first, then
  // water, then a weight); the order of the three stays the same (MO-084).
  const heroNext: "food" | "water" | "weight" = !summary.entries ? "food" : !waterOn(data, date).entries ? "water" : !data.weights.some(w => w.date === date) ? "weight" : "food";
  // Session AH Part 17 (owner addition): the date bar; on a past day every card logs to that day, the future cannot be chosen.
  const dateControl = <div className="health-date-block"><HealthDateBar date={date} today={today} onChoose={next => chooseDate(journalDay(next, today))}/><LoggingFor date={date} today={today}/></div>;
  const feedbackLine = <p className="health-feedback" role="status" aria-live="polite">{busy ? "Saving to this browser…" : message}</p>;
  return <HealthFieldProvider value={fields} feedback={feedbackLine}><HealthDayProvider value={{date, today}}><LayoutPage page="health"><div className="health-page" onSubmitCapture={event => { lastForm.current = event.target instanceof HTMLFormElement ? event.target : null; if (lastForm.current) { setMessage(""); setError(""); setErrorForm(null); unmark(); } /* Session AL fourth pass: no stale "saved" line beside a refusal (MO-030) */ fields.onSubmit(event); }} onInput={/* Fix-up (MO-036): bubble, not capture. A state change in the capture phase re-rendered before the field's own onChange ran, so a controlled field (Water amount) was put back to its refused value and could no longer be changed. */fields.onInput} onClickCapture={event => { fields.onClick(event); const b = event.target instanceof Element ? event.target.closest("button") : null; if (b && b.type !== "submit") lastForm.current = null; }} onKeyDown={event => {
      // Session AL (P-MO-33, MO-154): Escape in an inline Edit form cancels it, as its own Cancel button does.
      if (event.key !== "Escape" || event.defaultPrevented || !(event.target instanceof HTMLElement)) return;
      const cancel = [...(event.target.closest("form")?.querySelectorAll<HTMLButtonElement>("button[type=button]") ?? [])].find(b => /^Cancel\b/.test(b.textContent?.trim() ?? ""));
      if (cancel) { event.preventDefault(); cancel.click(); }
    }}>
    {/* Session AL (P-MO-29, MO-154): a keyboard way past the hero, the counters and the summary to the views. */}
    <a className="skip" href="#health-views">Skip to Health views</a>
    {/* Session AB-Design (owner request 21): the shared header pattern — eyebrow, title, slogan, then the page's actions in the same style as Goals, Habits and Wealth; the old care card is this header. */}
    <PillarHero pillar="health" className="health-heading" titleId="health-title" art={<OrbitArt glyph={HealthGlyph} tone="health" spin={14}/>} eyebrow="Your everyday wellbeing" title="A little care, every day." lede="Your food, water, movement and progress. Your private journal." about="health" buttons={<>{/* Session AK RB (RELEASE_REVIEW_2 R2-19): "Log weight" takes the settings link's place among the logging buttons; privacy and backups stay in the text row beside Ask ZIGi ("Back up private data ↗"). */}<button type="button" className={heroNext === "weight" ? "primary" : "secondary"} onClick={() => { setView("Weight"); revealWhenShown("health-weight-entry", true); }}>Log weight</button><button type="button" className={heroNext === "water" ? "primary" : "secondary"} onClick={() => { setView("Diary"); requestAnimationFrame(() => document.getElementById("water")?.scrollIntoView({ block: "start", behavior: "instant" })); }}>Log water</button><button type="button" className={heroNext === "food" ? "primary" : "secondary"} onClick={() => { setView("Diary"); requestAnimationFrame(() => document.getElementById("health-entry-action")?.scrollIntoView({ block: "start", behavior: "instant" })); }}>Log food</button></>}/><LayoutLockButton/>
    {!phone && <ExerciseCounters data={data} update={update} date={date} />}
    {/* On a phone the title comes first, then the journal date it drives, then the quick counters (desktop keeps
        the counters at the top, Part 18.6, and the date beside the views). */}
    {phone && <div className="health-date-strip">{dateControl}</div>}
    {phone && <ExerciseCounters data={data} update={update} date={date} />}
    {/* Phase 2, Part 5 (owner request 33): the highlight tiles — the figures of the trend, energy and coach cards below. */}
    <LoadBoundary quiet><Suspense fallback={null}><HealthHighlights data={data} today={date} unit={dailyData(data).preferences.weightUnit} /></Suspense></LoadBoundary>
    <LayoutRegion region="body" items={[
    {id: "health:summary", label: "Today’s nourishment", node: <HealthSummary data={data} date={date} today={today} compact={view !== "Diary"} onDiary={() => setView("Diary")} onTargets={() => setView("Targets")} />},
    // Session AK RB (R2-8): "Nutrition patterns" moved into the Insights view ("Your day, meal by meal" repeated the Diary's meals).
    {id: "health:journal", label: "Your Health journal", node: <div className="health-journal-block">
    <div className="health-toolbar"><nav className="health-views" id="health-views" tabIndex={-1} aria-label="Health views" ref={viewEdges}>{views.map(tab => <button type="button" key={tab} aria-pressed={view === tab} onClick={() => { setView(tab); setError(""); setMessage(""); }}>{tab}</button>)}</nav>
      {!phone && dateControl}
    </div>
    {!fields.atForm && feedbackLine}{error && !(phone && logging) && (errorForm?.isConnected ? createPortal(<p className="health-error field-error" role="alert" id={errorId}>{error}</p>, errorForm) : <p className="health-error" role="alert" id={errorId}>{error}</p>)}
    {/* Session AH (HE9; D-010, L-037, B-121, M-141): the import strip on the Diary and Import views only, never in the
        Showcase (its sample import is not the person's), with its own "Undo import" beside any toast's Undo. */}
    {(view === "Diary" || view === "Import") && !isShowcase() && <ImportBanner imports={imports} kind="nutrition" onUndo={undoRecord} />}

    {/* Session AL (P-MO-22, P-MO-33; MO-041, MO-154): a save no longer disables the whole view (the focus fell to the page
        and every field greyed out for seconds); a second submit while one saves is still ignored (perform's guard). */}
    <fieldset className="health-content" aria-busy={busy || undefined}>
      {view === "Diary" && <><DiaryView data={data} date={date} today={today} choice={dateChoice} perform={perform} invalid={invalid} onLibrary={() => setView("Foods & recipes")} phone={phone} error={error} logging={logging} setLogging={setLogging} />{/* Session AL (P-MO-40; MO-012, MO-156): the meal photo is a way to log a meal, so it sits in the Diary under "Log a meal", with a named header (it was a bare "A photo of a meal" row above the food library). */}<LazyFold summary="Estimate a meal from a photo">{() => <MealPhotoPanel data={data} />}</LazyFold><details open={barcodeOpen || undefined} onToggle={(e) => setBarcodeOpen(e.currentTarget.open)}><summary>Scan or look up a food barcode</summary>{barcodeOpen && <LoadBoundary quiet><Suspense fallback={null}><BarcodeFoodLookup date={date} update={update} data={data}/></Suspense></LoadBoundary>}</details>{/* Session AK (F5b): the supplements and medication log, loaded when its fold opens. */}<LazyFold summary="Supplements and medication (optional)">{() => <SupplementsCard date={date} today={today} />}</LazyFold><LoadBoundary quiet><Suspense fallback={null}><CycleEntry today={today} /></Suspense></LoadBoundary><details className="import-entry" id="import-meals" open={importingCsv || importFold || undefined} onToggle={e => setImportFold(e.currentTarget.open)}>{/* Session AL third pass (MO-051): Done no longer folds the section away; it stays open with its "Choose a file". */}<summary>Import a nutrition CSV</summary><p>From any app’s export with a header row. Read on this device only.</p>{(() => { const panel = importingCsv && <NutritionImportPanel data={data} update={update} imports={imports} onUndo={undoRecord} onClose={() => setImportingCsv(false)} />; return !panel ? <button type="button" className="secondary" onClick={() => setImportingCsv(true)}>Choose a file</button> : phone ? <PhoneFormSheet title="Import meals" onClose={() => setImportingCsv(false)}>{panel}</PhoneFormSheet> : panel; })()}</details></>}
      {view === "Meals & planning" && <MealsAndPlanning key={dateChoice} data={data} date={date} perform={perform} invalid={invalid} />}
      {view === "Planner" && <LoadBoundary quiet><Suspense fallback={<Skeleton label="Opening the planner…" block/>}><PlannerView data={data} date={date} today={today} perform={perform} /></Suspense></LoadBoundary>}
      {/* Session AK RB (R2-8): the 30-day nutrition patterns open Insights (they sat on the page under the summary). */}
      {view === "Insights" && <><LoadBoundary quiet><Suspense fallback={null}><WeekDigestCard data={data} today={today} /></Suspense></LoadBoundary><NutritionDashboard data={data} date={date} /><LoadBoundary quiet><Suspense fallback={<Skeleton label="Reading your diary…" block/>}><InsightsView data={data} today={today} /></Suspense></LoadBoundary></>}
      {view === "Import" && <LoadBoundary quiet><Suspense fallback={<Skeleton label="Opening the import…"/>}><RecipeImport data={data} perform={perform} /></Suspense></LoadBoundary>}
      {view === "Journal settings" && <HealthJournalSettings data={data} date={date} perform={perform} invalid={invalid} />}
      {view === "Foods & recipes" && <><LibraryView data={data} perform={perform} invalid={invalid} /></>}
      {view === "Measurements" && <><LoadBoundary label="Your measurements"><Suspense fallback={<div aria-busy="true" style={{ minHeight: 220 }} />}><BodyMeasurements data={data} perform={perform}/></Suspense></LoadBoundary><LoadBoundary quiet><Suspense fallback={null}><MeasurementsAa data={data} today={date} /></Suspense></LoadBoundary><LazyFold summary="Your numbers: blood pressure and lab values">{() => <YourNumbers today={today} />}</LazyFold></>}
      {/* Session AK RB (R2-8): the weight trend, energy estimate and coach open the Weight view (the tiles at the top link here). */}
      {view === "Weight" && <><LoadBoundary quiet><div className="health-aa-highlights"><Suspense fallback={null}><WeightCards data={data} date={date} today={today} perform={perform} /></Suspense></div></LoadBoundary><WeightView data={data} update={update} today={today} date={date} choice={dateChoice} perform={perform} invalid={invalid} onDate={chooseDate} /></>}
      {view === "Activity" && <ActivityView data={data} date={date} choice={dateChoice} perform={perform} invalid={invalid} />}
      {view === "Targets" && <><TargetsView key={`${JSON.stringify(data.targets)}:${dailyData(data).preferences.weightUnit}`} targets={data.targets} weightUnit={dailyData(data).preferences.weightUnit} perform={perform} invalid={invalid} /><LoadBoundary quiet><Suspense fallback={null}><TargetPanels data={data} date={date} /></Suspense></LoadBoundary><LazyFold summary="Weekly calorie budget (optional)">{() => <CalorieWeekCard data={data} date={date} today={today} />}</LazyFold>{/* Session AL fourth pass (C-MO-04, C-DVG-42) */}<LazyFold summary="Estimate my maintenance calories (optional)">{() => <MaintenanceEstimator latestGrams={weightTrend(data, date).latestGrams} weightUnit={dailyData(data).preferences.weightUnit} onUse={kcal => void perform(latest => setHealthTargets(latest, { ...latest.targets, kcal }), `Calorie target set to ${formatNumber(kcal)} kcal a day, from the estimate. Change it any time.`)} />}</LazyFold></>}
    </fieldset>
    {/* Session AK RB (RELEASE_REVIEW_2 R2-8): the weight trend, energy and coach cards moved into the Weight view; the
        highlight tiles at the top link to them (they showed twice on the page). */}
    </div>},
    {id: "health:sleep", label: "Sleep", node: <PhoneFold label="Sleep" expanded={sleepRunning}><SleepCard /></PhoneFold>},
    {id: "health:meditation", label: "Meditation", node: <PhoneFold label="Meditation" expanded={meditationRunning}><MeditationCard /></PhoneFold>},
    {id: "health:workouts", label: "Workouts", node: <PhoneFold label="Workouts"><WorkoutsCard /></PhoneFold>},
    // Session AK RB (RELEASE_REVIEW_2 R2-8): "Faster ways to log" (Release review R6's card) is gone: it advertised this
    // page's own features (the barcode fold in the Diary, the meal photo in Foods & recipes); Devices is linked at the end.
    // Saved layouts that name it keep working (lib/page-layout.ts resolveOrder drops ids that are gone).
    {id: "health:fasting", label: "Fasting timer", node: <PhoneFold label="Fasting timer" expanded={!!fasting.running}><div className="health-fasting-block"><FastingTimer fasting={fasting} health={data} /><LoadBoundary quiet><Suspense fallback={null}><FastingTimeline session={fasting.running ?? fastingHistory(fasting.data, 1)[0]?.session ?? null} /></Suspense></LoadBoundary></div></PhoneFold>}, // B49: one child, so PhoneFold can carry the layout attributes on computers (two children lost the item from the region since B41)
    // Session AK RB (R2-8): folded on a phone, and on every size until two days of the week have entries.
    {id: "health:trends", label: "Seven days of care", node: <HealthWeekFold health={data} today={date} waterUnit={dailyData(data).preferences.waterUnit} />},
    ]}/>
    {/* Session AB-Design (owner requests 9, 23): the game card only at the very bottom of the page while Gamify is on. */}
    <div className="health-progress-slot page-game-slot"><ProgressSlot page="health" /></div>
    <p className="health-private-note">Only the entries you add are counted. {summary.entries ? "Diary nutrition uses saved food snapshots." : "No meal entries for this date yet."} Private Health backups are in <Link href="/app/settings#backup-restore">Settings → Backup &amp; restore</Link>. {/* Session AK RB (R2-8): Devices' link, which "Faster ways to log" carried. */}Watches, rings and scales: <a className="text-link" href="/app/health?view=devices">Devices</a>{/* eslint-disable-line @next/next/no-html-link-for-pages -- a full load: Health's camera and Bluetooth policy applies to its own document */}.</p>
  </div></LayoutPage></HealthDayProvider></HealthFieldProvider>;
}

function HealthSummary({ data, date, today, onTargets, onDiary, compact = false, ...layout }: LayoutAttrs & { data: HealthData; date: string; today: string; onTargets: () => void; onDiary?: () => void; compact?: boolean }) {
  const summary = dailyHealthSummary(data, date);
  const kcal = summary.nutrients.kcal;
  const target = data.targets.kcal;
  // Session AL (P-MO-99): a keto or custom split (Targets → macro mode) sets the tiles' gram targets from the calorie
  // target when no gram target of your own is set; net carbs shows carbs minus fiber on the Carbs tile.
  const modeRecord = useDeviceRecord(MACRO_MODE), mode = modeRecord.loaded && !modeRecord.unreadable ? modeRecord.data : null;
  const split = mode && (mode.mode === "keto" || mode.mode === "custom") && mode.split && target ? splitGrams(target, mode.split) : null;
  const net = mode?.mode === "net-carbs" || mode?.mode === "keto" ? netCarbs(data.diary.filter(e => e.date === date).map(e => scaleNutrition(e.snapshot.nutrients, e.quantityMilli))) : null;
  // Session AL (P-MO-76, MO-028): on the other views the day's nourishment is one line, so the view itself is not pushed
  // ~600 px down; its one button follows what is missing (a target, a first entry, else the Diary).
  if (compact) return <section {...layout} className="panel health-summary health-summary-compact" aria-label="Daily nutrition summary">
    <p><span className="eyebrow">{date === today ? "TODAY’S NOURISHMENT" : formatDate(date)}</span> {summary.entries ? `${formatNutrient(kcal ?? summary.knownNutrients.kcal)}${kcal === null ? "+" : ""} kcal logged · ${summary.entries} ${plural(summary.entries, "entry", "entries")}` : "No entries yet"} · {target ? `${formatNumber(target)} kcal target` : "No calorie target set"}</p>
    {!target ? <button type="button" className="text-link health-inline-button" onClick={onTargets}>Set your own targets →</button> : <button type="button" className="text-link health-inline-button" onClick={onDiary}>{summary.entries ? "Open the Diary →" : "Log a meal →"}</button>}
  </section>;
  const progress = target && kcal!==null ? Math.min(1, kcal / target) : 0;
  return <section {...layout} className="panel health-summary" aria-label="Daily nutrition summary">
    <PinToToday label="Daily nutrition" choices={[{kind:'health',metric:'kcal',label:'Meals today'},{kind:'health',metric:'macros',label:'Macros today'}]}/>
    <div className="health-aurora" aria-hidden="true"><i /><i /><i /></div>
    <GlassRing identity="health-gauge" className="health-gauge" arcs={[{ key: "kcal", end: progress * 100 }]}><div>{/* Session AK RB (R2-15): unknown is not zero — a dash until the day's first entry. */}{!summary.entries ? <><strong><span aria-hidden="true">—</span><span className="sr-only">No entry</span></strong><span>no entries yet</span></> : <><strong>{formatNutrient(kcal ?? summary.knownNutrients.kcal)}</strong><span>{kcal === null && summary.knownNutrients.kcal !== null ? "kcal known so far" : "kcal logged"}</span></>}{/* Session AH (TR9): a full ring past the target says so. */}{target && kcal !== null && kcal > target && <span className="health-gauge-over">over target</span>}</div></GlassRing>
    <div className="health-summary-main"><p className="eyebrow">{date === today ? "TODAY’S NOURISHMENT" : date}</p><h2>{summary.entries ? <NebulaFlow identity="health-summary-title">Every entry adds perspective.</NebulaFlow> : "Start with one small entry."}</h2><p>{target ? `${formatNumber(target)} kcal target` : "No calorie target set"}</p>{target && kcal!==null ? <p className="fine">{kcal <= target ? `${formatNumber((target - kcal))} kcal remaining to your target` : `${formatNumber((kcal - target))} kcal above your target`}</p> : <button className="text-link health-inline-button" onClick={onTargets}>Set your own targets →</button>}{kcal===null&&summary.entries>0&&<p className="fine">{nutritionSummaryText(summary,"kcal","kcal")}. The entries without calories are left out; add their calories for a full total.</p>}{/* Session AL (P-DV-120; DV-143, DV-254a): no "0 meal groups · 0 entries" on an empty day, and one targets button (the "Set your own targets →" link above stands alone until a target exists). */}{(summary.entries > 0 || summary.steps > 0 || summary.minutes > 0) && <p className="health-daily-facts">{summary.entries > 0 ? `${groupsOn(data, date)} ${plural(groupsOn(data, date), "meal group")} · ${summary.entries} ${plural(summary.entries, "entry", "entries")}` : "No meals yet"}{summary.steps > 0 ? ` · ${formatNumber(summary.steps)} steps logged` : ""}{summary.minutes > 0 ? ` · ${summary.minutes} min movement` : ""}</p>}{target && <button className="quiet" onClick={onTargets}>Edit personal targets</button>}</div>
    <div className="health-macro-grid">{([ ["Protein", "proteinMg"], ["Carbs", "carbsMg"], ["Fat", "fatMg"] ] as const).map(([label, key]) => {
      const own = data.targets[key], fromSplit = own === null && split ? split[key === "proteinMg" ? "protein" : key === "carbsMg" ? "carbs" : "fat"] * 1000 : null, personalTarget = own ?? fromSplit;
      const netShown = key === "carbsMg" && net?.net && net.grams !== null && summary.entries > 0;
      // Session AL fourth pass (Oct-26 macro modes gap): in the net-carbs (or keto) mode the tile is "Net carbs" on an
      // empty day too, and a day whose entries do not all carry fiber says why it shows plain carbs.
      const netMode = key === "carbsMg" && (mode?.mode === "net-carbs" || mode?.mode === "keto"), netNote = !netMode || netShown ? null : !summary.entries ? "Carbs minus fiber, from your entries" : `Net carbs need fiber on every entry (${net?.fiberKnownOf ?? 0} of ${summary.entries} have it)`;
      return <div className={`health-macro health-macro-${key}`} key={key}><span>{netShown || (netMode && !summary.entries) ? "Net carbs" : label}</span>{/* Session AL (P-MO-25; MO-002, MO-033, MO-079, M-130): the headline is the number only; a day where some entries carry no value says so in a small "partial" line under it ("5 of 6 entries"), instead of a sentence in the hero font. */}<strong>{!summary.entries ? <><span aria-hidden="true">—</span><span className="sr-only">No entry</span></> : summary.nutrients[key] !== null ? `${formatMacroGrams(summary.nutrients[key]!)} g` : summary.knownNutrients[key] !== null ? `${formatMacroGrams(summary.knownNutrients[key]!)}+ g` : <><span aria-hidden="true">—</span><span className="sr-only">Unknown</span></>}</strong>{summary.entries > 0 && summary.nutrients[key] === null && <small className="health-macro-partial">Partial · {summary.coverage[key].known} of {summary.coverage[key].total} entries</small>}<GlassBar identity={`health-macro:${key}`} className="health-meter" aria-hidden="true" value={personalTarget && summary.nutrients[key]!==null ? summary.nutrients[key]! / personalTarget : 0} /><small>{personalTarget ? `${formatHealthGrams(personalTarget)} g target${fromSplit !== null ? ` (${mode?.mode === "keto" ? "keto" : "your"} split)` : ""}` : "Target not set"}</small>{netShown && <small className="health-macro-partial">{net!.grams} g after fiber</small>}{netNote && <small className="health-macro-partial">{netNote}</small>}</div>;
    })}</div><AdditionalNutrition entries={data.diary.filter(e=>e.date===date)} label="Daily nutrient details"/>
  </section>;
}

function DiaryView({ data, date, today, choice, perform, invalid, onLibrary, phone, error, logging, setLogging }: { data: HealthData; date: string; today: string; choice: number; perform: Perform; invalid: (cause?: unknown) => void; onLibrary: () => void; phone: boolean; error: string; logging: boolean; setLogging: (open: boolean) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<HealthDiaryEntry["meal"]>("Breakfast");
  const [entryUnit, setEntryUnit] = useState("servings");
  const [mealCheck, setMealCheck] = useState<{ key: string; text: string } | null>(null);
  const logOperation = useRef<string | null>(null);
  const mealExtras = useHealthExtras();
  const sourceItems = [...data.foods.map(f => ({ ...f, kind: "food" as const })), ...data.recipes.map(r => ({ ...r, kind: "recipe" as const }))];
  const selected = data.foods.find(s=>s.id===source)??data.recipes.find(s=>s.id===source);
  let preview: Nutrition | null = null;
  // Session AL third pass (GAP-048, C-MO-08): kitchen units convert within weight (oz → g) or volume (cup, tbsp, tsp, fl oz → mL) only.
  const quantityOf = (item: NonNullable<typeof selected>) => { const unit = servingUnit(entryUnit), base = unit.per === 1 && unit.base ? servings : toBaseAmount(servings, unit.id); return base === null ? parseHealthNumber(servings, 1000, 1, 1_000_000) : servingsFromMeasure(base, "ingredients" in item ? recipeSnapshot(item) : item, unit.base!); };
  try { if (selected) preview = scaleNutrition("ingredients" in selected ? recipeNutrition(selected) : selected.nutrients, quantityOf(selected)); } catch { /* Incomplete form values have no calculated preview. */ }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!selected) return invalid();
      const quantityMilli = quantityOf(selected);
      // Session AL (P-MO-43, MO-109): 1,000 servings or 99,999 g in one entry asks once; the same amount again is kept.
      const typedGrams = servingUnit(entryUnit).base === "g" ? Number(entryUnit === "grams" ? normalizeDecimalInput(servings.trim()) : toBaseAmount(servings, servingUnit(entryUnit).id)) : null;
      const check = servingsWarning(quantityMilli, typedGrams !== null && Number.isFinite(typedGrams) ? typedGrams : null), key = `${source}:${entryUnit}:${servings.trim()}`;
      if (check && mealCheck?.key !== key) { setMealCheck({ key, text: check }); return; }
      setMealCheck(null);
      logOperation.current ??= newHealthId();
      const draft = { id: logOperation.current, sourceId: selected.id, sourceKind: "ingredients" in selected ? "recipe" as const : "food" as const, date, meal, quantityMilli };
      void perform(latest => logHealthItem(latest, draft, new Date().toISOString()), "Meal logged.", () => { setServings(entryUnit !== "servings" ? "" : "1"); logOperation.current = null; setLogging(false); zigiSignals.emitValidated('health_log_recorded'); });
    } catch (cause) { invalid(cause); }
  };
  const quickPicks = sourceItems.length > 0 && <HealthQuickPicks data={data} perform={perform} onChoose={(id, quantity, usualMeal) => { setSource(id); setServings(String(quantity / 1000)); setEntryUnit("servings"); if (usualMeal) setMeal(usualMeal); logOperation.current = null; }} />;
  const mealForm = <>{sourceItems.length ? <FormBox title="Log a meal" onSubmit={submit}>
    <Checked of="health-log-source"><label className="field"><span>Food or recipe</span><select id="health-log-source" data-sheet-focus required value={source} onChange={e => setSource(e.target.value)}><option value="">Choose from your library</option>{sourceItems.map(s => <option value={s.id} key={s.id}>{s.name} · {s.kind}</option>)}</select></label></Checked>
    <div className="health-form-grid"><MealField value={meal} onChange={setMeal} /><label className="field"><span>Quantity unit</span><select aria-label="Quantity unit" value={entryUnit} onChange={e => { setEntryUnit(e.target.value); setServings(""); logOperation.current = null; }}>{SERVING_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label><NumberField label={servingUnit(entryUnit).field} value={servings} onChange={v => { setServings(v); logOperation.current = null; }} step="0.001" /></div>{conversionNote(servings, servingUnit(entryUnit).id) && <p className="fine health-conversion-note" aria-live="polite">{conversionNote(servings, servingUnit(entryUnit).id)}</p>}{preview && <div className="health-preview"><NutrientLine nutrients={preview} /></div>}<button className="primary" type="submit">Log to diary</button><p className="fine">Logging for {formatDate(date)}. Measured entries use the saved serving unit, rounded to 0.001 serving. Ounces convert to grams and cups or spoons to millilitres; weight and volume never convert into each other without density evidence.</p>
  {mealCheck && <p className="field-error health-soft-check" role="alert">{mealCheck.text}</p>}</FormBox> : <><p>Build a food library from the nutrition labels you use, then add meals here.</p><button className="primary" onClick={onLibrary}>Add your first food</button></>}<QuickAddFood date={date} meal={meal} perform={perform} invalid={invalid} /></>;
  const logForm = <>{quickPicks}{mealForm}</>;
  return <div className="health-diary-layout"><div className="health-meals"><RepeatDay data={data} date={date} today={today} perform={perform} />{HEALTH_MEALS.map(mealName => {
    const entries = data.diary.filter(e => e.date === date && e.meal === mealName);
    const mealSummary=dailyHealthSummary({...data,diary:entries},date);
    // Session AL third pass (GAP-045, C-MO-03): your own name and time for the meal, when you gave one (this device).
    const shownName = mealLabel(mealExtras.extras, mealName), shownTime = mealTime(mealExtras.extras, mealName);
    return <section className="panel health-meal" id={`diary-${mealName.toLowerCase()}`} aria-label={`${shownName} diary`} key={mealName}><div className="health-section-heading"><h2>{shownName}{shownTime && <small className="health-meal-time"> · {shownTime}</small>}</h2><span>{entries.length ? nutritionSummaryText(mealSummary,"kcal","kcal") : <><span aria-hidden="true">—</span><span className="sr-only">No entry</span></>}{/* Session AL fourth pass (C-DVG-38): your own target for this meal */}{mealKcalTarget(mealExtras.extras, mealName) !== null && <small className="health-meal-target"> of {formatNumber(mealKcalTarget(mealExtras.extras, mealName)!)} kcal</small>}</span><StarToggle item={{kind:"health",input:"meal",meal:mealName}} label={mealName==="Snacks"?"Log a snack":`Log ${mealName.toLowerCase()}`}/><PinToToday label={`${mealName} today`} menuName={date === today ? `${mealName} today` : `${mealName} on ${formatDate(date)}`} choices={[{kind:'meal',entity:mealName,metric:'kcal',label:`${mealName} today calories`},{kind:'meal',entity:mealName,metric:'macros',label:`${mealName} today macros`}]}/></div>{entries.length === 0 ? <p className="health-empty-inline">Nothing logged yet.</p> : entries.map(entry => <SwipeRow key={entry.id} className="health-entry" id={`entry-${entry.id}`} label={entry.snapshot.name} actions={[{label: "Edit", run: () => setEditing(editing === entry.id ? null : entry.id)}, {label: "Remove", danger: true, run: () => void perform(latest => removeHealthItem(latest, "diary", entry.id), "Diary entry removed.")}]}>
      <div className="health-entry-main"><strong>{entry.snapshot.name}</strong><small>{formatHealthGrams(entry.quantityMilli)}{` ${plural(entry.quantityMilli / 1000, "serving")} · `}{formatServingMeasure(entry.snapshot,entry.quantityMilli)}{entry.snapshot.recipeVersion?` · Recipe version ${entry.snapshot.recipeVersion}`:""}</small><NutrientLine nutrients={scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli)} /></div><div className="health-row-actions" style={{marginLeft:"auto"}}><button className="quiet" aria-label={`Edit ${entry.snapshot.name}`} onClick={() => setEditing(editing === entry.id ? null : entry.id)}>Edit</button><button className="quiet" aria-label={`Remove ${entry.snapshot.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "diary", entry.id), "Diary entry removed.")}>Remove</button><PinToToday label={`${entry.snapshot.name} diary entry`} choices={[{kind:'food-entry',entity:entry.id,metric:'kcal',label:`${entry.snapshot.name} calories`},{kind:'food-entry',entity:entry.id,metric:'macros',label:`${entry.snapshot.name} macros`}]}/></div>
      {editing === entry.id && <DiaryEditor entry={entry} today={today} perform={perform} invalid={invalid} close={() => setEditing(null)} />}
    </SwipeRow>)}{entries.length>0&&<AdditionalNutrition entries={entries} label={`${mealName} nutrient totals`}/>}<MealQuick data={data} date={date} today={today} meal={mealName} perform={perform} /></section>;
  })}<MealNamesEditor /></div><aside className="health-diary-side"><section className="panel" id="health-entry-action"><p className="eyebrow">A MOMENT TO CHECK IN</p><h2>Log a meal.</h2>{phone ? <><button type="button" className="primary phone-form-trigger" onClick={() => setLogging(true)}>Log a meal</button>{logging && <PhoneFormSheet title="Log a meal" onClose={() => setLogging(false)}>{mealForm}{error && <p className="health-error" role="alert" id="health-page-error">{error}</p>}{quickPicks}</PhoneFormSheet>}</> : logForm}</section><WaterJournal key={`${choice}:${dailyData(data).preferences.waterUnit}`} data={data} date={date} perform={perform} invalid={invalid} /><MoodChip date={date} today={today} /></aside></div>;
}

/** Session AH (C11, BUG-066): log a food that is not in the library yet: a name, its calories and one serving's size. */
function QuickAddFood({ date, meal: initialMeal, perform, invalid }: { date: string; meal: HealthDiaryEntry["meal"]; perform: Perform; invalid: (cause?: unknown) => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState<"g" | "ml">("g");
  const [meal, setMeal] = useState(initialMeal);
  const [macros, setMacros] = useState({ proteinMg: "", carbsMg: "", fatMg: "" });
  const ids = useRef<{ foodId: string; logId: string } | null>(null);
  const reset = () => { setName(""); setKcal(""); setSize(""); setMacros({ proteinMg: "", carbsMg: "", fatMg: "" }); ids.current = null; };
  return <details className="health-quick-add"><summary>Quick add a food that is not in your library</summary><FormBox title="Quick add a food" onSubmit={e => { e.preventDefault(); try {
    const nutrients: Nutrition = { kcal: parseHealthNumber(kcal, 1, 0, 10_000), proteinMg: macros.proteinMg.trim() ? parseHealthNumber(macros.proteinMg, 1000, 0, 1_000_000_000) : null, carbsMg: macros.carbsMg.trim() ? parseHealthNumber(macros.carbsMg, 1000, 0, 1_000_000_000) : null, fatMg: macros.fatMg.trim() ? parseHealthNumber(macros.fatMg, 1000, 0, 1_000_000_000) : null };
    const amount = parseHealthNumber(size, 1, 1, 100_000);
    within(foodIssue(nutrients, unit === "g" ? amount : null));
    ids.current ??= { foodId: newHealthId(), logId: newHealthId() };
    const quick = { ...ids.current, name: healthName(name), servingGrams: unit === "g" ? amount : null, ...(unit === "ml" ? { servingMl: amount } : {}), nutrients, date, meal };
    void perform(latest => quickLogFood(latest, quick, new Date().toISOString()), `${quick.name} logged and saved to your library.`, reset);
  } catch (cause) { invalid(cause); } }}>
    <div className="health-form-grid"><Checked of="health-quick-name"><label className="field"><span>Food name</span><input id="health-quick-name" required data-check="name" value={name} onChange={e => { setName(e.target.value); ids.current = null; }} /></label></Checked><NumberField label="Calories (kcal)" check="kcal" value={kcal} onChange={v => { setKcal(v); ids.current = null; }} /><NumberField label={unit === "g" ? "Portion weight (g)" : "Portion volume (mL)"} check="portion" unit={unit} value={size} onChange={v => { setSize(v); ids.current = null; }} /><label className="field"><span>Portion unit</span><select value={unit} onChange={e => { setUnit(e.target.value as "g" | "ml"); ids.current = null; }}><option value="g">Grams</option><option value="ml">Millilitres</option></select></label><MealField value={meal} onChange={setMeal} />{(["proteinMg", "carbsMg", "fatMg"] as const).map(key => <NumberField key={key} required={false} check="macro" step="0.001" label={`${{ proteinMg: "Protein", carbsMg: "Carbs", fatMg: "Fat" }[key]} (g, optional)`} value={macros[key]} onChange={v => { setMacros(old => ({ ...old, [key]: v })); ids.current = null; }} />)}</div>
    <button className="secondary" type="submit">Log and save food</button><p className="fine">Logging for {formatDate(date)}. The food is saved to your library as one portion, so you can pick it again. Blank values stay unknown, never zero.</p>
  </FormBox></details>;
}

function DiaryEditor({ entry, today, perform, invalid, close }: { entry: HealthDiaryEntry; today: string; perform: Perform; invalid: (cause?: unknown) => void; close: () => void }) {
  const [quantity, setQuantity] = useState(String(entry.quantityMilli / 1000));
  const [date, setDate] = useState(entry.date);
  const [meal, setMeal] = useState(entry.meal);
  // Session AL (P-MO-53, MO-010/MO-110): an entry moves only to a day the diary can open (1990 to today).
  return <FormBox title="Edit diary entry" onSubmit={e => { e.preventDefault(); try { const dayIssue = diaryDayIssue(date, today); if (dayIssue) throw Error(dayIssue); const quantityMilli = parseHealthNumber(quantity, 1000, 1, 1_000_000); void perform(latest => editDiaryEntry(latest, entry.id, { date, meal, quantityMilli }, new Date().toISOString()), "Diary entry updated.", close); } catch (cause) { invalid(cause); } }}>
    <div className="health-form-grid"><label className="field"><span>Entry date</span><input id="health-entry-date" type="date" required min={JOURNAL_MIN_DAY} max={today} value={date} onChange={e => setDate(e.target.value)} /></label><MealField value={meal} onChange={setMeal} /><NumberField label="Servings" value={quantity} onChange={setQuantity} step="0.001" /></div><p className="fine">Corrections use the nutrition originally saved with this entry.</p><div className="actions"><button className="primary" type="submit">Save entry</button><button className="quiet" type="button" onClick={close}>Cancel</button></div>
  </FormBox>;
}

function LibraryView({ data, perform, invalid }: { data: HealthData; perform: Perform; invalid: (cause?: unknown) => void }) {
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<HealthFood | "new" | null>(null);
  const [recipe, setRecipe] = useState<HealthRecipe | "new" | null>(null);
  const [quality, setQuality] = useState<{ grades: Record<string, string>; abFirst: boolean } | null>(null);
  const found = searchFoods(data.foods, query), ab = (f: HealthFood) => (/^[ab]$/.test(quality?.grades[f.id] ?? "") ? 0 : 1);
  const foods = quality?.abFirst ? [...found].sort((a, b) => ab(a) - ab(b)) : found;
  const estimates = useDeviceRecord(MEAL_ESTIMATES).data.foods; // Session AI (HE17): the ranges behind an AI meal estimate
  const recipes = data.recipes.filter(r => r.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="health-library"><div className="health-section-heading"><div><h2>Your kitchen library.</h2><p>Foods and recipes you add, with nutrition from your own labels.</p></div><div className="actions"><button className="primary" onClick={() => { setFood("new"); setRecipe(null); }}>New food</button><button className="secondary" onClick={() => { setRecipe("new"); setFood(null); }}>New recipe</button></div></div>
    {food && <FoodEditor key={food === "new" ? "new" : food.id} food={food === "new" ? null : food} perform={perform} invalid={invalid} close={() => setFood(null)} />}
    {recipe && <RecipeEditor key={recipe === "new" ? "new" : recipe.id} recipe={recipe === "new" ? null : recipe} data={data} perform={perform} invalid={invalid} close={() => setRecipe(null)} />}
    <label className="field health-search"><span>Search your foods and recipes</span><input type="search" maxLength={200} placeholder="Search by name or brand" value={query} onChange={e => setQuery(e.target.value)} /></label><Suspense fallback={null}><FoodQualityLibrary foods={data.foods} onChange={setQuality} /></Suspense>
    <div className="health-library-grid"><section className="panel"><div className="health-section-heading"><h2>Foods</h2><span>{data.foods.length} saved</span></div>{foods.length ? foods.map(f => <article className="health-library-row" key={f.id}><div><h3>{f.name}</h3><p className="fine">{f.brand ? `${f.brand} · ` : ""}{formatServingMeasure(f)} per serving{quality?.grades[f.id] ? ` · Nutri-Score ${quality.grades[f.id]!.toUpperCase()}` : ""}</p><NutrientLine nutrients={f.nutrients} />{estimates[f.id] && <p className="fine health-estimate-range">{estimateLine(estimates[f.id]!)}</p>}</div><div className="health-row-actions"><button className="quiet" aria-label={`Edit food ${f.name}`} onClick={() => { setFood(f); setRecipe(null); }}>Edit</button><button className="quiet" aria-label={`Remove food ${f.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "foods", f.id), "Food removed. Existing recipes and diary entries are preserved.")}>Remove</button></div></article>) : <ArtNote pillar="health"><p className="health-empty-inline">{query ? "No matching foods." : "Your library starts with your first food."}</p></ArtNote>}</section>
    <section className="panel"><div className="health-section-heading"><h2>Recipes</h2><span>{data.recipes.length} saved</span></div>{recipes.length ? recipes.map(r => <article className="health-library-row" key={r.id}><div><h3>{r.name}</h3><p className="fine">Makes {formatHealthGrams(r.portionsMilli)}{` ${plural(r.portionsMilli / 1000, "serving")} · `}{r.ingredients.length}{` ${plural(r.ingredients.length, "ingredient")} · Version `}{r.revision??1}{r.yield?` · Measured yield ${r.yield.quantityMilli/1000} ${r.yield.unit}`:""}</p><NutrientLine nutrients={recipeNutrition(r)} /><Suspense fallback={null}><VitaminRecipeLine recipe={r} /></Suspense><details className="health-recipe-ingredients"><summary>View ingredients</summary><ul>{r.ingredients.map((ingredient, i) => <li key={i}>{ingredient.snapshot.name} · {formatHealthGrams(ingredient.quantityMilli)}{` ${plural(ingredient.quantityMilli / 1000, "serving")}`}</li>)}</ul></details></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit recipe ${r.name}`} onClick={() => { setRecipe(r); setFood(null); }}>Edit</button><button className="quiet" aria-label={`Remove recipe ${r.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "recipes", r.id), "Recipe removed. Existing diary entries are preserved.")}>Remove</button></div></article>) : <ArtNote pillar="health"><p className="health-empty-inline">{query ? "No matching recipes." : "Combine your foods into a recipe you can log again."}</p></ArtNote>}</section></div>
    <p className="fine">Saved recipes keep their original ingredient nutrition. Editing a recipe rebuilds it from the current food library. Existing diary entries always keep their saved nutrition.</p>
  </div>;
}

function FoodEditor({ food, perform, invalid, close }: { food: HealthFood | null; perform: Perform; invalid: (cause?: unknown) => void; close: () => void }) {
  const [name, setName] = useState(food?.name ?? "");
  const [foodId] = useState(() => food?.id ?? newHealthId());
  const [brand, setBrand] = useState(food?.brand ?? "");
  const [basis, setBasis] = useState("serving");
  const [weight, setWeight] = useState(food ? String(food.servingGrams??food.servingMl??"") : "");
  const [measureUnit,setMeasureUnit]=useState(food?.servingMl!==undefined?"ml":"g");
  const [values, setValues] = useState<Record<typeof foodFields[number][0], string>>({ kcal: food?.nutrients.kcal!=null ? String(food.nutrients.kcal) : "", proteinMg: food?.nutrients.proteinMg!=null ? String(food.nutrients.proteinMg / 1000) : "", carbsMg: food?.nutrients.carbsMg!=null ? String(food.nutrients.carbsMg / 1000) : "", fatMg: food?.nutrients.fatMg!=null ? String(food.nutrients.fatMg / 1000) : "" });
  const [extras,setExtras]=useState<Record<string,string>>(Object.fromEntries(additionalNutrients.map(([key,,,scale])=>[key,food?.nutrients[key]===undefined?'':String(food.nutrients[key]!/scale)])));
  // Session AK (item 3): a label read from a photo fills these fields as an editable draft; the vitamins remount with it.
  const [scan,setScan]=useState<{open:boolean;count:number;vitamins?:Partial<Record<string,string>>}>({open:false,count:0});
  return <section className="panel health-editor"><h2>{food ? "Edit food" : "Add a food"}</h2><p>Choose the label basis and enter every known value. Enter 0 only when the label says zero. Leave any nutrient blank when the label does not provide it; blank is saved as unknown, never zero.</p><FormBox title="Food details" onSubmit={e => { e.preventDefault(); try {
    const at = new Date().toISOString();
    const labelNutrients = Object.fromEntries(foodFields.map(([key, , scale, max]) => [key, values[key].trim()?parseHealthNumber(values[key], scale, 0, max):null])) as Nutrition;
    for(const [key,,,scale]of additionalNutrients)if(extras[key]?.trim())labelNutrients[key]=parseHealthNumber(extras[key]!,scale,0,1_000_000_000);
    const servingAmount = parseHealthNumber(weight, 1, 1, 100_000);
    const nutrients = basis !== "serving" ? scaleNutrition(labelNutrients, servingAmount * 10) : labelNutrients;
    within(foodIssue(nutrients, measureUnit==="g"?servingAmount:null));
    const draft = { id: foodId, name: healthName(name), brand, servingGrams:measureUnit==="g"?servingAmount:null,...(measureUnit==="ml"?{servingMl:servingAmount}:{}), nutrients, createdAt: food?.createdAt ?? at, updatedAt: at };
    void perform(latest => saveFood(latest, draft), "Food saved.", close);
  } catch (cause) { invalid(cause); } }}><div className="health-form-grid">{/* Session AL fourth pass (D-089): no silent cut at 120 (or 80) characters; a longer name is said at the field. */}<Checked of="health-food-name"><label className="field"><span>Food name</span><input id="health-food-name" required data-check="name" value={name} onChange={e => setName(e.target.value)} /></label></Checked><Checked of="health-food-brand"><label className="field"><span>Brand (optional)</span><input id="health-food-brand" data-check="brand" value={brand} onChange={e => setBrand(e.target.value)} /></label></Checked><label className="field"><span>Nutrition label basis</span><select value={basis} onChange={e => {setBasis(e.target.value);if(e.target.value!=="serving")setMeasureUnit(e.target.value==="100g"?"g":"ml");}}><option value="serving">Per serving</option><option value="100g">Per 100 g</option><option value="100ml">Per 100 mL</option></select></label><label className="field"><span>Serving measure unit</span><select value={measureUnit} disabled={basis!=="serving"} onChange={e=>setMeasureUnit(e.target.value)}><option value="g">Grams</option><option value="ml">Millilitres</option></select></label><NumberField label={measureUnit==="g"?"Serving weight (g)":"Serving volume (mL)"} check="portion" unit={measureUnit} value={weight} onChange={setWeight} />{!food&&<details className="health-label-scan" style={{gridColumn:"1 / -1"}} onToggle={e=>{const open=(e.currentTarget as HTMLDetailsElement).open;setScan(s=>({...s,open}));}}><summary className="health-fold-button" data-icon="camera">Read the label from a photo</summary>{scan.open&&<Suspense fallback={<Skeleton label="Opening the label reader…" lines={2}/>}><LabelScan target="food-form" onDraft={d=>{setBasis(d.basis);setMeasureUnit(d.measureUnit);setWeight(d.weight);setValues(d.values);setExtras(old=>({...old,...d.extras}));setScan(s=>({...s,count:s.count+1,vitamins:d.vitamins}));}}/></Suspense>}</details>}{foodFields.map(([key, label, scale]) => <NumberField key={key} label={label} required={false} value={values[key]} onChange={value => setValues(old => ({ ...old, [key]: value }))} step={scale === 1 ? "1" : "0.001"} />)}</div><details open={scan.count>0||undefined}><summary>Additional label nutrients (optional)</summary><p>Enter only values supplied by the label.</p><div className="health-form-grid">{additionalNutrients.map(([key,label,unit,scale])=><NumberField key={key} label={`${label} (${unit})`} value={extras[key]??""} onChange={value=>setExtras(old=>({...old,[key]:value}))} required={false} step={scale===1?"1":"0.001"}/>)}</div></details><Suspense fallback={null}><VitaminFields key={scan.count} foodId={foodId} basis={basis} amount={weight} initial={scan.count?scan.vitamins:undefined} /></Suspense><div className="actions"><button className="primary" type="submit">Save food</button><button className="quiet" type="button" onClick={close}>Cancel</button></div></FormBox></section>;
}

function RecipeEditor({ recipe, data, perform, invalid, close }: { recipe: HealthRecipe | null; data: HealthData; perform: Perform; invalid: (cause?: unknown) => void; close: () => void }) {
  const [draftId] = useState(newHealthId);
  const [name, setName] = useState(recipe?.name ?? "");
  const [yieldAmount,setYieldAmount]=useState(recipe?.yield?String(recipe.yield.quantityMilli/1000):"");
  const [yieldUnit,setYieldUnit]=useState<"g"|"ml">(recipe?.yield?.unit??"g");
  const [portions, setPortions] = useState(recipe ? String(recipe.portionsMilli / 1000) : "1");
  const [items, setItems] = useState(recipe?.ingredients.map(i => ({ foodId: i.foodId, servings: String(i.quantityMilli / 1000) })) ?? [{ foodId: "", servings: "1" }]);
  const buildDraft = (): RecipeDraft => ({ id: recipe?.id ?? draftId, name,...(yieldAmount.trim()?{yield:{quantityMilli:parseHealthNumber(yieldAmount,1000,1,100_000_000),unit:yieldUnit}}:{}), portionsMilli: parseHealthNumber(portions, 1000, 1, 1_000_000), items: items.map(i => ({ foodId: i.foodId, quantityMilli: parseHealthNumber(i.servings, 1000, 1, 1_000_000) })) });
  let preview: Nutrition | null = null;
  try {
    const draft = buildDraft();
    const at = new Date().toISOString();
    const calculation: HealthRecipe = { id: draft.id, name: name.trim() || "Recipe preview", portionsMilli: draft.portionsMilli,...(draft.yield?{yield:draft.yield}:{}), ingredients: draft.items.map(i => { const food = data.foods.find(f => f.id === i.foodId); if (!food) throw Error(); return { foodId: i.foodId, quantityMilli: i.quantityMilli, snapshot: foodSnapshot(food) }; }), createdAt: at, updatedAt: at };
    preview = recipeSnapshot(calculation).nutrients;
  } catch { /* A preview appears only when every constituent is valid. */ }
  // Session AL (P-MO-47, MO-108): while Save recipe is off, the first reason is said beside it (it was greyed out silently).
  const reads = (text: string, min: number, max: number) => { try { parseHealthNumber(text, 1000, min, max); return true; } catch { return false; } };
  const blocked = preview ? null
    : !reads(portions, 1, 1_000_000) ? "Save turns on when “Recipe makes (servings)” is a number from 0.001 to 1,000."
    : yieldAmount.trim() && !reads(yieldAmount, 1, 100_000_000) ? "Save turns on when the measured yield is a number above 0, or left empty."
    : (() => { const i = items.findIndex(x => !data.foods.some(f => f.id === x.foodId)); if (i >= 0) return `Save turns on when ingredient ${i + 1} has a food chosen.`; const j = items.findIndex(x => !reads(x.servings, 1, 1_000_000)); return j >= 0 ? `Save turns on when ingredient ${j + 1} has servings from 0.001 to 1,000.` : "Save turns on when every field above can be read."; })();
  return <section className="panel health-editor"><h2>{recipe ? "Edit recipe" : "Build a recipe"}</h2><p>Add constituent foods in their label servings. Totals are divided by the servings the recipe makes.</p>{data.foods.length === 0 ? <><p>Add a food before building a recipe.</p><button className="quiet" onClick={close}>Close recipe</button></> : <FormBox title="Recipe details" onSubmit={e => { e.preventDefault(); try { const draft = { ...buildDraft(), name: healthName(name) }; void perform(latest => saveRecipe(latest, draft, new Date().toISOString()), "Recipe saved.", close); } catch (cause) { invalid(cause); } }}>
    <div className="health-form-grid"><label className="field"><span>Recipe name</span><input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><NumberField label="Recipe makes (servings)" value={portions} onChange={setPortions} step="0.001" /><label className="field"><span>Measured recipe yield unit</span><select value={yieldUnit} onChange={e=>setYieldUnit(e.target.value as "g"|"ml")}><option value="g">Grams</option><option value="ml">Millilitres</option></select></label><NumberField label="Measured total recipe yield" value={yieldAmount} onChange={setYieldAmount} required={false} step="0.001" /></div><p className="fine">Optional: enter the measured finished recipe yield. Without it, volume is unknown; ingredient weights are used only when every ingredient has a recorded mass.</p>
    {items.map((item, index) => <div className="health-ingredient" key={index}><label className="field"><span>Ingredient {index + 1}</span><select required value={item.foodId} onChange={e => setItems(old => old.map((v, i) => i === index ? { ...v, foodId: e.target.value } : v))}><option value="">Choose a food</option>{item.foodId && !data.foods.some(f => f.id === item.foodId) && <option value={item.foodId}>Removed food — choose a replacement</option>}{data.foods.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label><NumberField label={`Ingredient servings ${index + 1}`} value={item.servings} onChange={value => setItems(old => old.map((v, i) => i === index ? { ...v, servings: value } : v))} step="0.001" /><button className="quiet" type="button" disabled={items.length === 1} aria-label={`Remove ingredient ${index + 1}`} onClick={() => setItems(old => old.filter((_, i) => i !== index))}>Remove</button></div>)}
    <button className="secondary" type="button" disabled={items.length >= 100} onClick={() => setItems(old => [...old, { foodId: "", servings: "1" }])}>Add ingredient</button>{preview && <div className="health-preview"><strong>{formatNutrient(preview.kcal)} kcal per serving</strong><NutrientLine nutrients={preview} /></div>}<p className="fine">Kcal and nutrient milligrams round once per recipe serving. Serving measures round to whole grams or millilitres. Each save creates a recipe version; past diary and saved-meal snapshots keep their original version.</p><div className="actions"><button className="primary health-save-recipe" type="submit" disabled={!preview} aria-describedby={blocked ? "recipe-save-why" : undefined}>Save recipe</button><button className="quiet" type="button" onClick={close}>Cancel</button></div>{blocked && <p className="fine health-save-why" id="recipe-save-why">{blocked}</p>}
  </FormBox>}</section>;
}

function WeightView({ data, update, today, date, choice, perform, invalid, onDate }: { data: HealthData; update: Update; today: string; date: string; choice: number; perform: Perform; invalid: (cause?: unknown) => void; onDate: (date: string) => void }) {
  const edges = useScrollEdges<HTMLDivElement>();
  const reading = data.weights.find(w => w.date === date);
  const unit = dailyData(data).preferences.weightUnit;
  const trend = weightTrend(data, date);
  const history = [...data.weights].sort((a, b) => b.date.localeCompare(a.date));
  // Session AH Part 3 (DS7): second readings of a day (timed weight measurements) listed with their time.
  const seconds = (data.measurements ?? []).filter(m => m.kind === "weight" && m.source === "MANUAL");
  // Session AL (P-MO-43, MO-017): an unlikely jump asks once, under the field; the same value saved again is kept.
  const [warned, setWarned] = useState<{ typed: string; text: string } | null>(null);
  // Session AL fourth pass (DV-143): Edit on a history row says what is being edited and can be cancelled (it only moved
  // the journal date, with no banner and no way back but Esc).
  const [editFrom, setEditFrom] = useState<{ from: string; day: string } | null>(null), editingDay = editFrom?.day === date && reading ? editFrom : null;
  const cancelEdit = () => { if (editFrom) onDate(editFrom.from); setEditFrom(null); setWarned(null); };
  // Session AL fourth pass (MO-154): the first save of a day turns the form into "Correct a reading" (a new form), and the
  // focus fell to the page; it goes back to the form's Save button.
  const keepFocus = () => { let tries = 60; const step = () => { const b = document.querySelector<HTMLButtonElement>("#health-weight-entry button.primary"); if (b && (document.activeElement === document.body || document.activeElement === null || !document.activeElement.isConnected)) { b.focus({ preventScroll: true }); return; } if (tries-- > 0) requestAnimationFrame(step); }; requestAnimationFrame(step); };
  return <div className="health-two-columns"><div><section className="panel health-weight-overview"><StarToggle item={{kind:"health",input:"weight"}} label="Weigh in"/><PinToToday label="Weight journal" choices={[{kind:'health',metric:'weight',label:'Latest weight'}]}/><p className="eyebrow">A LONGER VIEW</p><h2>Your weight journal.</h2><p>Individual readings can vary. See what you recorded over time.</p><div className="health-weight-stats"><div><span>Latest in 30 days</span><strong>{trend.latestGrams === null ? "—" : weightAsEntered(trend.latestGrams, unit)}</strong></div><div><span>Your weight goal</span><strong>{data.targets.weightGrams === null ? "Not set" : weightText(data.targets.weightGrams, unit)}</strong>{/* Session AL (P-MO-71, MO-034): how far the latest reading is from it */}{data.targets.weightGrams !== null && trend.latestGrams !== null && <small className="health-goal-gap">{Math.abs(trend.latestGrams - data.targets.weightGrams) < 50 ? "at your goal" : `${weightText(Math.abs(trend.latestGrams - data.targets.weightGrams), unit)} to go`}</small>}</div><div><span>30-day change</span><strong>{trend.changeGrams === null ? "—" : weightChangeText(trend.changeGrams, unit)}</strong></div></div>
    <WeightChart data={data} date={date} unit={unit} /><p className="fine">{trend.count ? `${trend.count} ${trend.count === 1 ? 'reading' : 'readings'} in the 30 days ending ${formatDate(date)}. Average ${weightText(trend.averageGrams!, unit)}.` : "Add your first reading to start a trend."}</p></section>
    <section className="panel health-weight-history"><h2>Weight history</h2>{history.length ? <div ref={edges} className="health-table-wrap"><table aria-label="Weight history"><thead><tr><th>Date</th><th>Weight</th><th><span className="health-sr-only">Actions</span></th></tr></thead><tbody>{seconds.map(m => <tr key={m.id}><td>{formatDate(m.observedAt, { timeZone: m.timezone })}, {formatTime(m.observedAt, { timeZone: m.timezone })}</td><td>{weightText(Math.round(m.canonical / 1000), unit)}</td><td><div className="health-row-actions"><button className="quiet" aria-label={`Remove the reading of ${formatDate(m.observedAt, { timeZone: m.timezone })} at ${formatTime(m.observedAt, { timeZone: m.timezone })}`} onClick={() => void perform(latest => healthSchema.parse({ ...latest, measurements: (latest.measurements ?? []).filter(x => x.id !== m.id) }), "Reading removed.")}>Remove</button></div></td></tr>)}{history.slice(0, 100).map(w => <tr key={w.id}><td>{formatDate(w.date)}</td><td>{weightAsEntered(w.grams, unit)}</td><td><div className="health-row-actions"><button className="quiet" aria-label={`Edit weight for ${formatDate(w.date)}`} onClick={() => { setEditFrom({ from: date, day: w.date }); onDate(w.date); revealWhenShown("health-weight-entry", true); }}>Edit</button><button className="quiet" aria-label={`Remove weight for ${formatDate(w.date)}`} onClick={() => void perform(latest => removeHealthItem(latest, "weights", w.id), "Weight entry removed.")}>Remove</button></div></td></tr>)}</tbody></table>{history.length > 100 && <p className="fine">Showing the latest 100 readings. All readings remain in your private backup.</p>}</div> : <ArtNote pillar="health"><p className="health-empty-inline">No weight readings yet.</p></ArtNote>}</section></div>
    <section className="panel health-fit-panel" id="health-weight-entry"><h2>{reading ? "Correct a reading, or keep both." : "Add a reading."}</h2>{editingDay && reading && <div className="health-editing-banner"><p role="status">Editing the reading of {formatDate(date)}: {weightAsEntered(reading.grams, unit)}.</p><button type="button" className="quiet" onClick={cancelEdit}>Cancel edit</button></div>}<p>{formatDate(date)} · {reading ? "“Save weight” corrects this day’s reading; “Keep both” adds a second reading at this time." : "One reading a day; a second one can be kept beside it."}</p><FormBox key={`${choice}:${reading?.updatedAt ?? "new"}`} title="Weight entry" onSubmit={e => { e.preventDefault(); try { const typed = formString(new FormData(e.currentTarget), "weight").trim(), grams = reading && typed === weightPrefill(reading.grams, unit) ? reading.grams : checkedWeightGrams(typed, unit), now = new Date();
      const jump = grams === reading?.grams ? null : weightJumpWarning(grams, date, data.weights, unit);
      if (jump && warned?.typed !== typed) { setWarned({ typed, text: jump }); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#health-weight-entry input[name="weight"]')?.focus()); return; }
      setWarned(null);
      // Session AH Part 3 (DS7, N-057): a second reading on a day that has one is kept beside it (a timed weight
      // measurement, the record's own kind for readings with a time), never written over the first.
      if (reading && (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "second") void perform(latest => saveMeasurement(latest, { id: newHealthId(), kind: "weight", quantityMilli: grams, unit: "kg", observedAt: now.toISOString(), timezone: dailyData(latest).preferences.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, sourceLabel: "Manual reading" }, now.toISOString()), "Second reading saved beside the first.", () => { zigiSignals.emitValidated('health_log_recorded'); setEditFrom(null); keepFocus(); });
      else void perform(latest => saveWeight(latest, { id: reading?.id ?? newHealthId(), date, grams }, now.toISOString()), "Weight saved.", () => { zigiSignals.emitValidated('health_log_recorded'); setEditFrom(null); keepFocus(); }); } catch (cause) { invalid(cause); } }}><Checked of="health-weight-input"><label className="field"><span>Weight ({unit})</span><input id="health-weight-input" name="weight" type="text" inputMode="decimal" autoComplete="off" required data-check="weight" data-unit={unit} defaultValue={reading ? weightPrefill(reading.grams, unit) : ""} aria-describedby={warned ? "health-weight-check" : undefined} onInput={() => setWarned(null)} /></label></Checked>{warned && <p className="field-error health-soft-check" id="health-weight-check" role="alert">{warned.text}</p>}<button className="primary" type="submit">Save weight</button>{reading && <button className="secondary" type="submit" value="second">Keep both</button>}<p className="fine">Manual reading, converted to and stored as grams. History and the chart use your weight unit from Journal settings. Set or clear your own weight goal in Targets.</p></FormBox><LoadBoundary quiet><Suspense fallback={null}><WeightCsvImport data={data} update={update} unit={unit} today={today} /></Suspense></LoadBoundary></section></div>;
}

function WeightChart({ data, date, unit }: { data: HealthData; date: string; unit: WeightUnit }) {
  const { readings } = weightTrend(data, date), shape = weightChartValue(0, unit), goal = data.targets.weightGrams;
  // Session AL (P-MO-71, MO-034): your own weight goal as a dashed reference across the readings, in the journal's unit.
  // Session AL fourth pass (D-075): no chart (and none of its "Real observations and recorded contributions" words) until
  // there is a reading; the line under it says how to start.
  if (!readings.length) return null;
  const dates = readings.map(w => w.date).sort(), goalSeries = goal !== null && dates.length ? [{ label: "Your goal", color: "#f3c57d", maxGapMs: Number.MAX_SAFE_INTEGER, points: [...new Set([dates[0]!, dates.at(-1)!])].map(at => ({ at, value: weightChartValue(goal, unit).value, dateOnly: true })) }] : [];
  return <Suspense fallback={<div className="health-weight-chart-pending" aria-busy="true" style={{ minHeight: 220 }} />}><EvidenceChart label="Recorded body weight" decimals={shape.decimals} currency={shape.unit} series={[{ label: "Your readings", color: "#8ad7e6", points: readings.map(w => ({ at: w.date, value: weightChartValue(w.grams, unit).value, dateOnly: true })) }, ...goalSeries]} /></Suspense>;
}

function ActivityView({ data, date, choice, perform, invalid }: { data: HealthData; date: string; choice: number; perform: Perform; invalid: (cause?: unknown) => void }) {
  const entries = data.activity.filter(a => a.date === date);
  const summary = dailyHealthSummary(data, date);
  const [editing, setEditing] = useState<string | null>(null);
  const current = entries.find(a => a.id === editing);
  const operation = useRef<string | null>(null);
  return <div className="health-two-columns"><section className="panel health-activity-overview"><PinToToday label="Movement" choices={[{kind:'health',metric:'steps',label:'Steps today'},{kind:'health',metric:'activity',label:'Activity today'}]}/><p className="eyebrow">MOVE AT YOUR PACE</p><h2>Your movement, recorded.</h2><div className="health-weight-stats"><div><span>Steps</span><strong>{formatNumber(summary.steps)}</strong></div><div><span>Minutes</span><strong>{formatNumber(summary.minutes)}</strong></div><div><span>Your step target</span><strong>{data.targets.steps == null ? "Not set" : formatNumber(data.targets.steps)}</strong></div></div><p className="fine">Entries for {formatDate(date)}: yours, and any an import brought in (marked). Movement never changes your calorie target.</p>{entries.length ? entries.map(a => <article className="health-library-row" key={a.id}><div><h3>{a.name}</h3><p>{/* Session AL fourth pass (MO-040): a part left blank is not shown as zero ("4,000 steps", not "4,000 steps · 0 minutes") */}{[a.steps ? `${formatNumber(a.steps)} ${plural(a.steps, "step")}` : null, a.minutes ? `${formatNumber(a.minutes)} ${plural(a.minutes, "minute")}` : null].filter(Boolean).join(" · ") || "No steps or minutes"}</p>{/* Session AL fourth pass (C-MO-39): a labelled estimate of the energy it used; never added to a target */}{(() => { const kcal = activityKcalEstimate(a.name, a.minutes, weightTrend(data, date).latestGrams); return kcal === null ? null : <p className="fine">About {formatNumber(kcal)} kcal used <span className="health-estimate-tag">an estimate</span> (activity type, minutes and your latest weight; it does not change your calorie target)</p>; })()}<p className="fine">{importedFrom(a.id) ? `Imported from ${importedFrom(a.id)}` : a.updatedAt !== a.createdAt ? `Manual · corrected ${formatDate(a.updatedAt)}` : "Added by you"}</p></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit activity ${a.name}`} onClick={() => { setEditing(a.id); operation.current = null; }}>Edit</button><button className="quiet" aria-label={`Remove activity ${a.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "activity", a.id), "Activity removed.")}>Remove</button></div></article>) : <p className="health-empty-inline">No movement logged for this day.</p>}</section><section className="panel health-fit-panel"><h2>{current ? "Correct movement." : "Add movement."}</h2><FormBox key={`${choice}:${current?.id ?? "new"}`} title="Manual activity" onSubmit={e => { e.preventDefault(); try { const form = e.currentTarget; const values = new FormData(form); operation.current ??= newHealthId(); const draft = { id: current?.id ?? operation.current, date, name: healthName(formString(values, "name")), steps: blankZero(values, "steps", 100_000), minutes: blankZero(values, "minutes", 1440) }; if (!draft.steps && !draft.minutes) return invalid(new Error("Enter steps, minutes, or both.")); void perform(latest => saveActivity(latest, draft, new Date().toISOString()), current ? "Activity corrected." : "Activity saved.", () => { form.reset(); setEditing(null); operation.current = null; }); } catch (cause) { invalid(cause); } }}><Checked of="health-activity-name"><label className="field"><span>Activity name</span><input id="health-activity-name" name="name" required data-check="name" list="health-activity-types" placeholder="For example, a walk or strength session" defaultValue={current?.name ?? ""} /></label></Checked>{/* Session AL third pass (GAP-042, N-085): the usual types to pick from; any words of your own still work. */}<datalist id="health-activity-types">{ACTIVITY_TYPES.map(t => <option key={t} value={t} />)}</datalist><div className="health-form-grid"><Checked of="health-activity-steps"><label className="field"><span>Steps</span><input id="health-activity-steps" name="steps" type="text" inputMode="numeric" autoComplete="off" data-check="steps" defaultValue={current?.steps || ""} /></label></Checked><Checked of="health-activity-minutes"><label className="field"><span>Minutes</span><input id="health-activity-minutes" name="minutes" type="text" inputMode="numeric" autoComplete="off" data-check="minutes" defaultValue={current?.minutes || ""} /></label></Checked></div><div className="actions"><button className="primary" type="submit">{current ? "Save correction" : "Save activity"}</button>{current && <button className="quiet" type="button" onClick={() => { setEditing(null); operation.current = null; }}>Cancel correction</button>}</div><p className="fine">Enter steps, minutes, or both. New entries are added together; correcting one replaces only that record. Known activity types with minutes get a labelled estimate of the energy used (your latest weight is needed); it never changes your calorie target.</p></FormBox></section></div>;
}

const targetFields = [
  ["kcal", "Calorie target (kcal)", 1, 100000], ["proteinMg", "Protein target (g)", 1000, 10000000],
  ["carbsMg", "Carbs target (g)", 1000, 10000000], ["fatMg", "Fat target (g)", 1000, 10000000],
  ["weightGrams", "Weight goal (kg)", 1000, 1000000], ["steps", "Daily step target", 1, 1000000],
] as const;
// Session AL fourth pass (MO-001, D-077, T-137): each target's own range, checked at its field before the save (99,999 kcal,
// 5,000 g of protein and 1,000,000 steps a day were saved or came back as the storage text).
const TARGET_CHECKS: Record<typeof targetFields[number][0], HealthCheck> = { kcal: "kcal-target", proteinMg: "macro-target", carbsMg: "macro-target", fatMg: "macro-target", weightGrams: "weight-goal", steps: "steps-target" };
// Session AL (P-MO-71, MO-034): the weight goal is typed and shown in the journal's weight unit (it read "(kg)" in a pound
// journal); it is kept in grams as before. P-MO-69 (MO-164): a calorie target under 1,200 kcal is saved as typed, with a
// calm line that says it is below the floor the coach and the weekly budget keep: information, not advice.
// Session AL (P-MO-48, MO-019): a correction starts from the weight as shown ("181.7", not "181.661"); saving it unchanged
// keeps the stored grams (it no longer rewrote them by the rounding).
// Session AL (P-MO-44, MO-008, BUG-022): a weight is checked against the one limits table before the save (20 to 400 kg,
// said in the unit typed), so a value outside it is refused at the field, never as a "browser storage" failure.
// Session AL (P-NB-68, NB-202): "abc" and "-5" get the same range sentence as 0 and 5000 ("Enter a weight from 20 to 400 kg.").
const checkedWeightGrams = (typed: string, unit: WeightUnit) => { const v = validateValue("weight", typed, unit); if (!v.ok) throw Error(/^Enter a weight|^Use at most|^Choose/.test(v.error) ? v.error : (validateValue("weight", "0", unit).error ?? v.error)); return Math.round(v.value * 1000); };
// Session AL fourth pass (N-MO-14, N-NB-10): a correction starts from the reading as entered (two decimals at most).
const weightPrefill = (grams: number, unit: WeightUnit) => unit === "kg" ? String(grams / 1000) : String(Math.round(grams / 453.59237 * 100) / 100);
const goalText = (grams: number | null, unit: WeightUnit) => grams === null ? "" : String(Math.round((unit === "lb" ? grams / 453.59237 : grams / 1000) * 10) / 10);
function TargetsView({ targets, weightUnit, perform, invalid }: { targets: HealthTargets; weightUnit: WeightUnit; perform: Perform; invalid: (cause?: unknown) => void }) {
  return <section className="panel health-targets"><p className="eyebrow">YOU SET THE DIRECTION</p><h2>Targets that are yours.</h2><p>Enter targets you have chosen. There are no suggested calorie, macro or weight defaults. Leave a field blank to remove its target. {/* Session AL (P-MO-67, MO-135) */}The micronutrient lines below start from general reference intakes, which you can change.</p><FormBox title="Personal targets" onSubmit={e => { e.preventDefault(); try { const form = new FormData(e.currentTarget); const next = Object.fromEntries(targetFields.map(([key, , scale, max]) => { const raw = formString(form, key); return [key, raw.trim() === "" ? null : key === "weightGrams" ? checkedWeightGrams(raw, weightUnit) : parseHealthNumber(raw, scale, 1, max)]; })) as HealthTargets; void perform(latest => setHealthTargets(latest, next), next.kcal !== null && next.kcal < 1200 ? `Targets saved. Your calorie target of ${formatNumber(next.kcal)} kcal a day is below 1,200, the lowest the coach and the weekly budget ever suggest. Information, not advice: talk to a doctor or dietitian before eating this little.` : "Targets saved."); } catch (cause) { invalid(cause); } }}><div className="health-form-grid">{targetFields.map(([key, label, scale]) => <Checked of={`health-target-${key}`} key={key}><label className="field"><span>{key === "weightGrams" ? `Weight goal (${weightUnit})` : label}</span><input id={`health-target-${key}`} name={key} type="text" inputMode={scale === 1 ? "numeric" : "decimal"} autoComplete="off" data-check={TARGET_CHECKS[key]} data-unit={key === "weightGrams" ? weightUnit : undefined} defaultValue={key === "weightGrams" ? goalText(targets.weightGrams, weightUnit) : targets[key] === null ? "" : targets[key] / scale} /></label></Checked>)}</div><p className="fine">These current reference targets appear alongside any selected day. Past diary nutrition stays unchanged. This journal does not calculate medical or nutrition advice.</p><button className="primary" type="submit">Save targets</button></FormBox></section>;
}
/**
 * Session AK RB (RELEASE_REVIEW_2 R2-8): "Seven days of care" folds — one row on a phone (it opens in place, as Sleep and
 * Workouts do), and a closed fold on every size until two days of the week have an entry (an empty week was 35 dashes).
 * One DOM root, so it stays one layout item.
 */
function HealthWeekFold({ health, today, waterUnit, ...layout }: LayoutAttrs & { health: HealthData; today: string; waterUnit: WaterUnit }) {
  const phone = usePhoneActive(), days = loggedDaysOfWeek(healthWeek(health, today));
  const trends = <HealthTrends health={health} today={today} waterUnit={waterUnit} weightUnit={dailyData(health).preferences.weightUnit} />;
  if (phone) return <PhoneFold label="Seven days of care" {...layout}>{trends}</PhoneFold>;
  if (days >= 2) return <HealthTrends {...layout} health={health} today={today} waterUnit={waterUnit} weightUnit={dailyData(health).preferences.weightUnit} />;
  return <details {...layout} className="panel health-week-fold"><summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>Seven days of care{days ? " · 1 day with entries" : " · nothing logged this week yet"}</summary>{trends}</details>;
}
/** Session AK: a fold whose content loads only when it is opened (the weekly calorie budget, the meal photo). */
function LazyFold({ summary, children }: { summary: string; children: () => ReactNode }) {
  const [open, setOpen] = useState(false);
  return <details className="panel" onToggle={(e) => setOpen(e.currentTarget.open)}><summary style={{ minHeight: 44, display: "flex", alignItems: "center", cursor: "pointer" }}>{summary}</summary>{open && <LoadBoundary quiet><Suspense fallback={<Skeleton label="Opening…" />}>{children()}</Suspense></LoadBoundary>}</details>;
}
