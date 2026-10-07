'use client';
import Link from 'next/link';
import {useState} from 'react';
import {asleep, clockFromMidnight, clockFromNoon, consistency, dailySeries, deleteNight, inBedMinutes, nightDay, shortNights, sleepDebt, summary} from '../../../lib/sleep/engine';
import {sleepInsights} from '../../../lib/sleep/insights';
import type {SleepNight} from '../../../lib/sleep/schema';
import {formatMinutes, wallClock} from '../../../lib/zone-time';
import {NebulaFlow} from '../../nebula-flow';
import {SleepDurationChart, SleepQualityChart, SleepTimesChart} from './sleep-charts';
import {NightForm, SleepGoalForm} from './sleep-forms';
import {SleepTonight} from './sleep-tonight';
import {useSleep} from './use-sleep';
import {WindDownSetting} from './wind-down';
import './sleep.css';

const nightLine = (n: SleepNight) => {
  const s = wallClock(Date.parse(n.start), n.timeZone), e = wallClock(Date.parse(n.end!), n.timeZone), a = asleep(n)!;
  return `${s.clock} → ${e.clock} · ${formatMinutes(a.minutes)} asleep${a.estimated ? ' (estimated)' : ''} · in bed ${formatMinutes(inBedMinutes(n))}`;
};

/**
 * Sleep, the full view (Session W Part 4; /app/health?view=sleep, a view of Health so its document and camera rule stay).
 * Tonight's one-tap night, your week against your own goal, the charts, patterns from your own log, logging and editing
 * nights and naps, and the goal. No score, no medical claim; a missing night is never counted as zero.
 */
export default function SleepView() {
  const store = useSleep(), [note, setNote] = useState(''), [saves, setSaves] = useState(0), [range, setRange] = useState<7 | 30>(7), [editing, setEditing] = useState<string | null>(null), [confirm, setConfirm] = useState<string | null>(null);
  if (!store.loaded) return <section className="panel"><h1>Sleep</h1><p>Opening your sleep log…</p></section>;
  if (store.error) return <section className="panel"><h1>Sleep</h1><p role="alert">Sleep lives in your Health journal, which could not be read. Nothing was changed.</p><Link className="text-link" href="/app/health">Back to Health</Link></section>;
  const {sleep, today} = store, points = dailySeries(sleep, today, range), week = summary(dailySeries(sleep, today, 7));
  const debt = sleepDebt(sleep, today), steady = consistency(sleep, today), patterns = sleepInsights(sleep, today);
  const nights = sleep.nights.filter(n => n.end !== null).sort((a, b) => b.end!.localeCompare(a.end!)).slice(0, 14);
  // Each save starts the log form afresh (its key), so the next night begins from the defaults.
  const done = (text: string) => { setNote(text); setEditing(null); setSaves(n => n + 1); };
  async function remove(id: string) {
    try { await store.update(s => deleteNight(s, id)); setConfirm(null); setNote('The night is deleted.'); } catch (error) { setNote(error instanceof Error ? error.message : 'Could not delete.'); }
  }
  return <div className="sleep-view">
    <div className="page-heading"><div>
      <p><Link className="text-link sleep-back" href="/app/health">← Health</Link></p>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="sleep-eyebrow">HEALTH · SLEEP</NebulaFlow></p>
      <h1><NebulaFlow identity="sleep-title">Your sleep, your rhythm.</NebulaFlow></h1>
      <p className="page-lede">Nights and naps you log or bring in. Private to your Health journal; it syncs only with Health, under the same consent.</p>
    </div></div>
    {note && <p className="sleep-note" role="status">{note}</p>}
    <section className="panel sleep-tonight-panel" aria-labelledby="sleep-tonight-title"><h2 id="sleep-tonight-title">Tonight</h2><SleepTonight store={store} onDone={setNote}/><WindDownSetting/></section>
    {shortNights(sleep, today) && <section className="panel sleep-gentle" aria-label="A gentle word"><p>Your recent nights have been short. That happens, and small steps count. If sleeping stays hard for a while, a doctor or another health professional can help.</p></section>}
    <section className="panel sleep-week" aria-labelledby="sleep-week-title">
      <h2 id="sleep-week-title">Your last 7 days</h2>
      {week ? <dl className="sleep-stats">
        <div><dt>Asleep, on average</dt><dd>{formatMinutes(week.asleep)}{week.estimated ? ' (estimated)' : ''}</dd><small>{week.nights} {week.nights === 1 ? 'night' : 'nights'} logged</small></div>
        <div><dt>In bed, on average</dt><dd>{formatMinutes(week.inBed)}</dd></div>
        <div><dt>Bedtime · wake time</dt><dd>{clockFromNoon(week.bed)} · {clockFromMidnight(week.wake)}</dd><small>averages</small></div>
        <div><dt>Your quality rating</dt><dd>{week.quality !== null ? `${week.quality} of 5` : 'Not rated'}</dd></div>
        <div className="sleep-stat-wide"><dt>Sleep debt</dt><dd>{debt ? debt.minutes > 0 ? formatMinutes(debt.minutes) : `${formatMinutes(-debt.minutes)} ahead` : 'Set a goal'}</dd><small>{debt ? `Your goal (${formatMinutes(debt.goal)}) minus time asleep, added up over the ${debt.nights} ${debt.nights === 1 ? 'night' : 'nights'} you logged in the last 7 days.` : 'Needs your own sleep goal (below).'}</small></div>
        <div className="sleep-stat-wide"><dt>Bedtime consistency</dt><dd>{steady ? `± ${formatMinutes(steady.minutes)}` : 'Not yet'}</dd><small>{steady ? `How much your bedtimes vary: the standard deviation of ${steady.nights} bedtimes in the last 14 days.` : 'Needs at least 4 logged nights in 14 days.'}</small></div>
      </dl> : <p>No night logged in the last 7 days yet.</p>}
    </section>
    <section className="panel sleep-charts" aria-labelledby="sleep-charts-title">
      <div className="sleep-charts-head"><h2 id="sleep-charts-title">Over time</h2>
        <div className="sleep-range" role="group" aria-label="Range">{([7, 30] as const).map(r => <button key={r} type="button" className="secondary" aria-pressed={range === r} onClick={() => setRange(r)}>{r} days</button>)}</div>
      </div>
      <SleepDurationChart points={points} goal={sleep.goal?.minutes ?? null}/>
      <SleepTimesChart points={points} window={sleep.goal?.bedFrom && sleep.goal.bedTo ? {from: sleep.goal.bedFrom, to: sleep.goal.bedTo} : null}/>
      <SleepQualityChart points={points}/>
    </section>
    <section className="panel sleep-patterns" aria-labelledby="sleep-patterns-title">
      <h2 id="sleep-patterns-title">Patterns in your log</h2>
      {patterns.length ? <ul>{patterns.map(p => <li key={p.id}><p>{p.sentence}</p><details><summary>How this is worked out</summary><p className="fine">Average time asleep on the {p.withTag.nights} logged nights with the tag and the {p.without.nights} without it, from {p.window.start} to {p.window.end}. Shown only with at least 14 logged nights and 5 on each side.</p></details></li>)}</ul>
        : <p className="fine">Patterns appear once you have logged at least 14 nights in 60 days, with a tag on at least 5 of them and missing from at least 5 others. They describe your log; they do not explain it.</p>}
    </section>
    <div className="sleep-columns">
      <section className="panel" aria-labelledby="sleep-log-title"><h2 id="sleep-log-title">Log a night or a nap</h2><NightForm key={`new-${saves}`} store={store} onDone={done}/></section>
      <section className="panel" aria-labelledby="sleep-goal-title"><h2 id="sleep-goal-title">Your sleep goal</h2><SleepGoalForm key={`goal-${sleep.goal?.updatedAt ?? 'none'}`} store={store} onDone={done}/></section>
    </div>
    <section className="panel sleep-recent" aria-labelledby="sleep-recent-title">
      <h2 id="sleep-recent-title">Recent nights and naps</h2>
      {nights.length ? <ul className="sleep-nights">{nights.map(n => <li key={n.id}>
        {editing === n.id ? <NightForm store={store} night={n} onDone={done} onCancel={() => setEditing(null)}/> : <>
          <div><strong>{n.kind === 'nap' ? 'Nap' : 'Night'} ending {nightDay(n)}</strong><span>{nightLine(n)}</span>{(n.quality || n.tags?.length) && <span className="fine">{n.quality ? `Quality ${n.quality}/5` : ''}{n.quality && n.tags?.length ? ' · ' : ''}{n.tags?.join(', ')}</span>}{n.source !== 'manual' && n.source !== 'timer' && <span className="fine">From {n.source}</span>}</div>
          <div className="actions">
            <button type="button" className="secondary" onClick={() => setEditing(n.id)} aria-label={`Edit the ${n.kind} ending ${nightDay(n)}`}>Edit</button>
            {confirm === n.id ? <><button type="button" className="secondary" onClick={() => void remove(n.id)}>Delete it</button><button type="button" className="quiet" onClick={() => setConfirm(null)}>Keep it</button></>
              : <button type="button" className="quiet" onClick={() => setConfirm(n.id)} aria-label={`Delete the ${n.kind} ending ${nightDay(n)}`}>Delete</button>}
          </div>
        </>}
      </li>)}</ul> : <p>No nights yet. Log one above, or tap “I’m going to bed” tonight.</p>}
    </section>
    <p className="fine sleep-privacy">Nothing here is medical advice. Imported nights keep the source they came from.</p>
  </div>;
}
