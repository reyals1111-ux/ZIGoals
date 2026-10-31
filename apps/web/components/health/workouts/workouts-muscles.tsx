'use client';
import {useMemo} from 'react';
import {formatDate} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {categoryLookup, muscleFreshness, RECOVERY_DAYS, weeklyMuscleVolume} from '../../../lib/workouts/depth';
import type {LibraryExercise} from '../../../lib/workouts/library';
import type {Workouts} from '../../../lib/workouts/schema';
import {weightShown} from './units';

/**
 * Session AK (4.9; COMPETITORS.md T3, T4 — Hevy's sets per muscle, Fitbod's muscle recovery): this week's working sets
 * and volume per muscle group, as a table with a bar beside each count, and each group's freshness — days since it was
 * trained and an estimate of how recovered it is over about six days. Worked out from the log; nothing is stored. An
 * estimate, never advice. Loaded only when the view shows it.
 */
export default function WorkoutsMuscles({w, unit, library, today}: {w: Workouts; unit: 'kg' | 'lb'; library: LibraryExercise[]; today: string}) {
  const lookup = useMemo(() => categoryLookup(library), [library]);
  const week = useMemo(() => weeklyMuscleVolume(w, lookup, today), [w, lookup, today]);
  const fresh = useMemo(() => muscleFreshness(w, lookup, new Date(), today), [w, lookup, today]);
  const most = Math.max(1, ...week.rows.map(r => r.sets)), ready = fresh.filter(f => f.freshness !== null && f.freshness >= 90).map(f => f.muscle.toLowerCase());
  return <section className="panel workouts-muscles" aria-labelledby="workouts-muscles-title">
    <h2 id="workouts-muscles-title">Muscle groups</h2>
    <h3>This week, from {formatDate(week.from)}</h3>
    <table className="workouts-history-table workouts-muscle-table">
      <caption className="sr-only">Working sets and volume per muscle group this week</caption>
      <thead><tr><th scope="col">Muscle group</th><th scope="col">Working sets</th><th scope="col">Volume</th></tr></thead>
      <tbody>{week.rows.map(r => <tr key={r.muscle}>
        <th scope="row">{r.muscle}</th>
        <td><span className="workouts-bar-cell"><span className="workouts-bar" aria-hidden="true" style={{inlineSize: `${Math.round(r.sets / most * 100)}%`}}/><span>{r.sets}</span></span></td>
        <td>{r.volumeKg ? weightShown(r.volumeKg, unit) : '—'}</td>
      </tr>)}</tbody>
    </table>
    <p className="fine">Warm-ups are left out. A full-body exercise counts as a set for legs, back, shoulders and core, its volume (weight × reps) shared among them. Cardio and mobility are not counted here.{week.unmapped ? ` ${week.unmapped} ${plural(week.unmapped, 'set')} of exercises without a muscle group are not shown.` : ''}</p>

    <h3>Freshness <small className="fine">(an estimate)</small></h3>
    {ready.length > 0 && <p>Fresh today: {ready.join(', ')}.</p>}
    <ul className="workouts-freshness">{fresh.map(f => <li key={f.muscle}>
      <span className="workouts-freshness-name">{f.muscle}</span>
      {f.freshness === null ? <span className="fine">Not in your log yet</span> : <>
        <span className="workouts-freshness-track" aria-hidden="true"><span className="workouts-freshness-fill" style={{inlineSize: `${f.freshness}%`}}/></span>
        <span>About {f.freshness}% recovered · {f.daysSince === 0 ? 'trained today' : `${f.daysSince} ${plural(f.daysSince!, 'day')} since`}</span>
      </>}
    </li>)}</ul>
    <p className="fine">An estimate from your own sets, not a measurement: each working set counts as some effort for its muscle groups, recovering steadily over about {RECOVERY_DAYS} days. How you feel matters more. This is information, not advice.</p>
  </section>;
}
