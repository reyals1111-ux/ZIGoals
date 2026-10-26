'use client';
import Link from 'next/link';
import {useState} from 'react';
import {asleep, dailySeries, nightDay, runningNights, summary} from '../../../lib/sleep/engine';
import {formatMinutes} from '../../../lib/zone-time';
import {formatDate, formatTime} from '../../../lib/visual-format';
import {SleepTonight} from './sleep-tonight';
import {useSleep} from './use-sleep';
import type {LayoutAttrs} from '../../layout-edit';
import './sleep.css';
import {StarToggle} from '../../checklist/star-toggle';

/** The Health page's Sleep card (Session W Part 4): last night, this week against your goal, and the one-tap night. */
export function SleepCard(layout: LayoutAttrs) {
  const store = useSleep(), [note, setNote] = useState('');
  const last = store.sleep.nights.filter(n => n.kind === 'night' && n.end !== null).sort((a, b) => b.end!.localeCompare(a.end!))[0];
  // Session AH (HE3, D-144): while a night is running the card shows it (Tonight below), never "No night logged".
  const running = runningNights(store.sleep).length > 0;
  const lastAsleep = last ? asleep(last) : null, week = store.loaded ? summary(dailySeries(store.sleep, store.today, 7)) : null;
  return <section {...layout} className="panel sleep-card" aria-labelledby="sleep-card-title">
    <div className="health-section-heading"><div><p className="eyebrow">SLEEP · PRIVATE</p><h2 id="sleep-card-title">Rest well.</h2></div><StarToggle item={{kind: 'health', input: 'sleep'}} label="Sleep"/></div>
    {!store.loaded ? <p>Opening your sleep log…</p> : store.error ? <p role="alert">Sleep needs your Health journal, which could not be read. Nothing was changed.</p> : <>
      {last && lastAsleep ? <p className="sleep-last"><strong>{formatMinutes(lastAsleep.minutes)}</strong> asleep{lastAsleep.estimated ? ' (estimated)' : ''} · {formatTime(last.start, {timeZone: last.timeZone})}–{formatTime(last.end!, {timeZone: last.timeZone})}, night ending {formatDate(nightDay(last)!)}{last.quality ? ` · quality ${last.quality}/5` : ''}</p> : running ? null : <p className="sleep-last">No night logged yet. Log one, or tap “I’m going to bed” tonight.</p>}
      {week && <p className="fine">Last 7 days: {formatMinutes(week.asleep)} a night on average over {week.nights} {week.nights === 1 ? 'night' : 'nights'}{store.sleep.goal ? `, goal ${formatMinutes(store.sleep.goal.minutes)}` : ''}.</p>}
      <SleepTonight store={store} onDone={setNote}/>
      {note && <p role="status">{note}</p>}
      <Link className="text-link" href="/app/health?view=sleep">Open Sleep →</Link>
    </>}
  </section>;
}
