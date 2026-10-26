'use client';
import Link from 'next/link';
import {useWorkouts} from './use-workouts';
import {finished, inProgress, weekSummary} from '../../../lib/workouts/engine';
import {formatDate} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {localDate} from '../../../lib/local-date';
import type {LayoutAttrs} from '../../layout-edit';
import './workouts.css';

/** The Health page's Workouts card (Session AH Part 6, DE8): the week, the last workout, and the way in. */
export function WorkoutsCard(layout: LayoutAttrs) {
  const record = useWorkouts();
  const current = record.loaded ? inProgress(record.data) : undefined, last = record.loaded ? finished(record.data)[0] : undefined, week = record.loaded ? weekSummary(record.data, localDate()) : null;
  return <section {...layout} className="panel workouts-card" aria-labelledby="workouts-card-title">
    <div className="health-section-heading"><div><p className="eyebrow">WORKOUTS · ON THIS DEVICE</p><h2 id="workouts-card-title">Train.</h2></div></div>
    {!record.loaded ? <p>Opening your workout log…</p> : <>
      {current ? <p className="workouts-card-week" role="status">{current.name} is in progress.</p>
        : <p className="workouts-card-week"><strong>{week!.workouts} {plural(week!.workouts, 'workout')}</strong> this week{week!.minutes ? ` · ${week!.minutes} min` : ''}</p>}
      {last && !current && <p className="fine">Last: {last.name}, {formatDate(last.date)}.</p>}
      <Link className={current ? 'primary' : 'secondary'} href="/app/health?view=workouts">{current ? 'Back to your workout' : last ? 'Start a workout' : 'Log your first workout'}</Link>
    </>}
  </section>;
}
