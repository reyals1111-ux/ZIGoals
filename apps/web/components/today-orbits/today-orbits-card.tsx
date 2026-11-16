'use client';
import Link from 'next/link';
import {useId, useMemo} from 'react';
import type {HealthData} from '../../lib/health';
import {dailyData, healthDay} from '../../lib/health-daily';
import {orbitStatusWords, orbitValueWords, orbitsFor} from '../../lib/health-rings/rings';
import {formatNumber} from '../../lib/visual-format';
import {useHabits} from '../habits/use-habits';
import {useHealthGoals} from '../health-goals/use-health-goals';
import {useWorkouts} from '../health/workouts/use-workouts';
import {OrbitFigure} from '../health/plus/orbit-figure';
import './today-orbits.css';

/**
 * Session AR (6b; ADR-041 P1, ADR-040 D16 (a)): "Your orbits" on Today, a compact card of Health's orbits (lib/health-rings:
 * one orbit per goal the person set, a planet on its own track, side by side in the pillar colours; never nested rings and
 * never another app's names for them). Shown only when the person turns it on while arranging Today
 * (`zigoals:today-orbits:v1`, device only); this chunk loads only then. Each orbit says its value and its target in words
 * and where the target comes from; a value with nothing recorded yet says so (never a zero), and nothing is estimated.
 * One keyboard stop: the link to Health's orbits. Derived on view; nothing is stored here.
 */
const n = (v: number) => formatNumber(Math.round(v));

export default function TodayOrbitsCard({health}: {health: HealthData}) {
  const goals = useHealthGoals(), workouts = useWorkouts(), habits = useHabits(), id = useId();
  const day = healthDay(dailyData(health).preferences.timezone);
  const {orbits, missing} = useMemo(() => orbitsFor({health, goals: goals.unreadable ? [] : goals.data.goals, workouts: workouts.loaded && !workouts.unreadable ? workouts.data : null, habits: habits.data, today: day}),
    [health, goals.data, goals.unreadable, workouts.data, workouts.loaded, workouts.unreadable, habits.data, day]);
  return <section className="panel today-orbits" aria-labelledby={`${id}-title`}>
    <div className="today-orbits-head">
      <h3 id={`${id}-title`}>Your orbits</h3>
      <Link prefetch={false} className="text-link today-orbits-link" href="/app/health?view=activity">Your orbits in Health</Link>
    </div>
    {orbits.length ? <ul className="today-orbits-list" aria-label="One orbit per goal you set">{orbits.map(o => <li key={o.id} className="today-orbit" data-orbit={o.id} data-known={o.known ? undefined : 'false'}>
      <OrbitFigure o={o}/>
      <div className="today-orbit-words">
        <h4>{o.label}</h4>
        <p>{orbitValueWords(o, n)}</p>
        <p className="today-orbit-status">{o.reached && <span aria-hidden="true">✓ </span>}{orbitStatusWords(o)}</p>
        <p className="fine">{o.source}</p>
      </div>
    </li>)}</ul> : <div className="today-orbits-empty">
      <p>No orbit yet: each one follows a goal you set yourself. To add one:</p>
      <ul>{missing.map(m => <li key={m.id}><strong>{m.label}:</strong> {m.how}</li>)}</ul>
    </div>}
    {orbits.length > 0 && missing.length > 0 && <p className="fine">More orbits you can add: {missing.map(m => m.how).join(' ')}</p>}
    <p className="fine">Worked out from your own records each time you look. No calories are estimated.</p>
  </section>;
}
