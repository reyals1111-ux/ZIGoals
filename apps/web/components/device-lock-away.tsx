'use client';
import {useEffect, useId, useState} from 'react';
import {AWAY_CHOICES, readLockAway, writeLockAway, type AwayMinutes} from '../lib/device-lock-away';

/**
 * Session AV lane 2 (r6-notes; LEDGER #406, Diarium): Settings → Screen cover → "Lock again after a while away" (lazy,
 * shown only while a lock is on). Never (as before), or 5, 15 or 60 minutes: when ZIGoals comes back after being hidden
 * that long, the same screen cover asks for the same PIN. Kept on this device only; it never weakens the lock.
 */
const local = () => { try { return window.localStorage; } catch { return null; } };
export default function DeviceLockAway() {
  const [minutes, setMinutes] = useState<AwayMinutes | null>(null), [said, setSaid] = useState(''), id = useId();
  useEffect(() => { setMinutes(readLockAway(local())); }, []);
  const choose = (v: string) => {
    const next = v ? Number(v) as AwayMinutes : null;
    try { const s = local(); if (!s) throw new Error('no storage'); writeLockAway(s, next); setMinutes(next); window.dispatchEvent(new Event('zigoals-device-lock')); setSaid(next ? `ZIGoals covers itself again after ${next} minutes away; the same PIN opens it.` : 'The cover waits for a new tab or window again, as before.'); }
    catch { setSaid('This browser could not keep the choice. Nothing changed.'); }
  };
  return <div className="device-lock-away">
    <label className="field">Lock again after a while away<select value={minutes ?? ''} onChange={e => choose(e.target.value)} aria-describedby={`${id}-h`}>
      <option value="">Never: only a new tab or window asks</option>
      {AWAY_CHOICES.map(m => <option key={m} value={m}>After {m} minutes away</option>)}
    </select></label>
    <p className="fine" id={`${id}-h`}>When ZIGoals has been hidden that long — another app, another tab, the screen off — it asks for your PIN when you come back. A new tab or window still asks as before.</p>
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
