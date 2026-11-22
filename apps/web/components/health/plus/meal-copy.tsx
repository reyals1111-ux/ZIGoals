'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {HEALTH_MEALS, newHealthId, type HealthData} from '../../../lib/health';
import {copyMealTo, type Meal} from '../../../lib/health-quick/quick';
import {plural} from '../../../lib/plural';
import {formatDate} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {diarySections, isExtraChoice, sectionOf, slotOf, type MealChoice} from '../../../lib/food-plus/extra-meals-lite';
import {copySection, tagEntries, writeExtraTags} from '../../../lib/food-plus/extra-meals';
import {useExtraMeals} from '../food-plus/use-day-targets';
import './plus.css';

/**
 * Session AP (feature 6), Health → Diary → "Copy a meal to another day or meal": any day's meal into any day (up to
 * today) and any meal slot, through the existing copy write (lib/health-quick/quick.ts copyMealTo). Entries are added
 * beside what is there; nothing is replaced. One tap is one copy, even when pressed twice.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export default function MealCopy({data, date, today, perform}: {data: HealthData; date: string; today: string; perform: Perform}) {
  // Session AV lane 2 (food, LEDGER #197): with meals of the person's own, each Diary section is a choice of its own
  // (copySection); without them, the four meals and copyMealTo exactly as before.
  const x = useExtraMeals(), extra = x.slots.length > 0;
  const [fromDay, setFromDay] = useState(date), [fromMeal, setFromMeal] = useState<MealChoice>(() => HEALTH_MEALS.find(m => data.diary.some(e => e.date === date && e.meal === m)) ?? 'Breakfast');
  const [toDay, setToDay] = useState(today), [toMeal, setToMeal] = useState<MealChoice>('Lunch'), [error, setError] = useState('');
  const operation = useRef<string | null>(null), errorId = useId();
  const choices: readonly MealChoice[] = extra ? diarySections(x) : HEALTH_MEALS;
  const nameOf = (c: MealChoice) => isExtraChoice(c) ? slotOf(x, c)?.name ?? 'Snacks' : c;
  const count = (day: string, meal: MealChoice) => data.diary.filter(e => e.date === day && (extra ? sectionOf(e, x) === meal : e.meal === meal)).length;
  const changed = <T,>(set: (v: T) => void) => (v: T) => { set(v); setError(''); operation.current = null; };
  function submit(e: FormEvent) {
    e.preventDefault();
    operation.current ??= newHealthId();
    const id = operation.current, at = new Date().toISOString(), n = count(fromDay, fromMeal);
    const message = `Copied ${nameOf(fromMeal).toLowerCase()} of ${formatDate(fromDay)} to ${nameOf(toMeal).toLowerCase()} on ${toDay === today ? 'today' : formatDate(toDay)}: ${n} ${plural(n, 'entry', 'entries')}.`;
    if (extra || isExtraChoice(fromMeal) || isExtraChoice(toMeal)) {
      const from = {date: fromDay, choice: fromMeal}, to = {date: toDay, choice: toMeal}, made: {ids: string[]} = {ids: []};
      try { copySection(data, x, from, to, id, at, today); } catch (cause) { setError(plainErrorMessage(cause, 'Check the days and meals.')); return; }
      void perform(latest => { const out = copySection(latest, x, from, to, id, at, today); made.ids = out.added; return out.data; }, message, () => { operation.current = null; if (made.ids.length && isExtraChoice(toMeal)) writeExtraTags(r => tagEntries(r, made.ids, toMeal)); });
      return;
    }
    const from = {date: fromDay, meal: fromMeal as Meal}, to = {date: toDay, meal: toMeal as Meal};
    try { copyMealTo(data, from, to, id, at, today); } catch (cause) { setError(plainErrorMessage(cause, 'Check the days and meals.')); return; }
    void perform(latest => copyMealTo(latest, from, to, id, at, today), message, () => { operation.current = null; });
  }
  const described = error ? errorId : undefined;
  return <section className="ap-meal-copy" aria-labelledby="ap-meal-copy-title">
    <h2 id="ap-meal-copy-title" className="sr-only">Copy a meal</h2>{/* Session AT (AP D22 minor 1): the fold above already says it; the heading stays for screen-reader navigation */}
    <form className="ap-plus-form" aria-label="Copy a meal to another day or meal" onSubmit={submit} noValidate>
      <label className="field"><span>From the day</span><input type="date" value={fromDay} max={today} required aria-describedby={described} onChange={e => changed(setFromDay)(e.target.value)}/></label>
      <label className="field"><span>From the meal</span><select value={fromMeal} aria-describedby={described} onChange={e => changed(setFromMeal)(e.target.value as MealChoice)}>{choices.map(m => <option key={m} value={m}>{nameOf(m)} · {count(fromDay, m)} {plural(count(fromDay, m), 'entry', 'entries')}</option>)}</select></label>
      <label className="field"><span>To the day</span><input type="date" value={toDay} max={today} required aria-invalid={error ? true : undefined} aria-describedby={described} onChange={e => changed(setToDay)(e.target.value)}/></label>
      <label className="field"><span>To the meal</span><select value={toMeal} aria-describedby={described} onChange={e => changed(setToMeal)(e.target.value as MealChoice)}>{choices.map(m => <option key={m} value={m}>{nameOf(m)}</option>)}</select></label>
      <button type="submit" className="secondary">Copy meal</button>
    </form>
    {error && <p className="field-error ap-field-error" id={errorId} role="alert">{error}</p>}
    <p className="fine">The entries come over exactly as logged, with their amounts, beside anything already there. Remove one like any entry.</p>
  </section>;
}
