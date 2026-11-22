'use client';
import {useEffect, useId, useImperativeHandle, useRef, useState, type RefObject} from 'react';
import type {HealthData} from '../../../lib/health';
import {dailyData} from '../../../lib/health-daily';
import {drinkEnergyDay, readDrinkEnergy} from '../../../lib/own-drinks';
import {formatNumber} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {useHealthExtras} from '../meal-names';
import type {DrinkFieldsHandle} from './health-r3';
import './health-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #282, Waterllama's calories from drinks): an optional energy (kcal) and sugar for a
 * drink, typed in the water form and kept with the entry on this device; blank is unknown, never zero, and nothing is
 * looked up or guessed. The form reads them through `handle` when it saves.
 */
export default function DrinkFields({handle, initial}: {handle: RefObject<DrinkFieldsHandle | null>; initial?: {kcal?: number; sugarG?: number}}) {
  const id = useId(), [kcal, setKcal] = useState(initial?.kcal === undefined ? '' : String(initial.kcal)), [sugar, setSugar] = useState(initial?.sugarG === undefined ? '' : String(initial.sugarG));
  const [issue, setIssue] = useState<{field: 'kcal' | 'sugar'; message: string} | null>(null);
  const values = useRef({kcal, sugar});
  useEffect(() => { values.current = {kcal, sugar}; }, [kcal, sugar]);
  useImperativeHandle(handle, () => ({
      read: () => {
        const r = readDrinkEnergy(values.current.kcal, values.current.sugar);
        if (!r.ok) { setIssue({field: r.field, message: r.message}); document.getElementById(`${id}-${r.field}`)?.focus(); return {ok: false}; }
        setIssue(null);
        return {ok: true, value: {...(r.kcal !== undefined ? {kcal: r.kcal} : {}), ...(r.sugarG !== undefined ? {sugarG: r.sugarG} : {})}};
      },
      clear: () => { setKcal(''); setSugar(''); setIssue(null); },
  }), [id]);
  const field = (which: 'kcal' | 'sugar', label: string, value: string, set: (v: string) => void, mode: 'numeric' | 'decimal') => <div>
    <label className="field"><span>{label}</span><input id={`${id}-${which}`} type="text" inputMode={mode} autoComplete="off" value={value} aria-invalid={issue?.field === which ? true : undefined} aria-describedby={issue?.field === which ? `${id}-${which}-issue` : undefined} onChange={e => { set(e.target.value); setIssue(null); }}/></label>
    {issue?.field === which && <p className="field-error" id={`${id}-${which}-issue`} role="alert">{issue.message}</p>}
  </div>;
  return <>{field('kcal', 'Energy (kcal, optional)', kcal, setKcal, 'numeric')}{field('sugar', 'Sugar (g, optional)', sugar, setSugar, 'decimal')}</>;
}

/**
 * The day's drinks with a typed energy, as a drink line under the food day's total, and food and drinks together (the
 * food total itself, its ring and the targets stay food only, as before). Only what was
 * typed counts; a drink without an energy is said, never counted as zero. Nothing shows on a day without one.
 */
export function DrinkEnergyLine({data, date, foodKcal}: {data: HealthData; date: string; foodKcal: number | null}) {
  const {extras} = useHealthExtras();
  const day = drinkEnergyDay(extras, dailyData(data).water, date);
  if (day.kcal === null && day.sugarG === null) return null;
  const counted = Math.max(day.withKcal, day.withSugar);
  return <p className="fine r3-drink-line" data-body-figure="">
    <strong>Drinks</strong>: {[day.kcal !== null ? `${formatNumber(day.kcal)} kcal` : null, day.sugarG !== null ? `${formatNumber(day.sugarG, {maximumFractionDigits: 1})} g sugar` : null].filter(Boolean).join(' · ')} from {counted} {plural(counted, 'drink')} as you typed them
    {day.drinks > counted ? ` (${day.drinks - counted} more without an amount, not counted)` : ''}.
    {foodKcal !== null && day.kcal !== null ? ` Food and drinks together: ${formatNumber(foodKcal + day.kcal)} kcal.` : ''}
  </p>;
}
