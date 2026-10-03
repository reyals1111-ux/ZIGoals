'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {dueReminders, type DueReminder} from '../../lib/reminders/due';
import {dismissForToday} from '../../lib/reminders/store';
import {useReminders} from './use-reminders';
import './reminders.css';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/**
 * Reminder cards on Today (Session I, Part 8): in-app only (no notification, no permission), from the times set on
 * this device. A card stays until its habit is done or it is dismissed for today; the clock is checked each half minute.
 */
export function ReminderCards({habits, health}: {habits?: HabitData; health?: HealthData}) {
  const reminders = useReminders(), [now, setNow] = useState<Date | null>(null), [error, setError] = useState('');
  useEffect(() => {
    const tick = () => setNow(new Date());
    queueMicrotask(tick);
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!reminders.loaded || !now) return null;
  const due = dueReminders({reminders: reminders.data, habits, health, now});
  if (!due.length && !error) return null;
  const dismiss = (reminder: DueReminder) => {
    try { reminders.update(reminder.day, current => dismissForToday(current, reminder.id, reminder.day)); setError(''); }
    catch (error) { setError(`This reminder was not dismissed on this device. ${deviceSettingFailureMessage(error)}`); }
  };
  return <section className="reminder-cards" aria-label="Reminders on this device">
    {due.map(reminder => <article key={reminder.id} className="panel reminder-card" aria-label={`Reminder: ${reminder.title}`}>
      <p className="eyebrow">Reminder · {reminder.time} · on this device</p>
      <h2>{reminder.kind === 'water' ? 'Time for some water' : reminder.title}</h2>
      <p>{reminder.kind === 'water' ? 'Nothing is logged yet today, or it is still below your target.' : 'Not done yet today.'}</p>
      <div className="reminder-card-actions">
        <Link className="secondary" href={reminder.href}>{reminder.kind === 'water' ? 'Open water journal' : 'Open habit'}</Link>
        <button type="button" className="quiet" onClick={() => dismiss(reminder)}>Dismiss for today</button>
      </div>
    </article>)}
    {error && <p role="alert" className="notice">{error}</p>}
  </section>;
}
