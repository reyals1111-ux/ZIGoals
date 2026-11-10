import type {MotionLevel} from '../../motion/level';

/**
 * Session AL Part 11 (lane L8; owner decision O5, the NOVA HUD motion exception): what NOVA's holographic HUD may move.
 * - Full: slow ring rotation (ornaments only, never a data arc), a pulse on a figure that changes, an occasional scan
 *   shimmer across a panel, number tickers, and the floating motes on the sky's one canvas (computers only).
 * - Calm: slower and fewer — the rings turn three times slower and a changed figure fades in; no shimmer, tickers or motes.
 * - Off, or reduced motion on the device: fully still.
 * Everything pauses while the tab is hidden; a panel off-screen pauses its own loops. Nothing ever follows the pointer.
 * `state` is mirrored on NOVA's frame as `data-hud-motion`, so the CSS and every script agree.
 */
export type HudMotionState = 'full' | 'calm' | 'still' | 'paused';
export type HudMotion = {state: HudMotionState; rotate: boolean; rotateSeconds: number; pulse: 'glow' | 'fade' | 'none'; shimmer: boolean; ticker: boolean; motes: boolean};
export const ROTATE_FULL_S = 90, ROTATE_CALM_S = 270;
export function hudMotion({level, hidden, phone}: {level: MotionLevel; hidden: boolean; phone: boolean}): HudMotion {
  if (level === 'off') return {state: 'still', rotate: false, rotateSeconds: 0, pulse: 'none', shimmer: false, ticker: false, motes: false};
  if (hidden) return {state: 'paused', rotate: false, rotateSeconds: 0, pulse: 'none', shimmer: false, ticker: false, motes: false};
  if (level === 'calm') return {state: 'calm', rotate: true, rotateSeconds: ROTATE_CALM_S, pulse: 'fade', shimmer: false, ticker: false, motes: false};
  return {state: 'full', rotate: true, rotateSeconds: ROTATE_FULL_S, pulse: 'glow', shimmer: !phone, ticker: true, motes: !phone};
}
