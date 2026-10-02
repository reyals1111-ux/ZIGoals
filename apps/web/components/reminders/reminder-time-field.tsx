'use client';
import './reminders.css';

/** "Reminder time — on this device": an optional 24-hour time; empty means no reminder. */
export function ReminderTimeField({value, onChange, disabled, note}: {value: string; onChange: (value: string) => void; disabled?: boolean; note?: string}) {
  return <label className="field reminder-time-field">
    <span>Reminder time — on this device</span>
    <input type="time" step={60} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />
    <small>{note ?? 'After this time, Today shows a reminder card while this is not done. Kept on this device only, never synced; leave empty for none.'}</small>
  </label>;
}
