'use client';
import Link from 'next/link';
import {meditationSummary, minutesText} from '../../../lib/meditation/stats';
import {clockText, remainingMs} from '../../../lib/meditation/timer';
import {useMeditation} from './use-meditation';
import type {LayoutAttrs} from '../../layout-edit';
import '../sleep/sleep.css';
import './meditation.css';

/** The Health page's Meditation card (Session W Part 5): this week against your goal, and the way into a session. */
export function MeditationCard(layout: LayoutAttrs) {
  const store = useMeditation(), run = store.run.data.run;
  const summary = store.loaded ? meditationSummary(store.meditation, store.today) : null;
  return <section {...layout} className="panel meditation-card" aria-labelledby="meditation-card-title">
    <div className="health-section-heading"><div><p className="eyebrow">MEDITATION · PRIVATE</p><h2 id="meditation-card-title">Breathe.</h2></div></div>
    {!store.loaded ? <p>Opening your meditation log…</p> : store.error ? <p role="alert">Meditation needs your Health journal, which could not be read. Nothing was changed.</p> : <>
      {run ? <p className="meditation-week" role="status">A session is running · {clockText(remainingMs(run, store.now))} left</p>
        : <p className="meditation-week"><strong>{minutesText(summary!.thisWeek)}</strong> this week{summary!.goal ? ` · goal ${minutesText(summary!.goal)}` : ''}</p>}
      {!run && summary!.sessions > 0 && <p className="fine">{summary!.daysInARow ? `${summary!.daysInARow} ${summary!.daysInARow === 1 ? 'day' : 'days'} in a row. ` : ''}Rest days are fine.</p>}
      <Link className={run ? 'primary' : 'secondary'} href="/app/health?view=meditation">{run ? 'Back to your session' : 'Begin a session'}</Link>
    </>}
  </section>;
}
