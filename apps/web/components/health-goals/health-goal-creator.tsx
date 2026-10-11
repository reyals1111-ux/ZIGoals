'use client';
import {useState, type FormEvent} from 'react';
import {formNumberText, readFormNumber} from '../../lib/decimal-input';
import {addLocalDays} from '../../lib/local-date';
import {healthGoalIssue, type HealthGoal, type HealthGoalMeasure} from '../../lib/health-goals/schema';
import type {HealthGoalDraft} from '../../lib/health-goals/store';
import type {ExerciseCounter} from '../../lib/health-counters';
import {INVISIBLE_NAME, isInvisibleName} from '../../lib/visible-text';

export type HealthUnits = {weightUnit: 'kg' | 'lb'; waterUnit: 'ml' | 'fl-oz-us'};
const MEASURES: {value: HealthGoalMeasure; label: string}[] = [{value: 'steps', label: 'Steps per day'}, {value: 'water', label: 'Water days'}, {value: 'exercise', label: 'Exercise counter'}, {value: 'activeMinutes', label: 'Active minutes'}, {value: 'weight', label: 'Weight'}];
export const goalUnit = (measure: HealthGoalMeasure, units: HealthUnits) => measure === 'weight' ? units.weightUnit : measure === 'water' ? 'days' : measure === 'steps' ? 'steps' : measure === 'exercise' ? 'reps' : 'minutes';
/** A typed target as the stored integer string with its decimals: "72.5" → {value: "72500", decimals: 3} for weight, whole numbers elsewhere. */
export function targetFromText(text: string, measure: HealthGoalMeasure): HealthGoal['target'] {
  const whole = measure !== 'weight';
  const value = readFormNumber(text, {min: 0, max: 1_000_000_000, whole});
  if (whole) return {value: String(Math.round(value)), decimals: 0};
  const decimals = 3, scaled = Math.round(value * 10 ** decimals);
  return {value: String(scaled), decimals};
}
const targetText = (goal: HealthGoal) => formNumberText(Number(goal.target.value) / 10 ** goal.target.decimals);
/** The health goal creator (G3): a sheet on phones, a panel elsewhere. Units follow the Health journal; nothing is suggested. */
export function HealthGoalCreator({goal, counters, units, today, onSave, onCancel}: {goal?: HealthGoal; counters: readonly ExerciseCounter[]; units: HealthUnits; today: string; onSave: (draft: HealthGoalDraft) => Promise<void>; onCancel: () => void}) {
  const [name, setName] = useState(goal?.name ?? '');
  const [measure, setMeasure] = useState<HealthGoalMeasure>(goal?.measure ?? 'steps');
  const [exerciseId, setExerciseId] = useState(goal?.exerciseId ?? counters[0]?.id ?? '');
  const [direction, setDirection] = useState<'down' | 'up'>(goal?.direction === 'up' ? 'up' : 'down');
  const [target, setTarget] = useState(goal ? targetText(goal) : '');
  const [windowKind, setWindowKind] = useState<'by' | 'rolling'>(goal?.window.kind ?? 'rolling');
  const [byDate, setByDate] = useState(goal?.window.kind === 'by' ? goal.window.date : '');
  const [weeks, setWeeks] = useState(String(goal?.window.kind === 'rolling' ? goal.window.weeks : 4));
  const [notes, setNotes] = useState(goal?.notes ?? '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const unit = goalUnit(measure, units);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isInvisibleName(name)) { setError(`Name: ${INVISIBLE_NAME}`); return; }
    let draft: HealthGoalDraft;
    try {
      const parsedTarget = (() => { try { return targetFromText(target, measure); } catch { throw Error('Enter a target above zero.'); } })();
      if (windowKind === 'by' && !(byDate > today)) throw Error('Choose a date after today.');
      const rolling = windowKind === 'rolling' ? readFormNumber(weeks, {min: 1, max: 104, whole: true}) : 0;
      draft = {name: name.trim(), measure, direction: measure === 'weight' ? direction : 'at-least', target: parsedTarget, unit, window: windowKind === 'by' ? {kind: 'by', date: byDate} : {kind: 'rolling', weeks: rolling}, ...(measure === 'exercise' ? {exerciseId} : {}), ...(notes.trim() ? {notes: notes.trim()} : {})};
      const issue = healthGoalIssue({version: 1, id: goal?.id ?? '00000000-0000-4000-8000-000000000000', status: 'active', createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), ...draft});
      if (issue) throw Error(issue);
    } catch (e) { setError(e instanceof Error ? e.message : 'Check the goal.'); return; }
    setBusy(true); setError('');
    try { await onSave(draft); } catch (e) { setError(e instanceof Error ? e.message : 'The health goal was not saved.'); } finally { setBusy(false); }
  }
  return <section className="panel health-goal-creator" aria-labelledby="health-goal-creator-title">
    <div className="habit-section-heading"><div><p className="eyebrow">Your body, your measure</p><h2 id="health-goal-creator-title">{goal ? 'Edit health goal' : 'New health goal'}</h2></div></div>
    <form onSubmit={submit}><fieldset disabled={busy} className="habit-form-fields">
      <label className="field">Name<input autoFocus data-sheet-focus required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="Walk more" /></label>
      <div className="habit-form-grid">
        <label className="field">Measure<select value={measure} onChange={event => setMeasure(event.target.value as HealthGoalMeasure)}>{MEASURES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
        {measure === 'exercise' && <label className="field">Counter<select value={exerciseId} onChange={event => setExerciseId(event.target.value)}><option value="">Choose a counter</option>{counters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {measure === 'weight' ? <label className="field">Direction<select value={direction} onChange={event => setDirection(event.target.value as 'down' | 'up')}><option value="down">Towards a lower weight</option><option value="up">Towards a higher weight</option></select></label> : <p className="field health-goal-fixed"><span>Direction</span><strong>At least</strong></p>}
        <label className="field">Target<span className="health-goal-target"><input type="text" inputMode="decimal" autoComplete="off" required aria-label="Target" value={target} onChange={event => setTarget(event.target.value)} /><span>{unit}</span></span></label>
      </div>
      <div className="health-goal-window" role="radiogroup" aria-label="Window">
        <label><input type="radio" name="health-goal-window" value="by" checked={windowKind === 'by'} onChange={() => setWindowKind('by')} /><span>By a date</span><input type="date" aria-label="Date" min={addLocalDays(today, 1)} disabled={windowKind !== 'by'} value={byDate} onChange={event => setByDate(event.target.value)} /></label>
        <label><input type="radio" name="health-goal-window" value="rolling" checked={windowKind === 'rolling'} onChange={() => setWindowKind('rolling')} /><span>Rolling</span><input type="text" inputMode="numeric" autoComplete="off" aria-label="Weeks" disabled={windowKind !== 'rolling'} value={weeks} onChange={event => setWeeks(event.target.value)} /><span>weeks</span></label>
      </div>
      <label className="field">Notes (optional)<textarea maxLength={2000} rows={2} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      <p className="fine">Units follow your Health journal settings ({unit}). ZIGoals never suggests a target and does not give medical advice.</p>
      {error && <p role="alert">{error}</p>}
      <div className="actions"><button className="primary" type="submit">{busy ? 'Saving…' : goal ? 'Save health goal' : 'Create health goal'}</button><button type="button" className="secondary" onClick={onCancel}>Cancel</button></div>
    </fieldset></form>
  </section>;
}
