'use client';
import {useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {W_REMINDERS} from '../../../lib/reminders/w-schema';
import {setMeditationTime} from '../../../lib/reminders/meditation-time';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';

/**
 * The meditation reminder's setting (Session W Part 5): a time on this device. Today shows a card once it has passed
 * (until a session is logged that day), and ZIGi may knock if knocking is on, outside its quiet hours. Device-only.
 */
export function MeditationReminderSetting() {
  const w = useDeviceRecord(W_REMINDERS), [note, setNote] = useState<{text: string; failed?: boolean} | null>(null);
  const time = w.data.meditation?.time ?? null;
  const save = (next: string | null, text: string) => { try { w.update(r => setMeditationTime(r, next)); setNote({text}); } catch (error) { setNote({text: `Not saved on this device. ${deviceSettingFailureMessage(error)}`, failed: true}); } };
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('time') ?? ''); if (!value) { setNote({text: 'Choose a time, or turn the reminder off.', failed: true}); return; } save(value, `Meditation reminder set for ${value} on this device.`); };
  if (!w.loaded) return null;
  if (w.unreadable) return <p className="fine" role="alert">This device’s reminders could not be read. They were not changed.</p>;
  return <form className="sleep-wind-down" onSubmit={submit} aria-label="Meditation reminder">
    <label className="field">Daily reminder (this device)<input type="time" name="time" defaultValue={time ?? '07:30'} key={time ?? 'none'}/></label>
    <div className="actions"><button type="submit" className="secondary">{time ? 'Change' : 'Set reminder'}</button>{time && <button type="button" className="text-link" onClick={() => save(null, 'Meditation reminder turned off.')}>Turn off</button>}</div>
    <p className="fine">{time ? `Today shows a card from ${time} until you have meditated that day.` : 'Off.'}</p>
    {note && <p role={note.failed ? 'alert' : 'status'}>{note.text}</p>}
  </form>;
}
