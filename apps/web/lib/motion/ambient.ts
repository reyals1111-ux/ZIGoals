import type {MotionLevel} from './level';

/**
 * Session AK M2: may a slow ambient drift (aurora/mesh gradients, starfield layers) run on this device right now?
 * Only in Full motion, never on a low-end device (≤ 4 logical cores, ≤ 4 GB memory where the browser says so, or Save-Data
 * on), never on a low battery that is not charging (< 20 %, where `navigator.getBattery` exists — no browser exposes the
 * operating system's battery-saver switch, so this is the closest honest signal), never while the tab is hidden.
 * Unknown signals (a browser that does not say) do not count against the device.
 */
export type BatteryState = {charging: boolean; level: number};
export type AmbientSignals = {
  level: MotionLevel;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  saveData?: boolean;
  battery?: BatteryState | null;
  hidden?: boolean;
};
export const LOW_END_CORES = 4, LOW_END_MEMORY_GB = 4, LOW_BATTERY = 0.2;

const known = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function lowEndDevice(s: Pick<AmbientSignals, 'hardwareConcurrency' | 'deviceMemory' | 'saveData'>): boolean {
  return (known(s.hardwareConcurrency) && s.hardwareConcurrency <= LOW_END_CORES)
    || (known(s.deviceMemory) && s.deviceMemory <= LOW_END_MEMORY_GB)
    || s.saveData === true;
}

export function batterySaving(battery: BatteryState | null | undefined): boolean {
  if (!battery || typeof battery.level !== 'number' || !Number.isFinite(battery.level)) return false;
  return !battery.charging && battery.level < LOW_BATTERY;
}

export function ambientAllowed(s: AmbientSignals): boolean {
  return s.level === 'full' && !s.hidden && !lowEndDevice(s) && !batterySaving(s.battery);
}

type NavigatorLike = {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: {saveData?: boolean} | null;
  getBattery?: () => Promise<{charging: boolean; level: number}>;
};

/** The device's own signals, read without throwing. */
export function deviceSignals(nav: NavigatorLike | null | undefined = typeof navigator === 'undefined' ? undefined : navigator as NavigatorLike): Omit<AmbientSignals, 'level' | 'battery' | 'hidden'> {
  if (!nav) return {};
  try { return {hardwareConcurrency: nav.hardwareConcurrency, deviceMemory: nav.deviceMemory, saveData: nav.connection?.saveData === true}; } catch { return {}; }
}

/** The battery where the browser offers it (Chromium); null elsewhere or on any error. */
export async function readBattery(nav: NavigatorLike | null | undefined = typeof navigator === 'undefined' ? undefined : navigator as NavigatorLike): Promise<BatteryState | null> {
  try {
    if (!nav || typeof nav.getBattery !== 'function') return null;
    const b = await nav.getBattery();
    return {charging: !!b.charging, level: Number(b.level)};
  } catch { return null; }
}
