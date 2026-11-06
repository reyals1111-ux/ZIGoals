'use client';
import {useState, type FormEvent} from 'react';
import {habitDay, restoreHabitEntry, type Habit} from '../../lib/habits';
import {markDayWithUndo} from './skip-undo';
import {storageMessageOr} from '../../lib/storage-error-copy';
import type {HabitCardStore} from './use-habits';
import {formatDate} from '../../lib/visual-format';
// Session AK (BUILD list 2 #1): a calm line while a note looks like recovery words or a key.
import {SecretGuard} from '../secret-guard/secret-guard';

export const SKIP_REASONS = ['Rest day', 'Not feeling well', 'Travelling', 'No time today', 'Other'] as const;
export const MOODS = [['energized', 'Energized'], ['good', 'Good'], ['calm', 'Calm'], ['neutral', 'Neutral'], ['difficult', 'Difficult']] as const;
type Mood = (typeof MOODS)[number][0];
/**
 * H4: "Skip today" with a reason (a skipped day, separate from a miss, never a broken streak when the schedule allows a
 * skip) and an optional note and mood on today's check-in; both through the journal's own mutators (`markDay`,
 * `setCount`) and shown in the habit's history.
 */
export function TodayNote({habit, store}: {habit: Habit; store: HabitCardStore}) {
  const day = habitDay(habit, store.today, store.today);
  const [mode, setMode] = useState<'closed' | 'note' | 'skip'>('closed'), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [reason, setReason] = useState<string>(''), [custom, setCustom] = useState(''), [note, setNote] = useState(day.note), [mood, setMood] = useState<Mood | ''>(day.mood ?? '');
  if (!day.scheduled) return null;
  async function saveNote(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await store.setCount(habit.id, store.today, day.count, note, mood || undefined); setMessage('Note saved for today.'); setMode('closed'); } catch (cause) { setError(storageMessageOr(cause, 'The note was not saved.')); } finally { setBusy(false); }
  }
  async function skip(e: FormEvent) {
    // Session AL (P-NB-26; NB-188): a reason is optional (a skip without one was refused far from the button); Undo is offered.
    e.preventDefault(); const why = reason === 'Other' ? custom.trim() : reason;
    setBusy(true); setError(''); setMessage('');
    try { await markDayWithUndo(store.update, habit, store.today, store.today, 'skipped', why ? `Skipped · ${why.slice(0, 100)}` : 'Skipped'); setMessage(why ? `Skipped today · ${why}. Your streak keeps its place.` : 'Skipped today. Your streak keeps its place.'); setMode('closed'); } catch (cause) { setError(storageMessageOr(cause, 'The skip was not saved.')); } finally { setBusy(false); }
  }
  return <div className="habit-today-note">
    {mode === 'closed' && <div className="habit-today-note-actions">{day.status !== 'skipped' && day.status !== 'complete' && <button type="button" className="quiet" onClick={() => { setMode('skip'); setMessage(''); }}>Skip today…</button>}{day.status === 'skipped' && <button type="button" className="quiet" disabled={busy} onClick={() => { setBusy(true); setError(''); store.update(data => { const entry = data.habits.find(h => h.id === habit.id)?.entries.find(x => x.date === store.today); return restoreHabitEntry(data, habit.id, store.today, entry ? {...entry, disposition: 'logged', note: /^Skipped/.test(entry.note) ? '' : entry.note} : undefined); }).then(() => setMessage(`${habit.title} is due again today.`), cause => setError(storageMessageOr(cause, 'The skip was not undone.'))).finally(() => setBusy(false)); }}>Undo skip</button>}<button type="button" className="quiet" onClick={() => { setMode('note'); setMessage(''); }}>{day.note || day.mood ? 'Edit note & mood' : 'Add a note or mood'}</button></div>}
    {mode === 'skip' && <form onSubmit={skip} className="habit-skip-form" aria-label={`Skip ${habit.title} today`}><p className="habit-skip-lead">Why skip {habit.title} today?</p><div className="habit-reason-chips" role="group" aria-label="Reason">{SKIP_REASONS.map(r => <button type="button" key={r} className="quiet" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}</div>{reason === 'Other' && <label className="field">Your reason<input type="text" maxLength={100} value={custom} onChange={e => setCustom(e.target.value)} autoFocus /></label>}<p className="fine">A reason is optional. A skip is not a miss: it keeps your streak and your consistency as they are.</p><div className="actions"><button type="submit" className="secondary" disabled={busy}>{busy ? 'Saving…' : 'Skip today'}</button><button type="button" className="quiet" onClick={() => { setMode('closed'); setError(''); }}>Cancel</button></div></form>}
    {mode === 'note' && <form onSubmit={saveNote} className="habit-note-form" aria-label={`Note and mood for ${habit.title} today`}><div className="habit-mood-chips" role="group" aria-label="Mood">{MOODS.map(([id, label]) => <button type="button" key={id} className="quiet" aria-pressed={mood === id} onClick={() => setMood(mood === id ? '' : id)}>{label}</button>)}</div><label className="field">Note for today<textarea rows={2} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} placeholder="How did it go?" /></label><SecretGuard text={note} onRemove={() => setNote('')}/><div className="actions"><button type="submit" className="secondary" disabled={busy}>{busy ? 'Saving…' : 'Save note'}</button><button type="button" className="quiet" onClick={() => { setMode('closed'); setError(''); }}>Cancel</button></div></form>}
    {message && <p role="status" className="fine">{message}</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
/** Recent reflections (notes, moods, skip reasons) for the history panel, newest first. */
export function Reflections({habit, today}: {habit: Habit; today: string}) {
  const rows = habit.entries.filter(e => e.date <= today && (e.note || e.mood || e.disposition === 'skipped')).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
  if (!rows.length) return null;
  const moodLabel = (m: string | undefined) => MOODS.find(([id]) => id === m)?.[1];
  return <div className="habit-reflections"><h3>Notes, moods and skips</h3><ul>{rows.map(e => <li key={e.date}><time dateTime={e.date}>{formatDate(e.date)}</time><span className={`habit-reflection-kind habit-day-${e.disposition}`}>{e.disposition === 'skipped' ? 'skipped' : e.disposition === 'failed' ? 'missed' : e.count > 0 ? 'logged' : 'note'}</span>{e.mood && <em>{moodLabel(e.mood)}</em>}{e.note && <span className="habit-reflection-note">{e.note}</span>}</li>)}</ul></div>;
}
