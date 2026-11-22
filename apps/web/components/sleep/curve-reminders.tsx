'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {energyReminders, NOTIFY_PREFS, setEnergyReminder, typeOn, type EnergyReminders} from '../../lib/notify/prefs';
import {DIP_AHEAD, WIND_DOWN_AHEAD} from '../../lib/notify/energy-items';
import type {EnergyCurve} from '../../lib/energy-curve/curve';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import '../health/sleep/av2-bodymind-sleep.css';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #235, Rise's energy schedule and its reminders; putting it on an outside calendar
 * is left out: it needs an outside service): under the energy curve, "Remind me from my curve" — the focus window's start,
 * 15 minutes before the likely dip, and the wind-down start (45 minutes before the suggested bedtime window). Each is off
 * until ticked; the times follow each day's curve. The notification comes from this device's notifications (Settings →
 * Notifications), which the card says plainly when they are off here; it never says a sleep figure.
 */
export default function CurveReminders({curve, clock}: {curve: EnergyCurve; clock: (m: number) => string}) {
  const prefs = useDeviceRecord(NOTIFY_PREFS), id = useId(), [said, setSaid] = useState('');
  if (!prefs.loaded) return null;
  const chosen = energyReminders(prefs.data), here = prefs.data.here === true, muted = !typeOn(prefs.data, 'energy');
  const rows: {key: keyof EnergyReminders; label: string; at: number}[] = [
    {key: 'focus', label: 'When the good focus window starts', at: curve.focus.from},
    {key: 'dip', label: `${DIP_AHEAD} minutes before the likely dip`, at: curve.dip.from - DIP_AHEAD},
    {key: 'windDown', label: 'When it is time to start winding down', at: curve.bedtime.from - WIND_DOWN_AHEAD},
  ];
  const change = (key: keyof EnergyReminders, on: boolean, label: string) => {
    try { prefs.update(p => setEnergyReminder(p, key, on)); setSaid(on ? `Reminder on: ${label.toLowerCase()}.` : `Reminder off: ${label.toLowerCase()}.`); }
    catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); }
  };
  const any = chosen.focus || chosen.dip || chosen.windDown;
  return <section className="curve-reminders" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Remind me from my curve</h3>
    <p className="fine">The times move with your wake time each day. Off until you tick one.</p>
    <ul>{rows.map(r => <li key={r.key}><label><input type="checkbox" checked={chosen[r.key]} onChange={e => change(r.key, e.target.checked, r.label)}/><span>{r.label} <span className="fine">(today <time>{clock(r.at)}</time>)</span></span></label></li>)}</ul>
    {any && !here && <p className="fine">Notifications are off on this device, so these cannot reach you yet. Turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {any && here && muted && <p className="fine">&ldquo;Energy curve and plan steps&rdquo; is switched off in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
