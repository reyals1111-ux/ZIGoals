'use client';
import {useState} from 'react';
import {healthDay} from '../../lib/health-daily';
import {reminderTime} from '../../lib/reminders/schema';
import {setWaterReminder} from '../../lib/reminders/store';
import {ReminderTimeField} from './reminder-time-field';
import {useReminders} from './use-reminders';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/** The Water journal's reminder time, kept on this device only (lib/reminders). Saved only when asked. */
export function WaterReminder({timezone}: {timezone: string | null}) {
  const reminders = useReminders();
  const saved = reminders.data.water?.time ?? '';
  const [draft, setDraft] = useState<string | null>(null), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const value = draft ?? saved;
  return <form className="health-form reminder-form" aria-label="Water reminder" onSubmit={event => {
    event.preventDefault();
    const time = reminderTime(value);
    try {
      reminders.update(healthDay(timezone), current => setWaterReminder(current, time));
      setDraft(null);
      setMessage({text: time ? `Water reminder set for ${time} on this device.` : 'Water reminder removed from this device.'});
    } catch (error) { setMessage({text: `The reminder time was not saved on this device. ${deviceSettingFailureMessage(error)}`, failed: true}); }
  }}>
    <ReminderTimeField value={value} disabled={!reminders.loaded} onChange={next => { setDraft(next); setMessage(null); }} note="After this time, Today shows a water reminder card while nothing is logged or the day is below your target. Kept on this device only, never synced; leave empty for none." />
    <div className="actions"><button type="submit" className="secondary" disabled={!reminders.loaded || value === saved}>Save reminder time</button></div>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </form>;
}
