'use client';
import type {WorkoutSplits} from '../../../lib/workouts/splits-schema';
import {paceText, splitPace} from '../../../lib/workouts/splits';
import '../plus/plus.css';

/**
 * Session AP (feature 5): a run's pace and per-kilometre splits, as worked out at import from its GPX or TCX points
 * (zigoals:workout-splits:v1). A workout imported before this has none, and none is made up for it.
 */
export function WorkoutSplitsTable({s, name}: {s: WorkoutSplits; name: string}) {
  return <div className="ap-workout-splits">
    <p className="fine"><strong>Pace {paceText(s.paceSecondsPerKm)}</strong> over the moving time (pauses between recorded parts left out).</p>
    {s.splits.length > 0 && <table className="ap-splits"><caption className="sr-only">Splits of {name}, per kilometre</caption>
      <thead><tr><th scope="col">Kilometre</th><th scope="col">Distance</th><th scope="col">Time</th><th scope="col">Pace</th></tr></thead>
      <tbody>{s.splits.map(x => <tr key={x.km}><th scope="row">{x.km}</th><td>{x.meters === 1000 ? '1 km' : `${x.meters} m`}</td><td>{paceText(x.seconds).replace(' /km', '')}</td><td>{paceText(splitPace(x))}</td></tr>)}</tbody>
    </table>}
  </div>;
}
