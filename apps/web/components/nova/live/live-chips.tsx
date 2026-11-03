'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useHabits} from '../../habits/use-habits';
import {useFasting} from '../../health/use-fasting';
import {useSleep} from '../../health/sleep/use-sleep';
import {useMeditation} from '../../health/meditation/use-meditation';
import {usePomodoro} from '../../focus/use-pomodoro';
import {runningNights} from '../../../lib/sleep/engine';
import {liveActivities, liveName, ticksBySecond, type LiveActivity} from '../../../lib/nova/live-activity';
import './live-chips.css';

/**
 * Session AK lane P1 (owner follow-up 2 M3, "live activity chips"; WIRING_AUDIT_2 row M3): NOVA's "Running now" — one
 * chip for each thing running on this device (a Pomodoro, a meditation or breathing session, a habit's timer, a fast, a
 * night in bed), with its time, and a link to the page where it is paused or ended. Nothing runs: nothing shows (the
 * status chips above say what NOVA is; these say what the person's day is doing now). Read only; loaded with NOVA's page
 * (lazy, its own chunk), never in the app's shell. No motion: the time is plain text that moves on each second only while
 * a clock with seconds runs (each half minute otherwise) and only while the page is in front; it is not announced on each
 * tick (no live region), and each chip names itself in full for assistive technology. Every chip is at least 44 px tall.
 */
export function LiveChipList({items}: {items: readonly LiveActivity[]}) {
  if (!items.length) return null;
  return <ul className="nova-chips nova-live" aria-label="Running now">
    {items.map(item => <li key={item.id}>
      <Link className="nova-chip nova-live-chip" data-live={item.kind} data-paused={item.paused || undefined} href={item.href} prefetch={false} aria-label={liveName(item)}>
        <span className="nova-live-dot" aria-hidden="true"/>
        <span><span className="nova-chip-key">{item.label}</span> <span className="nova-live-time">{item.value}</span></span>
      </Link>
    </li>)}
  </ul>;
}

export default function NovaLive() {
  const pomodoro = usePomodoro(), meditation = useMeditation(), habits = useHabits(), fasting = useFasting(), sleep = useSleep();
  const [now, setNow] = useState(() => Date.now());
  const night = sleep.loaded && !sleep.error ? runningNights(sleep.sleep)[0] ?? null : null;
  const items = useMemo(() => liveActivities({
    now: Math.max(now, pomodoro.now),
    pomodoro: pomodoro.run,
    meditation: meditation.loaded && !meditation.runUnreadable ? meditation.run.data.run : null,
    habits: habits.loaded && !habits.error ? habits.data.habits : null,
    fast: fasting.loaded && !fasting.unreadable ? fasting.running ?? null : null,
    night,
  }), [now, pomodoro.now, pomodoro.run, meditation.loaded, meditation.runUnreadable, meditation.run.data.run, habits.loaded, habits.error, habits.data.habits, fasting.loaded, fasting.unreadable, fasting.running, night]);
  const running = items.length > 0, seconds = ticksBySecond(items);
  useEffect(() => {
    if (!running) return;
    const tick = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    tick();
    const timer = window.setInterval(tick, seconds ? 1000 : 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [running, seconds]);
  return <LiveChipList items={items}/>;
}
