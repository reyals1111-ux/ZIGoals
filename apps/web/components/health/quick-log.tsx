'use client';
import {useRef, useState} from 'react';
import {formatHealthGrams, newHealthId, type HealthData} from '../../lib/health';
import {copyMealFromDayBefore, dayBefore, logAgain, pinnedItems, repeatDayBefore, resetWaterSizes, saveWaterSizes, usualForMeal, waterSizesText, quickIn, type Meal, type QuickItem} from '../../lib/health-quick/quick';
import {dailyData} from '../../lib/health-daily';
import {plural} from '../../lib/plural';

/**
 * Health quick logging on the diary (Session W Part 9): one tap repeats the day before's meal (or the whole day before)
 * exactly as it was logged, and one tap logs a pinned item or one this person usually has at this meal, at the amount
 * they last used there. Each tap is one ordinary diary write, said in the page's status line, and removable like any
 * entry. Nothing is suggested from outside the person's own diary and library.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
const now = () => new Date().toISOString();
const servings = (quantityMilli: number) => `${formatHealthGrams(quantityMilli)} ${plural(quantityMilli / 1000, 'serving')}`;
const dayWords = (date: string, today: string, prev: string) => date === today ? 'yesterday' : prev;

/** "Repeat yesterday" above the meals, while the day is still empty and the day before has entries. */
export function RepeatDay({data, date, today, perform}: {data: HealthData; date: string; today: string; perform: Perform}) {
  const before = dayBefore(data, date), operation = useRef<string | null>(null);
  if (!before.total || data.diary.some(e => e.date === date)) return null;
  const meals = Object.values(before.meals).filter(Boolean).length, when = dayWords(date, today, before.date);
  return <div className="health-repeat-day"><p>{date === today ? 'Nothing logged yet today.' : `Nothing logged on ${date}.`}</p>
    <button type="button" className="secondary" onClick={() => { operation.current ??= newHealthId(); const id = operation.current; void perform(latest => repeatDayBefore(latest, date, id, now()), `Copied ${before.total} ${plural(before.total, 'entry', 'entries')} from ${when}.`, () => { operation.current = null; }); }}>
      {date === today ? 'Repeat yesterday' : `Repeat ${before.date}`} ({before.total} {plural(before.total, 'entry', 'entries')} in {meals} {plural(meals, 'meal')})
    </button></div>;
}

/** Under a meal's heading: "Copy yesterday's breakfast" while the meal is empty, and one-tap chips (pinned, then usual). */
export function MealQuick({data, date, today, meal, perform}: {data: HealthData; date: string; today: string; meal: Meal; perform: Perform}) {
  const before = dayBefore(data, date), copyOperation = useRef<string | null>(null), logOperation = useRef<{key: string; id: string} | null>(null);
  const empty = !data.diary.some(e => e.date === date && e.meal === meal), word = meal.toLowerCase();
  const here = new Set(data.diary.filter(e => e.date === date && e.meal === meal).map(e => `${e.sourceKind}:${e.sourceId}`));
  const pinned = pinnedItems(data).filter(p => !here.has(`${p.kind}:${p.id}`)), pinnedKeys = new Set(pinned.map(p => `${p.kind}:${p.id}`));
  const usual = usualForMeal(data, date, meal).filter(u => !pinnedKeys.has(`${u.kind}:${u.id}`));
  const chips: QuickItem[] = [...pinned, ...usual].slice(0, 6);
  const copy = empty && before.meals[meal] > 0;
  if (!copy && !chips.length) return null;
  function log(item: QuickItem) {
    const key = `${item.kind}:${item.id}:${date}:${meal}`;
    if (logOperation.current?.key !== key) logOperation.current = {key, id: newHealthId()};
    const id = logOperation.current.id;
    void perform(latest => logAgain(latest, item, date, meal, id, now()), `${item.name} logged to ${word}: ${servings(item.quantityMilli)}.`, () => { logOperation.current = null; });
  }
  return <div className="health-meal-quick">
    {copy && <button type="button" className="secondary" onClick={() => { copyOperation.current ??= newHealthId(); const id = copyOperation.current; void perform(latest => copyMealFromDayBefore(latest, date, meal, id, now()), `Copied ${word} from ${dayWords(date, today, before.date)}: ${before.meals[meal]} ${plural(before.meals[meal], 'entry', 'entries')}.`, () => { copyOperation.current = null; }); }}>
      {date === today ? `Copy yesterday’s ${word}` : `Copy ${word} from ${before.date}`} ({before.meals[meal]} {plural(before.meals[meal], 'entry', 'entries')})
    </button>}
    {chips.length > 0 && <div className="health-chips" role="group" aria-label={`One tap for ${word}`}>{chips.map(c => <button type="button" className="secondary health-chip" key={`${c.kind}:${c.id}`} aria-label={`Log ${c.name}, ${servings(c.quantityMilli)}, to ${word}`} onClick={() => log(c)}>
      <span aria-hidden="true">+ </span>{c.name}<small> · {formatHealthGrams(c.quantityMilli)}</small>
    </button>)}</div>}
  </div>;
}

/** The water buttons' own sizes (Health v4 `quick`), changed from the Water card. */
export function WaterButtonsEditor({data, perform}: {data: HealthData; perform: Perform}) {
  const unit = dailyData(data).preferences.waterUnit, [open, setOpen] = useState(false), [text, setText] = useState(() => waterSizesText(data)), [error, setError] = useState('');
  if (!open) return <button type="button" className="quiet health-water-change" onClick={() => { setText(waterSizesText(data)); setError(''); setOpen(true); }}>Change these buttons</button>;
  return <form className="health-form health-water-buttons" aria-label="Your water buttons" onSubmit={e => { e.preventDefault(); try { saveWaterSizes(data, text, now()); setError(''); void perform(latest => saveWaterSizes(latest, text, now()), 'Water buttons saved.', () => setOpen(false)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the sizes.'); } }}>
    <label className="field"><span>Your water buttons ({unit === 'ml' ? 'mL' : 'US fl oz'}, up to six, separated by commas)</span><input type="text" inputMode="decimal" autoComplete="off" required maxLength={80} value={text} onChange={e => setText(e.target.value)} /></label>
    <div className="actions"><button type="submit" className="primary">Save buttons</button>{quickIn(data) && <button type="button" className="quiet" onClick={() => void perform(latest => resetWaterSizes(latest, now()), 'Water buttons back to the usual sizes.', () => setOpen(false))}>Back to {unit === 'ml' ? '250 and 500 mL' : '8 and 16 US fl oz'}</button>}<button type="button" className="quiet" onClick={() => setOpen(false)}>Cancel</button></div>
    {error && <p role="alert">{error}</p>}
  </form>;
}
