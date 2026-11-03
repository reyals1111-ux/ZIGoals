'use client';
/**
 * Session AK M1/M3 (reverses ADR-036 Q27): a completion moment that plays once, from a tap on a finished thing — a habit
 * completed on the Habits page card (never on the PROTECTED Checklist), a task done, a goal reached.
 * - Full: a soft ring fills around the control and eight small sparks drift out (~650 ms, compositor-only properties).
 * - Calm: the ring alone, as a short fade (no movement, no burst).
 * - Off and reduced motion: nothing moves; the control's own "done" state says it.
 * Never blocks input (pointer-events: none, a separate layer that removes itself), never follows the pointer (it is
 * placed from the control's own box), aria-hidden (the control's own label and state carry the meaning). One short
 * vibration where the device has one, following the app's vibration switch and Motion Off (lib/motion/haptics.ts).
 */
import {currentMotionLevel, type MotionLevel} from '../../lib/motion/level';
import {completionHaptic} from '../../lib/motion/haptics';
import {deviceFeedbackEnv} from '../../lib/checklist/feedback';
import {readDeviceRecord} from '../../lib/device-record';
import {UI_PREFS, checklistPrefsOf} from '../../lib/ui-prefs/schema';

export const COMPLETION_MS = 700, SPARKS = 8;

function hapticsOn(): boolean {
  try { return checklistPrefsOf(readDeviceRecord(window.localStorage, UI_PREFS).data).haptics; } catch { return false; }
}

/** Plays the moment at `target` (a control or a card). Returns what was shown. */
export function celebrateCompletion(target: Element | null | undefined, {haptic = true, level = currentMotionLevel()}: {haptic?: boolean; level?: MotionLevel} = {}): 'burst' | 'ring' | 'none' {
  if (!target || typeof document === 'undefined') return 'none';
  if (haptic) {
    const env = deviceFeedbackEnv();
    completionHaptic({level, hapticsOn: hapticsOn(), vibrate: env.vibrate, coarse: !!env.coarse});
  }
  if (level === 'off' || document.visibilityState === 'hidden') return 'none';
  const box = target.getBoundingClientRect();
  if (!(box.width > 0 && box.height > 0)) return 'none';
  const layer = document.createElement('span');
  layer.className = 'zg-burst';
  layer.dataset.level = level;
  layer.setAttribute('aria-hidden', 'true');
  layer.style.setProperty('--zg-x', `${Math.round(box.left + box.width / 2)}px`);
  layer.style.setProperty('--zg-y', `${Math.round(box.top + box.height / 2)}px`);
  layer.style.setProperty('--zg-r', `${Math.round(Math.min(56, Math.max(18, Math.max(box.width, box.height) / 2 + 6)))}px`);
  const ring = document.createElement('span');
  ring.className = 'zg-burst-ring';
  layer.appendChild(ring);
  if (level === 'full') for (let i = 0; i < SPARKS; i++) {
    const spark = document.createElement('span');
    spark.className = 'zg-burst-spark';
    spark.style.setProperty('--zg-a', `${i * (360 / SPARKS) + 22.5}deg`);
    layer.appendChild(spark);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), COMPLETION_MS + 100);
  return level === 'full' ? 'burst' : 'ring';
}
