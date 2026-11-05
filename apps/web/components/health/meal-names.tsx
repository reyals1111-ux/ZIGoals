'use client';
import {useState} from 'react';
import {HEALTH_MEALS} from '../../lib/health';
import {HEALTH_EXTRAS, MEAL_NAME_MAX, mealKcalTarget, mealLabel, mealTime, setMealPref, type HealthExtras, type Meal} from '../../lib/health-extras';
import {useDeviceRecord} from '../ai/use-device-record';
import {FieldError, useFormErrors} from '../primitives/field-error';
import {showStatus, showUndo} from '../ui/undo-toast';

/** Session AL third pass (GAP-045, C-MO-03): this device's meal names and times, read tolerantly (unreadable = the four plain meals). */
export function useHealthExtras() {
  const record = useDeviceRecord(HEALTH_EXTRAS);
  const extras: HealthExtras | null = record.loaded && !record.unreadable ? record.data : null;
  return {extras, update: record.update, unreadable: record.unreadable};
}

/**
 * Name each of the four diary meals your way ("Pre-workout" for Breakfast) and give it a usual time. Entries keep their
 * meal; only the words shown change, on this device. Blank goes back to the meal's own name.
 */
export function MealNamesEditor() {
  const {extras, update, unreadable} = useHealthExtras();
  return <details className="health-meal-names"><summary>Name your meals and set their times</summary>{/* Session AL fourth pass: and an optional calorie target each */}
    <p className="fine">Your words for the four diary meals, with a usual time and, if you like, a calorie target for each. Entries stay in their meal; only the names shown change, on this device.</p>
    {unreadable && <p className="notice">Your meal names on this device could not be read, so the usual names are shown.</p>}
    {HEALTH_MEALS.map(meal => <MealNameRow key={`${meal}:${mealLabel(extras, meal)}:${mealTime(extras, meal) ?? ''}:${mealKcalTarget(extras, meal) ?? ''}`} meal={meal} extras={extras} update={update} />)}
  </details>;
}

function MealNameRow({meal, extras, update}: {meal: Meal; extras: HealthExtras | null; update: (fn: (r: HealthExtras) => HealthExtras) => HealthExtras}) {
  const [name, setName] = useState(extras?.meals?.[meal]?.name ?? ''), [time, setTime] = useState(mealTime(extras, meal) ?? ''), [kcal, setKcal] = useState(mealKcalTarget(extras, meal)?.toString() ?? '');
  const form = useFormErrors(), slug = meal.toLowerCase();
  return <form className="health-meal-name-row" aria-label={`${meal}: name and time`} noValidate onSubmit={event => {
    event.preventDefault();
    const before = extras;
    const result = setMealPref(extras ?? {version: 1}, meal, {name, time, kcal});
    if (!result.ok) { form.fail({[`${result.issue.field}-${slug}`]: result.issue.message}); return; }
    try {
      update(() => result.value);
      const shown = mealLabel(result.value, meal);
      showUndo({message: shown === meal && !mealTime(result.value, meal) ? `${meal} uses its own name again.` : `${meal} now shows as ${shown}${mealTime(result.value, meal) ? ` at ${mealTime(result.value, meal)}` : ''}.${mealKcalTarget(result.value, meal) ? ` Its calorie target: ${mealKcalTarget(result.value, meal)!.toLocaleString('en-GB')} kcal.` : ''}`, undone: 'Meal name put back.', restore: () => { update(() => before ?? {version: 1}); }});
    } catch { showStatus('Your meal name could not be saved on this device.', {tone: 'error'}); }
  }}>
    <div className="health-form-grid">
      <div><label className="field"><span>{meal} shows as</span><input {...form.field(`name-${slug}`)} value={name} maxLength={MEAL_NAME_MAX + 8} placeholder={meal} autoComplete="off" onChange={event => setName(event.target.value)} /></label><FieldError {...form.message(`name-${slug}`)} /></div>
      <div><label className="field"><span>Usual time (optional)</span><input {...form.field(`time-${slug}`)} type="time" value={time} onChange={event => setTime(event.target.value)} /></label><FieldError {...form.message(`time-${slug}`)} /></div>
      {/* Session AL fourth pass (C-DVG-38): a calorie target for this meal, shown beside the meal's total in the diary */}
      <div><label className="field"><span>Calorie target for {meal.toLowerCase()} (kcal, optional)</span><input {...form.field(`kcal-${slug}`)} type="text" inputMode="numeric" autoComplete="off" value={kcal} onChange={event => setKcal(event.target.value)} /></label><FieldError {...form.message(`kcal-${slug}`)} /></div>
    </div>
    <div className="actions"><button type="submit" className="secondary">Save {meal.toLowerCase()} name</button></div>
  </form>;
}
