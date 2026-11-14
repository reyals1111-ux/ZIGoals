'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {DAY_GOAL_RECORD, chooseDayGoal, needOn} from '../../lib/checklist/day-goal';
import {checklistDay} from '../../lib/checklist/day';

/**
 * Session AP (owner decision 14 Nov, backlog #3; ADR-040): "A day counts as done at N", in Settings → Your app → Checklist.
 * Off by default (every dot, the Checklist's rule as before). The flame and Journey's orbit badges count a day by the rule
 * in force on that day; a change applies from today on and never re-counts a past day (said under the choice).
 */
const CHOICES = Array.from({length: 12}, (_, i) => i + 1);
export default function DayGoalSetting() {
  const id = useId(), record = useDeviceRecord(DAY_GOAL_RECORD), [status, setStatus] = useState('');
  const today = checklistDay(), need = needOn(record.data, today);
  return <div className="day-goal-setting">
    <label className="field" htmlFor={`${id}-select`}>
      <span>A day counts as done at</span>
      <select id={`${id}-select`} value={need === null ? 'all' : String(need)} disabled={!record.loaded} aria-describedby={`${id}-rule`} onChange={event => {
        const next = event.target.value === 'all' ? null : Number(event.target.value);
        try {
          record.update(current => chooseDayGoal(current, checklistDay(), next));
          setStatus(next === null ? 'A day counts as done when every dot is lit.' : `From today, a day counts as done at ${next} ${next === 1 ? 'dot' : 'dots'} (or every dot on a shorter day).`);
        } catch (error) { setStatus(error instanceof Error && /too many/.test(error.message) ? error.message : 'Could not save this choice on this device.'); }
      }}>
        <option value="all">Every dot (default)</option>
        {CHOICES.map(n => <option key={n} value={n}>{n} {n === 1 ? 'dot' : 'dots'}</option>)}
      </select>
    </label>
    <p className="fine" id={`${id}-rule`}>For example, at 4 a day with six dots counts once four are lit (&ldquo;4 of 6&rdquo;), and a day with three dots once all three are. It applies from today on: past days keep the rule they had, so nothing already counted changes. Your streak flame and Journey&rsquo;s orbit badges follow it; a Perfect orbit still needs every dot in order.</p>
    {record.unreadable && <p className="fine" role="alert">This device&rsquo;s choice could not be read, so a day counts when every dot is lit.</p>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </div>;
}
