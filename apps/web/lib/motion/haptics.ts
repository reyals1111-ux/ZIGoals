import type {MotionLevel} from './level';

/**
 * Session AK M3: a completion haptic (one short pulse) where the device has a vibration motor and a touch screen
 * (Android Chrome; iOS Safari and desktop browsers have none). It follows the app's own vibration switch (Checklist
 * Options, "Short vibration on each tick", on by default — the one haptics setting the app has) and Motion Off; a web page
 * cannot read the phone's silent switch. Never the only feedback, never throws, only from a tap (sticky activation).
 */
export const COMPLETION_PULSE_MS = 12;
export type HapticSignals = {level: MotionLevel; hapticsOn: boolean; vibrate: ((ms: number) => boolean) | null | undefined; coarse: boolean};

export function hapticAllowed(s: HapticSignals): boolean {
  return s.level !== 'off' && s.hapticsOn && typeof s.vibrate === 'function' && s.coarse;
}

export function completionHaptic(s: HapticSignals): boolean {
  if (!hapticAllowed(s)) return false;
  try { return s.vibrate!(COMPLETION_PULSE_MS) !== false; } catch { return false; }
}
