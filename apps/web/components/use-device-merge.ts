'use client';
import {useEffect, useState} from 'react';
import {getAppStorage} from '../lib/showcase-storage';
import {ensureDeviceRecordsMerged} from '../lib/sync-homes-store';

/**
 * Session U Part 9: once the module a record lives in has loaded, copies what this device's keys hold into it (once per
 * storage view; lib/sync-homes-store.ts), and says when that has settled, so a view never shows the record before its
 * device copy was merged. A failed merge settles too: the module's own data shows, and the next load tries again.
 */
export function useDeviceMerge(ready: boolean): boolean {
  const [settledFor, setSettledFor] = useState<Storage | null>(null);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    const storage = getAppStorage();
    queueMicrotask(() => { if (active) setSettledFor(null); });
    void ensureDeviceRecordsMerged(storage).finally(() => { if (active) setSettledFor(storage); });
    return () => { active = false; };
  }, [ready]);
  return settledFor !== null;
}
