'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSharedHealth} from '../../use-shared-health';
import {useJournalZone} from '../../use-journal-zone';
import {useDeviceZone} from '../../use-device-zone';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {updateHealthGroup} from '../../../lib/w-homes-store';
import {emptySleep, type Sleep} from '../../../lib/sleep/schema';
import {dailyData} from '../../../lib/health-daily';
import {wallClock} from '../../../lib/zone-time';

/**
 * Sleep in a component (Session W Part 4): the Health v4 `sleep` group from the one shared Health read, written through
 * the W homes store (Health's storage lock; the module moves to v4 only when sleep first gets content). `zone` is where
 * new nights are lived: the Health zone, then the journal zone, then this device's. `now` ticks each minute while the
 * page is visible, so a running night's length moves on.
 */
export function useSleep() {
  const health = useSharedHealth(), journal = useJournalZone().zone, device = useDeviceZone();
  const sleep = useMemo<Sleep>(() => health.loaded && !health.error ? healthGroupIn(health.data, 'sleep') ?? emptySleep() : emptySleep(), [health]);
  const zone = dailyData(health.data).preferences.timezone ?? journal ?? device ?? 'UTC';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  const update = useCallback((change: (current: Sleep) => Sleep) => updateHealthGroup('sleep', change), []);
  return {loaded: health.loaded, error: health.error, sleep, update, zone, now, today: wallClock(now, zone).date, health: health.data};
}
export type SleepStore = ReturnType<typeof useSleep>;
