'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {HEALTH_MEALS, newHealthId, type HealthData} from '../../../lib/health';
import {copyMealTo, type Meal} from '../../../lib/health-quick/quick';
import {plural} from '../../../lib/plural';
import {formatDate} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import './plus.css';

/**
 * Session AP (feature 6), Health → Diary → "Copy a meal to another day or meal": any day's meal into any day (up to
 * today) and any meal slot, through the existing copy write (lib/health-quick/quick.ts copyMealTo). Entries are added
 * beside what is there; nothing is replaced. One tap is one copy, even when pressed twice.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export default function MealCopy({data, date, today, perform}: {data: HealthData; date: string; today: string; perform: Perform}) {
  const [fromDay, setFromDay] = useState(date), [fromMeal, setFromMeal] = useState<Meal>(() => HEALTH_MEALS.find(m => data.diary.some(e => e.date === date && e.meal === m)) ?? 'Breakfast');
  const [toDay, setToDay] = useState(today), [toMeal, setToMeal] = useState<Meal>('Lunch'), [error, setError] = useState('');
  const operation = useRef<string | null>(null), errorId = useId();
  const count = (day: string, meal: Meal) => data.diary.filter(e => e.date === day && e.meal === meal).length;
  const changed = <T,>(set: (v: T) => void) => (v: T) => { set(v); setError(''); operation.current = null; };
  function submit(e: FormEvent) {
    e.preventDefault();
    operation.current ??= newHealthId();
    const id = operation.current, at = new Date().toISOString(), from = {date: fromDay, meal: fromMeal}, to = {date: toDay, meal: toMeal};
    try { copyMealTo(data, from, to, id, at, today); } catch (cause) { setError(plainErrorMessage(cause, 'Check the days and meals.')); return; }
    const n = count(fromDay, fromMeal);
    void perform(latest => copyMealTo(latest, from, to, id, at, today), `Copied ${fromMeal.toLowerCase()} of ${formatDate(fromDay)} to ${toMeal.toLowerCase()} on ${toDay === today ? 'today' : formatDate(toDay)}: ${n} ${plural(n, 'entry', 'entries')}.`, () => { operation.current = null; });
  }
  const described = error ? errorId : undefined;
  return <section className="ap-meal-copy" aria-labelledby="ap-meal-copy-title">
    <h2 id="ap-meal-copy-title">Copy a meal</h2>
    <form className="ap-plus-form" aria-label="Copy a meal to another day or meal" onSubmit={submit} noValidate>
      <label className="field"><span>From the day</span><input type="date" value={fromDay} max={today} required aria-describedby={described} onChange={e => changed(setFromDay)(e.target.value)}/></label>
      <label className="field"><span>From the meal</span><select value={fromMeal} aria-describedby={described} onChange={e => changed(setFromMeal)(e.target.value as Meal)}>{HEALTH_MEALS.map(m => <option key={m} value={m}>{m} · {count(fromDay, m)} {plural(count(fromDay, m), 'entry', 'entries')}</option>)}</select></label>
      <label className="field"><span>To the day</span><input type="date" value={toDay} max={today} required aria-invalid={error ? true : undefined} aria-describedby={described} onChange={e => changed(setToDay)(e.target.value)}/></label>
      <label className="field"><span>To the meal</span><select value={toMeal} aria-describedby={described} onChange={e => changed(setToMeal)(e.target.value as Meal)}>{HEALTH_MEALS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
      <button type="submit" className="secondary">Copy meal</button>
    </form>
    {error && <p className="field-error ap-field-error" id={errorId} role="alert">{error}</p>}
    <p className="fine">The entries come over exactly as logged, with their amounts, beside anything already there. Remove one like any entry.</p>
  </section>;
}
