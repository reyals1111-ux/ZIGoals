'use client';
import {useEffect, useMemo, useState} from 'react';
import type {HealthTargets} from '../../../lib/health';
import {DEVICE_RECORD_EVENT, FOOD_PLUS_STORAGE_KEY, coachPrefsOf, dayTargets, sugarAlcoholsOf, weekdayTargetsOf, type CoachPrefs, type WeekdayTargets} from '../../../lib/food-plus/day-target';
import {extraMealsOf, type ExtraMeals} from '../../../lib/food-plus/extra-meals-lite';
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

/** The food-plus record's stored text, re-read as useDayTargets reads it (null until after mount). */
function useFoodPlusText(): string | null {
  const [raw, setRaw] = useState<string | null>(null);
  useEffect(() => {
    const read = () => { try { setRaw(getAppStorage().getItem(FOOD_PLUS_STORAGE_KEY)); } catch { setRaw(null); } };
    queueMicrotask(read);
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.endsWith(FOOD_PLUS_STORAGE_KEY)) read(); };
    window.addEventListener(DEVICE_RECORD_EVENT, read); window.addEventListener('storage', onStorage); window.addEventListener('zigoals:account-change', read);
    return () => { window.removeEventListener(DEVICE_RECORD_EVENT, read); window.removeEventListener('storage', onStorage); window.removeEventListener('zigoals:account-change', read); };
  }, []);
  return raw;
}
/** Session AV lane 2 (food, LEDGER #106, #107): the coach's choices (check-in day, partly logged days, pace). */
export function useCoachPrefs(): CoachPrefs { return coachPrefsOf(useFoodPlusText()); }
/** Session AV lane 2 (food, LEDGER #197): the person's extra diary meals and which entries are in them (none until read). */
export function useExtraMeals(): ExtraMeals { const raw = useFoodPlusText(); return useMemo(() => extraMealsOf(raw), [raw]); }
