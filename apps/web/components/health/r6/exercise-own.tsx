'use client';
import {useId, useMemo, useState} from 'react';
import {exerciseHistory, type BestKey, type BestValues} from '../../../lib/workouts/engine';
import {ALL_EXERCISES_KEY, defaultsWords, isFavouriteExercise, setBestsFrom, setExerciseDefaults, setFavouriteExercise} from '../../../lib/workouts/r6-gym';
import type {LibraryExercise} from '../../../lib/workouts/library';
import type {Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {clock, estimateShown, weightShown} from '../workouts/units';
import './body-r6.css';

/**
 * Session AV lane 2, round 6 (r6-body; Caliber): an exercise's own part in "Exercises and how-tos", one lazy chunk —
 * the star (#420), its bests with the day each was set and "Count bests from today" for it or for every exercise, the
 * earlier bests greyed as "before" (#422), light weeks left out (#421), and its own defaults, "3 × 8, 2 min rest" (#424).
 */
type Change = (fn: (w: Workouts) => Workouts, said?: string, undone?: string) => boolean;
const LABELS: Record<BestKey, string> = {bestWeightKg: 'Heaviest', bestOneRepMaxKg: 'Estimated one-rep max', mostReps: 'Most reps', longestSeconds: 'Longest', farthestKm: 'Farthest', bestAddedKg: 'Most weight added', leastAssistKg: 'Least help'};
const ORDER: BestKey[] = ['bestWeightKg', 'bestOneRepMaxKg', 'mostReps', 'longestSeconds', 'farthestKm', 'bestAddedKg', 'leastAssistKg'];
function valueText(key: BestKey, v: number, unit: 'kg' | 'lb'): string {
  if (key === 'bestOneRepMaxKg') return estimateShown(v, unit);
  if (key === 'bestWeightKg' || key === 'bestAddedKg' || key === 'leastAssistKg') return weightShown(v, unit);
  if (key === 'longestSeconds') return clock(v);
  if (key === 'farthestKm') return `${formatNumber(v, {maximumFractionDigits: 2})} km`;
  return formatNumber(v);
}
const shown = (b: BestValues, measure: string) => ORDER.filter(k => b[k] !== null && !(k === 'mostReps' && measure === 'weight-reps'));
export default function ExerciseOwn({exercise, w, unit, change, today}: {exercise: LibraryExercise; w: Workouts; unit: 'kg' | 'lb'; change: Change; /** Review B6P-10: the day workouts are logged on (the Workouts view's today, in the Health zone). */ today: string}) {
  const h = useMemo(() => exerciseHistory(w, exercise.id), [w, exercise.id]), id = useId(), star = isFavouriteExercise(w, exercise.id);
  const own = w.exerciseDefaults?.[exercise.id], timed = exercise.measure === 'time';
  const [sets, setSets] = useState(own ? String(own.sets) : ''), [each, setEach] = useState(own ? String((timed ? own.seconds : own.reps) ?? '') : ''), [rest, setRest] = useState(own?.restSeconds !== undefined ? String(own.restSeconds) : ''), [problem, setProblem] = useState('');
  const fromOne = w.bestsFrom?.[exercise.id] ?? null, fromAll = w.bestsFrom?.[ALL_EXERCISES_KEY] ?? null;
  function saveDefaults() {
    setProblem('');
    if (!sets.trim()) { change(x => setExerciseDefaults(x, exercise.id, null), `${exercise.name} has no defaults of its own now.`); return; }
    const n = Number(sets), e = each.trim() ? Number(each) : undefined, r = rest.trim() ? Number(rest) : undefined;
    const d = {sets: n, ...(e !== undefined && exercise.measure !== 'distance-time' ? timed ? {seconds: e} : {reps: e} : {}), ...(r !== undefined ? {restSeconds: r} : {})};
    try { setExerciseDefaults(w, exercise.id, d); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved.'); return; }
    change(x => setExerciseDefaults(x, exercise.id, d), `${exercise.name}: ${defaultsWords(d)} when you add it with no earlier sets.`);
  }
  return <div className="r6-exercise-own">
    <p><button type="button" className="secondary r6-star" aria-pressed={star} onClick={() => change(x => setFavouriteExercise(x, exercise.id, !star), star ? `${exercise.name} is no longer a favourite.` : `${exercise.name} is a favourite: it comes first when you add an exercise.`)}><span className="r6-star-mark" aria-hidden="true">{star ? '★' : '☆'}</span> Favourite<span className="sr-only">: {exercise.name}</span></button></p>
    {h && <section aria-labelledby={`${id}-bests`}>
      <h4 id={`${id}-bests`}>Your bests and their days</h4>
      {shown(h, h.measure).length ? <ul className="r6-bests">{shown(h, h.measure).map(k => <li key={k}>{LABELS[k]}: <strong>{valueText(k, h[k]!, unit)}</strong>{h.bestDays[k] ? ` · ${formatDate(h.bestDays[k]!)}` : ''}</li>)}</ul>
        : <p className="fine">No best since {formatDate(h.from ?? today)} yet: your next workout with it sets the first.</p>}
      {h.before && <><p className="fine">Before {formatDate(h.from!)}:</p><ul className="r6-bests">{shown(h.before, h.measure).map(k => <li key={k} data-before="true">{LABELS[k]}: {valueText(k, h.before![k]!, unit)} <span className="fine">(before)</span></li>)}</ul></>}
      {h.lightLeftOut > 0 && <p className="fine">{h.lightLeftOut} light {h.lightLeftOut === 1 ? 'week is' : 'weeks are'} left out of these bests; {h.lightLeftOut === 1 ? 'it stays' : 'they stay'} in your history.</p>}
      <div className="r6-row">
        {fromOne ? <button type="button" className="quiet" onClick={() => change(x => setBestsFrom(x, exercise.id, null), `${exercise.name}: every workout counts for its bests again.`)}>Count every workout again<span className="sr-only"> for {exercise.name}</span></button>
          : <button type="button" className="secondary" onClick={() => change(x => setBestsFrom(x, exercise.id, today), `${exercise.name}: bests count from today. Earlier ones are kept as “before”.`, 'Bests count every workout again.')}>Count bests from today<span className="sr-only"> for {exercise.name}</span></button>}
        {fromAll ? <button type="button" className="quiet" onClick={() => change(x => setBestsFrom(x, ALL_EXERCISES_KEY, null), 'Every workout counts for every exercise’s bests again.')}>Count every workout again for all exercises</button>
          : <button type="button" className="quiet" onClick={() => change(x => setBestsFrom(x, ALL_EXERCISES_KEY, today), 'Bests count from today for every exercise. Earlier ones are kept as “before”.', 'Bests count every workout again.')}>Count bests from today for all exercises</button>}
      </div>
      <p className="fine">A fresh start after an injury or a new gym: your history stays as it is; only the bests and the “new best” marks start again.{fromOne || fromAll ? ` Counting from ${formatDate((fromOne && fromAll ? (fromOne > fromAll ? fromOne : fromAll) : fromOne ?? fromAll)!)}.` : ''}</p>
    </section>}
    {exercise.measure !== 'distance-time' && <section aria-labelledby={`${id}-defaults`}>
      <h4 id={`${id}-defaults`}>Its own defaults</h4>
      <p className="fine">{own ? `Now: ${defaultsWords(own)}. ` : ''}Used when you add {exercise.name} to a workout and it has no earlier sets; your last sets still win.</p>
      <form className="r6-defaults-form" aria-label={`Defaults for ${exercise.name}`} onSubmit={e => { e.preventDefault(); saveDefaults(); }}>
        <label className="field"><span>Sets</span><input type="text" inputMode="numeric" maxLength={2} value={sets} onChange={e => setSets(e.target.value)}/></label>
        <label className="field"><span>{timed ? 'Seconds each' : 'Reps each'}</span><input type="text" inputMode="numeric" maxLength={4} value={each} onChange={e => setEach(e.target.value)}/></label>
        <label className="field"><span>Rest (seconds)</span><input type="text" inputMode="numeric" maxLength={3} value={rest} onChange={e => setRest(e.target.value)}/></label>
        <button type="submit" className="secondary">{own ? 'Save the defaults' : 'Set the defaults'}</button>
        {own && <button type="button" className="quiet" onClick={() => { setSets(''); setEach(''); setRest(''); change(x => setExerciseDefaults(x, exercise.id, null), `${exercise.name} has no defaults of its own now.`); }}>Remove the defaults</button>}
      </form>
      {problem && <p role="alert">{problem}</p>}
    </section>}
  </div>;
}
