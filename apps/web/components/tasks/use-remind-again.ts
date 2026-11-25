'use client';
import {useMemo} from 'react';
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
