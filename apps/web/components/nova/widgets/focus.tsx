'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {FOCUS_SESSIONS} from '../../../lib/focus-sessions/schema';
import {gardenOf} from '../../../lib/focus-sessions/engine';
import {durationWords} from '../../../lib/nova/widgets/words';
import {useLocalToday} from '../../use-local-today';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/**
 * "Focus": this week's focus sessions (lib/focus-sessions) and a door to start one. A session runs on its own page (My
 * Universe's Focus Sessions), which counts only while that page is open and in front; NOVA never pretends to time it.
 */
export default function FocusWidget() {
  const record = useDeviceRecord(FOCUS_SESSIONS), today = useLocalToday();
  if (!record.loaded) return <NovaReading/>;
  if (record.unreadable) return <NovaUnread what="Your focus sessions"/>;
  const g = gardenOf(record.data, today);
  if (!g.weekSessions) return <NovaEmpty pillar="habits">No focus sessions this week yet. 15, 25 or 50 minutes, and something grows while you stay.</NovaEmpty>;
  return <div className="nova-focus">
    <p className="nova-big"><span className="nova-figure">{durationWords(g.weekMinutes)}</span><small> this week</small></p>
    <p className="nova-line">{g.weekSessions} {g.weekSessions === 1 ? 'session' : 'sessions'} · {g.grown} grown, {g.withered} withered in your garden.</p>
    <Link className="nova-chip-link" href="/app/journey#focus" prefetch={false}>Start another</Link>
  </div>;
}
