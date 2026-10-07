'use client';
import Link from 'next/link';
import {Suspense, lazy, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {ZIGI_REMINDERS_KEY, ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import {dueReminders, type DueReminder} from '../../lib/reminders/due';
import {dismissForToday} from '../../lib/reminders/store';
import {useReminders} from './use-reminders';
import {useDeviceRecord} from '../ai/use-device-record';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {dismissWindDown, windDownDue} from '../../lib/reminders/wind-down';
import {healthGroupIn} from '../../lib/vault/w-homes';
import './reminders.css';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';

/**
 * Reminder cards on Today (Session I, Part 8): in-app only (no notification, no permission), from the times set on
 * this device. A card stays until its habit is done or it is dismissed for today; the clock is checked each half minute.
 * Session V Part 13: ZIGi's own weekly reminders (goal check-ins, a look at Wealth, a new context pack) join them,
 * loaded only on a device that has some.
 */
const ZigiReminderCards = lazy(() => import('./zigi-reminder-cards'));
function useHasZigiReminders(): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    const read = () => { try { setHas(getAppStorage().getItem(ZIGI_REMINDERS_KEY) !== null); } catch { setHas(false); } };
    read();
    const onSaved = (event: Event) => { if ((event as CustomEvent<string>).detail === ZIGI_REMINDERS_KEY) read(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, []);
  return has;
}
export function ReminderCards({habits, health}: {habits?: HabitData; health?: HealthData}) {
  const reminders = useReminders(), [now, setNow] = useState<Date | null>(null), [error, setError] = useState(''), zigi = useHasZigiReminders(), wReminders = useDeviceRecord(W_REMINDERS);
  useEffect(() => {
    const tick = () => setNow(new Date());
    queueMicrotask(tick);
    const timer = window.setInterval(tick, 30_000);
    // The push-only service worker (ADR-010) posts this when a reminder arrives while the app is open.
    const onMessage = (event: MessageEvent) => { if (event.data?.type === 'zigoals:push-reminder') tick(); };
    const worker = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    worker?.addEventListener('message', onMessage);
    return () => { window.clearInterval(timer); worker?.removeEventListener('message', onMessage); };
  }, []);
  if (!reminders.loaded || !now) return null;
  const due = dueReminders({reminders: reminders.data, habits, health, now});
  // Session W Part 4: the wind-down time, until a night is running (Health → Sleep).
  const windDown = wReminders.loaded && !wReminders.unreadable ? windDownDue({w: wReminders.data, running: !!health && (healthGroupIn(health, 'sleep')?.nights ?? []).some(n => n.end === null), now}) : null;
  if (!due.length && !windDown && !zigi && !error) return null;
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
    {windDown && <article className="panel reminder-card" aria-label="Reminder: Wind-down time">
      <p className="eyebrow">Reminder · {windDown.time} · on this device</p>
      <h2>Time to wind down</h2>
      <p>Your wind-down time. When you go to bed, tap “I’m going to bed” in Sleep.</p>
      <div className="reminder-card-actions">
        <Link className="secondary" href={windDown.href}>Open Sleep</Link>
        <button type="button" className="quiet" onClick={() => { try { wReminders.update(r => dismissWindDown(r, windDown.day)); setError(''); } catch (error) { setError(`This reminder was not dismissed on this device. ${deviceSettingFailureMessage(error)}`); } }}>Not tonight</button>
      </div>
    </article>}
    {zigi && <Suspense fallback={null}><ZigiReminderCards now={now} onError={setError}/></Suspense>}
    {error && <p role="alert" className="notice">{error}</p>}
  </section>;
}
