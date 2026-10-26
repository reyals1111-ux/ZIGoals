'use client';
import Link from 'next/link';
import {meditationSummary, minutesText, sessionDay} from '../../../lib/meditation/stats';
import {PastDayLine, useHealthDay} from '../health-day';
import {clockText, remainingMs} from '../../../lib/meditation/timer';
import {useMeditation} from './use-meditation';
import type {LayoutAttrs} from '../../layout-edit';
import '../sleep/sleep.css';
import './meditation.css';
import {StarToggle} from '../../checklist/star-toggle';

/** The Health page's Meditation card (Session W Part 5): this week against your goal, and the way into a session. */
export function MeditationCard(layout: LayoutAttrs) {
  const store = useMeditation(), run = store.run.data.run;
  const summary = store.loaded ? meditationSummary(store.meditation, store.today) : null;
  // Session AH Part 17: on a past Journal date, that day's minutes and a way to log a session for it.
  const day = useHealthDay(store.today), dayMinutes = day.past && store.loaded ? Math.round(store.meditation.sessions.filter(x => sessionDay(x) === day.date).reduce((t, x) => t + x.seconds, 0) / 60) : 0;
  return <section {...layout} className="panel meditation-card" aria-labelledby="meditation-card-title">
    <div className="health-section-heading"><div><p className="eyebrow">MEDITATION · PRIVATE</p><h2 id="meditation-card-title">Breathe.</h2></div><StarToggle item={{kind: 'health', input: 'meditation'}} label="Meditate" defaultValue={10} unit="min"/></div>
    {!store.loaded ? <p>Opening your meditation log…</p> : store.error ? <p role="alert">Meditation needs your Health journal, which could not be read. Nothing was changed.</p> : <>
      {run ? <p className="meditation-week" role="status">A session is running · {clockText(remainingMs(run, store.now))} left</p>
        : <p className="meditation-week"><strong>{minutesText(summary!.thisWeek)}</strong> this week{summary!.goal ? ` · goal ${minutesText(summary!.goal)}` : ''}</p>}
      {!run && summary!.sessions > 0 && <p className="fine">{summary!.daysInARow ? `${summary!.daysInARow} ${summary!.daysInARow === 1 ? 'day' : 'days'} in a row. ` : ''}Rest days are fine.</p>}
      {store.loaded && !store.error && <PastDayLine date={day.date} today={day.today}>{dayMinutes ? `${minutesText(dayMinutes)} that day` : 'no session logged'} · <Link className="text-link" href={`/app/health?view=meditation&date=${day.date}`}>Log a session for this day →</Link></PastDayLine>}
      <Link className={run ? 'primary' : 'secondary'} href="/app/health?view=meditation">{run ? 'Back to your session' : 'Begin a session'}</Link>
    </>}
  </section>;
}
