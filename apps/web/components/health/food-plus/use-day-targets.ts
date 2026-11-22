'use client';
import {useEffect, useState} from 'react';
import type {HealthTargets} from '../../../lib/health';
import {DEVICE_RECORD_EVENT, FOOD_PLUS_STORAGE_KEY, dayTargets, sugarAlcoholsOf, weekdayTargetsOf, type WeekdayTargets} from '../../../lib/food-plus/day-target';
import {getAppStorage} from '../../../lib/showcase-storage';

/**
 * Session AV lane 2 (food, LEDGER #88, #97): the day's targets (and the sugar alcohols set per food, for net carbs) for
 * Health's summary and Today's Health module — the
 * Targets' own until the device record is read after mount, then with that weekday's values. Re-read on a save anywhere
 * on the page, in another tab or after an account change, like useDeviceRecord (no schema in the first chunk).
 */
export function useDayTargets(base: HealthTargets, date: string) {
  const [lite, setLite] = useState<{weekdays: WeekdayTargets; sugarAlcohols: Record<string, number>}>({weekdays: {}, sugarAlcohols: {}});
  useEffect(() => {
    const read = () => { try { const raw = getAppStorage().getItem(FOOD_PLUS_STORAGE_KEY); setLite({weekdays: weekdayTargetsOf(raw), sugarAlcohols: sugarAlcoholsOf(raw)}); } catch { setLite({weekdays: {}, sugarAlcohols: {}}); } };
    queueMicrotask(read);
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.endsWith(FOOD_PLUS_STORAGE_KEY)) read(); };
    window.addEventListener(DEVICE_RECORD_EVENT, read); window.addEventListener('storage', onStorage); window.addEventListener('zigoals:account-change', read);
    return () => { window.removeEventListener(DEVICE_RECORD_EVENT, read); window.removeEventListener('storage', onStorage); window.removeEventListener('zigoals:account-change', read); };
  }, []);
  return {targets: dayTargets(base, date, lite.weekdays), sugarAlcohols: lite.sugarAlcohols};
}
