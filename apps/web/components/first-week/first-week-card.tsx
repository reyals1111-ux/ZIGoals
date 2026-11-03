'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {CELEBRATIONS} from '../../lib/celebrations';
import {ENERGY} from '../../lib/energy/schema';
import {JOURNAL} from '../../lib/journal/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {FIRST_WEEK, type FirstWeek} from '../../lib/first-week/store';
import {DAY_SEVEN_LINE, FIRST_WEEK_DAYS, STEPS, activeDaysBefore, celebrationId, firstWeekView, hideFirstWeek, markStep, showFirstWeek, startFirstWeek, type StepId} from '../../lib/first-week/week';
import {showcaseFirstWeek} from '../../lib/first-week/showcase';
import {showcaseDay, isShowcase} from '../../lib/showcase-storage';
import {deviceTimeZone, journalTimeZone} from '../../lib/journal-zone';
import {localDate} from '../../lib/local-date';
import {wallClock} from '../../lib/zone-time';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import {useJournalZone} from '../use-journal-zone';
import {ShowcaseTag} from '../ui/showcase-tag';
import {LazyPillarArt} from '../illustrations/lazy-pillar-art';
import './first-week.css';

/** The journal zone's calendar day (the device's when none is chosen). */
function zoneToday(): string { try { return wallClock(Date.now(), journalTimeZone() ?? deviceTimeZone()).date; } catch { return localDate(); } }

/**
 * Session AK (BUILD list 2 #5): "Your first week", a Today card kept on this device (`first-week` in
 * zigoals:today-cards:v1), off until the person turns it on, never in the Today hero. One small step a day for seven
 * days, in any order; skipping costs nothing; it ends on day 7 or on Hide, with one calm line on day 7 (once, through
 * lib/celebrations). Its own record (zigoals:first-week:v1) is written only on the person's taps. In the Showcase it shows
 * a fixed, labelled example and writes nothing.
 */
export default function FirstWeekCard() {
  const record = useDeviceRecord(FIRST_WEEK), notes = useDeviceRecord(CELEBRATIONS), journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY), money = useDeviceRecord(MONEY_LOG), habits = useHabits();
  const zone = useJournalZone().zone;
  const [today, setToday] = useState<string | null>(null), [showcase, setShowcase] = useState(false), [problem, setProblem] = useState('');
  useEffect(() => { queueMicrotask(() => { setToday(zoneToday()); setShowcase(isShowcase()); }); }, [zone]);
  const ready = today !== null && record.loaded && journal.loaded && energy.loaded && money.loaded && habits.loaded;
  const state: FirstWeek = showcase ? showcaseFirstWeek(showcaseDay() ?? today ?? localDate()) : record.data;
  const habitDays = useMemo(() => habits.loaded && !habits.error ? habits.data.habits.flatMap(h => h.entries.filter(e => e.count > 0).map(e => e.date)) : [], [habits.loaded, habits.error, habits.data]);
  const view = useMemo(() => {
    if (!ready) return null;
    const dates = [...habitDays, ...journal.data.entries.map(e => e.date), ...Object.keys(energy.data.days), ...money.data.entries.map(e => e.date)];
    const since = state.startedOn, detected: Partial<Record<StepId, string>> = {};
    if (since) {
      const ticked = habitDays.filter(d => d >= since).sort()[0]; if (ticked) detected.habit = ticked;
      const rated = Object.keys(energy.data.days).filter(d => d >= since).sort()[0]; if (rated) detected.checkin = rated;
    }
    return firstWeekView(state, today!, {activeDays: activeDaysBefore(dates, since ?? today!), detected});
  }, [ready, state, today, habitDays, journal.data.entries, energy.data.days, money.data.entries]);
  const write = (change: (s: FirstWeek) => FirstWeek) => {
    if (showcase) return;
    try { record.update(change); setProblem(''); } catch { setProblem('This could not be kept on this device.'); }
  };
  const celebrate = view?.phase === 'active' && view.lastDay && !!state.startedOn && notes.loaded && !notes.unreadable && !notes.data.seen[celebrationId(state.startedOn)];
  const closeCelebration = () => { if (showcase || !state.startedOn || !today) return; try { notes.update(n => ({...n, seen: {...n.seen, [celebrationId(state.startedOn!)]: today}})); } catch { /* the line stays until it can be kept */ } };

  return <section className="panel first-week-card" aria-labelledby="first-week-title">
    <p className="eyebrow">{view?.phase === 'active' ? `Day ${view.day} of ${FIRST_WEEK_DAYS}` : 'Optional'}</p>
    <h2 id="first-week-title">Your first week</h2>
    {showcase && <p className="fine"><ShowcaseTag/> A fictional example. In the Showcase nothing here is kept.</p>}
    {!view ? <p className="fine" role="status">Reading your records…</p>
      : view.phase === 'not-started' ? view.alreadyActive
        ? <p>You already have a week or more of records here, so there is no first week to walk through. You can take this card off Today under Customize Today.</p>
        : <div className="first-week-start pillar-art-inline"><div>
          <p>Seven small steps, one a day, to find your way around ZIGoals. Do them in any order. Skipping one costs nothing.</p>
          <div className="actions"><button type="button" className="primary" onClick={() => write(s => startFirstWeek(s, today!))}>Start my first week</button></div>
        </div><LazyPillarArt pillar="orbit" size={96}/></div>
      : view.phase === 'hidden' ? <>
        <p>This card is hidden. You can take it off Today under Customize Today.</p>
        <div className="actions"><button type="button" className="secondary" onClick={() => write(showFirstWeek)}>Show it again</button></div>
      </>
      : view.phase === 'ended' ? <p>Your first week has ended. Everything you set up stays as it is. You can take this card off Today under Customize Today.</p>
      : <>
        {celebrate && <div className="first-week-celebrate" role="status"><p>{DAY_SEVEN_LINE}</p><button type="button" className="text-link" onClick={closeCelebration}>Close</button></div>}
        {view.today ? <div className="first-week-today">
          <p className="first-week-step-title">{view.today.title}</p>
          <p className="fine">{view.today.line}</p>
          <div className="actions">
            <Link className="primary" href={view.today.href}>{view.today.cta}</Link>
            <button type="button" className="secondary" disabled={showcase} onClick={() => write(s => markStep(s, view.today!.id, today!))}>Mark as done</button>
          </div>
        </div> : <p>All seven steps are done. The card stays until day {FIRST_WEEK_DAYS}, or you can hide it now.</p>}
        <details className="first-week-all"><summary>All seven steps</summary>
          <ol className="first-week-steps">{STEPS.map(step => { const on = view.done.has(step.id); return <li key={step.id} data-done={on ? '' : undefined}>
            <Link href={step.href}>{step.title}</Link>
            <button type="button" className="secondary" aria-pressed={on} disabled={showcase} aria-label={`${step.title}: ${on ? 'done' : 'not yet'}`} onClick={() => write(s => markStep(s, step.id, today!, !on))}>{on ? 'Done' : 'Not yet'}</button>
          </li>; })}</ol>
          <p className="fine">Done steps keep a tick here. Open steps simply wait; nothing is counted against you.</p>
        </details>
        <div className="actions"><button type="button" className="text-link" disabled={showcase} onClick={() => write(hideFirstWeek)}>Hide this card</button></div>
      </>}
    {problem && <p role="alert" className="fine">{problem}</p>}
  </section>;
}
