'use client';
import {useEffect, useState} from 'react';
import {getAppStorage} from '../lib/showcase-storage';
import {ensureDeviceRecordsMerged} from '../lib/sync-homes-store';

/**
 * Session U Part 9: once the module a record lives in has loaded, copies what this device's keys hold into it (once per
 * storage view; lib/sync-homes-store.ts), and says when that has settled, so a view never shows the record before its
 * device copy was merged. A failed merge settles too: the module's own data shows, and the next load tries again.
 *
 * The account can lock between the module's read and this effect (a remembered device reopening while Settings verifies
 * the session, Session W). Nothing is merged then and the hook settles as after a failed merge; the account's next load
 * merges. Throwing out of the effect instead took the whole page down.
 */
export function useDeviceMerge(ready: boolean): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let active = true, storage: Storage | null = null;
    try { storage = getAppStorage(); } catch { /* locked or refused: settles without a merge */ }
    queueMicrotask(() => { if (active) setSettled(false); });
    void (storage ? ensureDeviceRecordsMerged(storage) : Promise.resolve(false)).finally(() => { if (active) setSettled(true); });
    return () => { active = false; };
  }, [ready]);
  return settled;
}
