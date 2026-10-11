'use client';
import {useState} from 'react';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {setContributionReminder} from '../../lib/reminders/contribution-due';
import {useDeviceRecord} from '../ai/use-device-record';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/**
 * A contribution plan's reminder (Session W Part 12): a time on this device (`zigoals:w-reminders:v1`). On a day the
 * plan has an amount due, once the time has passed, Today shows a card and ZIGi may knock while ZIGoals is open; "Fund
 * now" opens this Goal's contribution form with that day's amount filled in for the person to check. Nothing moves money.
 */
export function ContributionReminder({goalId, disabled = false}: {goalId: string; disabled?: boolean}) {
  const w = useDeviceRecord(W_REMINDERS), [error, setError] = useState(''), [message, setMessage] = useState('');
  if (!w.loaded) return null;
  if (w.unreadable) return <p className="fine">Reminders on this device could not be read, so this one cannot be set now. Their bytes are kept.</p>;
  const time = w.data.contributions[goalId]?.time;
  function save(next: string | null) {
    try { w.update(r => setContributionReminder(r, goalId, next)); setError(''); setMessage(next ? `Reminder set for ${next} on this device.` : 'Reminder turned off on this device.'); }
    catch (cause) { setMessage(''); setError(`Not saved on this device. ${deviceSettingFailureMessage(cause)}`); }
  }
  return <form className="contribution-reminder" aria-label="Contribution reminder" onSubmit={e => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('time') ?? ''); if (value) save(value); }}>
    <h3>Reminder</h3>
    <label className="field">Remind me on this device at<input name="time" type="time" required key={time ?? 'off'} defaultValue={time ?? '09:00'} disabled={disabled} /></label>
    <div className="actions"><button className="secondary" disabled={disabled}>{time ? 'Change reminder' : 'Set reminder'}</button>{time && <button type="button" className="quiet" disabled={disabled} onClick={() => save(null)}>Turn reminder off</button>}</div>
    <p className="fine">On a day your plan has an amount due, a card shows on Today after this time, and ZIGi may knock while ZIGoals is open. “Fund now” opens this Goal&apos;s contribution form filled in for you to check; nothing moves money.</p>
    {message && <p role="status" className="fine">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </form>;
}
