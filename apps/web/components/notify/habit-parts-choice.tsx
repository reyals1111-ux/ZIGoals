'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTIFY_PREFS} from '../../lib/notify/prefs';
import {HABIT_PARTS, PART_WORDS, habitPartsOn, partTime, setHabitParts} from '../../lib/notify/habit-parts';
import {REMINDERS_PLAN, quietHours} from '../../lib/reminders-plan/schema';
import {inQuiet} from '../../lib/notify/zone';
import {formatClock} from '../../lib/visual-format';
import {NOTIFY_CHANGE} from './notify-sync';

/**
 * Session AV lane 2 (r5-body; Productive's reminders for each part of the day; LEDGER #369; TIER 3 (PWA)): under "Habits
 * due" in Settings → Notifications, "One reminder for each part of the day" — off unless chosen; the start of the morning,
 * the afternoon and the evening (times the person sets). Its own chunk.
 */
export default function HabitPartsChoice() {
  const prefs = useDeviceRecord(NOTIFY_PREFS), plan = useDeviceRecord(REMINDERS_PLAN), id = useId(), [said, setSaid] = useState('');
  if (!prefs.loaded) return null;
  const on = habitPartsOn(prefs.data), quiet = quietHours(plan.data);
  const save = (change: Parameters<typeof setHabitParts>[1], text: string) => {
    try { prefs.update(p => setHabitParts(p, change)); window.dispatchEvent(new Event(NOTIFY_CHANGE)); setSaid(text); } catch { setSaid('This choice could not be saved on this device.'); }
  };
  return <fieldset className="notify-parts" aria-describedby={`${id}-note`}>
    <legend>Habit reminders</legend>
    <label className="checkbox"><input type="checkbox" checked={on} disabled={prefs.unreadable} onChange={e => save({on: e.currentTarget.checked}, e.currentTarget.checked ? 'One reminder for each part of the day, in place of one per habit.' : 'Back to one reminder per habit, at each habit’s time.')}/><span>One reminder for each part of the day</span></label>
    <small id={`${id}-note`} className="fine">At the start of the morning, the afternoon and the evening: how many of that part’s habits are still open, their names only if names are on. Habits in a part then have no reminder of their own; Anytime habits keep theirs. Quiet hours apply.</small>
    {on && <div className="notify-times">{HABIT_PARTS.map(part => { const time = partTime(prefs.data, part); return <label key={part} className="field"><span>{PART_WORDS[part]} starts at</span>
      <input type="time" step={60} value={time} onChange={e => { if (e.target.value) save({[part]: e.target.value}, `${PART_WORDS[part]} reminder at ${formatClock(e.target.value)}.`); }}/>
      {inQuiet(time, quiet) && <small className="fine">Inside your quiet hours, so it will not ring.</small>}
    </label>; })}</div>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </fieldset>;
}
