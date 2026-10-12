'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useId, useMemo, useState} from 'react';
import {AVERAGE_METRICS, WINDOWS, addAverageGoal, averageKey, averageProgress, editAverageGoal, logAverageValue, removeAverageGoal, removeAverageValue, setAverageStatus, type AverageGoal, type AverageMetric} from '../../lib/average-goals/store';
import {setGoalArea, setGoalTemplate} from '../../lib/goal-extras/store';
import {templateById} from '../../lib/templates/goal-library';
import {formatExactNumber} from '../../lib/visual-format';
import {useHealth} from '../health/use-health';
import {useLocalToday} from '../use-local-today';
import {ProgressRing} from '../platform/financial-ui';
import {showToast} from '../ui/undo-toast';
import {SectionHeading} from '../ui/section-heading';
import {useAverageGoals, useGoalExtras} from './use-goal-extras';
import {zigiSignals} from '../zigi/bus';
import {formatDay} from './format';
import {GoalPlan} from './goal-plan';
import {useUnifiedGoals} from '../use-unified-goals';
import './goals.css';

const value = (goal: Pick<AverageGoal, 'metric'>, v: number) => formatExactNumber(String(Math.round(v * 10 ** AVERAGE_METRICS[goal.metric].decimals) / 10 ** AVERAGE_METRICS[goal.metric].decimals));
const verdict = (g: AverageGoal, p: ReturnType<typeof averageProgress>) => p.average === null ? 'No days recorded in this window yet' : `${value(g, p.average)} ${g.unit} on average · ${p.days} of ${p.windowDays} days recorded`;

/** G8's card in the Goals collection: the rolling average against the target, with how many days it rests on. */
export function AverageGoalCard({goal}: {goal: AverageGoal}) {
  const health = useHealth(), today = useLocalToday();
  const p = averageProgress(goal, health.loaded && !health.error ? health.data : undefined, today);
  return <article className="panel average-goal-card" aria-label={goal.name}>
    <p className="eyebrow">Keep an average · {goal.direction === 'at-least' ? 'at least' : 'at most'} {value(goal, goal.target)} {goal.unit}</p>
    <h2><Link href={`/app/goals/average/${goal.id}`}>{goal.name}</Link></h2>
    <div className="average-goal-figure">
      <ProgressRing percent={p.share === null ? null : String(p.share * 100)} size={84} label={`${goal.name}: how close the average is`} complete={p.met === true} identity={`average-${goal.id}`} valueText={p.average === null ? 'No data' : undefined} />
      <div><strong>{p.average === null ? 'No data yet' : `${value(goal, p.average)}`}</strong><span>{p.average === null ? '' : goal.unit}</span><small>{verdict(goal, p)}</small></div>
    </div>
    <p className={`average-goal-state${p.met ? ' is-met' : ''}`}>{p.met === null ? 'Waiting for your first day.' : p.met ? 'On target over the last ' + goal.windowDays + ' days.' : 'Not on target yet over the last ' + goal.windowDays + ' days.'}</p>
    <Link className="text-link" href={`/app/goals/average/${goal.id}`}>Open goal →</Link>
  </article>;
}

/** Creating an average goal, optionally from a library template (its common target, editable). */
export function AverageGoalForm({templateId}: {templateId?: string}) {
  const t = templateId ? templateById(templateId) : undefined, preset = t?.average;
  const store = useAverageGoals(), extras = useGoalExtras(), router = useRouter(), id = useId();
  const [name, setName] = useState(t?.title ?? ''), [metric, setMetric] = useState<AverageMetric>(preset?.metric ?? 'sleep-hours');
  const [target, setTarget] = useState(preset ? String(preset.target) : ''), [direction, setDirection] = useState<'at-least' | 'at-most'>(preset?.direction ?? 'at-least');
  const [windowDays, setWindow] = useState<7 | 14 | 30>(preset?.windowDays ?? 7), [unit, setUnit] = useState(preset?.unit ?? AVERAGE_METRICS['sleep-hours'].unit), [error, setError] = useState('');
  function save(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const n = Number(target.replace(',', '.'));
    if (!name.trim()) return setError('Name the goal.');
    if (!(n > 0)) return setError('Choose a target above zero.');
    const goalId = crypto.randomUUID().slice(0, 18), at = new Date().toISOString();
    try {
      store.update(s => addAverageGoal(s, {id: goalId, name: name.trim(), metric, unit: unit.trim() || AVERAGE_METRICS[metric].unit, target: n, direction, windowDays, createdAt: at}));
      if (t && extras.writable) extras.update(x => setGoalTemplate(setGoalArea(x, averageKey(goalId), t.area, at), averageKey(goalId), t.id, at));
      showToast({message: `${name.trim()} is saved on this device.`, undo: () => store.update(s => removeAverageGoal(s, goalId)), undone: 'The new goal was removed.'});
      router.push(`/app/goals/average/${goalId}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'The goal could not be saved.'); }
  }
  return <form className="panel average-goal-form" onSubmit={save} aria-labelledby={`${id}-title`}>
    <SectionHeading id={`${id}-title`} eyebrow="A fifth kind of goal" title="Keep an average" lede="A rolling average over 7, 14 or 30 days, from Health where it already records the measure, or from your own entries." />
    <label className="field"><span>Name</span><input value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Sleep 7 hours a night" /></label>
    <label className="field"><span>Measure</span><select value={metric} onChange={e => { const m = e.target.value as AverageMetric; setMetric(m); setUnit(AVERAGE_METRICS[m].unit); }}>{(Object.keys(AVERAGE_METRICS) as AverageMetric[]).map(m => <option key={m} value={m}>{AVERAGE_METRICS[m].label}{AVERAGE_METRICS[m].source === 'health' ? ' (from Health)' : ''}</option>)}</select></label>
    <div className="average-goal-row">
      <label className="field"><span>Keep it</span><select value={direction} onChange={e => setDirection(e.target.value as 'at-least' | 'at-most')}><option value="at-least">At least</option><option value="at-most">At most</option></select></label>
      <label className="field"><span>Target</span><input inputMode="decimal" value={target} onChange={e => setTarget(e.target.value)} /></label>
      <label className="field"><span>Unit</span><input value={unit} maxLength={30} onChange={e => setUnit(e.target.value)} /></label>
    </div>
    <fieldset className="average-windows"><legend>Over the last</legend>{WINDOWS.map(w => <label key={w}><input type="radio" name={`${id}-window`} checked={windowDays === w} onChange={() => setWindow(w)} /><span>{w} days</span></label>)}</fieldset>
    {error && <p role="alert">{error}</p>}
    <p className="fine">Kept on this device for now. A day without a value is left out of the average, never counted as zero.</p>
    <div className="dashboard-actions"><Link className="secondary" href="/app/goals">Cancel</Link><button className="primary" disabled={!store.loaded || store.unreadable}>Save goal</button></div>
  </form>;
}

/** An average goal's own page: the average, every day in the window, today's own entry, and its plan. */
export function AverageGoalDetail({id}: {id: string}) {
  const store = useAverageGoals(), health = useHealth(), today = useLocalToday(), unified = useUnifiedGoals(), router = useRouter();
  const goal = store.data.goals.find(g => g.id === id);
  const [day, setDay] = useState(today), [entry, setEntry] = useState('');
  const p = useMemo(() => goal ? averageProgress(goal, health.loaded && !health.error ? health.data : undefined, today) : null, [goal, health.loaded, health.error, health.data, today]);
  if (!store.loaded) return <div className="aa-skeleton" aria-hidden="true"><i /><i /><i /></div>;
  if (!goal || !p) return <section className="panel"><h1>Goal unavailable</h1><p>This average goal is not kept on this device.</p><Link className="text-link" href="/app/goals">Back to Goals →</Link></section>;
  const run = (change: Parameters<typeof store.update>[0], message: string, undo?: Parameters<typeof store.update>[0]) => { try { store.update(change); showToast({message, ...(undo ? {undo: () => store.update(undo), undone: 'Change undone.'} : {})}); } catch (e) { showToast({message: e instanceof Error ? e.message : 'That change could not be saved.'}); } };
  const before = goal.entries.find(e => e.day === day);
  return <div className="average-goal-page">
    <section className="panel goal-detail-overview average-goal-overview" aria-labelledby="average-title">
      <p className="eyebrow">Keep an average · over {goal.windowDays} days · kept on this device for now</p>
      <h1 id="average-title">{goal.name}</h1>
      <div className="average-goal-figure is-large">
        <ProgressRing percent={p.share === null ? null : String(p.share * 100)} size={128} label={`${goal.name}: how close the average is`} complete={p.met === true} identity={`average-detail-${goal.id}`} valueText={p.average === null ? 'No data' : undefined} />
        <div><strong>{p.average === null ? 'No data yet' : value(goal, p.average)}</strong><span>{p.average === null ? '' : goal.unit}</span><small>Target: {goal.direction === 'at-least' ? 'at least' : 'at most'} {value(goal, goal.target)} {goal.unit}. {verdict(goal, p)}.</small></div>
      </div>
      <ol className="average-days" aria-label={`The last ${goal.windowDays} days`}>{p.series.map(d => <li key={d.day} data-empty={d.value === null || undefined} data-met={d.value !== null && (goal.direction === 'at-least' ? d.value >= goal.target : d.value <= goal.target) || undefined}><span className="average-day-bar" style={{height: d.value === null ? undefined : `${Math.max(8, Math.min(100, d.value / (goal.target * 1.5) * 100))}%`}} /><span className="sr-only">{formatDay(d.day)}: {d.value === null ? 'nothing recorded' : `${value(goal, d.value)} ${goal.unit}`}</span></li>)}</ol>
      <p className="fine">{p.source === 'manual' ? 'From your own entries.' : p.source === 'health' ? 'From your Health journal.' : 'From your Health journal and your own entries (yours win on the same day).'} Days with nothing recorded are left out, never counted as zero.</p>
    </section>
    <section className="panel average-goal-entry" aria-labelledby="average-entry-title">
      <h2 id="average-entry-title">Add or correct a day</h2>
      <form onSubmit={e => { e.preventDefault(); const v = Number(entry.replace(',', '.')); if (!(v >= 0) || !entry.trim()) { showToast({message: 'Write a number, zero or more.'}); return; } run(s => logAverageValue(s, goal.id, {day, value: v}), `${formatDay(day)} saved.`, s => before ? logAverageValue(s, goal.id, before) : removeAverageValue(s, goal.id, day)); setEntry(''); }}>
        <div className="average-goal-row">
          <label className="field"><span>Day</span><input type="date" value={day} max={today} onChange={e => setDay(e.target.value)} /></label>
          <label className="field"><span>{goal.unit || 'Value'}</span><input inputMode="decimal" value={entry} onChange={e => setEntry(e.target.value)} /></label>
          <button className="secondary">Save the day</button>
        </div>
      </form>
      {goal.entries.length > 0 && <ul className="average-entries">{[...goal.entries].reverse().slice(0, 10).map(e => <li key={e.day}><span>{formatDay(e.day)}</span><strong>{value(goal, e.value)} {goal.unit}</strong><button type="button" className="text-link" onClick={() => run(s => removeAverageValue(s, goal.id, e.day), `${formatDay(e.day)} removed.`, s => logAverageValue(s, goal.id, e))}>Remove</button></li>)}</ul>}
    </section>
    <section className="panel average-goal-settings" aria-labelledby="average-settings-title">
      <h2 id="average-settings-title">Goal status</h2>
      <div className="dashboard-actions">
        {goal.status !== 'completed' ? <button type="button" className="secondary" onClick={() => { run(s => setAverageStatus(s, goal.id, 'completed', new Date().toISOString()), 'Marked as finished. It is on the Hall of achievements.', s => setAverageStatus(s, goal.id, goal.status, new Date().toISOString())); zigiSignals.emitValidated('goal_funded'); }}>Mark as finished</button> : <button type="button" className="secondary" onClick={() => run(s => setAverageStatus(s, goal.id, 'active', new Date().toISOString()), 'Active again.')}>Make active again</button>}
        <label className="field average-window-edit"><span>Window</span><select value={goal.windowDays} onChange={e => run(s => editAverageGoal(s, goal.id, {windowDays: Number(e.target.value) as 7 | 14 | 30}), 'Window changed.', s => editAverageGoal(s, goal.id, {windowDays: goal.windowDays}))}>{WINDOWS.map(w => <option key={w} value={w}>{w} days</option>)}</select></label>
        <button type="button" className="quiet" onClick={() => { const kept = goal; run(s => removeAverageGoal(s, goal.id), `${goal.name} removed.`, s => ({...s, goals: [...s.goals, kept]})); router.push('/app/goals'); }}>Remove this goal</button>
      </div>
    </section>
    <GoalPlan goalKey={averageKey(goal.id)} name={goal.name} goals={unified.goals} finished={goal.status === 'completed'} />
  </div>;
}
