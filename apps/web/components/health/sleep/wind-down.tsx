'use client';
import {useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {W_REMINDERS} from '../../../lib/reminders/w-schema';
import {setWindDown} from '../../../lib/reminders/wind-down';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';

/**
 * The wind-down reminder's setting (Session W Part 4): a time on this device. Today shows a card once it has passed, and
 * ZIGi may knock if knocking is on (never in its quiet hours, 22:00 to 08:00 by default). Device-only, never synced.
 */
export function WindDownSetting() {
  const w = useDeviceRecord(W_REMINDERS), [note, setNote] = useState<{text: string; failed?: boolean} | null>(null);
  const time = w.data.windDown?.time ?? null;
  const save = (next: string | null, text: string) => { try { w.update(r => setWindDown(r, next)); setNote({text}); } catch (error) { setNote({text: `Not saved on this device. ${deviceSettingFailureMessage(error)}`, failed: true}); } };
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const value = String(new FormData(e.currentTarget).get('time') ?? ''); if (!value) { setNote({text: 'Choose a time, or turn the reminder off.', failed: true}); return; } save(value, `Wind-down reminder set for ${value} on this device.`); };
  if (!w.loaded) return null;
  if (w.unreadable) return <p className="fine" role="alert">This device’s reminders could not be read. They were not changed.</p>;
  return <form className="sleep-wind-down" onSubmit={submit} aria-label="Wind-down reminder">
    <label className="field">Wind-down reminder (this device)<input type="time" name="time" defaultValue={time ?? '22:00'} key={time ?? 'none'}/></label>
    <div className="actions"><button type="submit" className="secondary">{time ? 'Change' : 'Set reminder'}</button>{time && <button type="button" className="text-link" onClick={() => save(null, 'Wind-down reminder turned off.')}>Turn off</button>}</div>
    <p className="fine">{time ? `Today shows a card from ${time} until you go to bed.` : 'Off.'} ZIGi can knock too if you turned knocking on, outside its quiet hours.</p>
    {note && <p role={note.failed ? 'alert' : 'status'}>{note.text}</p>}
  </form>;
}
