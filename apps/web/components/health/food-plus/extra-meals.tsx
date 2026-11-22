'use client';
import {useState} from 'react';
import {HEALTH_EXTRAS, mealLabel, type HealthExtras} from '../../../lib/health-extras';
import {FOOD_PLUS, type FoodPlus} from '../../../lib/food-plus/schema';
import {EXTRA_DEFAULT_AFTER, EXTRA_MEAL_KEYS, EXTRA_MEAL_NAME_MAX, EXTRA_SUGGESTED, DIARY_MEALS, extraMealsOf, slotOf, type DiaryMeal, type ExtraMealKey} from '../../../lib/food-plus/extra-meals-lite';
import {setExtraSlot} from '../../../lib/food-plus/extra-meals';
import {useDeviceRecord} from '../../ai/use-device-record';
import {FieldError, useFormErrors} from '../../primitives/field-error';
import {showStatus, showUndo} from '../../ui/undo-toast';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #197; Lose It!'s own meals and snacks): in the Diary's "Name your meals and set their
 * times", two meals of the person's own ("Afternoon snack", "Second breakfast"), each with a usual time, an optional
 * calorie target and the meal it shows after. Naming one adds its Diary section and puts it in every meal choice; a
 * blank name takes it off (its entries show in Snacks again, and come back when it is named again). Entries in an extra
 * meal are stored as Snacks, so totals, older versions and other devices count them there. Kept on this device
 * (`zigoals:food-plus:v1` extraMeals).
 */
export default function ExtraMealNames() {
  const record = useDeviceRecord(FOOD_PLUS), names = useDeviceRecord(HEALTH_EXTRAS);
  if (!record.loaded) return null;
  const extras: HealthExtras | null = names.loaded && !names.unreadable ? names.data : null;
  const x = extraMealsOf(JSON.stringify(record.data));
  return <section className="food-plus-extra-meals" aria-labelledby="food-plus-extra-meals-title">
    <h3 id="food-plus-extra-meals-title">Meals of your own (up to two)</h3>
    <p className="fine">Add a meal the four above do not cover, such as an afternoon snack or a second breakfast. It gets its own place in the Diary and in the meal choice. Its entries also count as Snacks, so totals stay the same everywhere, on this device and in other versions of ZIGoals.</p>
    {record.unreadable && <p className="notice">Your extra meals on this device could not be read, so none is shown. Saving one starts afresh.</p>}
    {EXTRA_MEAL_KEYS.map((key, i) => { const slot = slotOf(x, key); return <ExtraMealRow key={`${key}:${slot ? `${slot.name}:${slot.time}:${slot.kcal}:${slot.after}` : 'off'}`} slotKey={key} number={i + 1} record={record.data} extras={extras} update={record.update} />; })}
  </section>;
}

function ExtraMealRow({slotKey, number, record, extras, update}: {slotKey: ExtraMealKey; number: number; record: FoodPlus; extras: HealthExtras | null; update: (fn: (r: FoodPlus) => FoodPlus) => FoodPlus}) {
  const slot = slotOf(extraMealsOf(JSON.stringify(record)), slotKey);
  const [name, setName] = useState(slot?.name ?? ''), [time, setTime] = useState(slot?.time ?? ''), [kcal, setKcal] = useState(slot?.kcal?.toString() ?? ''), [after, setAfter] = useState<DiaryMeal>(slot?.after ?? EXTRA_DEFAULT_AFTER[slotKey]);
  const form = useFormErrors(), title = `Extra meal ${number}`;
  // The row is drawn afresh after a save (its key is the slot), so the focus goes back to Save, or to the name once off.
  const refocus = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus());
  const save = (input: {name: string; time: string; kcal: string; after: DiaryMeal}) => {
    const before = record, result = setExtraSlot(record, slotKey, input);
    if (!result.ok) { form.fail({[`${result.issue.field}-${slotKey}`]: result.issue.message}); return; }
    try {
      update(() => result.value);
      refocus(input.name.trim() ? `food-plus-extra-save-${slotKey}` : `food-plus-extra-name-${slotKey}`);
      const now = slotOf(extraMealsOf(JSON.stringify(result.value)), slotKey);
      showUndo({message: now ? `${now.name} is in your Diary${now.time ? ` at ${now.time}` : ''}, after ${mealLabel(extras, now.after)}.${now.kcal ? ` Its calorie target: ${now.kcal.toLocaleString('en-GB')} kcal.` : ''}` : `${title} is off. Its entries show in Snacks again.`, undone: 'Extra meal put back.', restore: () => { update(() => before); }});
    } catch { showStatus('Your extra meal could not be saved on this device.', {tone: 'error'}); }
  };
  return <form className="health-meal-name-row food-plus-extra-row" aria-label={`${title}: name and time`} noValidate onSubmit={event => { event.preventDefault(); save({name, time, kcal, after}); }}>
    <div className="health-form-grid">
      <div><label className="field"><span>{title} name (blank for none)</span><input {...form.field(`name-${slotKey}`, {id: `food-plus-extra-name-${slotKey}`})} value={name} maxLength={EXTRA_MEAL_NAME_MAX + 8} placeholder={EXTRA_SUGGESTED[slotKey].en} autoComplete="off" onChange={event => setName(event.target.value)} /></label><FieldError {...form.message(`name-${slotKey}`)} /></div>
      <div><label className="field"><span>{title} usual time (optional)</span><input {...form.field(`time-${slotKey}`)} type="time" value={time} onChange={event => setTime(event.target.value)} /></label><FieldError {...form.message(`time-${slotKey}`)} /></div>
      <div><label className="field"><span>{title} calorie target (kcal, optional)</span><input {...form.field(`kcal-${slotKey}`)} type="text" inputMode="numeric" autoComplete="off" value={kcal} onChange={event => setKcal(event.target.value)} /></label><FieldError {...form.message(`kcal-${slotKey}`)} /></div>
      <label className="field"><span>{title} shows after</span><select value={after} onChange={event => setAfter(event.target.value as DiaryMeal)}>{DIARY_MEALS.map(meal => <option key={meal} value={meal}>{mealLabel(extras, meal)}</option>)}</select></label>
    </div>
    <div className="actions"><button type="submit" className="secondary" id={`food-plus-extra-save-${slotKey}`}>Save {title.toLowerCase()}</button>{slot && <button type="button" className="quiet" onClick={() => { setName(''); setTime(''); setKcal(''); save({name: '', time: '', kcal: '', after}); }}>Take {slot.name} off</button>}</div>
  </form>;
}
