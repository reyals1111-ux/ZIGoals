'use client';
import {useState, type FormEvent} from 'react';
import {endNight, inBedMinutes, runningNights, startNight} from '../../../lib/sleep/engine';
import {MAX_NIGHT_MINUTES, type SleepNight} from '../../../lib/sleep/schema';
import {formatMinutes, instantAt, wallClock} from '../../../lib/zone-time';
import type {SleepStore} from './use-sleep';

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
  return <form className="sleep-end-at" onSubmit={submit} aria-label={`When did the night from ${started.date} ${started.clock} end?`}>
    <p>A night started on {started.date} at {started.clock} is still open. When did you wake up?</p>
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
  return <div className="sleep-tonight">
    {!tonight ? <button type="button" className="primary" disabled={busy} onClick={() => void act(s => startNight(s, new Date(), store.zone), 'Good night. Tap “I woke up” in the morning.')}>I’m going to bed</button>
      : stale ? <EndAt store={store} night={tonight} onDone={onDone}/>
      : <>
        <p className="sleep-running">In bed since {wallClock(Date.parse(tonight.start), tonight.timeZone).clock} · {formatMinutes(inBedMinutes(tonight, store.now))}</p>
        <button type="button" className="primary" disabled={busy} onClick={() => void act(s => endNight(s, tonight.id, new Date()), 'Good morning. Your night is saved.')}>I woke up</button>
      </>}
    {extra.map(night => <EndAt key={night.id} store={store} night={night} onDone={onDone}/>)}
    {error && <p role="alert">{error}</p>}
  </div>;
}
