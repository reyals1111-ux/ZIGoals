'use client';
import {useMemo} from 'react';
import {bestLabel, clockOf, runBests} from '../../../lib/workouts/run-bests';
import type {Workouts} from '../../../lib/workouts/schema';
import type {SplitsRecord} from '../../../lib/workouts/splits-schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-RUN-BESTS; Strava): "Your running bests" in Workouts — the fastest 1, 5 and 10 km from
 * runs kept with per-kilometre splits, and the longest run — each with its run and day, labelled as from the person's
 * own imported files. Its own chunk. Session AV (q3 #13): runs only, the half marathon too, and "on whole-km splits" said.
 */
export default function RunBests({w, splits}: {w: Workouts; splits: SplitsRecord | null}) {
  const bests = useMemo(() => runBests(w, splits), [w, splits]);
  if (!bests.longest && !bests.timed.length) return null;
  return <section className="workouts-bests" aria-labelledby="workouts-bests-title">
    <h3 id="workouts-bests-title">Your running bests</h3>
    <ul>
      {bests.timed.map(b => <li key={b.km}><span>{bestLabel(b.km)}</span> <strong>{clockOf(b.seconds)}</strong> <small>{b.name}, {formatDate(b.date, {year: false})}</small></li>)}
      {bests.longest && <li><span>Longest</span> <strong>{formatNumber(bests.longest.km, {maximumFractionDigits: 2})} km</strong> <small>{bests.longest.name}, {formatDate(bests.longest.date, {year: false})}</small></li>}
    </ul>
    <p className="fine">{bests.withSplits ? 'Timed bests come from runs imported from GPX or TCX files, on whole-km splits in a row (the half marathon adds the next 97.5 m at that kilometre’s pace); runs imported before splits were kept do not count. Rides, swims and walks never count.' : 'Import a run from a GPX or TCX file and its fastest kilometres show here, on whole-km splits; the longest counts runs only.'}</p>
  </section>;
}
