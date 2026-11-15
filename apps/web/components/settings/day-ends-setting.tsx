'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {DAY_END_CHOICES, DAY_ENDS_RECORD, chooseDayEnd, dayEndLabel} from '../../lib/day-boundary';

/**
 * Session AO (C-DVG-22, C-NB-28, N-NB-11): "My day ends at" in Settings → Your app, beside the time zone. Habits, the
 * Checklist and streaks count until the chosen time (midnight by default). Owner rule 1's line is said under the choice.
 */
export function DayEndsSetting() {
  const id = useId(), record = useDeviceRecord(DAY_ENDS_RECORD), [status, setStatus] = useState('');
  const value = record.data.endsAt;
  return <section className="panel" id="day-ends" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">YOUR DAY</p>
    <h2 id={`${id}-title`}>My day ends at</h2>
    <p className="fine">For night owls: habits, the Checklist and streaks count for the day until this time, on this device.</p>
    <label className="field" htmlFor={`${id}-select`}>
      <span>My day ends at</span>
      <select id={`${id}-select`} value={value} disabled={!record.loaded} aria-describedby={`${id}-rule`} onChange={event => {
        const next = Number(event.target.value);
        try { record.update(current => chooseDayEnd(current, next)); setStatus(next === 0 ? 'Your day ends at midnight.' : `Your day now ends at ${dayEndLabel(next)}.`); }
        catch { setStatus('Could not save this choice on this device.'); }
      }}>
        {DAY_END_CHOICES.map(m => <option key={m} value={m}>{dayEndLabel(m)}{m === 0 ? ' (default)' : ''}</option>)}
      </select>
    </label>
    <p className="fine" id={`${id}-rule`}>Changing it never moves or recounts past days: it applies from now on, and the day in progress keeps the later end, so the change alone never breaks a streak.</p>
    {record.unreadable && <p className="fine" role="alert">This device&rsquo;s choice could not be read, so your day ends at midnight.</p>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </section>;
}
