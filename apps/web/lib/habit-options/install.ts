import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {setHabitDayOverlay} from '../habits';
import {getAppStorage} from '../showcase-storage';
import {readHabitOptions, type HabitOptions} from './rule';

/**
 * Session AV lane 2 (habits; LEDGER #49, #50, #57): hands the habit engine each habit's own options from this device's
 * habit extras (the Showcase's own copy in a Showcase tab), as lib/habit-month-weekday/install.ts does for its overlay.
 * Installed once in the browser by the habits store (components/habits/use-habits.ts); on the server and in tests there
 * is none, so every habit reads exactly as stored. Read again at most every 300 ms, and at once after `refreshHabitOptions()`.
 */
let cache: {at: number; raw: string | null; map: Record<string, HabitOptions>} | null = null, version = 0;
function current(): Record<string, HabitOptions> {
  const now = Date.now();
  if (cache && now - cache.at < 300) return cache.map;
  let raw: string | null = null;
  try { raw = getAppStorage().getItem(HABIT_EXTRAS_KEY); } catch { raw = null; }
  if (cache && cache.raw === raw) { cache.at = now; return cache.map; }
  let map: Record<string, HabitOptions> = {};
  try { map = raw ? readHabitOptions(JSON.parse(raw)) : {}; } catch { map = {}; }
  cache = {at: now, raw, map}; version++;
  return map;
}
export function refreshHabitOptions(): void { cache = null; }
let installed = false;
export function installHabitOptionsOverlay(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  setHabitDayOverlay({options: id => current()[id], version: () => { current(); return version; }});
}
