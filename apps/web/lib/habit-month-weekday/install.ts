import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {setHabitScheduleOverlay} from '../habits';
import {getAppStorage} from '../showcase-storage';
import {isMonthWeekday, monthWeekdayLabel, overlayApplies, readMonthWeekdays, scheduleIsItsWeekday, type MonthWeekday} from './rule';

/**
 * Session AK F0 (5.1): hands the habit engine the "which one of the month" overlay from this device's habit extras
 * (the Showcase's own copy in a Showcase tab). Installed once in the browser by the habits store (components/habits/
 * use-habits.ts); the engine stays pure and, on the server and in tests, has no overlay (every build's reading).
 * The map is read again at most every 300 ms, and at once after `refreshMonthWeekdays()` (the editor's save).
 */
let cache: {at: number; raw: string | null; map: Record<string, MonthWeekday>} | null = null, version = 0;
function current(): Record<string, MonthWeekday> {
  const now = Date.now();
  if (cache && now - cache.at < 300) return cache.map;
  let raw: string | null = null;
  try { raw = getAppStorage().getItem(HABIT_EXTRAS_KEY); } catch { raw = null; }
  if (cache && cache.raw === raw) { cache.at = now; return cache.map; }
  let map: Record<string, MonthWeekday> = {};
  try { map = raw ? readMonthWeekdays(JSON.parse(raw)) : {}; } catch { map = {}; }
  cache = {at: now, raw, map}; version++;
  return map;
}
export function refreshMonthWeekdays(): void { cache = null; }
let installed = false;
export function installMonthWeekdayOverlay(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  setHabitScheduleOverlay({
    allows: (id, schedule, date) => { const rule = current()[id]; return !rule || !overlayApplies(rule, schedule, date) || isMonthWeekday(rule, date); },
    version: () => { current(); return version; },
    label: (id, schedule) => { const rule = current()[id]; return rule && scheduleIsItsWeekday(rule, schedule) ? monthWeekdayLabel(rule) : null; },
  });
}
