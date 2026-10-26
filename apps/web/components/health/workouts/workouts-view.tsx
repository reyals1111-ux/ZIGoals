'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {NebulaFlow} from '../../nebula-flow';
import {ConfirmInline} from '../../ui/confirm-inline';
import {showToast} from '../../ui/undo-toast';
import {useHealth} from '../use-health';
import {dailyData, healthDay} from '../../../lib/health-daily';
import {newHealthId, removeHealthItem, saveActivity} from '../../../lib/health';
import {plainErrorMessage} from '../../../lib/plain-error';
import {formatDate, formatNumber, formatTime} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {addCustomExercise, addExercise, addSet, discardWorkout, doneSets, durationMinutes, exerciseHistory, finished, oneRepMax, finishWorkout, inProgress, lastEntryFor, moveExercise, removeExercise, removeSet, removeTemplate, removeWorkout, renameWorkout, saveTemplate, setExerciseNote, setReady, setRest, startWorkout, updateSet, volumeKg, weekSummary, withActivity, type PersonalBest} from '../../../lib/workouts/engine';
import {allExercises, searchExercises, type LibraryExercise} from '../../../lib/workouts/library';
import {CATEGORIES, MEASURES, SET_KINDS, type ExerciseEntry, type Measure, type Workout, type WorkoutSet, type Workouts} from '../../../lib/workouts/schema';
import {clock, fromUnit, readClock, setText, toUnit, weightShown} from './units';
import {useWorkouts} from './use-workouts';
import './workouts.css';

/**
 * Workouts, the full view (Session AH Part 6, DE8; /app/health?view=workouts, a view of Health like Sleep and Meditation).
 * Start empty, from a routine or by repeating the last workout; log sets (weight × reps, reps, time or distance) with the
 * same set last time beside each; a rest timer after each ticked set; finish to keep the minutes in Health (so Today, the
 * weekly review and a linked exercise habit count them) and to see new personal bests; every exercise keeps its history.
 */
const KIND_WORDS: Record<WorkoutSet['kind'], string> = {warmup: 'Warm-up', normal: 'Working', drop: 'Drop set', failure: 'To failure'};
const MEASURE_WORDS: Record<Measure, string> = {'weight-reps': 'Weight and reps', reps: 'Reps', time: 'Time', 'distance-time': 'Distance and time'};
const bestWords = (b: PersonalBest, unit: 'kg' | 'lb') => `${b.name}: ${b.what === 'weight' ? `heaviest ${weightShown(b.value, unit)}` : b.what === 'one-rep max' ? `estimated one-rep max ${weightShown(b.value, unit)}` : b.what === 'reps' ? `most reps, ${b.value}` : b.what === 'time' ? `longest, ${clock(b.value)}` : `farthest, ${formatNumber(b.value)} km`}`;

export default function WorkoutsView() {
  const record = useWorkouts(), health = useHealth();
  const [note, setNote] = useState(''), [now, setNow] = useState(() => Date.now()), [restUntil, setRestUntil] = useState<number | null>(null);
  const [asking, setAsking] = useState<null | 'finish' | 'discard' | {remove: string}>(null), [summary, setSummary] = useState<{workout: Workout; bests: PersonalBest[]} | null>(null);
  const [historyOf, setHistoryOf] = useState('');
  const ready = record.loaded && health.loaded && !health.error;
  const unit = ready ? dailyData(health.data).preferences.weightUnit : 'kg';
  const today = ready ? healthDay(dailyData(health.data).preferences.timezone) : '';
  const current = record.loaded ? inProgress(record.data) : undefined;
  // One clock for the elapsed time and the rest timer, every second while either shows.
  useEffect(() => { if (!current && restUntil === null) return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [current, restUntil]);
  useEffect(() => { if (restUntil !== null && now >= restUntil) { setRestUntil(null); setNote('Rest is over. Next set when you are ready.'); } }, [now, restUntil]);
  const change = (fn: (w: Workouts) => Workouts, said?: string) => { try { record.update(fn); if (said) setNote(said); return true; } catch (e) { setNote(plainErrorMessage(e, 'That could not be saved on this device.')); return false; } };

  if (!record.loaded || !health.loaded) return <section className="panel"><h1>Workouts</h1><p>Opening your workout log…</p></section>;
  if (health.error) return <section className="panel"><h1>Workouts</h1><p role="alert">Workouts keep their minutes in your Health journal, which could not be read. Nothing was changed.</p><Link className="text-link" href="/app/health">Back to Health</Link></section>;
  const w = record.data, past = finished(w), last = past[0], week = weekSummary(w, today), library = allExercises(w.exercises);

  const begin = (input: Parameters<typeof startWorkout>[1]) => { setSummary(null); if (change(x => startWorkout(x, input), 'Workout started. Add an exercise, then log your sets.')) document.getElementById('workout-now')?.scrollIntoView({block: 'start'}); };
  async function finish() {
    setAsking(null);
    try {
      let result: ReturnType<typeof finishWorkout> | undefined;
      record.update(x => { result = finishWorkout(x, new Date()); return result.workouts; });
      const {workout, bests} = result!, minutes = Math.min(1440, Math.max(1, durationMinutes(workout)));
      // The minutes go to Health's activity log, so Today, the weekly review and a linked exercise habit count them.
      const activityId = newHealthId();
      try { await health.update(h => saveActivity(h, {id: activityId, date: workout.date, name: workout.name, steps: 0, minutes}, new Date().toISOString())); record.update(x => withActivity(x, workout.id, activityId)); }
      catch { setNote('The workout is saved; its minutes could not be added to Health.'); }
      setRestUntil(null); setSummary({workout, bests});
      showToast({message: `${workout.name} saved · ${minutes} min${bests.length ? ` · ${bests.length} new ${plural(bests.length, 'personal best')}` : ''}.`});
    } catch (e) { setNote(plainErrorMessage(e, 'The workout could not be finished.')); }
  }
  async function remove(id: string) {
    const target = w.workouts.find(x => x.id === id); setAsking(null);
    if (!target) return;
    if (!change(x => removeWorkout(x, id))) return;
    if (target.activityId) { try { await health.update(h => h.activity.some(a => a.id === target.activityId) ? removeHealthItem(h, 'activity', target.activityId!) : h); } catch { /* the workout is gone; its minutes stay in Health */ } }
    setNote(`${target.name} on ${formatDate(target.date)} is deleted, with its minutes in Health.`);
  }

  return <div className="workouts-view">
    <div className="page-heading"><div>
      <p><Link className="text-link sleep-back" href="/app/health">← Health</Link></p>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="workouts-eyebrow">HEALTH · WORKOUTS</NebulaFlow></p>
      <h1><NebulaFlow identity="workouts-title">Train with a plan.</NebulaFlow></h1>
      <p className="page-lede">Sets, reps, weights, time and distance, with what you did last time beside each set. Kept on this device; a finished workout adds its minutes to your Health activity.</p>
    </div></div>
    {note && <p className="workouts-note" role="status">{note}</p>}
    {record.unreadable && <p className="notice" role="alert">The workout log on this device could not be read. Its bytes are kept; nothing was changed. Starting a workout writes a new log.</p>}

    {current ? <CurrentWorkout workout={current} w={w} unit={unit} now={now} library={library} restUntil={restUntil} change={change}
        onRest={() => { if (w.restSeconds > 0) setRestUntil(Date.now() + w.restSeconds * 1000); }} onSkipRest={() => setRestUntil(null)}
        onFinish={() => { const open = current.exercises.reduce((n, e) => n + e.sets.filter(s => !s.done && setReady(e.measure, s)).length, 0); if (open) setAsking('finish'); else void finish(); }}
        onDiscard={() => setAsking('discard')}/>
      : <section className="panel workouts-start" aria-labelledby="workouts-start-title">
        <h2 id="workouts-start-title">Start a workout</h2>
        <p className="fine">This week: {week.workouts} {plural(week.workouts, 'workout')}{week.workouts ? ` · ${week.minutes} min · ${week.sets} ${plural(week.sets, 'set')}${week.volumeKg ? ` · ${weightShown(week.volumeKg, unit)} lifted` : ''}` : ''}.</p>
        <div className="workouts-start-actions">
          <button className="primary" type="button" onClick={() => begin({date: today, now: new Date()})}>Start an empty workout</button>
          {last && <button className="secondary" type="button" onClick={() => begin({date: today, now: new Date(), repeat: last})}>Repeat {last.name}</button>}
        </div>
        {w.templates.length > 0 && <><h3>Your routines</h3><ul className="workouts-routines">{w.templates.map(t => <li key={t.id}>
          <div><strong>{t.name}</strong><span>{t.exercises.map(e => e.name).join(' · ')}</span></div>
          <div className="workouts-row-actions"><button className="secondary" type="button" onClick={() => begin({date: today, now: new Date(), template: t})} aria-label={`Start ${t.name}`}>Start</button>
            <button className="quiet" type="button" aria-label={`Remove routine ${t.name}`} onClick={() => change(x => removeTemplate(x, t.id), `Routine ${t.name} removed.`)}>Remove</button></div>
        </li>)}</ul></>}
      </section>}
    {asking === 'finish' && current && <ConfirmInline title="Finish with unticked sets?" confirmLabel="Finish workout" cancelLabel="Keep logging" tone="neutral" onConfirm={() => void finish()} onCancel={() => setAsking(null)}><p>Sets you have not ticked are left out. Tick a set when you finish it.</p></ConfirmInline>}
    {asking === 'discard' && <ConfirmInline title="Discard this workout?" confirmLabel="Discard workout" cancelLabel="Keep it" onConfirm={() => { setAsking(null); setRestUntil(null); change(discardWorkout, 'The workout in progress is discarded. Nothing was added to Health.'); }} onCancel={() => setAsking(null)}><p>Its sets are not kept.</p></ConfirmInline>}

    {summary && <section className="panel workouts-summary" aria-labelledby="workouts-summary-title">
      <h2 id="workouts-summary-title">{summary.workout.name}, done</h2>
      <p>{durationMinutes(summary.workout)} min · {doneSets(summary.workout).length} {plural(doneSets(summary.workout).length, 'set')}{(() => { const v = summary.workout.exercises.reduce((t, e) => t + volumeKg(e), 0); return v ? ` · ${weightShown(v, unit)} lifted` : ''; })()}.</p>
      {summary.bests.length > 0 ? <><h3>New personal bests</h3><ul>{summary.bests.map(b => <li key={`${b.exerciseId}-${b.what}`}>{bestWords(b, unit)}</li>)}</ul></> : <p className="fine">No new personal best this time; consistency is what counts.</p>}
      <SaveRoutine workout={summary.workout} onSave={name => change(x => saveTemplate(x, summary.workout, name, new Date()), `Routine ${name || summary.workout.name} saved. Start it from here next time.`)}/>
    </section>}

    <section className="panel workouts-history" aria-labelledby="workouts-history-title">
      <h2 id="workouts-history-title">Your workouts</h2>
      {past.length ? <ul className="workouts-past">{past.slice(0, 30).map(x => <li key={x.id}>
        <details><summary><strong>{x.name}</strong> <span>{formatDate(x.date)} · {durationMinutes(x)} min · {x.exercises.length} {plural(x.exercises.length, 'exercise')}</span></summary>
          <ul className="workouts-past-exercises">{x.exercises.map(e => <li key={e.id}><strong>{e.name}</strong> <span>{e.sets.map(s => `${s.kind === 'warmup' ? 'W ' : ''}${setText(e.measure, s, unit)}`).join(' · ')}</span></li>)}</ul>
          <div className="workouts-row-actions">
            {!current && <button className="secondary" type="button" onClick={() => begin({date: today, now: new Date(), repeat: x})}>Repeat</button>}
            <SaveRoutine compact workout={x} onSave={name => change(y => saveTemplate(y, x, name, new Date()), `Routine ${name || x.name} saved.`)}/>
            <button className="quiet" type="button" onClick={() => setAsking({remove: x.id})} aria-label={`Delete ${x.name} on ${formatDate(x.date)}`}>Delete</button>
          </div>
          {typeof asking === 'object' && asking?.remove === x.id && <ConfirmInline title={`Delete ${x.name}?`} confirmLabel="Delete workout" cancelLabel="Keep it" onConfirm={() => void remove(x.id)} onCancel={() => setAsking(null)}><p>Its sets and the minutes it added to Health are removed.</p></ConfirmInline>}
        </details>
      </li>)}</ul> : <p className="health-empty-inline">No workout yet. Start one above: an empty one, or add exercises as you go.</p>}
    </section>

    <ExerciseProgress w={w} unit={unit} library={library} value={historyOf} onChange={setHistoryOf}/>

    <section className="panel workouts-settings" aria-labelledby="workouts-settings-title">
      <h2 id="workouts-settings-title">Rest timer</h2>
      <label className="field"><span>Rest after each finished set</span>
        <select value={String(w.restSeconds)} onChange={e => change(x => setRest(x, Number(e.target.value)), Number(e.target.value) ? `Rest timer: ${clock(Number(e.target.value))}.` : 'Rest timer off.')}>
          {[0, 30, 60, 90, 120, 180, 240, 300].map(s => <option key={s} value={s}>{s ? clock(s) : 'Off'}</option>)}
        </select></label>
      <p className="fine">Weights use your Health weight unit ({unit}); change it in Health → Journal settings.</p>
    </section>
  </div>;
}

function CurrentWorkout({workout, w, unit, now, library, restUntil, change, onRest, onSkipRest, onFinish, onDiscard}: {workout: Workout; w: Workouts; unit: 'kg' | 'lb'; now: number; library: LibraryExercise[]; restUntil: number | null;
  change: (fn: (w: Workouts) => Workouts, said?: string) => boolean; onRest: () => void; onSkipRest: () => void; onFinish: () => void; onDiscard: () => void}) {
  const [picking, setPicking] = useState(workout.exercises.length === 0);
  const elapsed = Math.max(0, Math.floor((now - Date.parse(workout.startedAt)) / 1000));
  return <section className="panel workouts-now" id="workout-now" aria-labelledby="workout-now-title">
    <div className="workouts-now-head">
      <label className="field workouts-name"><span id="workout-now-title">Workout in progress</span><input defaultValue={workout.name} maxLength={80} onBlur={e => { if (e.target.value.trim() !== workout.name) change(x => renameWorkout(x, e.target.value)); }}/></label>
      <p className="workouts-elapsed"><span>Started {formatTime(workout.startedAt)}</span> <strong>{clock(elapsed)}</strong></p>
    </div>
    {restUntil !== null && <p className="workouts-rest" role="timer" aria-live="off">Rest <strong>{clock(Math.max(0, Math.ceil((restUntil - now) / 1000)))}</strong> <button className="text-link" type="button" onClick={onSkipRest}>Skip rest</button></p>}
    {workout.exercises.map((e, i) => <ExerciseBlock key={e.id} entry={e} index={i} count={workout.exercises.length} previous={lastEntryFor(w, e.exerciseId, workout.startedAt)} unit={unit} change={change} onRest={onRest}/>)}
    {picking ? <ExercisePicker library={library} onPick={x => { if (change(y => addExercise(y, x))) setPicking(false); }} onCreate={input => { let made: LibraryExercise | undefined; if (change(y => { const r = addCustomExercise(y, input); made = r.exercise; return addExercise(r.workouts, r.exercise); })) { setPicking(false); void made; } }} onClose={workout.exercises.length ? () => setPicking(false) : undefined}/>
      : <button className="secondary workouts-add" type="button" onClick={() => setPicking(true)}>+ Add an exercise</button>}
    <div className="workouts-now-actions"><button className="primary" type="button" onClick={onFinish}>Finish workout</button><button className="quiet" type="button" onClick={onDiscard}>Discard</button></div>
  </section>;
}

function ExerciseBlock({entry, index, count, previous, unit, change, onRest}: {entry: ExerciseEntry; index: number; count: number; previous?: ExerciseEntry; unit: 'kg' | 'lb'; change: (fn: (w: Workouts) => Workouts, said?: string) => boolean; onRest: () => void}) {
  const headId = `ex-${entry.id}`;
  return <article className="workouts-exercise" aria-labelledby={headId}>
    <header><h3 id={headId}>{entry.name}</h3><div className="workouts-row-actions">
      <button className="quiet" type="button" disabled={index === 0} aria-label={`Move ${entry.name} up`} onClick={() => change(x => moveExercise(x, entry.id, -1))}>↑</button>
      <button className="quiet" type="button" disabled={index === count - 1} aria-label={`Move ${entry.name} down`} onClick={() => change(x => moveExercise(x, entry.id, 1))}>↓</button>
      <button className="quiet" type="button" aria-label={`Remove ${entry.name}`} onClick={() => change(x => removeExercise(x, entry.id), `${entry.name} removed from this workout.`)}>Remove</button></div></header>
    <table className="workouts-sets"><caption className="sr-only">{entry.name}: sets</caption>
      <thead><tr><th scope="col">Set</th><th scope="col">Last time</th>{entry.measure === 'weight-reps' && <th scope="col">{unit}</th>}{entry.measure === 'distance-time' && <th scope="col">km</th>}{(entry.measure === 'weight-reps' || entry.measure === 'reps') && <th scope="col">Reps</th>}{(entry.measure === 'time' || entry.measure === 'distance-time') && <th scope="col">Time</th>}<th scope="col"><span className="sr-only">Done</span></th><th scope="col"><span className="sr-only">Remove</span></th></tr></thead>
      <tbody>{entry.sets.map((s, i) => <SetRow key={s.id} entry={entry} set={s} n={i + 1} previous={previous?.sets[i]} unit={unit} change={change} onDone={onRest}/>)}</tbody>
    </table>
    <div className="workouts-exercise-foot"><button className="secondary" type="button" onClick={() => change(x => addSet(x, entry.id))}>+ Add set</button>
      <label className="field workouts-ex-note"><span className="sr-only">Note for {entry.name}</span><input placeholder="Note (seat height, grip…)" maxLength={500} defaultValue={entry.note ?? ''} onBlur={e => { if ((entry.note ?? '') !== e.target.value) change(x => setExerciseNote(x, entry.id, e.target.value)); }}/></label></div>
  </article>;
}

function SetRow({entry, set, n, previous, unit, change, onDone}: {entry: ExerciseEntry; set: WorkoutSet; n: number; previous?: WorkoutSet; unit: 'kg' | 'lb'; change: (fn: (w: Workouts) => Workouts, said?: string) => boolean; onDone: () => void}) {
  const m = entry.measure, label = `${entry.name}, set ${n}`;
  const [weight, setWeight] = useState(set.weightKg === undefined ? '' : String(Math.round(toUnit(set.weightKg, unit) * 100) / 100));
  const [reps, setReps] = useState(set.reps === undefined ? '' : String(set.reps)), [time, setTime] = useState(set.seconds ? clock(set.seconds) : ''), [dist, setDist] = useState(set.distanceKm === undefined ? '' : String(set.distanceKm));
  const [problem, setProblem] = useState('');
  const read = (): Partial<WorkoutSet> | null => {
    const num = (v: string) => v.trim() === '' ? undefined : Number(v.replace(',', '.'));
    const kg = num(weight), r = num(reps), km = num(dist), sec = time.trim() ? readClock(time) : undefined;
    if (kg !== undefined && (!Number.isFinite(kg) || kg < 0 || fromUnit(kg, unit) > 1000)) { setProblem(`Enter a weight from 0 to ${unit === 'lb' ? '2,204' : '1,000'} ${unit}.`); return null; }
    if (r !== undefined && (!Number.isInteger(r) || r < 0 || r > 1000)) { setProblem('Enter whole reps from 0 to 1,000.'); return null; }
    if (km !== undefined && (!Number.isFinite(km) || km < 0 || km > 1000)) { setProblem('Enter a distance from 0 to 1,000 km.'); return null; }
    if (sec === null) { setProblem('Enter the time as minutes:seconds, such as 1:30.'); return null; }
    setProblem('');
    return {...(m === 'weight-reps' ? {weightKg: kg === undefined ? undefined : fromUnit(kg, unit)} : {}), ...(m === 'weight-reps' || m === 'reps' ? {reps: r} : {}), ...(m === 'time' || m === 'distance-time' ? {seconds: sec} : {}), ...(m === 'distance-time' ? {distanceKm: km} : {})};
  };
  const commit = () => { const patch = read(); if (patch) change(x => updateSet(x, entry.id, set.id, patch)); };
  const tick = () => {
    if (set.done) { change(x => updateSet(x, entry.id, set.id, {done: false})); return; }
    const patch = read(); if (!patch) return;
    if (!setReady(m, {...set, ...patch})) { setProblem(m === 'weight-reps' ? 'Enter the weight and the reps first.' : m === 'reps' ? 'Enter the reps first.' : m === 'time' ? 'Enter the time first.' : 'Enter the distance or the time first.'); return; }
    if (change(x => updateSet(x, entry.id, set.id, {...patch, done: true}))) onDone();
  };
  const fill = () => { if (!previous) return; if (previous.weightKg !== undefined) setWeight(String(Math.round(toUnit(previous.weightKg, unit) * 100) / 100)); if (previous.reps !== undefined) setReps(String(previous.reps)); if (previous.seconds) setTime(clock(previous.seconds)); if (previous.distanceKm !== undefined) setDist(String(previous.distanceKm)); };
  return <><tr data-done={set.done || undefined} data-kind={set.kind}>
    <th scope="row"><select className="workouts-kind" value={set.kind} aria-label={`${label}: type`} onChange={e => change(x => updateSet(x, entry.id, set.id, {kind: e.target.value as WorkoutSet['kind']}))}>{SET_KINDS.map(k => <option key={k} value={k}>{k === 'normal' ? String(n) : k === 'warmup' ? 'W' : k === 'drop' ? 'D' : 'F'}</option>)}</select><span className="sr-only">{KIND_WORDS[set.kind]}</span></th>
    <td>{previous ? <button className="text-link workouts-prev" type="button" onClick={fill} aria-label={`${label}: use last time, ${setText(m, previous, unit)}`}>{setText(m, previous, unit)}</button> : <span className="fine">—</span>}</td>
    {m === 'weight-reps' && <td><input className="workouts-num" inputMode="decimal" aria-label={`${label}: weight in ${unit}`} value={weight} onChange={e => setWeight(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {m === 'distance-time' && <td><input className="workouts-num" inputMode="decimal" aria-label={`${label}: distance in km`} value={dist} onChange={e => setDist(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {(m === 'weight-reps' || m === 'reps') && <td><input className="workouts-num" inputMode="numeric" aria-label={`${label}: reps`} value={reps} onChange={e => setReps(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    {(m === 'time' || m === 'distance-time') && <td><input className="workouts-num" inputMode="numeric" aria-label={`${label}: time, minutes:seconds`} placeholder="1:30" value={time} onChange={e => setTime(e.target.value)} onBlur={commit} disabled={set.done}/></td>}
    <td><button className="workouts-tick" type="button" aria-pressed={set.done} aria-label={set.done ? `${label} done; undo` : `Mark ${label} done`} onClick={tick}>✓</button></td>
    <td><button className="quiet workouts-remove" type="button" aria-label={`Remove ${label}`} onClick={() => change(x => removeSet(x, entry.id, set.id))}>×</button></td>
  </tr>{problem && <tr className="workouts-problem"><td colSpan={7}><p role="alert">{problem}</p></td></tr>}</>;
}

function ExercisePicker({library, onPick, onCreate, onClose}: {library: LibraryExercise[]; onPick: (x: LibraryExercise) => void; onCreate: (input: {name: string; category: typeof CATEGORIES[number]; measure: Measure}) => void; onClose?: () => void}) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState<'' | typeof CATEGORIES[number]>(''), [measure, setMeasure] = useState<Measure>('weight-reps'), [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>('Full body');
  const found = useMemo(() => searchExercises(library, query).filter(e => !category || e.category === category).slice(0, 40), [library, query, category]);
  const exact = library.some(e => e.name.toLowerCase() === query.trim().toLowerCase());
  return <div className="workouts-picker" role="group" aria-label="Add an exercise">
    <div className="workouts-picker-filters">
      <label className="field"><span>Find an exercise</span><input type="search" value={query} maxLength={80} onChange={e => setQuery(e.target.value)} placeholder="Bench, squat, run…" autoFocus/></label>
      <label className="field"><span>Muscle group</span><select value={category} onChange={e => setCategory(e.target.value as typeof category)}><option value="">All</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
    </div>
    <ul className="workouts-picker-list">{found.map(x => <li key={x.id}><button type="button" className="secondary" onClick={() => onPick(x)}><strong>{x.name}</strong><span>{x.category} · {MEASURE_WORDS[x.measure]}</span></button></li>)}</ul>
    {query.trim() && !exact && <div className="workouts-picker-new"><p>Not in the list? Add “{query.trim()}”.</p>
      <label className="field"><span>Muscle group</span><select value={newCategory} onChange={e => setNewCategory(e.target.value as typeof newCategory)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="field"><span>Each set records</span><select value={measure} onChange={e => setMeasure(e.target.value as Measure)}>{MEASURES.map(mm => <option key={mm} value={mm}>{MEASURE_WORDS[mm]}</option>)}</select></label>
      <button className="secondary" type="button" onClick={() => onCreate({name: query, category: newCategory, measure})}>Add “{query.trim().slice(0, 40)}”</button></div>}
    {onClose && <button className="text-link" type="button" onClick={onClose}>Close the list</button>}
  </div>;
}

function SaveRoutine({workout, onSave, compact = false}: {workout: Workout; onSave: (name: string) => void; compact?: boolean}) {
  const [name, setName] = useState(workout.name), [open, setOpen] = useState(!compact);
  if (!open) return <button className="secondary" type="button" onClick={() => setOpen(true)}>Save as routine</button>;
  return <form className="workouts-save-routine" onSubmit={e => { e.preventDefault(); onSave(name.trim()); if (compact) setOpen(false); }}>
    <label className="field"><span>Routine name</span><input value={name} maxLength={80} onChange={e => setName(e.target.value)}/></label>
    <button className="secondary" type="submit">Save as routine</button>
  </form>;
}

/**
 * Session AH (L1, as Multi's progression view): each session's best set, oldest to newest, as one line (estimated
 * one-rep max for weighted lifts; reps, time or distance otherwise), with the first and latest values written beside it
 * and the whole line described in words. Derived from the saved workouts; nothing is stored.
 */
function ProgressLine({h, unit}: {h: NonNullable<ReturnType<typeof exerciseHistory>>; unit: 'kg' | 'lb'}) {
  const value = (s: (typeof h.sessions)[number]) => { const b = s.best; if (!b) return null; if (h.measure === 'weight-reps') return b.weightKg !== undefined && b.reps ? oneRepMax(b.weightKg, Math.min(b.reps, 12)) : null; if (h.measure === 'reps') return b.reps ?? null; if (h.measure === 'time') return b.seconds ?? null; return b.distanceKm ?? null; };
  const points = [...h.sessions].reverse().slice(-20).map(s => ({date: s.date, v: value(s)})).filter((p): p is {date: string; v: number} => typeof p.v === 'number' && p.v > 0);
  if (points.length < 2) return null;
  const shown = (v: number) => h.measure === 'weight-reps' ? weightShown(v, unit) : h.measure === 'time' ? clock(v) : h.measure === 'reps' ? `${v} reps` : `${formatNumber(v, {maximumFractionDigits: 2})} km`;
  const W = 300, H = 72, lo = Math.min(...points.map(p => p.v)), hi = Math.max(...points.map(p => p.v)), span = hi - lo || 1;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${(i / (points.length - 1) * (W - 8) + 4).toFixed(1)} ${(H - 6 - (p.v - lo) / span * (H - 12)).toFixed(1)}`).join(' ');
  const first = points[0]!, last = points.at(-1)!;
  return <figure className="workouts-progress-line">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${h.measure === 'weight-reps' ? 'Estimated one-rep max' : 'Best set'} over ${points.length} sessions: ${shown(first.v)} on ${formatDate(first.date)}, ${shown(last.v)} on ${formatDate(last.date)}; highest ${shown(hi)}.`}><path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/></svg>
    <figcaption className="fine">{`Progress, session by session (${h.measure === 'weight-reps' ? 'estimated 1-rep max' : 'best set'}): ${shown(first.v)} on ${formatDate(first.date)} → ${shown(last.v)} on ${formatDate(last.date)}`}</figcaption>
  </figure>;
}
function ExerciseProgress({w, unit, library, value, onChange}: {w: Workouts; unit: 'kg' | 'lb'; library: LibraryExercise[]; value: string; onChange: (v: string) => void}) {
  const done = useMemo(() => [...new Set(finished(w).flatMap(x => x.exercises.map(e => e.exerciseId)))], [w]);
  if (!done.length) return null;
  const chosen = value && done.includes(value) ? value : done[0]!, h = exerciseHistory(w, chosen);
  const name = (id: string) => library.find(e => e.id === id)?.name ?? finished(w).flatMap(x => x.exercises).find(e => e.exerciseId === id)?.name ?? id;
  return <section className="panel workouts-progress" aria-labelledby="workouts-progress-title">
    <h2 id="workouts-progress-title">Exercise history</h2>
    <label className="field"><span>Exercise</span><select value={chosen} onChange={e => onChange(e.target.value)}>{done.map(id => <option key={id} value={id}>{name(id)}</option>)}</select></label>
    {h && <><dl className="workouts-stats">
      {h.bestWeightKg !== null && <div><dt>Heaviest</dt><dd>{weightShown(h.bestWeightKg, unit)}</dd></div>}
      {h.bestOneRepMaxKg !== null && <div><dt>Estimated one-rep max</dt><dd>{weightShown(h.bestOneRepMaxKg, unit)}</dd><small>an estimate (Epley)</small></div>}
      {h.mostReps !== null && <div><dt>Most reps</dt><dd>{h.mostReps}</dd></div>}
      {h.longestSeconds !== null && <div><dt>Longest</dt><dd>{clock(h.longestSeconds)}</dd></div>}
      {h.farthestKm !== null && <div><dt>Farthest</dt><dd>{formatNumber(h.farthestKm, {maximumFractionDigits: 2})} km</dd></div>}
      <div><dt>Sessions</dt><dd>{h.sessions.length}</dd><small>last {formatDate(h.sessions[0]!.date)}</small></div>
    </dl>
    <ProgressLine h={h} unit={unit}/>
    <table className="workouts-history-table"><caption className="sr-only">{h.name}, last sessions</caption><thead><tr><th scope="col">Date</th><th scope="col">Best set</th><th scope="col">Sets</th>{h.measure === 'weight-reps' && <th scope="col">Volume</th>}</tr></thead>
      <tbody>{h.sessions.slice(0, 10).map(s => <tr key={s.workoutId}><th scope="row">{formatDate(s.date)}</th><td>{s.best ? setText(h.measure, s.best, unit) : '—'}</td><td>{s.sets.length}</td>{h.measure === 'weight-reps' && <td>{weightShown(s.volumeKg, unit)}</td>}</tr>)}</tbody></table></>}
  </section>;
}
