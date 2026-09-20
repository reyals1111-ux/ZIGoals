"use client";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  HEALTH_MEALS, dailyHealthSummary, editDiaryEntry, formatHealthGrams, healthHistory,
  logHealthItem, newHealthId, parseHealthNumber, recipeNutrition, recipeServingGrams,
  removeHealthItem, saveActivity, saveFood, saveRecipe, saveWeight, scaleNutrition,
  searchFoods, setHealthTargets, weightTrend, type HealthData, type HealthDiaryEntry,
  type HealthFood, type HealthRecipe, type HealthTargets, type Nutrition, type RecipeDraft,
} from "../../lib/health";
import { addLocalDays, localDate } from "../../lib/local-date";
import { useHealth } from "./use-health";

type Update = ReturnType<typeof useHealth>["update"];
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const views = ["Diary", "Foods & recipes", "Weight", "Activity", "Targets"] as const;
type View = typeof views[number];
const foodFields = [
  ["kcal", "Calories (kcal)", 1, 1_000_000], ["proteinMg", "Protein (g)", 1000, 1_000_000_000],
  ["carbsMg", "Carbs (g)", 1000, 1_000_000_000], ["fatMg", "Fat (g)", 1000, 1_000_000_000],
] as const;

function NumberField({ label, name, value, onChange, min = 0, max, step = "1", required = true }: {
  label: string; name?: string; value?: string; onChange?: (value: string) => void; min?: number; max: number; step?: string; required?: boolean;
}) {
  return <label className="field"><span>{label}</span><input type="number" inputMode={step === "1" ? "numeric" : "decimal"} name={name} value={value} onChange={onChange ? e => onChange(e.target.value) : undefined} min={min} max={max} step={step} required={required} /></label>;
}
function MealField({ name = "meal", value, onChange }: { name?: string; value?: string; onChange?: (value: HealthDiaryEntry["meal"]) => void }) {
  return <label className="field"><span>Meal</span><select aria-label="Meal" name={name} value={value} onChange={onChange ? e => onChange(e.target.value as HealthDiaryEntry["meal"]) : undefined}>{HEALTH_MEALS.map(meal => <option key={meal}>{meal}</option>)}</select></label>;
}
function NutrientLine({ nutrients }: { nutrients: Nutrition }) {
  return <span className="health-nutrient-line">{nutrients.kcal.toLocaleString()} kcal <span>· P {formatHealthGrams(nutrients.proteinMg)} g · C {formatHealthGrams(nutrients.carbsMg)} g · F {formatHealthGrams(nutrients.fatMg)} g</span></span>;
}
function FormBox({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form aria-label={title} className="health-form" onSubmit={onSubmit}>{children}</form>;
}
const formString = (form: FormData, key: string) => String(form.get(key) ?? "");
const formNumber = (form: FormData, key: string, scale: 1 | 1000, min: number, max: number) => parseHealthNumber(formString(form, key), scale, min, max);

export function HealthApp() {
  const store = useHealth();
  if (!store.loaded) return <section className="panel"><h1>Health</h1><p>Loading your private health journal…</p></section>;
  if (store.error) return <section className="panel"><h1>Health</h1><p role="alert">{store.error}</p><div className="actions"><button className="secondary" onClick={store.refresh}>Retry reading data</button><Link className="secondary" href="/app/settings">Open backup settings</Link></div></section>;
  return <HealthWorkspace data={store.data} update={store.update} />;
}

function HealthWorkspace({ data, update }: { data: HealthData; update: Update }) {
  const [view, setView] = useState<View>("Diary");
  const [date, setDate] = useState(localDate);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const perform: Perform = async (updater, success, after) => {
    setBusy(true); setError(""); setMessage("");
    try { await update(updater); setMessage(success); after?.(); }
    catch { setError("Could not save this change. Check your entries and available browser storage, then try again."); }
    finally { setBusy(false); }
  };
  const invalid = () => setError("Check the highlighted fields. Enter finite numbers within the displayed ranges, with up to three decimal places for grams, kilograms and servings.");
  const summary = dailyHealthSummary(data, date);
  return <div className="health-page">
    <div className="page-heading"><div><p className="eyebrow">YOUR EVERYDAY WELLBEING</p><h1>A little care, every day.</h1><p>Your food, movement and progress. A private journal in this browser.</p></div><span className="badge">Local to this browser</span></div>
    <HealthSummary data={data} date={date} onTargets={() => setView("Targets")} />
    <div className="health-toolbar"><nav className="health-views" aria-label="Health views">{views.map(tab => <button type="button" key={tab} aria-pressed={view === tab} onClick={() => { setView(tab); setError(""); setMessage(""); }}>{tab}</button>)}</nav>
      <div className="health-date"><button className="quiet" aria-label="Previous day" disabled={date <= "1900-01-01"} onClick={() => setDate(addLocalDays(date, -1))}>←</button><label className="field"><span>Journal date</span><input type="date" min="1900-01-01" max="2199-12-31" value={date} onChange={e => { if (e.target.value >= "1900-01-01" && e.target.value <= "2199-12-31") setDate(e.target.value); }} /></label><button className="quiet" aria-label="Next day" disabled={date >= "2199-12-31"} onClick={() => setDate(addLocalDays(date, 1))}>→</button><button className="quiet" onClick={() => setDate(localDate())}>Today</button></div>
    </div>
    <p className="health-feedback" role="status" aria-live="polite">{busy ? "Saving to this browser…" : message}</p>{error && <p className="health-error" role="alert">{error}</p>}
    <fieldset className="health-content" disabled={busy}>
      {view === "Diary" && <DiaryView data={data} date={date} perform={perform} invalid={invalid} onLibrary={() => setView("Foods & recipes")} />}
      {view === "Foods & recipes" && <LibraryView data={data} perform={perform} invalid={invalid} />}
      {view === "Weight" && <WeightView data={data} date={date} perform={perform} invalid={invalid} onDate={setDate} />}
      {view === "Activity" && <ActivityView data={data} date={date} perform={perform} invalid={invalid} />}
      {view === "Targets" && <TargetsView key={JSON.stringify(data.targets)} targets={data.targets} perform={perform} invalid={invalid} />}
    </fieldset>
    <section className="health-roadmap" aria-label="Planned Health features"><header><p className="eyebrow">A HEALTHIER ROUTINE, WITH LESS EFFORT</p><h2>Next on your Health journey</h2><p>Planned for Beta. Your working journal above is ready today.</p></header><div className="health-roadmap-grid"><article><span aria-hidden="true">▥</span><div><strong>Barcode scan</strong><p>Bring food labels into your diary faster.</p><b>Coming soon · Not available yet</b></div></article><article><span aria-hidden="true">⌚</span><div><strong>Your wearables</strong><p>Apple Health, Health Connect, Fitbit &amp; Garmin are planned.</p><b>Planned · Not connected</b></div></article><article><span aria-hidden="true">◎</span><div><strong>A photo, a food entry</strong><p>Food recognition is on the roadmap.</p><b>Coming soon · Not available yet</b></div></article></div></section><p className="health-private-note">Only the entries you add are counted. {summary.entries ? "Diary nutrition uses saved food snapshots." : "No meal entries for this date yet."} Private Health backups are in <Link href="/app/settings">Settings</Link>.</p>
  </div>;
}

function HealthSummary({ data, date, onTargets }: { data: HealthData; date: string; onTargets: () => void }) {
  const summary = dailyHealthSummary(data, date);
  const kcal = summary.nutrients.kcal;
  const target = data.targets.kcal;
  const progress = target ? Math.min(1, kcal / target) : 0;
  return <section className="panel health-summary" aria-label="Daily nutrition summary">
    <div className="health-aurora" aria-hidden="true"><i /><i /><i /></div>
    <div className="health-gauge"><svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="68" className="health-gauge-track" /><circle cx="80" cy="80" r="68" pathLength="100" className="health-gauge-fill" strokeDasharray={`${progress * 100} 100`} transform="rotate(-90 80 80)" /></svg><div><strong>{kcal.toLocaleString()}</strong><span>kcal logged</span></div></div>
    <div className="health-summary-main"><p className="eyebrow">{date === localDate() ? "TODAY’S NOURISHMENT" : date}</p><h2>{summary.entries ? "Every entry adds perspective." : "Start with one small entry."}</h2><p>{target ? `${target.toLocaleString()} kcal target` : "No calorie target set"}</p>{target ? <p className="fine">{kcal <= target ? `${(target - kcal).toLocaleString()} kcal below your target` : `${(kcal - target).toLocaleString()} kcal above your target`}</p> : <button className="text-link health-inline-button" onClick={onTargets}>Set your own targets →</button>}</div>
    <div className="health-macro-grid">{([ ["Protein", "proteinMg"], ["Carbs", "carbsMg"], ["Fat", "fatMg"] ] as const).map(([label, key]) => {
      const personalTarget = data.targets[key];
      return <div className={`health-macro health-macro-${key}`} key={key}><span>{label}</span><strong>{formatHealthGrams(summary.nutrients[key])}<small> g</small></strong><div className="health-meter" aria-hidden="true"><i style={{ width: `${personalTarget ? Math.min(100, summary.nutrients[key] / personalTarget * 100) : 0}%` }} /></div><small>{personalTarget ? `${formatHealthGrams(personalTarget)} g target` : "Target not set"}</small></div>;
    })}</div>
  </section>;
}

function DiaryView({ data, date, perform, invalid, onLibrary }: { data: HealthData; date: string; perform: Perform; invalid: () => void; onLibrary: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [servings, setServings] = useState("1");
  const [meal, setMeal] = useState<HealthDiaryEntry["meal"]>("Breakfast");
  const sourceItems = [...data.foods.map(f => ({ ...f, kind: "food" as const })), ...data.recipes.map(r => ({ ...r, kind: "recipe" as const }))];
  const selected = sourceItems.find(s => s.id === source);
  let preview: Nutrition | null = null;
  try { if (selected) preview = scaleNutrition("ingredients" in selected ? recipeNutrition(selected) : selected.nutrients, parseHealthNumber(servings, 1000, 1, 1_000_000)); } catch { /* Incomplete form values have no calculated preview. */ }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const quantityMilli = parseHealthNumber(servings, 1000, 1, 1_000_000);
      if (!selected) return invalid();
      const draft = { id: newHealthId(), sourceId: selected.id, sourceKind: selected.kind, date, meal, quantityMilli };
      void perform(latest => logHealthItem(latest, draft, new Date().toISOString()), "Meal logged.", () => setServings("1"));
    } catch { invalid(); }
  };
  return <div className="health-diary-layout"><div className="health-meals">{HEALTH_MEALS.map(mealName => {
    const entries = data.diary.filter(e => e.date === date && e.meal === mealName);
    const total = entries.reduce((sum, e) => sum + scaleNutrition(e.snapshot.nutrients, e.quantityMilli).kcal, 0);
    return <section className="panel health-meal" aria-label={`${mealName} diary`} key={mealName}><div className="health-section-heading"><h2>{mealName}</h2><span>{total.toLocaleString()} kcal</span></div>{entries.length === 0 ? <p className="health-empty-inline">Nothing logged yet.</p> : entries.map(entry => <div className="health-entry" key={entry.id}>
      <div className="health-entry-main"><strong>{entry.snapshot.name}</strong><small>{formatHealthGrams(entry.quantityMilli)} servings · {Number((entry.snapshot.servingGrams * entry.quantityMilli / 1000).toFixed(3)).toLocaleString()} g</small><NutrientLine nutrients={scaleNutrition(entry.snapshot.nutrients, entry.quantityMilli)} /></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit ${entry.snapshot.name}`} onClick={() => setEditing(editing === entry.id ? null : entry.id)}>Edit</button><button className="quiet" aria-label={`Remove ${entry.snapshot.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "diary", entry.id), "Diary entry removed.")}>Remove</button></div>
      {editing === entry.id && <DiaryEditor entry={entry} perform={perform} invalid={invalid} close={() => setEditing(null)} />}
    </div>)}</section>;
  })}</div><aside className="health-diary-side"><section className="panel"><p className="eyebrow">A MOMENT TO CHECK IN</p><h2>Log a meal.</h2>{sourceItems.length ? <FormBox title="Log a meal" onSubmit={submit}>
    <label className="field"><span>Food or recipe</span><select required value={source} onChange={e => setSource(e.target.value)}><option value="">Choose from your library</option>{sourceItems.map(s => <option value={s.id} key={s.id}>{s.name} · {s.kind}</option>)}</select></label>
    <div className="health-form-grid"><MealField value={meal} onChange={setMeal} /><NumberField label="Servings" value={servings} onChange={setServings} min={0.001} max={1000} step="0.001" /></div>{preview && <div className="health-preview"><NutrientLine nutrients={preview} /></div>}<button className="primary" type="submit">Log to diary</button><p className="fine">Logging for {date}. Serving quantities support three decimal places.</p>
  </FormBox> : <><p>Build a food library from the nutrition labels you use, then add meals here.</p><button className="primary" onClick={onLibrary}>Add your first food</button></>}</section><NutritionHistory data={data} date={date} /></aside></div>;
}

function DiaryEditor({ entry, perform, invalid, close }: { entry: HealthDiaryEntry; perform: Perform; invalid: () => void; close: () => void }) {
  const [quantity, setQuantity] = useState(String(entry.quantityMilli / 1000));
  const [date, setDate] = useState(entry.date);
  const [meal, setMeal] = useState(entry.meal);
  return <FormBox title="Edit diary entry" onSubmit={e => { e.preventDefault(); try { const quantityMilli = parseHealthNumber(quantity, 1000, 1, 1_000_000); void perform(latest => editDiaryEntry(latest, entry.id, { date, meal, quantityMilli }, new Date().toISOString()), "Diary entry updated.", close); } catch { invalid(); } }}>
    <div className="health-form-grid"><label className="field"><span>Entry date</span><input type="date" required min="1900-01-01" max="2199-12-31" value={date} onChange={e => setDate(e.target.value)} /></label><MealField value={meal} onChange={setMeal} /><NumberField label="Servings" value={quantity} onChange={setQuantity} min={0.001} max={1000} step="0.001" /></div><p className="fine">Corrections use the nutrition originally saved with this entry.</p><div className="actions"><button className="primary" type="submit">Save entry</button><button className="quiet" type="button" onClick={close}>Cancel</button></div>
  </FormBox>;
}

function NutritionHistory({ data, date }: { data: HealthData; date: string }) {
  const history = healthHistory(data, date, 7);
  const max = Math.max(1, ...history.map(d => d.nutrients.kcal));
  const logged = history.filter(d => d.entries > 0);
  return <section className="panel health-history"><p className="eyebrow">LAST SEVEN DAYS</p><h2>Your rhythm.</h2>{logged.length ? <><div className="health-bars" role="img" aria-label={`Calories by day: ${history.map(d => `${d.date}: ${d.entries ? `${d.nutrients.kcal} kcal` : "no entries"}`).join("; ")}`}>{history.map(d => <div key={d.date}><div className="health-bar-track"><i style={{ height: `${d.entries ? Math.max(2, d.nutrients.kcal / max * 100) : 0}%` }} /></div><span>{Number(d.date.slice(-2))}</span></div>)}</div><p className="fine">{Math.round(logged.reduce((sum, d) => sum + d.nutrients.kcal, 0) / logged.length).toLocaleString()} kcal average across {logged.length} logged {logged.length === 1 ? "day" : "days"}. Blank days are excluded.</p></> : <p className="health-empty-inline">A week of entries will take shape here. No meals logged in this period.</p>}</section>;
}

function LibraryView({ data, perform, invalid }: { data: HealthData; perform: Perform; invalid: () => void }) {
  const [query, setQuery] = useState("");
  const [food, setFood] = useState<HealthFood | "new" | null>(null);
  const [recipe, setRecipe] = useState<HealthRecipe | "new" | null>(null);
  const foods = searchFoods(data.foods, query);
  const recipes = data.recipes.filter(r => r.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="health-library"><div className="health-section-heading"><div><h2>Your kitchen library.</h2><p>Foods and recipes you add, with nutrition from your own labels.</p></div><div className="actions"><button className="primary" onClick={() => { setFood("new"); setRecipe(null); }}>New food</button><button className="secondary" onClick={() => { setRecipe("new"); setFood(null); }}>New recipe</button></div></div>
    {food && <FoodEditor key={food === "new" ? "new" : food.id} food={food === "new" ? null : food} perform={perform} invalid={invalid} close={() => setFood(null)} />}
    {recipe && <RecipeEditor key={recipe === "new" ? "new" : recipe.id} recipe={recipe === "new" ? null : recipe} data={data} perform={perform} invalid={invalid} close={() => setRecipe(null)} />}
    <label className="field health-search"><span>Search your foods and recipes</span><input type="search" maxLength={200} placeholder="Search by name or brand" value={query} onChange={e => setQuery(e.target.value)} /></label>
    <div className="health-library-grid"><section className="panel"><div className="health-section-heading"><h2>Foods</h2><span>{data.foods.length} saved</span></div>{foods.length ? foods.map(f => <article className="health-library-row" key={f.id}><div><h3>{f.name}</h3><p className="fine">{f.brand ? `${f.brand} · ` : ""}{f.servingGrams} g per serving</p><NutrientLine nutrients={f.nutrients} /></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit food ${f.name}`} onClick={() => { setFood(f); setRecipe(null); }}>Edit</button><button className="quiet" aria-label={`Remove food ${f.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "foods", f.id), "Food removed. Existing recipes and diary entries are preserved.")}>Remove</button></div></article>) : <p className="health-empty-inline">{query ? "No matching foods." : "Your library starts with your first food."}</p>}</section>
    <section className="panel"><div className="health-section-heading"><h2>Recipes</h2><span>{data.recipes.length} saved</span></div>{recipes.length ? recipes.map(r => <article className="health-library-row" key={r.id}><div><h3>{r.name}</h3><p className="fine">Makes {formatHealthGrams(r.portionsMilli)} servings · {r.ingredients.length} ingredients</p><NutrientLine nutrients={recipeNutrition(r)} /><details className="health-recipe-ingredients"><summary>View ingredients</summary><ul>{r.ingredients.map((ingredient, i) => <li key={i}>{ingredient.snapshot.name} · {formatHealthGrams(ingredient.quantityMilli)} servings</li>)}</ul></details></div><div className="health-row-actions"><button className="quiet" aria-label={`Edit recipe ${r.name}`} onClick={() => { setRecipe(r); setFood(null); }}>Edit</button><button className="quiet" aria-label={`Remove recipe ${r.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "recipes", r.id), "Recipe removed. Existing diary entries are preserved.")}>Remove</button></div></article>) : <p className="health-empty-inline">{query ? "No matching recipes." : "Combine your foods into a recipe you can log again."}</p>}</section></div>
    <p className="fine">Saved recipes keep their original ingredient nutrition. Editing a recipe rebuilds it from the current food library. Existing diary entries always keep their saved nutrition.</p>
  </div>;
}

function FoodEditor({ food, perform, invalid, close }: { food: HealthFood | null; perform: Perform; invalid: () => void; close: () => void }) {
  const [name, setName] = useState(food?.name ?? "");
  const [brand, setBrand] = useState(food?.brand ?? "");
  const [weight, setWeight] = useState(food ? String(food.servingGrams) : "");
  const [values, setValues] = useState<Record<keyof Nutrition, string>>({ kcal: food ? String(food.nutrients.kcal) : "", proteinMg: food ? String(food.nutrients.proteinMg / 1000) : "", carbsMg: food ? String(food.nutrients.carbsMg / 1000) : "", fatMg: food ? String(food.nutrients.fatMg / 1000) : "" });
  return <section className="panel health-editor"><h2>{food ? "Edit food" : "Add a food"}</h2><p>Copy the values for one serving from its nutrition label. Enter 0 for a nutrient when the label says zero.</p><FormBox title="Food details" onSubmit={e => { e.preventDefault(); try {
    const at = new Date().toISOString();
    const nutrients = Object.fromEntries(foodFields.map(([key, , scale, max]) => [key, parseHealthNumber(values[key], scale, 0, max)])) as Nutrition;
    const draft = { id: food?.id ?? newHealthId(), name, brand, servingGrams: parseHealthNumber(weight, 1, 1, 100_000), nutrients, createdAt: food?.createdAt ?? at, updatedAt: at };
    void perform(latest => saveFood(latest, draft), "Food saved.", close);
  } catch { invalid(); } }}><div className="health-form-grid"><label className="field"><span>Food name</span><input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label className="field"><span>Brand (optional)</span><input maxLength={80} value={brand} onChange={e => setBrand(e.target.value)} /></label><NumberField label="Serving weight (g)" value={weight} onChange={setWeight} min={1} max={100000} />{foodFields.map(([key, label, scale, max]) => <NumberField key={key} label={label} value={values[key]} onChange={value => setValues(old => ({ ...old, [key]: value }))} max={max / scale} step={scale === 1 ? "1" : "0.001"} />)}</div><div className="actions"><button className="primary" type="submit">Save food</button><button className="quiet" type="button" onClick={close}>Cancel</button></div></FormBox></section>;
}

function RecipeEditor({ recipe, data, perform, invalid, close }: { recipe: HealthRecipe | null; data: HealthData; perform: Perform; invalid: () => void; close: () => void }) {
  const [draftId] = useState(newHealthId);
  const [name, setName] = useState(recipe?.name ?? "");
  const [portions, setPortions] = useState(recipe ? String(recipe.portionsMilli / 1000) : "1");
  const [items, setItems] = useState(recipe?.ingredients.map(i => ({ foodId: i.foodId, servings: String(i.quantityMilli / 1000) })) ?? [{ foodId: "", servings: "1" }]);
  const buildDraft = (): RecipeDraft => ({ id: recipe?.id ?? draftId, name, portionsMilli: parseHealthNumber(portions, 1000, 1, 1_000_000), items: items.map(i => ({ foodId: i.foodId, quantityMilli: parseHealthNumber(i.servings, 1000, 1, 1_000_000) })) });
  let preview: Nutrition | null = null;
  try {
    const draft = buildDraft();
    const at = new Date().toISOString();
    const calculation: HealthRecipe = { id: draft.id, name: name.trim() || "Recipe preview", portionsMilli: draft.portionsMilli, ingredients: draft.items.map(i => { const food = data.foods.find(f => f.id === i.foodId); if (!food) throw Error(); return { foodId: i.foodId, quantityMilli: i.quantityMilli, snapshot: { name: food.name, servingGrams: food.servingGrams, nutrients: food.nutrients } }; }), createdAt: at, updatedAt: at };
    preview = recipeNutrition(calculation); recipeServingGrams(calculation);
  } catch { /* A preview appears only when every constituent is valid. */ }
  return <section className="panel health-editor"><h2>{recipe ? "Edit recipe" : "Build a recipe"}</h2><p>Add constituent foods in their label servings. Totals are divided by the servings the recipe makes.</p>{data.foods.length === 0 ? <><p>Add a food before building a recipe.</p><button className="quiet" onClick={close}>Close recipe</button></> : <FormBox title="Recipe details" onSubmit={e => { e.preventDefault(); try { const draft = buildDraft(); void perform(latest => saveRecipe(latest, draft, new Date().toISOString()), "Recipe saved.", close); } catch { invalid(); } }}>
    <div className="health-form-grid"><label className="field"><span>Recipe name</span><input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><NumberField label="Recipe makes (servings)" value={portions} onChange={setPortions} min={0.001} max={1000} step="0.001" /></div>
    {items.map((item, index) => <div className="health-ingredient" key={index}><label className="field"><span>Ingredient {index + 1}</span><select required value={item.foodId} onChange={e => setItems(old => old.map((v, i) => i === index ? { ...v, foodId: e.target.value } : v))}><option value="">Choose a food</option>{item.foodId && !data.foods.some(f => f.id === item.foodId) && <option value={item.foodId}>Removed food — choose a replacement</option>}{data.foods.map(f => <option value={f.id} key={f.id}>{f.name}</option>)}</select></label><NumberField label={`Ingredient servings ${index + 1}`} value={item.servings} onChange={value => setItems(old => old.map((v, i) => i === index ? { ...v, servings: value } : v))} min={0.001} max={1000} step="0.001" /><button className="quiet" type="button" disabled={items.length === 1} aria-label={`Remove ingredient ${index + 1}`} onClick={() => setItems(old => old.filter((_, i) => i !== index))}>Remove</button></div>)}
    <button className="secondary" type="button" disabled={items.length >= 100} onClick={() => setItems(old => [...old, { foodId: "", servings: "1" }])}>Add ingredient</button>{preview && <div className="health-preview"><strong>{preview.kcal.toLocaleString()} kcal per serving</strong><NutrientLine nutrients={preview} /></div>}<p className="fine">Kcal and nutrient milligrams round once per recipe serving. Serving weight rounds to whole grams.</p><div className="actions"><button className="primary" type="submit" disabled={!preview}>Save recipe</button><button className="quiet" type="button" onClick={close}>Cancel</button></div>
  </FormBox>}</section>;
}

function WeightView({ data, date, perform, invalid, onDate }: { data: HealthData; date: string; perform: Perform; invalid: () => void; onDate: (date: string) => void }) {
  const reading = data.weights.find(w => w.date === date);
  const trend = weightTrend(data, date);
  const history = [...data.weights].sort((a, b) => b.date.localeCompare(a.date));
  return <div className="health-two-columns"><div><section className="panel"><p className="eyebrow">A LONGER VIEW</p><h2>Your weight journal.</h2><p>Individual readings can vary. See what you recorded over time.</p><div className="health-weight-stats"><div><span>Latest in 30 days</span><strong>{trend.latestGrams === null ? "—" : `${formatHealthGrams(trend.latestGrams)} kg`}</strong></div><div><span>Your weight goal</span><strong>{data.targets.weightGrams === null ? "Not set" : `${formatHealthGrams(data.targets.weightGrams)} kg`}</strong></div><div><span>30-day change</span><strong>{trend.changeGrams === null ? "—" : `${trend.changeGrams > 0 ? "+" : ""}${formatHealthGrams(trend.changeGrams)} kg`}</strong></div></div>
    <WeightChart data={data} date={date} /><p className="fine">{trend.count ? `${trend.count} readings in the 30 days ending ${date}. Average ${formatHealthGrams(trend.averageGrams!)} kg.` : "Add your first reading to start a trend."}</p></section>
    <section className="panel health-weight-history"><h2>Weight history</h2>{history.length ? <div className="health-table-wrap"><table aria-label="Weight history"><thead><tr><th>Date</th><th>Weight</th><th><span className="health-sr-only">Actions</span></th></tr></thead><tbody>{history.slice(0, 100).map(w => <tr key={w.id}><td>{w.date}</td><td>{formatHealthGrams(w.grams)} kg</td><td><div className="health-row-actions"><button className="quiet" aria-label={`Edit weight for ${w.date}`} onClick={() => onDate(w.date)}>Edit</button><button className="quiet" aria-label={`Remove weight for ${w.date}`} onClick={() => void perform(latest => removeHealthItem(latest, "weights", w.id), "Weight entry removed.")}>Remove</button></div></td></tr>)}</tbody></table>{history.length > 100 && <p className="fine">Showing the latest 100 readings. All readings remain in your private backup.</p>}</div> : <p className="health-empty-inline">No weight readings yet.</p>}</section></div>
    <section className="panel health-fit-panel"><h2>{reading ? "Correct a reading." : "Add a reading."}</h2><p>{date} · One reading per day; saving again corrects that day.</p><FormBox key={`${date}:${reading?.updatedAt ?? "new"}`} title="Weight entry" onSubmit={e => { e.preventDefault(); try { const grams = formNumber(new FormData(e.currentTarget), "weight", 1000, 1, 1_000_000); void perform(latest => saveWeight(latest, { id: reading?.id ?? newHealthId(), date, grams }, new Date().toISOString()), "Weight saved."); } catch { invalid(); } }}><label className="field"><span>Weight (kg)</span><input name="weight" type="number" inputMode="decimal" min="0.001" max="1000" step="0.001" required defaultValue={reading ? reading.grams / 1000 : ""} /></label><button className="primary" type="submit">Save weight</button><p className="fine">Stored to the nearest gram. Set or clear your own weight goal in Targets.</p></FormBox></section></div>;
}

function WeightChart({ data, date }: { data: HealthData; date: string }) {
  const { readings } = weightTrend(data, date);
  if (readings.length === 0) return <div className="health-chart-empty">Your trend begins with a first reading.</div>;
  const dates = healthHistory(data, date, 30).map(d => d.date);
  const min = Math.min(...readings.map(w => w.grams));
  const max = Math.max(...readings.map(w => w.grams));
  const padding = Math.max(250, (max - min) * 0.15);
  const points = readings.map(w => ({ ...w, x: 32 + dates.indexOf(w.date) / 29 * 516, y: 154 - (w.grams - min + padding) / (max - min + padding * 2) * 120 }));
  return <div className="health-weight-chart"><svg viewBox="0 0 580 190" role="img" aria-label={`Weight readings: ${readings.map(w => `${w.date}, ${formatHealthGrams(w.grams)} kilograms`).join("; ")}`}><path className="health-chart-grid" d="M32 34H548 M32 94H548 M32 154H548" />{points.length > 1 && <polyline className="health-chart-line" points={points.map(p => `${p.x},${p.y}`).join(" ")} />}{points.map(p => <circle className="health-chart-point" key={p.id} cx={p.x} cy={p.y} r="4" />)}<text x="32" y="181">{dates[0]}</text><text x="548" y="181" textAnchor="end">{date}</text></svg></div>;
}

function ActivityView({ data, date, perform, invalid }: { data: HealthData; date: string; perform: Perform; invalid: () => void }) {
  const entries = data.activity.filter(a => a.date === date);
  const summary = dailyHealthSummary(data, date);
  return <div className="health-two-columns"><section className="panel"><p className="eyebrow">MOVE AT YOUR PACE</p><h2>Your movement, recorded.</h2><div className="health-weight-stats"><div><span>Steps</span><strong>{summary.steps.toLocaleString()}</strong></div><div><span>Minutes</span><strong>{summary.minutes.toLocaleString()}</strong></div><div><span>Your step target</span><strong>{data.targets.steps?.toLocaleString() ?? "Not set"}</strong></div></div><p className="fine">Manual entries for {date}. Movement never changes your calorie target.</p>{entries.length ? entries.map(a => <article className="health-library-row" key={a.id}><div><h3>{a.name}</h3><p>{a.steps.toLocaleString()} steps · {a.minutes} minutes</p></div><button className="quiet" aria-label={`Remove activity ${a.name}`} onClick={() => void perform(latest => removeHealthItem(latest, "activity", a.id), "Activity removed.")}>Remove</button></article>) : <p className="health-empty-inline">No movement logged for this day.</p>}</section><section className="panel health-fit-panel"><h2>Add movement.</h2><FormBox title="Manual activity" onSubmit={e => { e.preventDefault(); try { const form = e.currentTarget; const values = new FormData(form); const draft = { id: newHealthId(), date, name: formString(values, "name"), steps: formNumber(values, "steps", 1, 0, 1_000_000), minutes: formNumber(values, "minutes", 1, 0, 1440) }; if (!draft.steps && !draft.minutes) return invalid(); void perform(latest => saveActivity(latest, draft, new Date().toISOString()), "Activity saved.", () => form.reset()); } catch { invalid(); } }}><label className="field"><span>Activity name</span><input name="name" required maxLength={120} placeholder="For example, a walk" /></label><div className="health-form-grid"><label className="field"><span>Steps</span><input name="steps" type="number" inputMode="numeric" min="0" max="1000000" step="1" required defaultValue="0" /></label><label className="field"><span>Minutes</span><input name="minutes" type="number" inputMode="numeric" min="0" max="1440" step="1" required defaultValue="0" /></label></div><button className="primary" type="submit">Save activity</button><p className="fine">Enter steps, minutes, or both. Entries are added together for the selected day.</p></FormBox></section></div>;
}

const targetFields = [
  ["kcal", "Calorie target (kcal)", 1, 100000], ["proteinMg", "Protein target (g)", 1000, 10000000],
  ["carbsMg", "Carbs target (g)", 1000, 10000000], ["fatMg", "Fat target (g)", 1000, 10000000],
  ["weightGrams", "Weight goal (kg)", 1000, 1000000], ["steps", "Daily step target", 1, 1000000],
] as const;
function TargetsView({ targets, perform, invalid }: { targets: HealthTargets; perform: Perform; invalid: () => void }) {
  return <section className="panel health-targets"><p className="eyebrow">YOU SET THE DIRECTION</p><h2>Targets that are yours.</h2><p>Enter targets you have chosen. There are no suggested calorie, macro or weight defaults. Leave a field blank to remove its target.</p><FormBox title="Personal targets" onSubmit={e => { e.preventDefault(); try { const form = new FormData(e.currentTarget); const next = Object.fromEntries(targetFields.map(([key, , scale, max]) => { const raw = formString(form, key); return [key, raw.trim() === "" ? null : parseHealthNumber(raw, scale, 1, max)]; })) as HealthTargets; void perform(latest => setHealthTargets(latest, next), "Targets saved."); } catch { invalid(); } }}><div className="health-form-grid">{targetFields.map(([key, label, scale, max]) => <label className="field" key={key}><span>{label}</span><input name={key} type="number" inputMode={scale === 1 ? "numeric" : "decimal"} min={1 / scale} max={max / scale} step={scale === 1 ? "1" : "0.001"} defaultValue={targets[key] === null ? "" : targets[key] / scale} /></label>)}</div><p className="fine">These current reference targets appear alongside any selected day. Past diary nutrition stays unchanged. This journal does not calculate medical or nutrition advice.</p><button className="primary" type="submit">Save targets</button></FormBox></section>;
}
