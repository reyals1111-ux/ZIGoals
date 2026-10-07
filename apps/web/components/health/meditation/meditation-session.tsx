'use client';
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {addSession, DEFAULT_BELLS, newSessionId} from '../../../lib/meditation/engine';
import {heartSnapshot, heartSummary, SERVER_HEART, subscribeHeart} from '../../../lib/bluetooth/heart-store';
import {audioContext, audioReady, strike, type Strike} from '../../../lib/meditation/bells';
import {bellTimes, clockText, elapsedMs, endedSession, isDone, isPaused, pauseRun, remainingMs, resumeRun, sessionFrom, type Run} from '../../../lib/meditation/timer';
import {emptyMeditationRun} from '../../../lib/meditation/schema';
import {minutesText} from '../../../lib/meditation/stats';
import {BreathingVisual} from './breathing-visual';
import {MoodPicker} from './meditation-forms';
import type {MeditationStore} from './use-meditation';

type WakeLockSentinel = {release(): Promise<void>};
/** Keeps the screen on while `active`, where the browser offers it; asks again when the page comes back into view. */
function useWakeLock(active: boolean): boolean {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  useEffect(() => {
    if (!active || !supported) return;
    const lock = (navigator as unknown as {wakeLock: {request(type: 'screen'): Promise<WakeLockSentinel>}}).wakeLock;
    let sentinel: WakeLockSentinel | null = null, done = false;
    const acquire = async () => { try { const next = await lock.request('screen'); if (done) void next.release(); else sentinel = next; } catch { /* refused (battery saver, policy): the session goes on */ } };
    const onVisible = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => { done = true; document.removeEventListener('visibilitychange', onVisible); void sentinel?.release().catch(() => undefined); };
  }, [active, supported]);
  return supported;
}

/**
 * The running session (Session W Part 5): the whole view while it runs (on a phone, the screen), so nothing else asks for
 * attention. The clock counts down from instants; the bells are scheduled ahead on the audio clock and cancelled by a
 * pause; the screen stays on where the browser allows. When the time is up (or "End now"), the person may add how they
 * feel and a note, then saves it or lets it go. A reload in the middle comes back here, the time still right.
 */
export function MeditationSession({store, run, onDone}: {store: MeditationStore; run: Run; onDone: (text: string) => void}) {
  const bells = store.meditation.bells ?? {...DEFAULT_BELLS, updatedAt: ''}, paused = isPaused(run), done = isDone(run, store.now);
  const [ending, setEnding] = useState(false), [moodAfter, setMoodAfter] = useState<number | undefined>(), [note, setNote] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false), [keepHeart, setKeepHeart] = useState(false);
  // Session W Part 8: a connected heart-rate monitor (Health → Devices) shows here, and its summary may be kept.
  const heart = useSyncExternalStore(subscribeHeart, heartSnapshot, () => SERVER_HEART);
  // Read on every render (the clock re-renders each second): the audio wakes asynchronously after the Begin tap.
  const sound = audioReady(), finished = done || ending, finishedHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (finished) finishedHeading.current?.focus(); }, [finished]);
  // The tap that began it is gone with the form: bring the session into view and give it the focus.
  const panel = useRef<HTMLElement>(null), runningHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { panel.current?.scrollIntoView({block: 'center'}); runningHeading.current?.focus({preventScroll: true}); }, []);
  // The run's timing as plain values: a re-read of the same record (another tab, a refresh) is not a change.
  const {startedAt, pausedAt, pausedMs, plannedSec} = run;
  const elapsedAt = useCallback((now: number) => elapsedMs({startedAt, pausedAt, pausedMs}, now), [startedAt, pausedAt, pausedMs]);
  const keepsScreenOn = useWakeLock(!paused && !finished);
  // The bells still to come, on the audio clock; anything that changes them (a pause, the end) cancels and reschedules.
  const scheduled = useRef<Strike[]>([]);
  useEffect(() => {
    if (paused || finished || !sound || bells.sound === 'silent') return;
    const ctx = audioContext();
    if (!ctx) return;
    const from = elapsedMs({startedAt, pausedAt, pausedMs}, Date.now()), times = bellTimes({plannedSec}, from, bells.intervalMin), base = ctx.currentTime - from / 1000;
    scheduled.current = [...times.interval, ...(times.end !== null ? [times.end] : [])].map(ms => strike(ctx, bells.sound, bells.volume, base + ms / 1000)).filter((s): s is Strike => s !== null);
    return () => { for (const s of scheduled.current) s.stop(); scheduled.current = []; };
  }, [startedAt, pausedAt, pausedMs, plannedSec, paused, finished, sound, bells.sound, bells.volume, bells.intervalMin]);
  const write = (change: Parameters<typeof store.run.update>[0]) => { try { store.run.update(change); setError(''); } catch { setError('This device could not save the session state. The session goes on.'); } };
  async function turnSoundOn() {
    try { await audioContext()?.resume?.(); } catch { /* stays silent */ }
  }
  async function save() {
    const ended = endedSession(run, store.now);
    if (!ended) { write(() => emptyMeditationRun()); onDone('Nothing to save: less than a second.'); return; }
    setBusy(true); setError('');
    try {
      const pulse = keepHeart ? heartSummary(Date.parse(ended.startedAt), Date.parse(ended.startedAt) + ended.seconds * 1000) : null;
      const session = sessionFrom(ended, {id: newSessionId(), timeZone: store.zone, moodAfter, note, now: new Date(), ...(pulse ? {heartRate: pulse} : {})});
      await store.update(m => addSession(m, session));
      write(() => emptyMeditationRun());
      onDone(`Saved: ${ended.seconds >= 60 ? minutesText(Math.round(ended.seconds / 60)) : `${ended.seconds} s`}.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Try again.'); }
    finally { setBusy(false); }
  }
  function letGo() { write(() => emptyMeditationRun()); onDone('The session was not saved.'); }
  const label = run.kind === 'breathing' ? 'Breathing' : 'Meditation';
  if (finished) {
    const ended = endedSession(run, store.now);
    return <section ref={panel} className="panel meditation-session meditation-finished" aria-labelledby="meditation-finished-title">
      <p className="eyebrow">{label.toUpperCase()} · DONE</p>
      <h2 id="meditation-finished-title" tabIndex={-1} ref={finishedHeading}>{ended ? `${ended.seconds >= 60 ? minutesText(Math.round(ended.seconds / 60)) : `${ended.seconds} s`} of ${run.kind === 'breathing' ? 'breathing' : 'stillness'}` : 'Less than a second'}</h2>
      <p>Save it to your Health journal, or let it go. How you feel is optional.</p>
      <MoodPicker legend="How do you feel now? (optional)" value={moodAfter} onChange={setMoodAfter}/>
      <label className="field">Note (optional)<textarea maxLength={500} rows={2} value={note} onChange={e => setNote(e.target.value)}/></label>
      {(() => { const pulse = ended ? heartSummary(Date.parse(ended.startedAt), Date.parse(ended.startedAt) + ended.seconds * 1000) : null; return pulse && <label className="checkbox"><input type="checkbox" checked={keepHeart} onChange={e => setKeepHeart(e.target.checked)}/>Keep my heart rate from this session: lowest {pulse.min}, average {pulse.avg}, highest {pulse.max} bpm (only these three numbers)</label>; })()}
      {error && <p role="alert">{error}</p>}
      <div className="actions"><button type="button" className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="secondary" disabled={busy} onClick={letGo}>Don’t save</button></div>
    </section>;
  }
  const left = remainingMs(run, store.now), total = run.plannedSec * 1000, progress = 1 - left / total;
  return <section ref={panel} className="panel meditation-session" aria-labelledby="meditation-session-title">
    <p className="eyebrow">{label.toUpperCase()} · {paused ? 'PAUSED' : 'IN PROGRESS'}</p>
    <h2 id="meditation-session-title" className="sr-only" tabIndex={-1} ref={runningHeading}>{label} in progress</h2>
    {run.kind === 'breathing' && run.pattern ? <BreathingVisual pattern={run.pattern} elapsedAt={elapsedAt} paused={paused}/> : <div className="meditation-clock" role="timer" aria-label={`${clockText(left)} left`}>
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="meditation-ring-track" cx="60" cy="60" r="54"/><circle className="meditation-ring" cx="60" cy="60" r="54" pathLength="100" strokeDasharray={`${(progress * 100).toFixed(2)} 100`} transform="rotate(-90 60 60)"/></svg>
      <strong aria-hidden="true">{clockText(left)}</strong>
    </div>}
    {heart.connected && heart.latest && <p className="meditation-heart"><span aria-hidden="true">♥</span> {heart.latest.bpm} bpm</p>}
    <p className="meditation-left">{clockText(left)} left of {minutesText(run.plannedSec / 60)}</p>
    {!sound && bells.sound !== 'silent' && <p className="fine">The bells are quiet until you tap “Turn on the bells” (browsers allow sound only after a tap). <button type="button" className="text-link" onClick={() => void turnSoundOn()}>Turn on the bells</button></p>}
    {keepsScreenOn && !paused && <p className="fine">The screen stays on during the session.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="actions meditation-controls">
      {paused ? <button type="button" className="primary" onClick={() => write(r => resumeRun(r, new Date()))}>Resume</button> : <button type="button" className="secondary" onClick={() => write(r => pauseRun(r, new Date()))}>Pause</button>}
      <button type="button" className="quiet" onClick={() => { write(r => pauseRun(r, new Date())); setEnding(true); }}>End now</button>
    </div>
  </section>;
}
