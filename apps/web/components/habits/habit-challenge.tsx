'use client';
import {useState} from 'react';
import {latestHabitRule, type Habit} from '../../lib/habits';
import {CHALLENGE_DAYS, challengeNoteId, challengeOf, finishedWords, keepGoing, startChallenge} from '../../lib/habits-v2/challenge';
import {CELEBRATIONS} from '../../lib/celebrations';
import {useDeviceRecord} from '../ai/use-device-record';
import type {HabitCardStore} from './use-habits';

/**
 * A habit's challenge on its card (Session W Part 10): the day it is on and the days done while it runs; when it has
 * ended, one calm note (once on this device, remembered in `zigoals:celebrations:v1`) with "Keep going" or "Let it
 * rest"; and, for a habit without an end date, a way to start one.
 */
export function ChallengeLine({habit, today}: {habit: Habit; today: string}) {
  const c = challengeOf(habit, today);
  if (!c || c.finished) return null;
  return <p className="habit-challenge-line"><strong>Challenge · day {c.dayNumber} of {c.days}</strong> · done on {c.done} of {c.scheduled} scheduled {c.scheduled === 1 ? 'day' : 'days'} so far · ends {c.end}</p>;
}
export function ChallengeFinished({habit, store}: {habit: Habit; store: HabitCardStore}) {
  const c = challengeOf(habit, store.today), notes = useDeviceRecord(CELEBRATIONS), [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!c?.finished || !notes.loaded || notes.unreadable || notes.data.seen[challengeNoteId(habit, c)]) return null;
  const seen = () => notes.update(n => ({...n, seen: {...n.seen, [challengeNoteId(habit, c)]: store.today}}));
  return <div className="habit-challenge-done" role="group" aria-label={`${habit.title} challenge ended`}>
    <p>{finishedWords(habit, c)}</p>
    <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await store.update(data => keepGoing(data, habit.id)); seen(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Not saved.'); } finally { setBusy(false); } }}>Keep going (no end date)</button>
      <button type="button" className="quiet" disabled={busy} onClick={() => { try { seen(); } catch { setError('Not saved on this device.'); } }}>Let it rest</button></div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
export function ChallengeControls({habit, store}: {habit: Habit; store: HabitCardStore}) {
  const c = challengeOf(habit, store.today), [days, setDays] = useState(String(CHALLENGE_DAYS.usual)), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const active = latestHabitRule(habit).state === 'active';
  async function run(change: Parameters<HabitCardStore['update']>[0], words: string) { setBusy(true); setError(''); setMessage(''); try { await store.update(change); setMessage(words); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Not saved.'); } finally { setBusy(false); } }
  return <details className="habit-details habit-challenge"><summary>Challenge</summary>
    {c && !c.finished ? <><p>Day {c.dayNumber} of {c.days}, from {c.start} to {c.end}: done on {c.done} of {c.scheduled} scheduled {c.scheduled === 1 ? 'day' : 'days'} so far. Rest days don’t count either way.</p>
      <button type="button" className="quiet" disabled={busy} onClick={() => void run(data => keepGoing(data, habit.id), 'The challenge’s end date is gone; the habit carries on.')}>Carry on without an end date</button></>
      : <>{c?.finished && <p>{finishedWords(habit, c)}</p>}
        {active ? <form className="habit-challenge-form" onSubmit={e => { e.preventDefault(); const n = Number(days); void run(data => startChallenge(data, habit.id, n), `Challenge started: ${n} days from today.`); }}>
          <label className="field">Days<input type="text" inputMode="numeric" required value={days} onChange={e => setDays(e.target.value)} aria-describedby={`challenge-hint-${habit.id}`} /></label>
          <button type="submit" className="secondary" disabled={busy}>Start a challenge</button>
          <p className="fine" id={`challenge-hint-${habit.id}`}>From today, {CHALLENGE_DAYS.min} to {CHALLENGE_DAYS.max} days. The habit stops being due after the last day; you can carry on then.</p>
        </form> : <p className="fine">Resume this habit to start a challenge.</p>}</>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
