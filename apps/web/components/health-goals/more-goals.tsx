'use client';
import {Suspense, lazy, useId, useMemo, useState, type FormEvent} from 'react';
// Session AV lane 2, round 4 (health; Noom, LEDGER #331): "Keep my weight between …", its own chunk.
const WeightBandEditor = lazy(() => import('../health/r4/noom-parts').then(m => ({default: m.WeightBandEditor})));
import type {HealthData} from '../../lib/health';
import {HEALTH_NUMBERS} from '../../lib/health-numbers/store';
import {markers} from '../../lib/health-numbers/engine';
import {addMoreGoal, BODY_MEASURES, measureWord, MORE_GOALS, MORE_WINDOWS, moreGoalLine, moreGoalProgress, notAGoal, NUTRIENT_MEASURES, removeMoreGoal, restoreMoreGoal, setMoreGoalStatus, unitOf, type MoreGoal, type MoreGoalIssue} from '../../lib/health-goals/more';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {formatNumber} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {GlassBar} from '../progress/glass-progress';
import {showUndo} from '../ui/undo-toast';
import './health-goals.css';

const newId = () => `more_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const fmt = (n: number) => formatNumber(n, {maximumFractionDigits: 2});

/**
 * Session AV lane 2 (health r3; LEDGER #287, Carb Manager): under Health goals, "Goals on a nutrient, a measurement or your
 * own number": at least or at most your own target, as an average over the last 7, 14 or 30 days, from the food log, Health
 * → Measurements or Your numbers. A day without a value is left out and the line says how many days it rests on. No target
 * is suggested; ketones, glucose, insulin, HbA1c and BMI are not offered (medical advice). Its own chunk.
 */
export default function MoreGoals({health, today}: {health: HealthData; today: string}) {
  const rec = useDeviceRecord(MORE_GOALS), numbers = useDeviceRecord(HEALTH_NUMBERS), id = useId();
  const [said, setSaid] = useState(''), [issue, setIssue] = useState<MoreGoalIssue | null>(null);
  const [what, setWhat] = useState('nutrient:proteinMg'), [direction, setDirection] = useState<MoreGoal['direction']>('at-least'), [target, setTarget] = useState(''), [windowDays, setWindow] = useState(7), [name, setName] = useState('');
  const own = useMemo(() => numbers.loaded && !numbers.unreadable ? markers(numbers.data).filter(m => !notAGoal(m.name)) : [], [numbers.loaded, numbers.unreadable, numbers.data]);
  if (!rec.loaded) return null;
  const [source, ...rest] = what.split(':') as [MoreGoal['source'], ...string[]], key = rest.join(':');
  const ownUnit = source === 'number' ? own.find(m => m.key === key)?.unit ?? '' : '';
  const ownName = source === 'number' ? own.find(m => m.key === key)?.name ?? '' : key;
  const shownUnit = source === 'number' ? ownUnit : unitOf({source, key});
  function submit(e: FormEvent) {
    e.preventDefault();
    const r = addMoreGoal(rec.data, {name, source, key: ownName, unit: ownUnit, target, direction, windowDays}, newId(), new Date().toISOString());
    if (!r.ok) { setIssue(r.issue); document.getElementById(`${id}-${r.issue.field}`)?.focus(); return; }
    try { rec.update(() => r.value); setIssue(null); setTarget(''); setName(''); setSaid(`Goal added: ${r.goal.name}.`); }
    catch (cause) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(cause)}`); }
  }
  const keep = (change: Parameters<typeof rec.update>[0], text: string) => { try { rec.update(change); setSaid(text); return true; } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); return false; } };
  const active = rec.data.goals.filter(g => g.status === 'active'), closed = rec.data.goals.filter(g => g.status === 'closed');
  const row = (g: MoreGoal) => { const p = moreGoalProgress(g, health, numbers.loaded && !numbers.unreadable ? numbers.data : null, today), at = rec.data.goals.findIndex(x => x.id === g.id); return <li key={g.id} className="health-goal-row more-goal-row" data-status={g.status} data-met={p.met ? '' : undefined}>
    <MoreGoalHead g={g}/>
    <p className="fine" data-body-figure="">{moreGoalLine(g, p, fmt)}</p>
    {p.percent !== null && <GlassBar identity={`more-goal:${g.id}`} className="health-goal-track" aria-hidden="true" value={p.percent / 100}/>}
    <div className="actions">{g.status === 'active' ? <button type="button" className="quiet" aria-label={`Close ${g.name}`} onClick={() => keep(r => setMoreGoalStatus(r, g.id, 'closed'), `${g.name} closed. It stays under Closed.`)}>Close</button> : <button type="button" className="quiet" aria-label={`Reopen ${g.name}`} onClick={() => keep(r => setMoreGoalStatus(r, g.id, 'active'), `${g.name} is active again.`)}>Reopen</button>}
      <button type="button" className="quiet" aria-label={`Remove ${g.name}`} onClick={() => { if (keep(r => removeMoreGoal(r, g.id), `${g.name} removed.`)) showUndo({message: `${g.name} removed.`, undone: `${g.name} is back.`, restore: () => rec.update(r => restoreMoreGoal(r, g, at))}); }}>Remove</button></div>
  </li>; };
  return <div className="more-goals">
    <Suspense fallback={null}><WeightBandEditor health={health} today={today}/></Suspense>
    <p className="fine">At least or at most your own target, as an average over the last 7, 14 or 30 days. A day with nothing to count is left out, never counted as zero, and today counts once it ends. Nothing is suggested. Targets on ketones, glucose, insulin, HbA1c and BMI are not offered: setting one is medical advice.</p>
    {rec.unreadable ? <p className="fine" role="alert">These goals on this device could not be read, so they cannot be changed here now.</p> : <>
      {active.length ? <ul className="health-goal-list">{active.map(row)}</ul> : <p className="health-empty-inline">No goal of this kind yet. Try protein at least 100 g a day, fibre at least 25 g, or your waist at most a number of your own.</p>}
      <form className="health-form more-goal-form" aria-label="Add a goal on a health number" noValidate onSubmit={submit}>
        <div className="health-form-grid">
          <label className="field"><span>Goal on</span><select id={`${id}-key`} value={what} aria-invalid={issue?.field === 'key' ? true : undefined} aria-describedby={issue?.field === 'key' ? `${id}-key-issue` : undefined} onChange={e => { setWhat(e.target.value); setIssue(null); }}>
            <optgroup label="From the food log, a day">{Object.entries(NUTRIENT_MEASURES).map(([k, m]) => <option key={k} value={`nutrient:${k}`}>{m.label} ({m.unit})</option>)}</optgroup>
            <optgroup label="Body measurements">{Object.entries(BODY_MEASURES).map(([k, label]) => <option key={k} value={`body:${k}`}>{label} (cm)</option>)}</optgroup>
            {own.length > 0 && <optgroup label="Your numbers">{own.map(m => <option key={m.key} value={`number:${m.key}`}>{m.name}{m.unit ? ` (${m.unit})` : ''}</option>)}</optgroup>}
          </select></label>
          <label className="field"><span>Direction</span><select value={direction} onChange={e => setDirection(e.target.value as MoreGoal['direction'])}><option value="at-least">At least</option><option value="at-most">At most</option></select></label>
          <div><label className="field"><span>Your target{shownUnit ? ` (${shownUnit})` : ''}</span><input id={`${id}-target`} type="text" inputMode="decimal" autoComplete="off" value={target} aria-invalid={issue?.field === 'target' ? true : undefined} aria-describedby={issue?.field === 'target' ? `${id}-target-issue` : undefined} onChange={e => { setTarget(e.target.value); setIssue(null); }}/></label>
            {issue?.field === 'target' && <p className="field-error" id={`${id}-target-issue`} role="alert">{issue.message}</p>}</div>
          <label className="field"><span>Average over</span><select value={windowDays} onChange={e => setWindow(Number(e.target.value))}>{MORE_WINDOWS.map(w => <option key={w} value={w}>The last {w} days</option>)}</select></label>
          <div><label className="field"><span>Name (optional)</span><input id={`${id}-name`} type="text" maxLength={60} value={name} aria-invalid={issue?.field === 'name' ? true : undefined} aria-describedby={issue?.field === 'name' ? `${id}-name-issue` : undefined} onChange={e => { setName(e.target.value); setIssue(null); }}/></label>
            {issue?.field === 'name' && <p className="field-error" id={`${id}-name-issue`} role="alert">{issue.message}</p>}</div>
        </div>
        {issue?.field === 'key' && <p className="field-error" id={`${id}-key-issue`} role="alert">{issue.message}</p>}
        <div className="actions"><button type="submit" className="primary">Add the goal</button></div>
      </form>
      {closed.length > 0 && <details className="health-goals-done"><summary>Closed ({closed.length})</summary><ul className="health-goal-list">{closed.map(row)}</ul></details>}
    </>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
/** A goal's name and target; a calorie or body figure is hidden by "Hide calories and weight" (review B3B-4). */
export function MoreGoalHead({g}: {g: MoreGoal}) {
  return <div><strong data-body-figure={unitOf(g) === 'kcal' ? '' : undefined}>{g.name}</strong> <small className="fine">{measureWord(g)} · <span data-body-figure={g.source === 'body' || unitOf(g) === 'kcal' ? '' : undefined}>{g.direction === 'at-least' ? 'at least' : 'at most'} {fmt(g.target)} {unitOf(g)}</span> · last {g.windowDays} days</small></div>;
}
