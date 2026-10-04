'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {isShowcase} from '../../lib/showcase-storage';
import {pushSupport} from '../../lib/push/support';
import {pushBuildAvailability} from '../push/use-push';
import './reminders.css';
import '../push/push.css';

/** True while this build has push configured and this browser could use it (ADR-010); false in Showcase. */
function usePushOffer() {
  const [offer, setOffer] = useState(false);
  useEffect(() => {
    let active = true;
    if (isShowcase() || pushSupport() === 'unsupported') return;
    void pushBuildAvailability().then(a => { if (active) setOffer(a.available); });
    return () => { active = false; };
  }, []);
  return offer;
}
/** "Reminder time — on this device": an optional 24-hour time; empty means no reminder. */
export function ReminderTimeField({value, onChange, disabled, note}: {value: string; onChange: (value: string) => void; disabled?: boolean; note?: string}) {
  const offer = usePushOffer();
  return <label className="field reminder-time-field">
    <span>Reminder time — on this device</span>
    <input type="time" step={60} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />
    <small>{note ?? 'After this time, Today shows a reminder card while this is not done. Kept on this device only, never synced; leave empty for none.'}</small>
    {offer && <small className="reminder-offer"><Link href="/app/settings#reminders">Get this on your phone even when ZIGoals is closed → Settings</Link></small>}
  </label>;
}
