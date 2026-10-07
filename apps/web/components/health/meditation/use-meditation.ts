'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useSharedHealth} from '../../use-shared-health';
import {useJournalZone} from '../../use-journal-zone';
import {useDeviceZone} from '../../use-device-zone';
import {useDeviceRecord} from '../../ai/use-device-record';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {updateHealthGroup} from '../../../lib/w-homes-store';
import {emptyMeditation, MEDITATION_RUN, type Meditation} from '../../../lib/meditation/schema';
import {dailyData} from '../../../lib/health-daily';
import {wallClock} from '../../../lib/zone-time';

/**
 * Meditation in a component (Session W Part 5): the Health v4 `meditation` group from the one shared Health read, written
 * through the W homes store, and this device's running session (`zigoals:meditation-run:v1`). `zone` is where new
 * sessions are lived (Health zone → journal zone → this device's). `now` ticks every second while a session runs and the
 * page is visible, and every minute otherwise; the clock itself is always worked out from instants.
 */
export function useMeditation() {
  const health = useSharedHealth(), journal = useJournalZone().zone, device = useDeviceZone(), run = useDeviceRecord(MEDITATION_RUN);
  const meditation = useMemo<Meditation>(() => health.loaded && !health.error ? healthGroupIn(health.data, 'meditation') ?? emptyMeditation() : emptyMeditation(), [health]);
  const zone = dailyData(health.data).preferences.timezone ?? journal ?? device ?? 'UTC';
  const running = !!run.data.run, [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    const timer = window.setInterval(tick, running ? 1000 : 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [running]);
  const update = useCallback((change: (current: Meditation) => Meditation) => updateHealthGroup('meditation', change), []);
  return {loaded: health.loaded && run.loaded, error: health.error, runUnreadable: run.unreadable, meditation, update, run, zone, now, today: wallClock(now, zone).date};
}
export type MeditationStore = ReturnType<typeof useMeditation>;
