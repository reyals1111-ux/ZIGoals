'use client';
import {useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {newHealthId, parseHealthNumber, type HealthData, type HealthDiaryEntry} from '../../lib/health';
import {QUICK_KCAL_NAME, quickCalories} from '../../lib/health-quick/calories';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-QUICK-KCAL; MyFitnessPal, MacroFactor): calories alone for a meal — a number, the meal,
 * and a few optional words — logged to the day shown, without a food in the library (lib/health-quick/calories.ts).
 * Loaded when its fold opens (Health's own chunk stays as it was).
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export default function QuickCalories({date, meal: initial, perform, invalid, mealField}: {date: string; meal: HealthDiaryEntry['meal']; perform: Perform; invalid: (cause?: unknown) => void;
  /** The Health form's own meal choice (its words are the person's own meal names). */ mealField: (value: HealthDiaryEntry['meal'], onChange: (m: HealthDiaryEntry['meal']) => void) => ReactNode}) {
  const id = useId(), [kcal, setKcal] = useState(''), [name, setName] = useState(''), [meal, setMeal] = useState(initial), ids = useRef<{id: string; sourceId: string} | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      parseHealthNumber(kcal, 1, 1, 10_000, 'kcal'); // refused here, with the range, before anything is written
      ids.current ??= {id: newHealthId(), sourceId: newHealthId()};
      const quick = {...ids.current, kcal, name, date, meal};
      const words = name.trim() || QUICK_KCAL_NAME;
      void perform(latest => quickCalories(latest, quick, new Date().toISOString()), `${words}: ${kcal.trim()} kcal logged.`, () => { setKcal(''); setName(''); ids.current = null; });
    } catch (cause) { invalid(cause); }
  };
  return <form className="health-quick-kcal-form" onSubmit={submit} aria-label="Log just the calories" noValidate>
    <div className="health-form-grid">
      <label className="field"><span>Calories (kcal)</span><input inputMode="numeric" autoComplete="off" enterKeyHint="done" required value={kcal} aria-describedby={`${id}-note`} onChange={e => { setKcal(e.target.value); ids.current = null; }} placeholder="450"/></label>
      {mealField(meal, m => { setMeal(m); ids.current = null; })}
      <label className="field"><span>What was it? (optional)</span><input maxLength={80} autoComplete="off" value={name} onChange={e => { setName(e.target.value); ids.current = null; }} placeholder={QUICK_KCAL_NAME}/></label>
    </div>
    <button className="secondary" type="submit">Log calories</button>
    <p id={`${id}-note`} className="fine">Logging for {formatDate(date)}. Only the calories are known: protein, carbs and fat stay unknown, never zero, and nothing is added to your library.</p>
  </form>;
}
