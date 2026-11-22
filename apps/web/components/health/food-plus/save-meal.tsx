'use client';
import {useEffect, useRef, useState} from 'react';
import {newHealthId, type HealthData, type HealthDiaryEntry} from '../../../lib/health';
import {saveMealFromDiary} from '../../../lib/health-daily';
import {saveMealFromEntries} from '../../../lib/food-plus/extra-meals';
import {isInvisibleName} from '../../../lib/visible-text';
import {plural} from '../../../lib/plural';
import './food-plus.css';

/**
 * Session AV lane 2 (food; q3 #3 check 8, MyFitnessPal's "Save as meal"): a meal's ⋯ menu in the Diary saves that meal's
 * entries as a saved meal, with a name you can change (the meal's own name and the day, to start). It is the same saved
 * meal Health → Meals & planning makes (lib/health-daily.ts saveMealFromDiary): the entries' snapshots as they are, so a
 * later food edit never changes it. Escape or Cancel closes it; focus goes back to the meal's ⋯ button.
 */
type Perform = (updater: (latest: HealthData) => HealthData, message: string, after?: () => void) => Promise<void>;
export default function SaveMeal({data, date, meal, entryIds, label, dayWords, perform, onClose}: {data: HealthData; date: string; meal: HealthDiaryEntry['meal']; entryIds?: readonly string[]; label: string; dayWords: string; perform: Perform; onClose: () => void}) {
  const [name, setName] = useState(`${label}, ${dayWords}`), [error, setError] = useState(''), field = useRef<HTMLInputElement>(null), operation = useRef<string | null>(null);
  // Session AV lane 2 (food, LEDGER #197): with extra meals, a section saves the entries it shows (`entryIds`).
  const count = entryIds ? entryIds.length : data.diary.filter(e => e.date === date && e.meal === meal).length;
  useEffect(() => { field.current?.focus(); field.current?.select(); }, []);
  const close = () => { onClose(); };
  return <form className="food-plus-inline" aria-label={`Save ${label} as a meal`} noValidate onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }} onSubmit={e => {
    e.preventDefault();
    const typed = name.replace(/\s+/g, ' ').trim();
    if (!typed || isInvisibleName(typed)) { setError('Type a name with letters or numbers.'); field.current?.focus(); return; }
    if (typed.length > 120) { setError('Keep the name to 120 characters or fewer.'); field.current?.focus(); return; }
    setError('');
    operation.current ??= newHealthId();
    const id = operation.current;
    void perform(latest => entryIds ? saveMealFromEntries(latest, id, typed, date, entryIds, new Date().toISOString()) : saveMealFromDiary(latest, id, typed, date, meal, new Date().toISOString()), `“${typed}” saved: ${count} ${plural(count, 'item')}. Log it again from Health → Meals & planning.`, () => { operation.current = null; close(); });
  }}>
    <label className="field"><span>Name for this saved meal</span><input ref={field} maxLength={120} autoComplete="off" value={name} aria-invalid={error ? true : undefined} aria-describedby={error ? `${meal}-save-meal-error` : undefined} onChange={e => { setName(e.target.value); operation.current = null; }}/></label>
    {error && <p className="field-error" role="alert" id={`${meal}-save-meal-error`}>{error}</p>}
    <p className="fine">Saves the {count} {plural(count, 'entry', 'entries')} in {label} as they are now. Changing a food later does not change this meal.</p>
    <div className="actions"><button type="submit" className="primary">Save meal</button><button type="button" className="quiet" onClick={close}>Cancel</button></div>
  </form>;
}
