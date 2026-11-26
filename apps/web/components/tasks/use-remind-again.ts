'use client';
import {useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {dueReminders, type DueReminder} from '../../lib/tasks/reminders';
import type {Again} from '../../lib/tasks/remind-again';
import type {Tasks} from '../../lib/tasks/schema';

/**
 * Session AW Part 2 (speed, attempt 2): the repeats' own chunk (components/tasks/remind-again-read.ts: the rings and the two
 * records they follow), asked for as soon as a page that shows reminder rows runs in a browser, so it is there by the time
 * the tasks are read; until then the rows are the ones without repeats, as before Session AW, and nothing waits for a ring.
 */
type Rings = typeof import('./remind-again-read');
const loadRings = () => import('./remind-again-read');
const ringsChunk: Promise<Rings> | null = typeof window === 'undefined' ? null : loadRings();
let ringsHere: Rings | null = null;
void ringsChunk?.then(m => { ringsHere = m; }, () => {});

export type RemindAgain = {fallback: Again | null; quiet: {from: string; to: string}; rings: Rings | null};
const NONE: RemindAgain = {fallback: null, quiet: {from: '22:00', to: '08:00'}, rings: null};
const same = (a: RemindAgain, b: RemindAgain) => a.rings === b.rings && a.fallback?.every === b.fallback?.every && a.fallback?.times === b.fallback?.times && a.quiet.from === b.quiet.from && a.quiet.to === b.quiet.to;
/**
 * Session AW (X1, LEDGER #438): what the in-app reminder rows need to repeat a reminder — this device's default repeat
 * (lib/notify/prefs.ts `taskAgain`) and the quiet hours that hold the repeats (the reminders plan's). Push is not needed:
 * the rows on Tasks, Today's tasks line and the Tasks card come back by themselves at each repeat. Read after mount and
 * again after a save anywhere on the page, a change in another tab or an account change (as useDeviceRecord does).
 */
export function useRemindAgain(): RemindAgain {
  const [state, setState] = useState<RemindAgain>(NONE);
  useEffect(() => {
    let on = true, rings: Rings | null = ringsHere;
    const read = () => { if (!on || !rings) return; const next = {...rings.readAgain(), rings}; setState(prev => same(prev, next) ? prev : next); };
    if (rings) queueMicrotask(read);
    else void (ringsChunk ?? loadRings()).then(m => { ringsHere = rings = m; read(); }, () => {});
    const onSaved = (event: Event) => { const key = (event as CustomEvent<string>).detail; if (!key || rings?.AGAIN_KEYS.includes(key)) read(); };
    const onStorage = (event: StorageEvent) => { if (!event.key || rings?.AGAIN_KEYS.some(k => event.key!.endsWith(k))) read(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { on = false; window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, []);
  return state;
}
/** The reminder rows to show now: with their repeats once components/tasks/remind-again-read.ts is here, else as before Session AW. */
export function remindersDue(again: RemindAgain, record: Tasks, nowMs: number, zone: string, dismissed: ReadonlySet<string>): DueReminder[] {
  return again.rings ? again.rings.dueReminders(record, nowMs, zone, {dismissed, again}) : dueReminders(record, nowMs, zone, {dismissed});
}
/** The next ring still ahead (lib/tasks/reminder-rings.ts nextRing), or null until that chunk is here. */
export const ringAhead = (again: RemindAgain, record: Tasks, nowMs: number, zone: string): number | null => again.rings ? again.rings.nextRing(record, nowMs, zone, again) : null;
/**
 * Session AW (X1, LEDGER #438): wakes the rows at `at` (the next ring, lib/tasks/reminder-rings.ts nextRing), so a repeat
 * shows at its minute rather than at the rows' next half-minute look. One timer; a ring more than a day away waits for the look.
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
