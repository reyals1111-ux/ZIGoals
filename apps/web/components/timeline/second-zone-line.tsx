'use client';
import {useEffect, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {UI_PREFS} from '../../lib/ui-prefs/schema';
import {zoneClock, zoneDifference, zoneName} from '../../lib/agenda/second-zone';
import {formatClock} from '../../lib/visual-format';

/**
 * Session AV lane 2 (r5-plan, LEDGER #357; Akiflow's secondary time zone), on the Day Timeline, its own chunk: when a second
 * zone is chosen (on the Agenda's hour grid), the time there now and each shown part of the day in its hours. Nothing when
 * none is chosen. A read only.
 */
const two = (n: number) => String(n).padStart(2, '0');
const clockOf = (m: number) => `${two(Math.floor(Math.min(m, 1439) / 60))}:${two(Math.min(m, 1439) % 60)}`;
export default function SecondZoneLine({date, today, bands}: {date: string; today: string; bands: readonly {label: string; from: number; to: number}[]}) {
  const prefs = useDeviceRecord(UI_PREFS), [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(t); }, []);
  const zone = prefs.loaded && !prefs.unreadable ? prefs.data.secondZone : undefined;
  if (!zone) return null;
  const here = `${two(now.getHours())}:${two(now.getMinutes())}`, there = date === today ? zoneClock(today, here, zone) : null;
  const parts = bands.map(b => { const a = zoneClock(date, clockOf(b.from), zone), z = zoneClock(date, clockOf(b.to), zone); return a && z ? `${b.label} is ${formatClock(a.clock)}–${formatClock(z.clock)} there` : null; }).filter(Boolean);
  return <p className="fine timeline-fine timeline-zone" role="note">In {zoneName(zone)} ({zoneDifference(date, zone)}){there ? `, it is ${formatClock(there.clock)} now` : ''}.{parts.length ? ` ${parts.join('; ')}.` : ''}</p>;
}
