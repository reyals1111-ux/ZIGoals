'use client';
import {useId, useMemo, useState} from 'react';
import {SPORT_WORDS, sportsWithDistance, workoutWeeks, type DistanceSport, type WorkoutWeek} from '../../../lib/workouts/weekly';
import type {Workouts} from '../../../lib/workouts/schema';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {weightShown} from './units';

/**
 * Session AV (owner follow-up 1, F-WORKOUT-WEEKS; Strava, Hevy): the last 12 weeks of workouts as bars — time, distance
 * or weight lifted, chosen with three buttons — and the same figures as a table. No calorie figure. Its own chunk.
 * Session AV (q3 #11): distance is one sport at a time (a sport picker once there are two), and the bars name their first
 * and last week.
 */
type Metric = 'minutes' | 'distanceKm' | 'volumeKg';
const LABEL: Record<Metric, string> = {minutes: 'Time', distanceKm: 'Distance', volumeKg: 'Weight lifted'};
export default function WeeklyChart({w, today, unit}: {w: Workouts; today: string; unit: 'kg' | 'lb'}) {
  const sports = useMemo(() => sportsWithDistance(w, today), [w, today]), [picked, setPicked] = useState<DistanceSport | null>(null);
  const sport: DistanceSport | undefined = picked && sports.includes(picked) ? picked : sports.includes('run') ? 'run' : sports[0];
  const weeks = useMemo(() => workoutWeeks(w, today, 12, sport), [w, today, sport]), id = useId();
  const [metric, setMetric] = useState<Metric>(() => weeks.some(k => k.distanceKm > 0) ? 'distanceKm' : weeks.some(k => k.volumeKg > 0) ? 'volumeKg' : 'minutes');
  const words = (k: WorkoutWeek, m: Metric) => m === 'minutes' ? `${formatNumber(k.minutes)} min` : m === 'distanceKm' ? `${formatNumber(k.distanceKm, {maximumFractionDigits: 1})} km` : k.volumeKg ? weightShown(k.volumeKg, unit) : '0';
  const top = Math.max(1, ...weeks.map(k => k[metric]));
  if (!weeks.some(k => k.workouts)) return <p className="fine">Finish a workout and the last 12 weeks show here: time, distance and weight lifted per week.</p>;
  return <section className="workouts-weeks" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your last 12 weeks</h3>
    <div className="workouts-weeks-pick" role="group" aria-label="Show per week">{(Object.keys(LABEL) as Metric[]).map(m => <button key={m} type="button" className="quiet" aria-pressed={metric === m} onClick={() => setMetric(m)}>{LABEL[m]}</button>)}</div>
    {metric === 'distanceKm' && sports.length > 1 && <label className="field workouts-weeks-sport"><span>Sport</span><select value={sport} onChange={e => setPicked(e.target.value as DistanceSport)}>{sports.map(s => <option key={s} value={s}>{SPORT_WORDS[s]}</option>)}</select></label>}
    <svg className="workouts-weeks-bars" viewBox="0 0 240 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {weeks.map((k, i) => { const h = k[metric] ? Math.max(3, Math.round(56 * k[metric] / top)) : 2; return <rect key={k.start} x={i * 20 + 3} y={60 - h} width={14} height={h} rx={3} className={i === weeks.length - 1 ? 'is-this-week' : undefined}/>; })}
    </svg>
    <p className="workouts-weeks-axis" aria-hidden="true"><span>{formatDate(weeks[0]!.start, {year: false})}</span><span>This week</span></p>
    <p className="fine">{LABEL[metric]}{metric === 'distanceKm' && sports.length > 1 && sport ? ` (${SPORT_WORDS[sport].toLowerCase()})` : ''} this week: {words(weeks.at(-1)!, metric)} · in 12 weeks: {words(weeks.reduce((t, k) => ({...t, minutes: t.minutes + k.minutes, distanceKm: Math.round((t.distanceKm + k.distanceKm) * 100) / 100, volumeKg: t.volumeKg + k.volumeKg}), {start: '', end: '', workouts: 0, minutes: 0, distanceKm: 0, volumeKg: 0}), metric)}.</p>
    <details className="workouts-weeks-table"><summary>As a table</summary>
      <div className="workouts-weeks-scroll" role="region" tabIndex={0} aria-label="Table: workouts per week"><table><caption className="sr-only">Workouts per week, the last 12 weeks</caption>
        <thead><tr><th scope="col">Week of</th><th scope="col">Workouts</th><th scope="col">Time</th><th scope="col">{sports.length > 1 && sport ? `Distance (${SPORT_WORDS[sport].toLowerCase()})` : 'Distance'}</th><th scope="col">Weight lifted</th></tr></thead>
        <tbody>{[...weeks].reverse().map(k => <tr key={k.start}><th scope="row">{formatDate(k.start, {year: false})}</th><td>{k.workouts}</td><td>{words(k, 'minutes')}</td><td>{words(k, 'distanceKm')}</td><td>{words(k, 'volumeKg')}</td></tr>)}</tbody></table></div>
    </details>
  </section>;
}
