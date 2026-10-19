'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useMemo, useState} from 'react';
import {EARN_PATH, markStep, setTodayCard} from '../../lib/earn/records';
import {STEP_WORDS, startStates, type StartFacts, type StartStepId} from '../../lib/earn/start-here';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import {LoadBoundary} from '../load-boundary';
import {SectionHeading} from '../ui/section-heading';
import type {StartLive} from './start-here-path';

const StartHerePath = lazy(() => import('./start-here-path'));
/**
 * Session AF chunk 2 (P1.7–P1.11, P1.30): "Start here", six steps from no wallet to a first real stake, on the shared path
 * engine. The heading, the count and a plain list are on the page at once; the path (its own chunk) replaces the list
 * after the first paint. Each step is ticked from what ZIGoals can see (lib/earn/start-here.ts), or marked by the person
 * on this device (`zigoals:earn-path:v1`). A dismissed Today card can be brought back from here.
 */
export function StartHereSection({facts, live}: {facts: StartFacts; live: StartLive}) {
  const record = useDeviceRecord(EARN_PATH);
  const [open, setOpen] = useState<string | null>(null), [ready, setReady] = useState(false), [error, setError] = useState('');
  useEffect(() => { queueMicrotask(() => setReady(true)); }, []);
  const states = useMemo(() => startStates(facts, record.unreadable ? {version: 1} : record.data), [facts, record.data, record.unreadable]);
  const done = states.filter(s => s.done).length, next = states.find(s => !s.done);
  const mark = (id: StartStepId, value: boolean) => {
    try { record.update(r => markStep(r, id, value)); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); }
  };
  const showToday = () => { try { record.update(setTodayCard('auto')); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <section id="start-here" className="earn-start panel" aria-labelledby="start-here-title" data-done={done}>
    <SectionHeading id="start-here-title" eyebrow="New here? Start here" title="From no wallet to your first stake"
      lede="Six steps, about 30 minutes in all, on the apps’ own pages and in your own wallet. Press a dot for its guide. ZIGoals ticks what it can see and never signs for you."/>
    <p className="earn-start-progress" aria-live="polite"><b>{done} of 6 steps done</b>{next ? <> · next: {STEP_WORDS[next.id].label}</> : ' · all done'}</p>
    {ready
      ? <LoadBoundary label="The Start-here path"><Suspense fallback={<StartList states={states}/>}><StartHerePath states={states} open={open} onOpen={setOpen} onMark={mark} live={live} markError={error}/></Suspense></LoadBoundary>
      : <StartList states={states}/>}
    {record.loaded && record.data.todayCard === 'dismissed' && <p className="fine earn-start-today">The Earn card is off on Today. <button type="button" className="text-link" onClick={showToday}>Show it on Today again</button></p>}
    <p className="fine">Stuck on a word? The <a className="text-link" href="#academy">Academy</a> explains staking, fees and safety in five-minute lessons. <Link className="text-link" href="/app/staking">Go to Staking</Link></p>
  </section>;
}
/** Before the path's chunk arrives (or if it cannot load): the six steps as a plain list with their state. */
function StartList({states}: {states: ReturnType<typeof startStates>}) {
  return <ol className="earn-start-list">{states.map(s => <li key={s.id} data-step={s.id} data-done={s.done || undefined}><b>{STEP_WORDS[s.id].label}</b> <span className="fine">{s.done ? s.how === 'seen' ? '· seen done' : '· marked done' : `· ${STEP_WORDS[s.id].short}`}</span></li>)}</ol>;
}
