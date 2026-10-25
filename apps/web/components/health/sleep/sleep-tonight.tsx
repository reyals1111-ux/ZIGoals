'use client';
import {useState, type FormEvent} from 'react';
import {SHORTEST_SLEEP_MS, deleteNight, endNight, inBedMinutes, runningNights, startNight, wakeGreeting} from '../../../lib/sleep/engine';
import {MAX_NIGHT_MINUTES, type SleepNight} from '../../../lib/sleep/schema';
import {formatMinutes, instantAt, wallClock} from '../../../lib/zone-time';
import type {SleepStore} from './use-sleep';
import {formatDate, formatTime} from '../../../lib/visual-format';

const message = (error: unknown) => error instanceof Error && error.message ? error.message : 'Could not save. Try again.';
/** A running night that is too old to end with a tap asks when the person woke up; nothing is ever invented. */
function EndAt({store, night, onDone}: {store: SleepStore; night: SleepNight; onDone: (text: string) => void}) {
  const [error, setError] = useState('');
  const started = wallClock(Date.parse(night.start), night.timeZone);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget), date = String(form.get('date') ?? ''), time = String(form.get('time') ?? '');
    if (!date || !time) { setError('Enter when you woke up.'); return; }
    const end = instantAt(date, time, night.timeZone);
    try { await store.update(s => endNight(s, night.id, new Date(end))); onDone('Night saved.'); } catch (err) { setError(message(err)); }
  }
  return <form className="sleep-end-at" onSubmit={submit} aria-label={`When did the night from ${formatDate(started.date)} ${formatTime(night.start, {timeZone: night.timeZone})} end?`}>
    <p>A night started on {formatDate(started.date)} at {formatTime(night.start, {timeZone: night.timeZone})} is still open. When did you wake up?</p>
    <div className="sleep-form-row">
      <label className="field">Woke up (date)<input type="date" name="date" required defaultValue={started.date}/></label>
      <label className="field">Woke up (time)<input type="time" name="time" required defaultValue="07:00"/></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <button type="submit" className="secondary">Save the wake time</button>
  </form>;
}

/**
 * "I'm going to bed" and "I woke up" (Session W Part 4). One tap starts a running night in the zone the person's days
 * follow; one tap ends it. A night older than 24 hours, or a second one started on another device, asks for its end.
 */
export function SleepTonight({store, onDone}: {store: SleepStore; onDone: (text: string) => void}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const running = runningNights(store.sleep), tonight = running[0], extra = running.slice(1);
  const stale = tonight && store.now - Date.parse(tonight.start) > MAX_NIGHT_MINUTES * 60_000;
  async function act(change: Parameters<SleepStore['update']>[0], done: string) {
    setBusy(true); setError('');
    try { await store.update(change); onDone(done); } catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  function wakeUp(night: SleepNight) {
    const now = new Date();
    if (now.getTime() - Date.parse(night.start) < SHORTEST_SLEEP_MS) void act(s => s.nights.some(n => n.id === night.id) ? deleteNight(s, night.id) : s, 'Stopped after less than ten minutes, so nothing was saved.');
    else void act(s => endNight(s, night.id, now), `${wakeGreeting(now.getTime(), night.timeZone)} Your night is saved.`);
  }
  return <div className="sleep-tonight">
    {!tonight ? <button type="button" className="primary" disabled={busy} onClick={() => void act(s => startNight(s, new Date(), store.zone), 'Good night. Tap “I woke up” in the morning.')}>I’m going to bed</button>
      : stale ? <EndAt store={store} night={tonight} onDone={onDone}/>
      : <>
        <p className="sleep-running">In bed since {formatTime(tonight.start, {timeZone: tonight.timeZone})} · {formatMinutes(inBedMinutes(tonight, store.now))}</p>
        {/* Session AH Part 3 (DS2): the greeting follows the hour; moments after "I'm going to bed" nothing is saved. */}
        <button type="button" className="primary" disabled={busy} onClick={() => wakeUp(tonight)}>I woke up</button>
      </>}
    {extra.map(night => <EndAt key={night.id} store={store} night={night} onDone={onDone}/>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
