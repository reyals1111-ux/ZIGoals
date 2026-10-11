'use client';
import {useState, type FormEvent} from 'react';
import {BELL_SOUNDS, BREATHING_PATTERNS, type MeditationSession} from '../../../lib/meditation/schema';
import {DEFAULT_BELLS, saveManual, setBells, setMeditationGoal} from '../../../lib/meditation/engine';
import {BELLS, ring, wakeAudio, type BellSound} from '../../../lib/meditation/bells';
import {PATTERNS, type BreathingPattern} from '../../../lib/meditation/breathing';
import {MAX_MINUTES, MIN_MINUTES, PRESET_MINUTES, startRun} from '../../../lib/meditation/timer';
import {wallClock} from '../../../lib/zone-time';
import type {MeditationStore} from './use-meditation';
import {zigiSignals} from '../../zigi/bus';

const MOODS = [[1, 'Low'], [2, 'Uneasy'], [3, 'OK'], [4, 'Calm'], [5, 'Very calm']] as const;
const message = (error: unknown) => error instanceof Error && error.message && !error.message.startsWith('[') ? error.message : 'Check the values and try again.';
const SOUND_LABELS: Record<BellSound, string> = {bowl: BELLS.bowl.label, chime: BELLS.chime.label, soft: BELLS.soft.label, silent: 'No sound'};

/** How you feel, 1–5, optional: a second tap on the chosen one clears it. */
export function MoodPicker({legend, value, onChange}: {legend: string; value: number | undefined; onChange: (mood: number | undefined) => void}) {
  return <fieldset className="meditation-moods"><legend>{legend}</legend>
    {MOODS.map(([mood, label]) => <button key={mood} type="button" className="meditation-chip" aria-pressed={value === mood} onClick={() => onChange(value === mood ? undefined : mood)}>{mood} · {label}</button>)}
  </fieldset>;
}

/**
 * Begin a session: a timer (silent sitting, with bells) or a breathing guide, for a preset or your own number of minutes,
 * with how you feel before (optional). The tap that begins also wakes the sound, as browsers ask.
 */
export function BeginForm({store, onStarted}: {store: MeditationStore; onStarted: () => void}) {
  const [kind, setKind] = useState<'timer' | 'breathing'>('timer'), [pattern, setPattern] = useState<BreathingPattern>('box');
  const [minutes, setMinutes] = useState<number | 'custom'>(kind === 'timer' ? 10 : 3), [custom, setCustom] = useState(''), [mood, setMood] = useState<number | undefined>(), [error, setError] = useState('');
  const bells = store.meditation.bells ?? {...DEFAULT_BELLS, updatedAt: ''};
  function begin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const chosen = minutes === 'custom' ? Number(custom.trim()) : minutes;
    if (minutes === 'custom' && (!/^\d{1,3}$/.test(custom.trim()) || chosen < MIN_MINUTES || chosen > MAX_MINUTES)) { setError(`Enter whole minutes from ${MIN_MINUTES} to ${MAX_MINUTES}.`); return; }
    try {
      store.run.update(() => startRun({now: new Date(), minutes: chosen, kind, ...(kind === 'breathing' ? {pattern} : {}), ...(mood !== undefined ? {moodBefore: mood} : {})}));
    } catch (err) { setError(`This device could not start the session. ${message(err)}`); return; }
    // A sitting starts with its bell; a breathing guide starts quietly, but this tap still wakes the sound for its end bell.
    if (kind === 'timer') void ring(bells.sound, bells.volume); else if (bells.sound !== 'silent') void wakeAudio();
    onStarted();
  }
  return <form className="meditation-form" onSubmit={begin} aria-label="Begin a session">
    <fieldset className="meditation-segment"><legend>What would you like to do?</legend>
      {(['timer', 'breathing'] as const).map(k => <label key={k}><input type="radio" name="kind" checked={kind === k} onChange={() => { setKind(k); setMinutes(k === 'timer' ? 10 : 3); }}/><span>{k === 'timer' ? 'Sit with a timer' : 'Breathe with a guide'}</span></label>)}
    </fieldset>
    {kind === 'breathing' && <fieldset className="meditation-segment meditation-patterns"><legend>Pattern</legend>
      {BREATHING_PATTERNS.map(p => <label key={p}><input type="radio" name="pattern" checked={pattern === p} onChange={() => setPattern(p)}/><span><strong>{PATTERNS[p].label}</strong><small>{PATTERNS[p].summary}</small></span></label>)}
    </fieldset>}
    <fieldset className="meditation-segment"><legend>How long?</legend>
      {PRESET_MINUTES.map(m => <label key={m}><input type="radio" name="minutes" checked={minutes === m} onChange={() => setMinutes(m)}/><span>{m} min</span></label>)}
      <label><input type="radio" name="minutes" checked={minutes === 'custom'} onChange={() => setMinutes('custom')}/><span>Your own</span></label>
    </fieldset>
    {minutes === 'custom' && <label className="field meditation-custom">Minutes ({MIN_MINUTES}–{MAX_MINUTES})<input type="text" inputMode="numeric" autoComplete="off" value={custom} onChange={e => setCustom(e.target.value)}/></label>}
    <MoodPicker legend="How do you feel before? (optional)" value={mood} onChange={setMood}/>
    {kind === 'breathing' && <p className="fine">Breathe gently and comfortably. If you feel dizzy or unwell, stop and breathe normally.</p>}
    {error && <p role="alert">{error}</p>}
    <button type="submit" className="primary meditation-begin">Begin</button>
  </form>;
}

/** Mindful minutes you did elsewhere, or a session to correct (manual entries only). */
export function ManualForm({store, session, onDone, onCancel}: {store: MeditationStore; session?: MeditationSession; onDone: (text: string) => void; onCancel?: () => void}) {
  const zone = session?.timeZone ?? store.zone, start = session ? wallClock(Date.parse(session.startedAt), zone) : null;
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = new FormData(e.currentTarget), get = (name: string) => String(form.get(name) ?? '').trim();
    if (!get('date') || !get('time')) { setError('Enter when you began.'); return; }
    if (!/^\d{1,4}$/.test(get('minutes'))) { setError('Enter whole minutes from 1 to 1440.'); return; }
    setBusy(true);
    try { await store.update(m => saveManual(m, {id: session?.id, date: get('date'), time: get('time'), minutes: Number(get('minutes')), note: get('note'), timeZone: zone}, new Date())); if (!session) zigiSignals.emitValidated('health_log_recorded'); onDone(session ? 'Session updated.' : 'Mindful minutes saved.'); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  const now = wallClock(store.now, zone);
  return <form className="meditation-form" onSubmit={submit} aria-label={session ? 'Edit this session' : 'Log mindful minutes'} noValidate>
    <div className="meditation-form-row">
      <label className="field">Began (date)<input type="date" name="date" required defaultValue={start?.date ?? now.date}/></label>
      <label className="field">Began (time)<input type="time" name="time" required defaultValue={start?.clock ?? '07:00'}/></label>
      <label className="field">Minutes<input type="text" inputMode="numeric" name="minutes" autoComplete="off" required defaultValue={session ? String(Math.round(session.seconds / 60)) : '10'}/></label>
    </div>
    <p className="fine">Times in {zone}.</p>
    <label className="field">Note (optional)<textarea name="note" maxLength={500} rows={2} defaultValue={session?.note ?? ''}/></label>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : session ? 'Save changes' : 'Save'}</button>{onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

const GOAL_CHOICES = [30, 60, 90, 120, 150, 210] as const;
/** Your own weekly goal in minutes; ZIGoals suggests none. */
export function MeditationGoalForm({store, onDone}: {store: MeditationStore; onDone: (text: string) => void}) {
  const goal = store.meditation.goal, [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const value = Number(new FormData(e.currentTarget).get('minutes'));
    setBusy(true);
    try { await store.update(m => setMeditationGoal(m, value, new Date())); onDone('Your weekly goal is saved.'); } catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError('');
    try { await store.update(m => setMeditationGoal(m, null, new Date())); onDone('Your weekly goal is removed.'); } catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  const choices = goal && !(GOAL_CHOICES as readonly number[]).includes(goal.minutesPerWeek) ? [...GOAL_CHOICES, goal.minutesPerWeek].sort((a, b) => a - b) : GOAL_CHOICES;
  return <form className="meditation-form" onSubmit={submit} aria-label="Your weekly goal">
    <label className="field">Minutes a week I aim for<select name="minutes" defaultValue={goal?.minutesPerWeek ?? 60}>{choices.map(m => <option key={m} value={m}>{m} minutes</option>)}</select></label>
    <p className="fine">Your own goal. Rest days are fine; the week is what counts.</p>
    {error && <p role="alert">{error}</p>}
    <div className="actions"><button type="submit" className="primary" disabled={busy}>Save goal</button>{goal && <button type="button" className="text-link" disabled={busy} onClick={() => void remove()}>Remove the goal</button>}</div>
  </form>;
}

const INTERVALS = [0, 1, 2, 5, 10] as const;
/** The bell: its sound, its volume, and an optional bell every few minutes. Kept with your Health journal. */
export function BellsForm({store, onDone}: {store: MeditationStore; onDone: (text: string) => void}) {
  const saved = store.meditation.bells ?? {...DEFAULT_BELLS, updatedAt: ''};
  const [sound, setSound] = useState<BellSound>(saved.sound), [volume, setVolume] = useState(saved.volume), [interval, setInterval_] = useState(saved.intervalMin ?? 0);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [tried, setTried] = useState<'' | 'played' | 'silent'>('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await store.update(m => setBells(m, {sound, volume, ...(interval ? {intervalMin: interval} : {})}, new Date())); onDone('Your bell is saved.'); } catch (err) { setError(message(err)); } finally { setBusy(false); }
  }
  async function tryBell() { setTried((await ring(sound, volume)) ? 'played' : 'silent'); }
  return <form className="meditation-form" onSubmit={submit} aria-label="Your bell">
    <fieldset className="meditation-segment"><legend>Sound</legend>
      {BELL_SOUNDS.map(s => <label key={s}><input type="radio" name="sound" checked={sound === s} onChange={() => setSound(s)}/><span>{SOUND_LABELS[s]}</span></label>)}
    </fieldset>
    <label className="field">Volume · {volume}<input type="range" min={0} max={100} step={5} value={volume} onChange={e => setVolume(Number(e.target.value))} disabled={sound === 'silent'}/></label>
    <label className="field">A bell during the session<select value={interval} onChange={e => setInterval_(Number(e.target.value))}>{INTERVALS.map(i => <option key={i} value={i}>{i ? `Every ${i} min` : 'Only at the start and the end'}</option>)}</select></label>
    <div className="actions"><button type="button" className="secondary" onClick={() => void tryBell()} disabled={sound === 'silent'}>Try the bell</button><button type="submit" className="primary" disabled={busy}>Save bell</button></div>
    {tried === 'silent' && <p className="fine" role="status">This browser could not play the bell. Sessions still work, silently.</p>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
