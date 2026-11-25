'use client';
import {useEffect, useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTIFY_PREFS, taskAgainOf} from '../../lib/notify/prefs';
import {REMINDERS_PLAN, quietHours} from '../../lib/reminders-plan/schema';
import type {Again} from '../../lib/tasks/remind-again';

/**
 * Session AW (X1, LEDGER #438): what the in-app reminder rows need to repeat a reminder — this device's default repeat
 * (lib/notify/prefs.ts `taskAgain`) and the quiet hours that hold the repeats (the reminders plan's). Push is not needed:
 * the rows on Tasks, Today's tasks line and the Tasks card come back by themselves at each repeat.
 */
export function useRemindAgain(): {fallback: Again | null; quiet: {from: string; to: string}} {
  const prefs = useDeviceRecord(NOTIFY_PREFS), plan = useDeviceRecord(REMINDERS_PLAN);
  const fallback = taskAgainOf(prefs.data), quiet = quietHours(plan.data);
  const every = fallback?.every, times = fallback?.times;
  return useMemo(() => ({fallback: every && times ? {every, times} : null, quiet: {from: quiet.from, to: quiet.to}}), [every, times, quiet.from, quiet.to]);
}
/**
 * Session AW (X1, LEDGER #438): wakes the rows at `at` (the next ring, lib/tasks/reminders.ts nextRing), so a repeat shows
 * at its minute rather than at the rows' next half-minute look. One timer; a ring more than a day away waits for the look.
 */
export function useWakeAt(at: number | null, setNow: (now: number) => void): void {
  useEffect(() => {
    if (at === null) return;
    const ms = at - Date.now() + 50;
    if (ms > 86_400_000) return;
    const t = window.setTimeout(() => setNow(Date.now()), Math.max(0, ms));
    return () => window.clearTimeout(t);
  }, [at, setNow]);
}
