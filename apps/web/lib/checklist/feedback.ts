import {inQuietHours} from '../habits-extras/bell';

/**
 * What a tick feels like besides the picture (Session AF, L3; P7.10): a soft bell only when the person turned sounds on
 * (off by default) and it is not their quiet hours (the reminders plan's, 22:00–08:00 unless they changed it); a short
 * vibration only where the device has one (`navigator.vibrate`, a touch screen) and the person left it on. iOS Safari
 * has no vibration: Options says so instead of pretending. Never throws: a bell is a nicety.
 */
export type FeedbackEnv = {
  ring?: (sound: 'soft', volume: number) => Promise<boolean>;
  vibrate?: ((pattern: number) => boolean) | null;
  coarse?: boolean;
};
export type FeedbackPrefs = {sounds: boolean; haptics: boolean; now: Date; quiet: {from: string; to: string}};
export const TICK_VOLUME = 45, TICK_VIBRATION_MS = 12;

/** The device's own vibration, where it has one and a touch screen to feel it through. */
export function deviceFeedbackEnv(): FeedbackEnv {
  if (typeof window === 'undefined') return {};
  let coarse = false; try { coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false; } catch { coarse = false; }
  const nav = typeof navigator !== 'undefined' ? navigator as Navigator & {vibrate?: (pattern: number) => boolean} : null;
  return {vibrate: nav && typeof nav.vibrate === 'function' ? (pattern: number) => nav.vibrate!(pattern) : null, coarse, ring: async (sound, volume) => { try { const {ring} = await import('../meditation/bells'); return await ring(sound, volume); } catch { return false; } }};
}
export const vibrationAvailable = (env: FeedbackEnv = deviceFeedbackEnv()) => !!env.vibrate && !!env.coarse;

export async function tickFeedback(prefs: FeedbackPrefs, env: FeedbackEnv = deviceFeedbackEnv()): Promise<{sound: boolean; vibrated: boolean}> {
  let vibrated = false, sound = false;
  try { if (prefs.haptics && vibrationAvailable(env)) vibrated = env.vibrate!(TICK_VIBRATION_MS) !== false; } catch { vibrated = false; }
  try { if (prefs.sounds && !inQuietHours(prefs.now, prefs.quiet.from, prefs.quiet.to) && env.ring) sound = await env.ring('soft', TICK_VOLUME); } catch { sound = false; }
  return {sound, vibrated};
}
