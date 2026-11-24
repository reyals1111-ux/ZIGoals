'use client';
import {useId, useRef, useState} from 'react';
import type {HealthData, HealthTargets} from '../../../lib/health';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {weekdayOfDay} from '../../../lib/food-plus/day-target';
import {emptyWeekdayDraft, mondayToWeekdays, saveWeekdays, setSugarAlcohol, weekCalories, WEEKDAY_ORDER, type WeekdayDraft, type WeekdayKey} from '../../../lib/food-plus/weekdays';
import {useDeviceRecord} from '../../ai/use-device-record';
import {addLocalDays} from '../../../lib/local-date';
import {formatNumber, formatWeekdayLong} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {ArtNote} from '../../illustrations/art-note';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #88, #97, #107; MyFitnessPal's goals by day, Cronometer's Macro Scheduler, MacroFactor's
 * per-day targets): Health → Targets → "Targets by weekday". Calories, protein, carbs and fat for each weekday; a blank
 * field keeps the Targets' own value. The Diary's summary and Today's Health module then compare each day with its own
 * targets. "Same as Monday for Tuesday to Friday" copies a row. Kept on this device (`zigoals:food-plus:v1` `weekdays`).
 * Your own targets, never advice; the 1,200 kcal floor of the energy estimate is unchanged.
 */
const FIELDS = [['kcal', 'Calories (kcal)'], ['proteinG', 'Protein (g)'], ['carbsG', 'Carbs (g)'], ['fatG', 'Fat (g)']] as const;
const g = (mg: number | null) => mg === null ? '' : formatNumber(mg / 1000, {maximumFractionDigits: 0});
export function WeekdayTargets({targets, today}: {targets: HealthTargets; today: string}) {
  const record = useDeviceRecord(FOOD_PLUS), id = useId(), form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<WeekdayDraft | null>(null), [note, setNote] = useState(''), [issue, setIssue] = useState<{day: WeekdayKey; field: string; message: string} | null>(null);
  if (!record.loaded) return null;
  const shown = draft ?? emptyWeekdayDraft(record.data);
  const monday = addLocalDays(today, -((weekdayOfDay(today) + 6) % 7));
  const dateOf = (day: WeekdayKey) => addLocalDays(monday, WEEKDAY_ORDER.indexOf(day));
  const week = weekCalories(targets, Object.fromEntries(Object.entries(record.data.weekdays ?? {})), monday);
  const base = (field: (typeof FIELDS)[number][0]) => field === 'kcal' ? (targets.kcal === null ? '' : String(targets.kcal)) : g(targets[field === 'proteinG' ? 'proteinMg' : field === 'carbsG' ? 'carbsMg' : 'fatMg']);
  const edit = (day: WeekdayKey, field: string, value: string) => { setDraft({...shown, [day]: {...shown[day], [field]: value}}); setIssue(null); setNote(''); };
  const save = () => {
    const result = saveWeekdays(record.data, shown);
    if (!result.ok) { setIssue(result.issue); form.current?.querySelector<HTMLInputElement>(`[data-day="${result.issue.day}"][data-field="${result.issue.field}"]`)?.focus(); return; }
    try { record.update(() => result.value); setDraft(null); setNote(Object.keys(result.value.weekdays ?? {}).length ? 'Weekday targets saved on this device.' : 'No weekday targets: every day uses your Targets.'); }
    catch (e) { setNote(plainErrorMessage(e, 'Not kept on this device.')); }
  };
  return <form ref={form} className="food-plus-card" aria-labelledby={`${id}-title`} noValidate onSubmit={e => { e.preventDefault(); save(); }}>
    <h3 id={`${id}-title`} className="sr-only">Targets by weekday</h3>
    <p className="fine">Give a weekday its own calories or macros (a training day, a rest day, a weekend). A blank field keeps your Targets{targets.kcal ? ` (${formatNumber(targets.kcal)} kcal)` : ''}. The Diary and Today then show each day against its own targets. Your own numbers, never advice.</p>
    {targets.kcal === null && !Object.keys(record.data.weekdays ?? {}).length && <ArtNote pillar="health"><p className="health-empty-inline">No calorie target is set yet. Set one in Targets above, or give each weekday its own here.</p></ArtNote>}
    {WEEKDAY_ORDER.map(day => <fieldset key={day} className="health-quick-macros"><legend>{formatWeekdayLong(dateOf(day))}</legend><div className="health-form-grid">
      {FIELDS.map(([field, label]) => { const bad = issue?.day === day && issue.field === field; return <label className="field" key={field}><span>{label}</span><input inputMode="numeric" autoComplete="off" data-day={day} data-field={field} value={shown[day][field]} placeholder={base(field)} aria-invalid={bad || undefined} aria-describedby={bad ? `${id}-issue` : undefined} onChange={e => edit(day, field, e.target.value)}/></label>; })}
    </div></fieldset>)}
    {issue && <p className="field-error" role="alert" id={`${id}-issue`}>{formatWeekdayLong(dateOf(issue.day))}: {issue.message}</p>}
    <div className="food-plus-row"><button type="submit" className="primary">Save weekday targets</button><button type="button" className="secondary" onClick={() => { setDraft(mondayToWeekdays(shown)); setNote('Monday copied to Tuesday to Friday. Save to keep it.'); }}>Same as Monday for Tuesday to Friday</button>{Object.keys(record.data.weekdays ?? {}).length > 0 && <button type="button" className="quiet" onClick={() => { try { record.update(r => { const {weekdays: _w, ...rest} = r; void _w; return rest as typeof r; }); setDraft(null); setNote('Weekday targets cleared: every day uses your Targets.'); } catch (e) { setNote(plainErrorMessage(e, 'Not kept on this device.')); } }}>Clear weekday targets</button>}</div>
    <p className="fine" role="status" aria-live="polite">{note || (week !== null ? `This week by these targets: ${formatNumber(week)} kcal (${formatNumber(Math.round(week / 7))} a day on average).` : '')}</p>
  </form>;
}

/** Health → Targets → "Sugar alcohols for net carbs": grams per serving of a library food, taken off its carbs in net-carbs and keto modes. */
export function SugarAlcohols({data}: {data: HealthData}) {
  const record = useDeviceRecord(FOOD_PLUS), [query, setQuery] = useState(''), [texts, setTexts] = useState<Record<string, string>>({}), [note, setNote] = useState(''), id = useId();
  if (!record.loaded) return null;
  const foods = data.foods.filter(f => f.nutrients.carbsMg !== null && f.nutrients.carbsMg > 0);
  if (!foods.length) return <ArtNote pillar="health"><p className="health-empty-inline">No food in your library has carbs yet. Add a food with its label’s carbs in Foods &amp; recipes; then give its sugar alcohols here (from the label, “of which polyols”).</p></ArtNote>;
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const shown = foods.filter(f => words.every(w => `${f.name} ${f.brand}`.toLocaleLowerCase().includes(w))).slice(0, 30);
  const value = (foodId: string) => texts[foodId] ?? (record.data.sugarAlcohols?.[foodId] !== undefined ? formatNumber(record.data.sugarAlcohols[foodId]! / 1000, {maximumFractionDigits: 1, useGrouping: false}) : '');
  return <div className="food-plus-card">
    <p className="fine">In Targets → macro mode “Net carbs” or “Keto”, a food’s sugar alcohols (polyols on the label) are taken off its carbs, as fiber is. Grams per serving; blank means not given.</p>
    {foods.length > 8 && <label className="field"><span>Find a food</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} autoComplete="off"/></label>}
    <ul className="food-plus-list" aria-label="Sugar alcohols per serving">{shown.map(f => <li key={f.id}><label className="field" style={{flex: '1 1 200px'}}><span>{f.name}{f.brand ? ` · ${f.brand}` : ''} (g per serving)</span><input inputMode="decimal" autoComplete="off" value={value(f.id)} aria-describedby={`${id}-note`} onChange={e => { const v = e.target.value; setTexts(t => ({...t, [f.id]: v})); setNote(''); }}/></label>
      <button type="button" className="secondary" aria-label={`Save sugar alcohols for ${f.name}`} onClick={() => { try { record.update(r => setSugarAlcohol(r, f.id, value(f.id), new Set(data.foods.map(x => x.id)))); setTexts(t => { const {[f.id]: _x, ...rest} = t; void _x; return rest; }); setNote(`${f.name}: ${value(f.id).trim() ? `${value(f.id).trim()} g sugar alcohols per serving saved` : 'sugar alcohols cleared'}.`); } catch (e) { setNote(plainErrorMessage(e, 'Not kept on this device.')); } }}>Save</button></li>)}</ul>
    <p className="fine" id={`${id}-note`} role="status" aria-live="polite">{note}</p>
  </div>;
}
