'use client';
import {useId, useState, type KeyboardEvent} from 'react';
import {HABIT_EXTRAS} from '../../lib/habits-extras/schema';
import {MORE_TIMES_MAX, readReminderMore, REMINDER_WORDS_MAX, reminderMoreOf, withReminderMore, type ReminderMoreIssue} from '../../lib/habit-reminder-words';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import './habit-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #275, Way of Life's reminders in your own words): in a habit's editor, under its
 * reminder time, "Your own words and more times": a line of your own for the reminder (up to 80 characters) and up to two
 * more times a day. Saved on its own (the habit itself is saved with the editor's button), in the habit extras. Its own
 * chunk; nothing loads for a new habit until it exists.
 */
export default function ReminderMore({habitId, baseTime}: {habitId: string; baseTime: string}) {
  const extras = useDeviceRecord(HABIT_EXTRAS), id = useId();
  const saved = reminderMoreOf(extras.data, habitId);
  const [words, setWords] = useState<string | null>(null), [times, setTimes] = useState<string[] | null>(null);
  const [issue, setIssue] = useState<ReminderMoreIssue | null>(null), [said, setSaid] = useState('');
  if (!extras.loaded) return null;
  const shownWords = words ?? saved.words ?? '', shownTimes = times ?? [...saved.times, '', ''].slice(0, MORE_TIMES_MAX);
  const changed = words !== null || times !== null;
  function save() {
    const read = readReminderMore(shownWords, shownTimes, baseTime);
    if (!read.ok) { setIssue(read.issue); document.getElementById(`${id}-${read.issue.field}`)?.focus(); return; }
    try {
      extras.update(current => withReminderMore(current, habitId, read.value));
      setWords(null); setTimes(null); setIssue(null);
      setSaid(read.value.words || read.value.times.length ? `Saved: ${read.value.words ? `“${read.value.words}”` : 'no words of your own'}${read.value.times.length ? `, also at ${read.value.times.join(' and ')}` : ''}.` : 'Your own words and extra times are removed.');
    } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); }
  }
  const enter = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save(); } };
  return <details className="habit-reminder-more" open={!!(saved.words || saved.times.length) || undefined}>
    <summary>Your own words and more times</summary>
    {extras.unreadable ? <p className="fine" role="alert">Your habit settings on this device could not be read, so these cannot be changed now.</p> : <>
      <p className="fine">A line of your own for this reminder, like “Shoes by the door?”, and up to {MORE_TIMES_MAX} more times a day{baseTime ? '' : ' once the habit has a reminder time'}. Notifications show your words only where names are allowed (Settings → Notifications), and never for a habit that is done from Health.</p>
      <div className="field"><label htmlFor={`${id}-words`}>Reminder words (optional)</label>
        <input id={`${id}-words`} type="text" maxLength={REMINDER_WORDS_MAX} autoComplete="off" value={shownWords} aria-invalid={issue?.field === 'words' ? true : undefined} aria-describedby={`${id}-count${issue?.field === 'words' ? ` ${id}-words-issue` : ''}`} onKeyDown={enter} onChange={e => { setWords(e.target.value); setIssue(null); setSaid(''); }}/>
        <small className="fine" id={`${id}-count`}>{shownWords.trim().length} of {REMINDER_WORDS_MAX} characters</small></div>
      {issue?.field === 'words' && <p className="field-error" id={`${id}-words-issue`} role="alert">{issue.message}</p>}
      <fieldset className="habit-reminder-times" disabled={!baseTime} aria-describedby={issue?.field === 'times' ? `${id}-times-issue` : undefined}><legend>More times a day (optional)</legend>
        {shownTimes.map((t, i) => <label className="field" key={i}><span>{i === 0 ? 'Also at' : 'And at'}</span><input id={i === 0 ? `${id}-times` : undefined} type="time" value={t} onKeyDown={enter} onChange={e => { const next = [...shownTimes]; next[i] = e.target.value; setTimes(next); setIssue(null); setSaid(''); }}/></label>)}
      </fieldset>
      {issue?.field === 'times' && <p className="field-error" id={`${id}-times-issue`} role="alert">{issue.message}</p>}
      <div className="actions"><button type="button" className="secondary" disabled={!changed} onClick={save}>Save words and times</button>{changed && <button type="button" className="quiet" onClick={() => { setWords(null); setTimes(null); setIssue(null); }}>Cancel</button>}</div>
    </>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </details>;
}
