"use client";
import { HealthTrends } from "../bottom-sections";
import { useHealthToday } from "./use-health-today";
import { INVISIBLE_NAME, visibleName } from "../../lib/visible-text";
import { ExerciseCounters } from "./exercise-counters";
import { NebulaFlow } from "../nebula-flow";
import { LayoutLockButton, LayoutPage, LayoutRegion, type LayoutAttrs } from "../layout-edit";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, lazy, useState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import {
  HEALTH_MEALS,foodSnapshot,recipeSnapshot,formatServingMeasure,formatNutrient,nutritionSummaryText, dailyHealthSummary, editDiaryEntry, formatHealthGrams,
  logHealthItem, newHealthId, parseHealthNumber, recipeNutrition,
  removeHealthItem, saveActivity, saveFood, saveRecipe, saveWeight, scaleNutrition,
  searchFoods, setHealthTargets, weightTrend, type HealthData, type HealthDiaryEntry,
  type HealthFood, type HealthRecipe, type HealthTargets, type Nutrition, type RecipeDraft,
} from "../../lib/health";
import { addLocalDays } from "../../lib/local-date";
import { GlassBar, GlassRing } from "../progress/glass-progress";
import { useHealth } from "./use-health";
import { useHabits } from "../habits/use-habits";
import { useAutoCheckIns } from "../habits/use-auto-checkins";
import { useFasting } from "./use-fasting";
import { FastingTimer } from "./fasting-timer";
import { BarcodeFoodLookup } from "./barcode-food-lookup";
import { useImportUndo } from "../import/use-import-undo";
import { ImportBanner } from "../import/csv-import-steps";
import { NutritionImportPanel } from "../import/nutrition-import";
import { undoNutritionImport } from "../../lib/import/nutrition";
import type { ImportRecord } from "../../lib/import/undo-schema";
import {AdditionalNutrition} from "./additional-nutrition";
import {additionalNutrients} from "../../lib/health";
import {BodyMeasurements} from "./body-measurements";
import { NutritionDashboard } from "./nutrition-dashboard";
import { HealthQuickPicks, WaterJournal, MealsAndPlanning, HealthJournalSettings } from "./daily-tools";
import { MealQuick, RepeatDay } from "./quick-log";
import { bodyWeightGrams, dailyData, servingsFromMeasure } from "../../lib/health-daily";
import { EvidenceChart } from "../platform/evidence-chart";
import {healthDateSchema} from "../../lib/health";
import {PinToToday} from "../pin-to-today";
import { PHONE_QUERY, usePhoneActive } from "../phone/use-phone-layout";
import { PhoneFormSheet } from "../phone/phone-form-sheet";
import { PhoneFold } from "../phone/phone-fold";
import { formatNumber } from "../../lib/visual-format";
import { plural } from "../../lib/plural";
import { updateRefusalMessage } from "../../lib/storage-error-copy";
import { SleepCard } from "./sleep/sleep-card";
import { healthGroupIn } from "../../lib/vault/w-homes";
import { MeditationCard } from "./meditation/meditation-card";
import { useDeviceRecord } from "../ai/use-device-record";
import { MEDITATION_RUN } from "../../lib/meditation/schema";
import { LoadBoundary } from "../load-boundary";

/** Session W Part 4: Sleep's full view, a view of this page (/app/health?view=sleep), loaded when opened. */
const SleepView = lazy(() => import("./sleep/sleep-view"));
const MeditationView = lazy(() => import("./meditation/meditation-view"));
const DevicesView = lazy(() => import("./devices/devices-view"));
/** Session W Part 7: an activity line an import or a device link brought in (its id names the source). */
const SOURCE_NAMES: Record<string, string> = {"apple-health": "Apple Health", fitbit: "Fitbit / Google Health", samsung: "Samsung Health", oura: "Oura", garmin: "Garmin", "oura-link": "Oura (linked)", "withings-link": "Withings (linked)", "polar-link": "Polar (linked)", "strava-link": "Strava (linked)"};
function importedFrom(id: string): string | null { const m = /^health_imp-([a-z]+(?:-[a-z]+)?)-[0-9a-f]{16}$/.exec(id); return m ? SOURCE_NAMES[m[1]!] ?? null : null; }

type Update = ReturnType<typeof useHealth>["update"];
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const views = ["Diary", "Foods & recipes", "Meals & planning", "Weight", "Measurements", "Activity", "Targets", "Journal settings"] as const;
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
function NumberField({ label, name, value, onChange, step = "1", required = true }: {
  label: string; name?: string; value?: string; onChange?: (value: string) => void; step?: string; required?: boolean;
}) {
  return <label className="field"><span>{label}</span><input type="text" inputMode={step === "1" ? "numeric" : "decimal"} autoComplete="off" name={name} value={value} onChange={onChange ? e => onChange(e.target.value) : undefined} required={required} /></label>;
}
function MealField({ name = "meal", value, onChange }: { name?: string; value?: string; onChange?: (value: HealthDiaryEntry["meal"]) => void }) {
  return <label className="field"><span>Meal</span><select aria-label="Meal" name={name} value={value} onChange={onChange ? e => onChange(e.target.value as HealthDiaryEntry["meal"]) : undefined}>{HEALTH_MEALS.map(meal => <option key={meal}>{meal}</option>)}</select></label>;
}
function NutrientLine({ nutrients }: { nutrients: Nutrition }) {
  return <span className="health-nutrient-line">{formatNutrient(nutrients.kcal)} kcal <span>· P {formatHealthGrams(nutrients.proteinMg)} g · C {formatHealthGrams(nutrients.carbsMg)} g · F {formatHealthGrams(nutrients.fatMg)} g</span></span>;
}
function FormBox({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form aria-label={title} className="health-form" onSubmit={onSubmit}>{children}</form>;
}
const formString = (form: FormData, key: string) => String(form.get(key) ?? "");
/** How many meal groups (Breakfast, Lunch…) have entries on a date. */
const groupsOn = (data: HealthData, date: string) => new Set(data.diary.filter(entry => entry.date === date).map(entry => entry.meal)).size;
const formNumber = (form: FormData, key: string, scale: 1 | 1000, min: number, max: number) => parseHealthNumber(formString(form, key), scale, min, max);

export function HealthApp() {
  const store = useHealth();
  // H7: linked habits tick themselves off from this journal while it is open.
  const habits = useHabits();
  useAutoCheckIns({ habits, health: store });
  const params = useSearchParams();
  // Session W Part 8: a linked service sends the person back to /app/health with its code (or refusal) and the state;
  // the Devices view reads and removes them.
  const view = params.get("view") ?? (params.has("state") && (params.has("code") || params.has("error")) ? "devices" : null);
  if (!store.loaded) return <section className="panel"><h1>Health</h1><p>Loading your private health journal…</p></section>;
  if (store.error) return <section className="panel"><h1>Health</h1><p role="alert">{store.error}</p><div className="actions"><button className="secondary" onClick={store.refresh}>Retry reading data</button><Link className="secondary" href="/app/settings">Open backup settings</Link></div></section>;
  if (view === "sleep") return <LoadBoundary title="Sleep" label="Sleep"><Suspense fallback={<section className="panel"><h1>Sleep</h1><p>Opening Sleep…</p></section>}><SleepView /></Suspense></LoadBoundary>;
  if (view === "meditation") return <LoadBoundary title="Meditation" label="Meditation"><Suspense fallback={<section className="panel"><h1>Meditation</h1><p>Opening Meditation…</p></section>}><MeditationView /></Suspense></LoadBoundary>;
  if (view === "devices") return <LoadBoundary title="Devices" label="Devices"><Suspense fallback={<section className="panel"><h1>Devices</h1><p>Opening Devices…</p></section>}><DevicesView /></Suspense></LoadBoundary>;
  return <HealthWorkspace data={store.data} update={store.update} />;
}

function HealthWorkspace({ data, update }: { data: HealthData; update: Update }) {
  const [view, setView] = useState<View>("Diary");
  const router = useRouter(), phone = usePhoneActive();
  // HE6: the fasting timer, this device's own record.
  const fasting = useFasting();
  // Session W Part 4: on a phone the Sleep card folds like the fasting timer, and stays open while a night runs.
  const sleepRunning = (healthGroupIn(data, "sleep")?.nights ?? []).some(n => n.end === null);
  // Session W Part 5: the Meditation card folds the same way, open while a session runs on this device.
  const meditationRunning = !!useDeviceRecord(MEDITATION_RUN).data.run;
  // I1: meals from a nutrition CSV (phone: a sheet; desktop: inside the Diary details), with this device's undo ledger.
  const [importingCsv, setImportingCsv] = useState(false), imports = useImportUndo();
  const undoRecord = async (record: ImportRecord) => { await update(d => undoNutritionImport(d, record).data); imports.forget(record.id); };
  // On a phone, Log a meal is a bottom sheet (Session I, Part 9); a Quick Add for a meal opens it.
  const [logging, setLogging] = useState(false);
  const searchParams=useSearchParams(),pinnedDate=healthDateSchema.safeParse(searchParams.get("date"));
  const addIntent = searchParams.get("add") === "entry";
  const [handledIntent, setHandledIntent] = useState(false);
  // A same-page Quick Add is a new intent, not a new Health store.
  if (addIntent !== handledIntent) {
    setHandledIntent(addIntent);
    if (addIntent) setView("Diary");
  }
  // Session W Part 7: Settings → Switch to ZIGoals sends MyFitnessPal and Cronometer files here (?import=meals).
  const importIntent = searchParams.get("import") === "meals";
  const [handledImport, setHandledImport] = useState(false);
  if (importIntent !== handledImport) {
    setHandledImport(importIntent);
    if (importIntent) { setView("Diary"); setImportingCsv(true); }
  }
  useEffect(() => { if (importIntent) document.getElementById("import-meals")?.scrollIntoView({ block: "start", behavior: "instant" }); }, [importIntent]);
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
  const [date, setDate] = useState(() => pinnedDate.success?pinnedDate.data:today);
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
  const [error, setError] = useState("");
  const perform: Perform = async (updater, success, after) => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(""); setMessage("");
    try { await update(updater); setMessage(success); after?.(); }
    catch (error) { setError(updateRefusalMessage(error, "Could not save this change. Check your entries and available browser storage, then try again.")); }
    finally { saving.current = false; setBusy(false); }
  };
  // A name with nothing visible gets its own message (QA-32); every other refusal keeps the fields message.
  const invalid = (cause?: unknown) => setError(cause instanceof Error && cause.message === INVISIBLE_NAME ? cause.message : "Check the highlighted fields. Enter finite numbers within the displayed ranges, with up to three decimal places for grams, kilograms and servings.");
  const summary = dailyHealthSummary(data, date);
  const dateControl = <div className="health-date"><button className="quiet" aria-label="Previous day" disabled={date <= "1900-01-01"} onClick={() => chooseDate(addLocalDays(date, -1))}>←</button><label className="field"><span>Journal date</span><input type="date" min="1900-01-01" max="2199-12-31" value={date} onChange={e => { if (e.target.value >= "1900-01-01" && e.target.value <= "2199-12-31") chooseDate(e.target.value); }} /></label><button className="quiet" aria-label="Next day" disabled={date >= "2199-12-31"} onClick={() => chooseDate(addLocalDays(date, 1))}>→</button><button className="quiet" onClick={() => chooseDate(today)}>Today</button></div>;
  return <LayoutPage page="health"><div className="health-page">
    {!phone && <ExerciseCounters data={data} update={update} />}
    <div className="page-heading"><div><p className="eyebrow page-eyebrow"><NebulaFlow identity="health-eyebrow">YOUR EVERYDAY WELLBEING</NebulaFlow></p><h1><NebulaFlow identity="health-title">A little care, every day.</NebulaFlow></h1><p className="page-lede">Your food, water, movement and progress. Your private journal.</p></div><div className="actions"><button type="button" className="primary" onClick={() => { setView("Diary"); requestAnimationFrame(() => document.getElementById("health-entry-action")?.scrollIntoView({ block: "start", behavior: "instant" })); }}>Log food or water</button><Link className="badge" href="/app/settings">Privacy &amp; backups</Link><LayoutLockButton/></div></div>
    {/* On a phone the title comes first, then the journal date it drives, then the quick counters (desktop keeps
        the counters at the top, Part 18.6, and the date beside the views). */}
    {phone && <div className="health-date-strip">{dateControl}</div>}
    {phone && <ExerciseCounters data={data} update={update} />}
    <LayoutRegion region="body" items={[
    {id: "health:summary", label: "Today’s nourishment", node: <HealthSummary data={data} date={date} today={today} onTargets={() => setView("Targets")} />},
    {id: "health:nutrition", label: "Nutrition patterns", node: <NutritionDashboard data={data} date={date} />},
    {id: "health:journal", label: "Your Health journal", node: <div className="health-journal-block">
    <div className="health-toolbar"><nav className="health-views" aria-label="Health views">{views.map(tab => <button type="button" key={tab} aria-pressed={view === tab} onClick={() => { setView(tab); setError(""); setMessage(""); }}>{tab}</button>)}</nav>
      {!phone && dateControl}
    </div>
    <p className="health-feedback" role="status" aria-live="polite">{busy ? "Saving to this browser…" : message}</p>{error && !(phone && logging) && <p className="health-error" role="alert">{error}</p>}
    <ImportBanner imports={imports} kind="nutrition" onUndo={undoRecord} />

    <fieldset className="health-content" disabled={busy}>
      {view === "Diary" && <><DiaryView data={data} date={date} today={today} choice={dateChoice} perform={perform} invalid={invalid} onLibrary={() => setView("Foods & recipes")} phone={phone} error={error} logging={logging} setLogging={setLogging} /><details><summary>Scan or look up a food barcode</summary><BarcodeFoodLookup date={date} update={update}/></details><details className="import-entry" id="import-meals" open={importingCsv || undefined}><summary>Import a nutrition CSV</summary><p>From any app’s export with a header row. Read on this device only.</p>{(() => { const panel = importingCsv && <NutritionImportPanel data={data} update={update} imports={imports} onUndo={undoRecord} onClose={() => setImportingCsv(false)} />; return !panel ? <button type="button" className="secondary" onClick={() => setImportingCsv(true)}>Choose a file</button> : phone ? <PhoneFormSheet title="Import meals" onClose={() => setImportingCsv(false)}>{panel}</PhoneFormSheet> : panel; })()}</details></>}
      {view === "Meals & planning" && <MealsAndPlanning key={dateChoice} data={data} date={date} perform={perform} invalid={invalid} />}
      {view === "Journal settings" && <HealthJournalSettings data={data} date={date} perform={perform} invalid={invalid} />}
      {view === "Foods & recipes" && <LibraryView data={data} perform={perform} invalid={invalid} />}
      {view === "Measurements" && <BodyMeasurements data={data} perform={perform}/>}
      {view === "Weight" && <WeightView data={data} date={date} choice={dateChoice} perform={perform} invalid={invalid} onDate={chooseDate} />}
      {view === "Activity" && <ActivityView data={data} date={date} choice={dateChoice} perform={perform} invalid={invalid} />}
      {view === "Targets" && <TargetsView key={JSON.stringify(data.targets)} targets={data.targets} perform={perform} invalid={invalid} />}
    </fieldset>
    </div>},
    {id: "health:sleep", label: "Sleep", node: <PhoneFold label="Sleep" expanded={sleepRunning}><SleepCard /></PhoneFold>},
    {id: "health:meditation", label: "Meditation", node: <PhoneFold label="Meditation" expanded={meditationRunning}><MeditationCard /></PhoneFold>},
    {id: "health:roadmap", label: "Next on your Health journey", node: <section className="health-roadmap" aria-label="Planned Health features"><header><p className="eyebrow">A HEALTHIER ROUTINE, WITH LESS EFFORT</p><h2>Next on your Health journey</h2><p>Planned for Beta. Your working journal above is ready today.</p></header><div className="health-roadmap-grid"><article><span aria-hidden="true">▥</span><div><strong>Barcode scan</strong><p>Bring food labels into your diary faster.</p><b>Manual entry and on-device decoding · Provider activation pending</b></div></article><article><span aria-hidden="true">⌚</span><div><strong>Your devices</strong><p>A Bluetooth heart-rate monitor or scale, and exports from Apple Health, Fitbit, Samsung Health and Oura. <a className="text-link" href="/app/health?view=devices">Open Devices</a>{/* eslint-disable-line @next/next/no-html-link-for-pages -- a full load: Health's camera and Bluetooth policy applies to its own document */}</p><b>Available · Linked accounts need setup</b></div></article><article><span aria-hidden="true">◎</span><div><strong>A photo, a food entry</strong><p>Food recognition is on the roadmap.</p><b>Coming soon · Not available yet</b></div></article></div></section>},
    {id: "health:fasting", label: "Fasting timer", node: <PhoneFold label="Fasting timer" expanded={!!fasting.running}><FastingTimer fasting={fasting} health={data} /></PhoneFold>},
    {id: "health:trends", label: "Seven days of care", node: <HealthTrends health={data} today={today} />},
    ]}/>
    <p className="health-private-note">Only the entries you add are counted. {summary.entries ? "Diary nutrition uses saved food snapshots." : "No meal entries for this date yet."} Private Health backups are in <Link href="/app/settings">Settings</Link>.</p>
  </div></LayoutPage>;
}

function HealthSummary({ data, date, today, onTargets, ...layout }: LayoutAttrs & { data: HealthData; date: string; today: string; onTargets: () => void }) {
  const summary = dailyHealthSummary(data, date);
  const kcal = summary.nutrients.kcal;
  const target = data.targets.kcal;
  const progress = target && kcal!==null ? Math.min(1, kcal / target) : 0;
  return <section {...layout} className="panel health-summary" aria-label="Daily nutrition summary">
    <PinToToday label="Daily nutrition" choices={[{kind:'health',metric:'kcal',label:'Meals today'},{kind:'health',metric:'macros',label:'Macros today'}]}/>
    <div className="health-aurora" aria-hidden="true"><i /><i /><i /></div>
    <GlassRing identity="health-gauge" className="health-gauge" arcs={[{ key: "kcal", end: progress * 100 }]}><div><strong>{formatNutrient(kcal)}</strong><span>kcal logged</span></div></GlassRing>
    <div className="health-summary-main"><p className="eyebrow">{date === today ? "TODAY’S NOURISHMENT" : date}</p><h2>{summary.entries ? <NebulaFlow identity="health-summary-title">Every entry adds perspective.</NebulaFlow> : "Start with one small entry."}</h2><p>{target ? `${formatNumber(target)} kcal target` : "No calorie target set"}</p>{target && kcal!==null ? <p className="fine">{kcal <= target ? `${formatNumber((target - kcal))} kcal remaining to your target` : `${formatNumber((kcal - target))} kcal above your target`}</p> : <button className="text-link health-inline-button" onClick={onTargets}>Set your own targets →</button>}{kcal===null&&<p className="fine">{nutritionSummaryText(summary,"kcal","kcal")}. Total and target comparison unavailable.</p>}<p className="health-daily-facts">{groupsOn(data, date)}{` ${plural(groupsOn(data, date), "meal group")} · `}{summary.entries}{` ${plural(summary.entries, "entry", "entries")}`}{summary.steps > 0 ? ` · ${formatNumber(summary.steps)} steps logged` : ""}{summary.minutes > 0 ? ` · ${summary.minutes} min movement` : ""}</p><button className="quiet" onClick={onTargets}>Edit personal targets</button></div>
    <div className="health-macro-grid">{([ ["Protein", "proteinMg"], ["Carbs", "carbsMg"], ["Fat", "fatMg"] ] as const).map(([label, key]) => {
      const personalTarget = data.targets[key];
      return <div className={`health-macro health-macro-${key}`} key={key}><span>{label}</span><strong>{nutritionSummaryText(summary,key,"g",1000)}</strong><GlassBar identity={`health-macro:${key}`} className="health-meter" aria-hidden="true" value={personalTarget && summary.nutrients[key]!==null ? summary.nutrients[key]! / personalTarget : 0} /><small>{personalTarget ? `${formatHealthGrams(personalTarget)} g target` : "Target not set"}</small></div>;
    })}</div><AdditionalNutrition entries={data.diary.filter(e=>e.date===date)} label="Daily nutrient details"/>
  </section>;
}

function DiaryView({ data, date, today, choice, perform, invalid, onLibrary, phone, error, logging, setLogging }: { data: HealthData; date: string; today: string; choice: number; perform: Perform; invalid: (cause?: unknown) => void; onLibrary: () => void; phone: boolean; error: string; logging: boolean; setLogging: (open: boolean) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<HealthDiaryEntry["meal"]>("Breakfast");
  const [entryUnit, setEntryUnit] = useState("servings");
  const logOperation = useRef<string | null>(null);
  const sourceItems = [...data.foods.map(f => ({ ...f, kind: "food" as const })), ...data.recipes.map(r => ({ ...r, kind: "recipe" as const }))];
  const selected = data.foods.find(s=>s.id===source)??data.recipes.find(s=>s.id===source);
  let preview: Nutrition | null = null;
  try { if (selected) preview = scaleNutrition("ingredients" in selected ? recipeNutrition(selected) : selected.nutrients, (entryUnit !== "servings" ? servingsFromMeasure(servings, "ingredients" in selected ? recipeSnapshot(selected) : selected,entryUnit==="grams"?"g":"ml") : parseHealthNumber(servings, 1000, 1, 1_000_000))); } catch { /* Incomplete form values have no calculated preview. */ }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (!selected) return invalid();
      const quantityMilli = entryUnit !== "servings" ? servingsFromMeasure(servings, "ingredients" in selected ? recipeSnapshot(selected) : selected,entryUnit==="grams"?"g":"ml") : parseHealthNumber(servings, 1000, 1, 1_000_000);
      logOperation.current ??= newHealthId();
      const draft = { id: logOperation.current, sourceId: selected.id, sourceKind: "ingredients" in selected ? "recipe" as const : "food" as const, date, meal, quantityMilli };
      void perform(latest => logHealthItem(latest, draft, new Date().toISOString()), "Meal logged.", () => { setServings(entryUnit !== "servings" ? "" : "1"); logOperation.current = null; setLogging(false); });
    } catch (cause) { invalid(cause); }
  };
  const quickPicks = sourceItems.length > 0 && <HealthQuickPicks data={data} perform={perform} onChoose={(id, quantity) => { setSource(id); setServings(String(quantity / 1000)); setEntryUnit("servings"); logOperation.current = null; }} />;
  const mealForm = <>{sourceItems.length ? <FormBox title="Log a meal" onSubmit={submit}>
    <label className="field"><span>Food or recipe</span><select data-sheet-focus required value={source} onChange={e => setSource(e.target.value)}><option value="">Choose from your library</option>{sourceItems.map(s => <option value={s.id} key={s.id}>{s.name} · {s.kind}</option>)}</select></label>
    <div className="health-form-grid"><MealField value={meal} onChange={setMeal} /><label className="field"><span>Quantity unit</span><select aria-label="Quantity unit" value={entryUnit} onChange={e => { setEntryUnit(e.target.value); setServings(""); logOperation.current = null; }}><option value="servings">Servings</option><option value="grams">Grams</option><option value="millilitres">Millilitres</option></select></label><NumberField label={entryUnit === "grams" ? "Food weight (g)" : entryUnit==="millilitres"?"Food volume (mL)":"Servings"} value={servings} onChange={v => { setServings(v); logOperation.current = null; }} step="0.001" /></div>{preview && <div className="health-preview"><NutrientLine nutrients={preview} /></div>}<button className="primary" type="submit">Log to diary</button><p className="fine">Logging for {date}. Measured entries use the saved serving unit, rounded to 0.001 serving. Weight and volume never convert without density evidence.</p>
  </FormBox> : <><p>Build a food library from the nutrition labels you use, then add meals here.</p><button className="primary" onClick={onLibrary}>Add your first food</button></>}</>;
  const logForm = <>{quickPicks}{mealForm}</>;
  return <div className="health-diary-layout"><div className="health-meals"><RepeatDay data={data} date={date} today={today} perform={perform} />{HEALTH_MEALS.map(mealName => {
    const entries = data.diary.filter(e => e.date === date && e.meal === mealName);
    const mealSummary=dailyHealthSummary({...data,diary:entries},date);
    return <section className="panel health-meal" id={`diary-${mealName.toLowerCase()}`} aria-label={`${mealName} diary`} key={mealName}><div className="health-section-heading"><h2>{mealName}</h2><span>{nutritionSummaryText(mealSummary,"kcal","kcal")}</span><PinToToday label={`${mealName} today`} choices={[{kind:'meal',entity:mealName,metric:'kcal',label:`${mealName} today calories`},{kind:'meal',entity:mealName,metric:'macros',label:`${mealName} today macros`}]}/></div>{entries.length === 0 ? <p className="health-empty-inline">Nothing logged yet.</p> : entries.map(entry => <div className="health-entry" id={`entry-${entry.id}`} key={entry.id}>
      <div className="health-entry-main"><strong>{entry.snapshot.name}</strong><small>{formatHealthGrams(entry.quantityMilli)}{` ${plural(entry.quantityMilli / 1000, "serving")} · `}{formatServingMeasure(entry.snapshot,entry.quantityMilli)}{entry.snapshot.recipeVersion?` · Recipe version ${entry.snapshot.recipeVersion}`:""}</small><NutrientLine nutrients={scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli)} /></div><div className="health-row-actions" style={{marginLeft:"auto"}}><button className="quiet" aria-label={`Edit ${entry.snapshot.name}`} onClick={() => setEditing(editing === entry.id ? null : entry.id)}>Edit</button><button className="quiet" aria-label={`Remove ${entry.snapshot.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "diary", entry.id), "Diary entry removed.")}>Remove</button><PinToToday label={`${entry.snapshot.name} diary entry`} choices={[{kind:'food-entry',entity:entry.id,metric:'kcal',label:`${entry.snapshot.name} calories`},{kind:'food-entry',entity:entry.id,metric:'macros',label:`${entry.snapshot.name} macros`}]}/></div>
      {editing === entry.id && <DiaryEditor entry={entry} perform={perform} invalid={invalid} close={() => setEditing(null)} />}
    </div>)}{entries.length>0&&<AdditionalNutrition entries={entries} label={`${mealName} nutrient totals`}/>}<MealQuick data={data} date={date} today={today} meal={mealName} perform={perform} /></section>;
  })}</div><aside className="health-diary-side"><section className="panel" id="health-entry-action"><p className="eyebrow">A MOMENT TO CHECK IN</p><h2>Log a meal.</h2>{phone && sourceItems.length > 0 ? <><button type="button" className="primary phone-form-trigger" onClick={() => setLogging(true)}>Log a meal</button>{logging && <PhoneFormSheet title="Log a meal" onClose={() => setLogging(false)}>{mealForm}{error && <p className="health-error" role="alert">{error}</p>}{quickPicks}</PhoneFormSheet>}</> : logForm}</section><WaterJournal key={`${choice}:${dailyData(data).preferences.waterUnit}`} data={data} date={date} perform={perform} invalid={invalid} /></aside></div>;
}

function DiaryEditor({ entry, perform, invalid, close }: { entry: HealthDiaryEntry; perform: Perform; invalid: (cause?: unknown) => void; close: () => void }) {
  const [quantity, setQuantity] = useState(String(entry.quantityMilli / 1000));
  const [date, setDate] = useState(entry.date);
  const [meal, setMeal] = useState(entry.meal);
  return <FormBox title="Edit diary entry" onSubmit={e => { e.preventDefault(); try { const quantityMilli = parseHealthNumber(quantity, 1000, 1, 1_000_000); void perform(latest => editDiaryEntry(latest, entry.id, { date, meal, quantityMilli }, new Date().toISOString()), "Diary entry updated.", close); } catch (cause) { invalid(cause); } }}>
    <div className="health-form-grid"><label className="field"><span>Entry date</span><input type="date" required min="1900-01-01" max="2199-12-31" value={date} onChange={e => setDate(e.target.value)} /></label><MealField value={meal} onChange={setMeal} /><NumberField label="Servings" value={quantity} onChange={setQuantity} step="0.001" /></div><p className="fine">Corrections use the nutrition originally saved with this entry.</p><div className="actions"><button className="primary" type="submit">Save entry</button><button className="quiet" type="button" onClick={close}>Cancel</button></div>
  </FormBox>;
}

function LibraryView({ data, perform, invalid }: { data: HealthData; perform: Perform; invalid: (cause?: unknown) => void }) {
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<HealthFood | "new" | null>(null);
  const [recipe, setRecipe] = useState<HealthRecipe | "new" | null>(null);
  const foods = searchFoods(data.foods, query);
  const recipes = data.recipes.filter(r => r.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="health-library"><div className="health-section-heading"><div><h2>Your kitchen library.</h2><p>Foods and recipes you add, with nutrition from your own labels.</p></div><div className="actions"><button className="primary" onClick={() => { setFood("new"); setRecipe(null); }}>New food</button><button className="secondary" onClick={() => { setRecipe("new"); setFood(null); }}>New recipe</button></div></div>
    {food && <FoodEditor key={food === "new" ? "new" : food.id} food={food === "new" ? null : food} perform={perform} invalid={invalid} close={() => setFood(null)} />}
    {recipe && <RecipeEditor key={recipe === "new" ? "new" : recipe.id} recipe={recipe === "new" ? null : recipe} data={data} perform={perform} invalid={invalid} close={() => setRecipe(null)} />}
    <label className="field health-search"><span>Search your foods and recipes</span><input type="search" maxLength={200} placeholder="Search by name or brand" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="health-library-grid"><section className="panel"><div className="health-section-heading"><h2>Foods</h2><span>{data.foods.length} saved</span></div>{foods.length ? foods.map(f => <article className="health-library-row" key={f.id}><div><h3>{f.name}</h3><p className="fine">{f.brand ? `${f.brand} · ` : ""}{formatServingMeasure(f)} per serving</p><NutrientLine nutrients={f.nutrients} /></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit food ${f.name}`} onClick={() => { setFood(f); setRecipe(null); }}>Edit</button><button className="quiet" aria-label={`Remove food ${f.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "foods", f.id), "Food removed. Existing recipes and diary entries are preserved.")}>Remove</button></div></article>) : <p className="health-empty-inline">{query ? "No matching foods." : "Your library starts with your first food."}</p>}</section>
    <section className="panel"><div className="health-section-heading"><h2>Recipes</h2><span>{data.recipes.length} saved</span></div>{recipes.length ? recipes.map(r => <article className="health-library-row" key={r.id}><div><h3>{r.name}</h3><p className="fine">Makes {formatHealthGrams(r.portionsMilli)}{` ${plural(r.portionsMilli / 1000, "serving")} · `}{r.ingredients.length}{` ${plural(r.ingredients.length, "ingredient")} · Version `}{r.revision??1}{r.yield?` · Measured yield ${r.yield.quantityMilli/1000} ${r.yield.unit}`:""}</p><NutrientLine nutrients={recipeNutrition(r)} /><details className="health-recipe-ingredients"><summary>View ingredients</summary><ul>{r.ingredients.map((ingredient, i) => <li key={i}>{ingredient.snapshot.name} · {formatHealthGrams(ingredient.quantityMilli)}{` ${plural(ingredient.quantityMilli / 1000, "serving")}`}</li>)}</ul></details></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit recipe ${r.name}`} onClick={() => { setRecipe(r); setFood(null); }}>Edit</button><button className="quiet" aria-label={`Remove recipe ${r.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "recipes", r.id), "Recipe removed. Existing diary entries are preserved.")}>Remove</button></div></article>) : <p className="health-empty-inline">{query ? "No matching recipes." : "Combine your foods into a recipe you can log again."}</p>}</section></div>
    <p className="fine">Saved recipes keep their original ingredient nutrition. Editing a recipe rebuilds it from the current food library. Existing diary entries always keep their saved nutrition.</p>
  </div>;
}

function FoodEditor({ food, perform, invalid, close }: { food: HealthFood | null; perform: Perform; invalid: (cause?: unknown) => void; close: () => void }) {
  const [name, setName] = useState(food?.name ?? "");
  const [brand, setBrand] = useState(food?.brand ?? "");
  const [basis, setBasis] = useState("serving");
  const [weight, setWeight] = useState(food ? String(food.servingGrams??food.servingMl??"") : "");
  const [measureUnit,setMeasureUnit]=useState(food?.servingMl!==undefined?"ml":"g");
  const [values, setValues] = useState<Record<typeof foodFields[number][0], string>>({ kcal: food?.nutrients.kcal!=null ? String(food.nutrients.kcal) : "", proteinMg: food?.nutrients.proteinMg!=null ? String(food.nutrients.proteinMg / 1000) : "", carbsMg: food?.nutrients.carbsMg!=null ? String(food.nutrients.carbsMg / 1000) : "", fatMg: food?.nutrients.fatMg!=null ? String(food.nutrients.fatMg / 1000) : "" });
  const [extras,setExtras]=useState<Record<string,string>>(Object.fromEntries(additionalNutrients.map(([key,,,scale])=>[key,food?.nutrients[key]===undefined?'':String(food.nutrients[key]!/scale)])));
  return <section className="panel health-editor"><h2>{food ? "Edit food" : "Add a food"}</h2><p>Choose the label basis and enter every known value. Enter 0 only when the label says zero. Leave any nutrient blank when the label does not provide it; blank is saved as unknown, never zero.</p><FormBox title="Food details" onSubmit={e => { e.preventDefault(); try {
    const at = new Date().toISOString();
    const labelNutrients = Object.fromEntries(foodFields.map(([key, , scale, max]) => [key, values[key].trim()?parseHealthNumber(values[key], scale, 0, max):null])) as Nutrition;
    for(const [key,,,scale]of additionalNutrients)if(extras[key]?.trim())labelNutrients[key]=parseHealthNumber(extras[key]!,scale,0,1_000_000_000);
    const servingAmount = parseHealthNumber(weight, 1, 1, 100_000);
    const nutrients = basis !== "serving" ? scaleNutrition(labelNutrients, servingAmount * 10) : labelNutrients;
    const draft = { id: food?.id ?? newHealthId(), name: visibleName(name), brand, servingGrams:measureUnit==="g"?servingAmount:null,...(measureUnit==="ml"?{servingMl:servingAmount}:{}), nutrients, createdAt: food?.createdAt ?? at, updatedAt: at };
    void perform(latest => saveFood(latest, draft), "Food saved.", close);
  } catch (cause) { invalid(cause); } }}><div className="health-form-grid"><label className="field"><span>Food name</span><input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label className="field"><span>Brand (optional)</span><input maxLength={80} value={brand} onChange={e => setBrand(e.target.value)} /></label><label className="field"><span>Nutrition label basis</span><select value={basis} onChange={e => {setBasis(e.target.value);if(e.target.value!=="serving")setMeasureUnit(e.target.value==="100g"?"g":"ml");}}><option value="serving">Per serving</option><option value="100g">Per 100 g</option><option value="100ml">Per 100 mL</option></select></label><label className="field"><span>Serving measure unit</span><select value={measureUnit} disabled={basis!=="serving"} onChange={e=>setMeasureUnit(e.target.value)}><option value="g">Grams</option><option value="ml">Millilitres</option></select></label><NumberField label={measureUnit==="g"?"Serving weight (g)":"Serving volume (mL)"} value={weight} onChange={setWeight} />{foodFields.map(([key, label, scale]) => <NumberField key={key} label={label} required={false} value={values[key]} onChange={value => setValues(old => ({ ...old, [key]: value }))} step={scale === 1 ? "1" : "0.001"} />)}</div><details><summary>Additional label nutrients (optional)</summary><p>Enter only values supplied by the label.</p><div className="health-form-grid">{additionalNutrients.map(([key,label,unit,scale])=><NumberField key={key} label={`${label} (${unit})`} value={extras[key]??""} onChange={value=>setExtras(old=>({...old,[key]:value}))} required={false} step={scale===1?"1":"0.001"}/>)}</div></details><div className="actions"><button className="primary" type="submit">Save food</button><button className="quiet" type="button" onClick={close}>Cancel</button></div></FormBox></section>;
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
  return <section className="panel health-editor"><h2>{recipe ? "Edit recipe" : "Build a recipe"}</h2><p>Add constituent foods in their label servings. Totals are divided by the servings the recipe makes.</p>{data.foods.length === 0 ? <><p>Add a food before building a recipe.</p><button className="quiet" onClick={close}>Close recipe</button></> : <FormBox title="Recipe details" onSubmit={e => { e.preventDefault(); try { const draft = { ...buildDraft(), name: visibleName(name) }; void perform(latest => saveRecipe(latest, draft, new Date().toISOString()), "Recipe saved.", close); } catch (cause) { invalid(cause); } }}>
    <div className="health-form-grid"><label className="field"><span>Recipe name</span><input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><NumberField label="Recipe makes (servings)" value={portions} onChange={setPortions} step="0.001" /><label className="field"><span>Measured recipe yield unit</span><select value={yieldUnit} onChange={e=>setYieldUnit(e.target.value as "g"|"ml")}><option value="g">Grams</option><option value="ml">Millilitres</option></select></label><NumberField label="Measured total recipe yield" value={yieldAmount} onChange={setYieldAmount} required={false} step="0.001" /></div><p className="fine">Optional: enter the measured finished recipe yield. Without it, volume is unknown; ingredient weights are used only when every ingredient has a recorded mass.</p>
    {items.map((item, index) => <div className="health-ingredient" key={index}><label className="field"><span>Ingredient {index + 1}</span><select required value={item.foodId} onChange={e => setItems(old => old.map((v, i) => i === index ? { ...v, foodId: e.target.value } : v))}><option value="">Choose a food</option>{item.foodId && !data.foods.some(f => f.id === item.foodId) && <option value={item.foodId}>Removed food — choose a replacement</option>}{data.foods.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label><NumberField label={`Ingredient servings ${index + 1}`} value={item.servings} onChange={value => setItems(old => old.map((v, i) => i === index ? { ...v, servings: value } : v))} step="0.001" /><button className="quiet" type="button" disabled={items.length === 1} aria-label={`Remove ingredient ${index + 1}`} onClick={() => setItems(old => old.filter((_, i) => i !== index))}>Remove</button></div>)}
    <button className="secondary" type="button" disabled={items.length >= 100} onClick={() => setItems(old => [...old, { foodId: "", servings: "1" }])}>Add ingredient</button>{preview && <div className="health-preview"><strong>{formatNutrient(preview.kcal)} kcal per serving</strong><NutrientLine nutrients={preview} /></div>}<p className="fine">Kcal and nutrient milligrams round once per recipe serving. Serving measures round to whole grams or millilitres. Each save creates a recipe version; past diary and saved-meal snapshots keep their original version.</p><div className="actions"><button className="primary" type="submit" disabled={!preview}>Save recipe</button><button className="quiet" type="button" onClick={close}>Cancel</button></div>
  </FormBox>}</section>;
}

function WeightView({ data, date, choice, perform, invalid, onDate }: { data: HealthData; date: string; choice: number; perform: Perform; invalid: (cause?: unknown) => void; onDate: (date: string) => void }) {
  const reading = data.weights.find(w => w.date === date);
  const unit = dailyData(data).preferences.weightUnit;
  const trend = weightTrend(data, date);
  const history = [...data.weights].sort((a, b) => b.date.localeCompare(a.date));
  return <div className="health-two-columns"><div><section className="panel health-weight-overview"><PinToToday label="Weight journal" choices={[{kind:'health',metric:'weight',label:'Latest weight'}]}/><p className="eyebrow">A LONGER VIEW</p><h2>Your weight journal.</h2><p>Individual readings can vary. See what you recorded over time.</p><div className="health-weight-stats"><div><span>Latest in 30 days</span><strong>{trend.latestGrams === null ? "—" : `${formatHealthGrams(trend.latestGrams)} kg`}</strong></div><div><span>Your weight goal</span><strong>{data.targets.weightGrams === null ? "Not set" : `${formatHealthGrams(data.targets.weightGrams)} kg`}</strong></div><div><span>30-day change</span><strong>{trend.changeGrams === null ? "—" : `${trend.changeGrams > 0 ? "+" : ""}${formatHealthGrams(trend.changeGrams)} kg`}</strong></div></div>
    <WeightChart data={data} date={date} /><p className="fine">{trend.count ? `${trend.count} readings in the 30 days ending ${date}. Average ${formatHealthGrams(trend.averageGrams!)} kg.` : "Add your first reading to start a trend."}</p></section>
    <section className="panel health-weight-history"><h2>Weight history</h2>{history.length ? <div className="health-table-wrap"><table aria-label="Weight history"><thead><tr><th>Date</th><th>Weight</th><th><span className="health-sr-only">Actions</span></th></tr></thead><tbody>{history.slice(0, 100).map(w => <tr key={w.id}><td>{w.date}</td><td>{formatHealthGrams(w.grams)} kg</td><td><div className="health-row-actions"><button className="quiet" aria-label={`Edit weight for ${w.date}`} onClick={() => onDate(w.date)}>Edit</button><button className="quiet" aria-label={`Remove weight for ${w.date}`} onClick={() => void perform(latest => removeHealthItem(latest, "weights", w.id), "Weight entry removed.")}>Remove</button></div></td></tr>)}</tbody></table>{history.length > 100 && <p className="fine">Showing the latest 100 readings. All readings remain in your private backup.</p>}</div> : <p className="health-empty-inline">No weight readings yet.</p>}</section></div>
    <section className="panel health-fit-panel"><h2>{reading ? "Correct a reading." : "Add a reading."}</h2><p>{date} · One reading per day; saving again corrects that day.</p><FormBox key={`${choice}:${reading?.updatedAt ?? "new"}`} title="Weight entry" onSubmit={e => { e.preventDefault(); try { const grams = bodyWeightGrams(formString(new FormData(e.currentTarget), "weight"), unit); void perform(latest => saveWeight(latest, { id: reading?.id ?? newHealthId(), date, grams }, new Date().toISOString()), "Weight saved."); } catch (cause) { invalid(cause); } }}><label className="field"><span>Weight ({unit})</span><input name="weight" type="text" inputMode="decimal" autoComplete="off" required defaultValue={reading ? unit === "kg" ? reading.grams / 1000 : (reading.grams / 453.59237).toFixed(3) : ""} /></label><button className="primary" type="submit">Save weight</button><p className="fine">Manual reading, converted to and stored as grams. History uses kg; preferred input units are in Journal settings. Set or clear your own weight goal in Targets.</p></FormBox></section></div>;
}

function WeightChart({ data, date }: { data: HealthData; date: string }) {
  const { readings } = weightTrend(data, date);
  return <EvidenceChart label="Recorded body weight" decimals={3} currency="kg" series={[{ label: "Manual readings", color: "#8ad7e6", points: readings.map(w => ({ at: w.date, value: String(w.grams), dateOnly: true })) }]} />;
}

function ActivityView({ data, date, choice, perform, invalid }: { data: HealthData; date: string; choice: number; perform: Perform; invalid: (cause?: unknown) => void }) {
  const entries = data.activity.filter(a => a.date === date);
  const summary = dailyHealthSummary(data, date);
  const [editing, setEditing] = useState<string | null>(null);
  const current = entries.find(a => a.id === editing);
  const operation = useRef<string | null>(null);
  return <div className="health-two-columns"><section className="panel health-activity-overview"><PinToToday label="Movement" choices={[{kind:'health',metric:'steps',label:'Steps today'},{kind:'health',metric:'activity',label:'Activity today'}]}/><p className="eyebrow">MOVE AT YOUR PACE</p><h2>Your movement, recorded.</h2><div className="health-weight-stats"><div><span>Steps</span><strong>{formatNumber(summary.steps)}</strong></div><div><span>Minutes</span><strong>{formatNumber(summary.minutes)}</strong></div><div><span>Your step target</span><strong>{data.targets.steps == null ? "Not set" : formatNumber(data.targets.steps)}</strong></div></div><p className="fine">Entries for {date}: yours, and any an import brought in (marked). Movement never changes your calorie target.</p>{entries.length ? entries.map(a => <article className="health-library-row" key={a.id}><div><h3>{a.name}</h3><p>{formatNumber(a.steps)}{` ${plural(a.steps, "step")} · `}{a.minutes}{` ${plural(a.minutes, "minute")}`}</p><p className="fine">{importedFrom(a.id) ? `Imported from ${importedFrom(a.id)}` : `Manual · corrected ${a.updatedAt.slice(0, 10)}`}</p></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit activity ${a.name}`} onClick={() => { setEditing(a.id); operation.current = null; }}>Edit</button><button className="quiet" aria-label={`Remove activity ${a.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "activity", a.id), "Activity removed.")}>Remove</button></div></article>) : <p className="health-empty-inline">No movement logged for this day.</p>}</section><section className="panel health-fit-panel"><h2>{current ? "Correct movement." : "Add movement."}</h2><FormBox key={`${choice}:${current?.id ?? "new"}`} title="Manual activity" onSubmit={e => { e.preventDefault(); try { const form = e.currentTarget; const values = new FormData(form); operation.current ??= newHealthId(); const draft = { id: current?.id ?? operation.current, date, name: visibleName(formString(values, "name")), steps: formNumber(values, "steps", 1, 0, 1_000_000), minutes: formNumber(values, "minutes", 1, 0, 1440) }; if (!draft.steps && !draft.minutes) return invalid(); void perform(latest => saveActivity(latest, draft, new Date().toISOString()), current ? "Activity corrected." : "Activity saved.", () => { form.reset(); setEditing(null); operation.current = null; }); } catch (cause) { invalid(cause); } }}><label className="field"><span>Activity name</span><input name="name" required maxLength={120} placeholder="For example, a walk or strength session" defaultValue={current?.name ?? ""} /></label><div className="health-form-grid"><label className="field"><span>Steps</span><input name="steps" type="text" inputMode="numeric" autoComplete="off" required defaultValue={current?.steps ?? 0} /></label><label className="field"><span>Minutes</span><input name="minutes" type="text" inputMode="numeric" autoComplete="off" required defaultValue={current?.minutes ?? 0} /></label></div><div className="actions"><button className="primary" type="submit">{current ? "Save correction" : "Save activity"}</button>{current && <button className="quiet" type="button" onClick={() => { setEditing(null); operation.current = null; }}>Cancel correction</button>}</div><p className="fine">Enter steps, minutes, or both. New entries are added together; correcting one replaces only that record. No calorie expenditure is estimated.</p></FormBox></section></div>;
}

const targetFields = [
  ["kcal", "Calorie target (kcal)", 1, 100000], ["proteinMg", "Protein target (g)", 1000, 10000000],
  ["carbsMg", "Carbs target (g)", 1000, 10000000], ["fatMg", "Fat target (g)", 1000, 10000000],
  ["weightGrams", "Weight goal (kg)", 1000, 1000000], ["steps", "Daily step target", 1, 1000000],
] as const;
function TargetsView({ targets, perform, invalid }: { targets: HealthTargets; perform: Perform; invalid: (cause?: unknown) => void }) {
  return <section className="panel health-targets"><p className="eyebrow">YOU SET THE DIRECTION</p><h2>Targets that are yours.</h2><p>Enter targets you have chosen. There are no suggested calorie, macro or weight defaults. Leave a field blank to remove its target.</p><FormBox title="Personal targets" onSubmit={e => { e.preventDefault(); try { const form = new FormData(e.currentTarget); const next = Object.fromEntries(targetFields.map(([key, , scale, max]) => { const raw = formString(form, key); return [key, raw.trim() === "" ? null : parseHealthNumber(raw, scale, 1, max)]; })) as HealthTargets; void perform(latest => setHealthTargets(latest, next), "Targets saved."); } catch (cause) { invalid(cause); } }}><div className="health-form-grid">{targetFields.map(([key, label, scale]) => <label className="field" key={key}><span>{label}</span><input name={key} type="text" inputMode={scale === 1 ? "numeric" : "decimal"} autoComplete="off" defaultValue={targets[key] === null ? "" : targets[key] / scale} /></label>)}</div><p className="fine">These current reference targets appear alongside any selected day. Past diary nutrition stays unchanged. This journal does not calculate medical or nutrition advice.</p><button className="primary" type="submit">Save targets</button></FormBox></section>;
}
