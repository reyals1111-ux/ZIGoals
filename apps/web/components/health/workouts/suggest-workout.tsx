'use client';
import {lazy, Suspense, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {MUSCLE_RECOVERY} from '../../../lib/muscle-freshness/model';
import {dropSuggested, LENGTHS, suggestionAsWorkout, suggestWorkout, swapSuggested, type Length, type Suggested, type Suggestion} from '../../../lib/workouts/suggest';
import type {LibraryExercise} from '../../../lib/workouts/library';
import type {WorkoutPlaces} from '../../../lib/workouts/places-schema';
import type {Workout, Workouts} from '../../../lib/workouts/schema';
import {formatDate} from '../../../lib/visual-format';
import {clock, weightShown} from './units';
import './av2-bodymind-workouts.css';
// Session AV lane 2, round 5 (gym; LEDGER #372, Gentler Streak's "How I feel"): the day's feeling shapes the suggestion.
import {adjustForFeeling, EASIER_WORDS, FEELINGS, FEEL_WORDS, walkInstead, type Feeling} from '../../../lib/workouts/feel';
import '../r5/gym-r5.css';

const ReplaceExercise = lazy(() => import('./replace-exercise'));

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #240, Fitbod's workout made for today; no programme is written, never calories):
 * Health → Workouts → Start a workout → "Suggest a workout for today". Choose the place and a length; 4–6 built-in
 * exercises for today's freshest muscle groups, with the place's equipment, and sets and weights from your own last
 * sessions through a progression rule (said per exercise). Labelled a suggestion: remove or replace any exercise, then
 * "Start this workout" (an ordinary workout you can still change). Its own chunk.
 */
export default function SuggestWorkout({w, library, today, unit, places, onStart}: {w: Workouts; library: LibraryExercise[]; today: string; unit: 'kg' | 'lb'; places: WorkoutPlaces | null; onStart: (x: Workout) => void}) {
  const recovery = useDeviceRecord(MUSCLE_RECOVERY), id = useId();
  const [placeId, setPlaceId] = useState(places?.current ?? ''), [minutes, setMinutes] = useState<Length>(45), [edited, setEdited] = useState<Suggestion | null>(null), [replacing, setReplacing] = useState<string | null>(null);
  const place = places?.places.find(p => p.id === placeId) ?? null;
  // Session AV lane 2, round 5 (LEDGER #372): kept for this suggestion only; nothing is stored.
  const [feel, setFeel] = useState<Feeling | null>(null);
  const made = useMemo(() => adjustForFeeling(w, suggestWorkout({w, library, now: new Date(), today, recovery: recovery.loaded && !recovery.unreadable ? recovery.data : null, place, minutes}), feel), [w, library, today, recovery.loaded, recovery.unreadable, recovery.data, place, minutes, feel]);
  const s = edited ?? made;
  const reset = () => { setEdited(null); setReplacing(null); };
  const setLine = (x: Suggested) => x.sets.map(set => set.weightKg !== undefined ? `${weightShown(set.weightKg, unit)} × ${set.reps ?? '?'}` : set.reps !== undefined ? `${set.reps} reps` : set.seconds !== undefined ? clock(set.seconds) : '—').join(' · ');
  const why = (x: Suggested) => x.from === 'new' ? 'New to your log: choose a weight you could lift a few more times.' : `${x.from === 'up' ? 'Every set reached its target' : x.from === 'more-reps' ? 'One more rep than' : 'As'} ${x.from === 'up' ? `on ${formatDate(x.lastDate!, {year: false})}, so the weight goes up` : `on ${formatDate(x.lastDate!, {year: false})}`}${x.rule === 'routine' ? ' (your routine’s rule)' : ' (8 to 12 reps, then +2.5 kg)'}.`;
  return <div className="av2-suggest">
    <p className="fine">A suggestion from your own sets, today’s muscle freshness and the equipment where you are — not a programme. Change anything before you start.</p>
    <div className="av2-suggest-form">
      {places && places.places.length > 0 && <label className="field"><span>Where</span><select value={placeId} onChange={e => { setPlaceId(e.target.value); reset(); }}><option value="">Any place</option>{places.places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <fieldset className="r5-feel"><legend>How do you feel today?</legend><div className="r5-choices">{FEELINGS.map(f => <label key={f} className="r5-choice"><input type="radio" name={`${id}-feel`} checked={feel === f} onChange={() => { setFeel(f); reset(); }}/> {FEEL_WORDS[f].en}</label>)}</div></fieldset>
      <fieldset><legend>How long</legend><div className="av2-suggest-lengths">{LENGTHS.map(m => <label key={m}><input type="radio" name={`${id}-len`} checked={minutes === m} onChange={() => { setMinutes(m); reset(); }}/> {m} minutes</label>)}</div></fieldset>
    </div>
    {!s.exercises.length ? <p className="fine" role="status">{place ? `Nothing in the library fits ${place.name}'s equipment for today's groups. Add equipment to the place, or choose Any place.` : 'Nothing to suggest right now.'}</p> : <>
      <p className="av2-suggest-why" role="status"><span className="av2-suggest-label">Suggestion</span> {s.groups.length ? `For your freshest muscle groups: ${s.groups.map(g => `${g.muscle.toLowerCase()} (${g.freshness === null ? 'not in your log yet' : `about ${g.freshness}% fresh`})`).join(', ')}` : ''}{s.place ? `, at ${s.place}` : ''}.{s.tired ? ' Everything is still recovering, so keep it light today.' : ''}</p>
      {(feel === 'tired' || feel === 'sore') && <div className="r5-feel"><p className="r5-easier">{EASIER_WORDS[feel].en}</p>
        <div className="actions"><button type="button" className="secondary" onClick={() => onStart(walkInstead())}>Or start an easy walk instead</button></div></div>}
      <ol className="av2-suggest-list">{s.exercises.map(x => <li key={x.exerciseId}>
        <div><strong>{x.name}</strong> <span className="fine">· {x.group}</span></div>
        <p className="av2-suggest-sets">{setLine(x)}</p>
        <p className="fine">{why(x)}</p>
        <div className="workouts-row-actions">
          <button type="button" className="quiet" aria-expanded={replacing === x.exerciseId} aria-label={`Replace ${x.name}`} data-suggest-replace={x.exerciseId} onClick={() => setReplacing(replacing === x.exerciseId ? null : x.exerciseId)}>Replace</button>
          <button type="button" className="quiet" aria-label={`Leave out ${x.name}`} disabled={s.exercises.length <= 1} onClick={() => { setEdited(dropSuggested(s, x.exerciseId)); setReplacing(null); }}>Leave out</button>
        </div>
        {replacing === x.exerciseId && <Suspense fallback={<p className="fine" role="status">Finding similar exercises…</p>}><ReplaceExercise planned exercise={{id: x.exerciseId, name: x.name, measure: x.measure}} w={w} place={place} exclude={s.exercises.map(y => y.exerciseId)}
          onPick={by => { setEdited(swapSuggested(w, s, x.exerciseId, by, new Date())); setReplacing(null); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-suggest-replace="${by.id}"]`)?.focus()); }}
          onClose={() => { setReplacing(null); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-suggest-replace="${x.exerciseId}"]`)?.focus()); }}/></Suspense>}
      </li>)}</ol>
      <div className="workouts-start-actions">
        <button type="button" className="primary" onClick={() => onStart(suggestionAsWorkout(s))}>Start this workout</button>
        {edited && <button type="button" className="quiet" onClick={reset}>Suggest again</button>}
      </div>
    </>}
  </div>;
}
