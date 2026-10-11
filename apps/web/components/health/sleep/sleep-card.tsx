'use client';
import Link from 'next/link';
import {useState} from 'react';
import {asleep, dailySeries, nightDay, summary} from '../../../lib/sleep/engine';
import {formatMinutes, wallClock} from '../../../lib/zone-time';
import {SleepTonight} from './sleep-tonight';
import {useSleep} from './use-sleep';
import type {LayoutAttrs} from '../../layout-edit';
import './sleep.css';

/** The Health page's Sleep card (Session W Part 4): last night, this week against your goal, and the one-tap night. */
export function SleepCard(layout: LayoutAttrs) {
  const store = useSleep(), [note, setNote] = useState('');
  const last = store.sleep.nights.filter(n => n.kind === 'night' && n.end !== null).sort((a, b) => b.end!.localeCompare(a.end!))[0];
  const lastAsleep = last ? asleep(last) : null, week = store.loaded ? summary(dailySeries(store.sleep, store.today, 7)) : null;
  return <section {...layout} className="panel sleep-card" aria-labelledby="sleep-card-title">
    <div className="health-section-heading"><div><p className="eyebrow">SLEEP · PRIVATE</p><h2 id="sleep-card-title">Rest well.</h2></div></div>
    {!store.loaded ? <p>Opening your sleep log…</p> : store.error ? <p role="alert">Sleep needs your Health journal, which could not be read. Nothing was changed.</p> : <>
      {last && lastAsleep ? <p className="sleep-last"><strong>{formatMinutes(lastAsleep.minutes)}</strong> asleep{lastAsleep.estimated ? ' (estimated)' : ''} · {wallClock(Date.parse(last.start), last.timeZone).clock}–{wallClock(Date.parse(last.end!), last.timeZone).clock}, night ending {nightDay(last)}{last.quality ? ` · quality ${last.quality}/5` : ''}</p> : <p className="sleep-last">No night logged yet. Log one, or tap “I’m going to bed” tonight.</p>}
      {week && <p className="fine">Last 7 days: {formatMinutes(week.asleep)} a night on average over {week.nights} {week.nights === 1 ? 'night' : 'nights'}{store.sleep.goal ? `, goal ${formatMinutes(store.sleep.goal.minutes)}` : ''}.</p>}
      <SleepTonight store={store} onDone={setNote}/>
      {note && <p role="status">{note}</p>}
      <Link className="text-link" href="/app/health?view=sleep">Open Sleep →</Link>
    </>}
  </section>;
}
