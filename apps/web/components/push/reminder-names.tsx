'use client';
import {useState} from 'react';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import {Switch} from '../ai/ai-switch';
import {useDeviceRecord} from '../ai/use-device-record';

/**
 * Session V Part 13 (owner-approved, ADR-014): with push on, the person may let notifications name the reminder. Off by
 * default; the names stay in a small table on this device that only its own notification code reads.
 */
export default function ReminderNames() {
  const options = useDeviceRecord(AI_OPTIONS), [error, setError] = useState('');
  if (!options.loaded) return null;
  const set = (on: boolean) => { try { options.update(current => ({...current, notificationNames: on})); setError(''); } catch { setError('This choice could not be saved on this device.'); } };
  return <div className="push-names">
    <Switch checked={options.data.notificationNames === true} onChange={set} label="Show what a reminder is for in notifications" note={<>Off: every notification says &ldquo;A reminder from ZIGoals&rdquo;. On: it names the habit, such as &ldquo;Reminder: Stretch&rdquo;. The names stay on this device, in a small table only this browser&rsquo;s notification code reads when a reminder arrives; the server and the push service never get them. Water and habits that tick themselves off from Health always keep the generic text.</>}/>
    {error && <p role="alert">{error}</p>}
  </div>;
}
