'use client';
import {useState} from 'react';
import type {Habit} from '../../lib/habits';
import {suggestHabitTime} from '../../lib/habit-time-suggest/suggest';
import {setHabitReminder} from '../../lib/reminders/store';
import {formatClock} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useReminders} from '../reminders/use-reminders';

/**
 * Session AK (F5b): "You usually check this in around 07:40", learned on this device from the habit's own same-day
 * check-ins (lib/habit-time-suggest). Offered with one button that sets this device's reminder to that time; never
 * applied without the tap, and "Not now" hides it until the page is opened again. Nothing is stored about the offer.
 */
export function TimeSuggest({habit, today, zone, keep}: {habit: Habit; today: string; zone: string; keep: ReadonlySet<string>}) {
  const reminders = useReminders(), [hidden, setHidden] = useState(false), [note, setNote] = useState('');
  const current = reminders.loaded && !reminders.unreadable ? reminders.data.habits[habit.id]?.time ?? null : null;
  const offer = reminders.loaded && !reminders.unreadable && !hidden ? suggestHabitTime(habit, zone, today, current) : null;
  if (note) return <p className="fine habit-time-suggest" role="status">{note}</p>;
  if (!offer) return null;
  return <div className="habit-time-suggest">
    <p className="fine">You usually check this in around {formatClock(offer.time)} ({offer.samples} times in the last six weeks, learned on this device).{current ? ` Your reminder is at ${formatClock(current)}.` : ''}</p>
    <div className="actions">
      <button type="button" className="quiet" onClick={() => { try { reminders.update(today, c => setHabitReminder(c, habit.id, offer.time, new Set([...keep, habit.id]))); setNote(`Reminder set for ${formatClock(offer.time)} on this device.`); } catch (e) { setNote(`Not saved on this device. ${deviceSettingFailureMessage(e)}`); } }}>Remind me at {formatClock(offer.time)}</button>
      <button type="button" className="quiet" onClick={() => setHidden(true)}>Not now</button>
    </div>
  </div>;
}
