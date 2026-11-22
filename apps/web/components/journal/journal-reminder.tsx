'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL} from '../../lib/journal/schema';
import {NOTIFY_PREFS, typeOn} from '../../lib/notify/prefs';
import {WEEKDAYS, dayOn, reminderLine, reminderOf, toggleDay, withReminder} from '../../lib/journal/reminder';

/**
 * Session AV lane 2 (journal; LEDGER #40, Day One's journaling reminders): "Reminder to write" — on or off, a time and the
 * weekdays, kept in the journal record. The notification comes from this device's notifications (Settings →
 * Notifications), which the card says plainly when they are off here or muted; it never carries a word of the journal.
 * Loaded when its fold opens.
 */
export default function JournalReminder() {
  const journal = useDeviceRecord(JOURNAL), prefs = useDeviceRecord(NOTIFY_PREFS), id = useId();
  const [said, setSaid] = useState(''), [problem, setProblem] = useState('');
  if (!journal.loaded) return <p className="fine">Loading…</p>;
  const r = reminderOf(journal.data);
  const change = (patch: Parameters<typeof withReminder>[1], words: string) => {
    setProblem('');
    try { journal.update(c => withReminder(c, patch)); setSaid(words); } catch (e) { setProblem(e instanceof Error ? e.message : 'This could not be kept on this device.'); }
  };
  const here = prefs.loaded && prefs.data.here === true, muted = prefs.loaded && !typeOn(prefs.data, 'journal');
  return <div className="journal-reminder">
    <label className="switch-row"><input type="checkbox" checked={r.on} onChange={e => change({on: e.target.checked}, e.target.checked ? `Reminder on: ${r.time}.` : 'Reminder off.')}/> <span>Remind me to write</span></label>
    <label className="field journal-reminder-time"><span>At</span><input type="time" value={r.time} required onChange={e => { if (e.target.value) change({time: e.target.value}, `Reminder at ${e.target.value}.`); }}/></label>
    <div className="journal-reminder-days" role="group" aria-labelledby={`${id}-days`}><span id={`${id}-days`} className="fine">On these days</span>
      <div className="journal-reminder-day-row">{WEEKDAYS.map(([short, long], i) => <button key={short} type="button" className="quiet" aria-pressed={dayOn(r.days, i)} aria-label={long} onClick={() => change({days: toggleDay(r.days, i)}, `${long} ${dayOn(r.days, i) ? 'off' : 'on'}.`)}>{short}</button>)}</div>
    </div>
    <p className="fine">{reminderLine(r)}</p>
    {r.on && !here && <p className="fine journal-reminder-note">Notifications are off on this device, so the reminder cannot reach you yet. Turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {r.on && here && muted && <p className="fine journal-reminder-note">&ldquo;Reminder to write&rdquo; is switched off in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {problem && <p className="field-error" role="alert">{problem}</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
