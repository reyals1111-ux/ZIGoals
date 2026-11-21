'use client';
import {useMemo} from 'react';
import {clockOf, runBests} from '../../../lib/workouts/run-bests';
import type {Workouts} from '../../../lib/workouts/schema';
import type {SplitsRecord} from '../../../lib/workouts/splits-schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';

/**
 * Session AV (owner follow-up 1, F-RUN-BESTS; Strava): "Your running bests" in Workouts — the fastest 1, 5 and 10 km from
 * runs kept with per-kilometre splits, and the longest run — each with its run and day, labelled as from the person's
 * own imported files. Its own chunk.
 */
export default function RunBests({w, splits}: {w: Workouts; splits: SplitsRecord | null}) {
  const bests = useMemo(() => runBests(w, splits), [w, splits]);
  if (!bests.longest && !bests.timed.length) return null;
  return <section className="workouts-bests" aria-labelledby="workouts-bests-title">
    <h3 id="workouts-bests-title">Your running bests</h3>
    <ul>
      {bests.timed.map(b => <li key={b.km}><span>Fastest {b.km} km</span> <strong>{clockOf(b.seconds)}</strong> <small>{b.name}, {formatDate(b.date, {year: false})}</small></li>)}
      {bests.longest && <li><span>Longest</span> <strong>{formatNumber(bests.longest.km, {maximumFractionDigits: 2})} km</strong> <small>{bests.longest.name}, {formatDate(bests.longest.date, {year: false})}</small></li>}
    </ul>
    <p className="fine">{bests.withSplits ? 'Timed bests come from runs imported from GPX or TCX files, from whole kilometres in a row; runs imported before splits were kept do not count.' : 'Import a run from a GPX or TCX file and its fastest kilometres show here; the longest counts every run.'}</p>
  </section>;
}
