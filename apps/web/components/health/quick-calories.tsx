'use client';
import {useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {newHealthId, parseHealthNumber, type HealthData, type HealthDiaryEntry} from '../../lib/health';
import {QUICK_KCAL_NAME, quickAddSourceId, quickCalories, quickMacro, type QuickMacros} from '../../lib/health-quick/calories';
import {formatDate} from '../../lib/visual-format';
import {isExtraChoice, storedMealOf, type MealChoice} from '../../lib/food-plus/extra-meals-lite';
import {tagEntries, writeExtraTags} from '../../lib/food-plus/extra-meals';
import {showStatus} from '../ui/undo-toast';
import './food-plus/food-plus.css';

/**
 * Session AV (owner follow-up 1, F-QUICK-KCAL; MyFitnessPal, MacroFactor): calories alone for a meal — a number, the meal,
 * and a few optional words — logged to the day shown, without a food in the library (lib/health-quick/calories.ts).
 * Loaded when its fold opens (Health's own chunk stays as it was).
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export default function QuickCalories({date, meal: initial, perform, invalid, mealField}: {date: string; meal: MealChoice; perform: Perform; invalid: (cause?: unknown) => void;
  /** The Health form's own meal choice (its words are the person's own meal names; LEDGER #197: and extra meals). */ mealField: (value: MealChoice, onChange: (m: MealChoice) => void) => ReactNode}) {
  const id = useId(), [kcal, setKcal] = useState(''), [name, setName] = useState(''), [meal, setMeal] = useState(initial), ids = useRef<{id: string; sourceId: string} | null>(null);
  // Session AV lane 2 (food, LEDGER #86): protein, carbs and fat, each optional; blank stays unknown.
  const [macros, setMacros] = useState<Required<QuickMacros>>({protein: '', carbs: '', fat: ''});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      parseHealthNumber(kcal, 1, 1, 10_000, 'kcal'); // refused here, with the range, before anything is written
      for (const key of ['protein', 'carbs', 'fat'] as const) quickMacro(macros[key], key);
      ids.current ??= {id: newHealthId(), sourceId: quickAddSourceId()};
      // Session AV lane 2 (food, LEDGER #197): an extra meal is stored as Snacks; this device keeps which one.
      const quick = {...ids.current, kcal, name, date, meal: storedMealOf(meal) as HealthDiaryEntry['meal'], ...macros};
      const words = name.trim() || QUICK_KCAL_NAME, given = (['protein', 'carbs', 'fat'] as const).filter(k => macros[k].trim());
      void perform(latest => quickCalories(latest, quick, new Date().toISOString()), `${words}: ${kcal.trim()} kcal${given.length ? ` and ${given.join(', ')}` : ''} logged.`, () => { if (isExtraChoice(meal) && !writeExtraTags(r => tagEntries(r, [quick.id], meal))) showStatus('Kept in Snacks: this device did not keep the extra meal.', {tone: 'error'}); setKcal(''); setName(''); setMacros({protein: '', carbs: '', fat: ''}); ids.current = null; });
    } catch (cause) { invalid(cause); }
  };
  return <form className="health-quick-kcal-form" onSubmit={submit} aria-label="Log just the calories" noValidate>
    <div className="health-form-grid">
      <label className="field"><span>Calories (kcal)</span><input inputMode="numeric" autoComplete="off" enterKeyHint="done" required value={kcal} aria-describedby={`${id}-note`} onChange={e => { setKcal(e.target.value); ids.current = null; }} placeholder="450"/></label>
      {mealField(meal, m => { setMeal(m); ids.current = null; })}
      <label className="field"><span>What was it? (optional)</span><input maxLength={80} autoComplete="off" value={name} onChange={e => { setName(e.target.value); ids.current = null; }} placeholder={QUICK_KCAL_NAME}/></label>
    </div>
    <fieldset className="health-quick-macros"><legend>Protein, carbs and fat (optional)</legend><div className="health-form-grid">
      {([['protein', 'Protein (g)'], ['carbs', 'Carbs (g)'], ['fat', 'Fat (g)']] as const).map(([key, label]) => <label className="field" key={key}><span>{label}</span><input inputMode="decimal" autoComplete="off" value={macros[key]} onChange={e => { const value = e.target.value; setMacros(m => ({...m, [key]: value})); ids.current = null; }}/></label>)}
    </div></fieldset>
    <button className="secondary" type="submit">Log calories</button>
    <p id={`${id}-note`} className="fine">Logging for {formatDate(date)}. Protein, carbs and fat count only when you give them; a blank one stays unknown, never zero. Nothing is added to your library.</p>
  </form>;
}
