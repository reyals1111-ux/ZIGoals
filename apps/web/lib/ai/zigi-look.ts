import {ZIGI_KEY} from './store/keys';

/**
 * The look-and-feel fields of `zigoals:zigi:v1` the launcher shell needs on every app page (Session V Part 12), read with
 * plain checks so the shell ships without the Zod schema: ZIGi's animation (Full, Calm by default, Off), the side, the
 * size, whether a hidden ZIGi leaves a "Show ZIGi" tab at the screen's edge (on by default), and whether ZIGi knocks
 * (Session V Part 13; off by default: only then does the shell load the knock). Anything unreadable
 * reads as the defaults (ADR-014 S5) and a read never writes; Customize writes through the full validated record.
 */
export type ZigiLook = {animation: 'full' | 'calm' | 'off'; side: 'right' | 'left'; size: 's' | 'm' | 'l'; edgeTab: boolean; knock: boolean};
export const DEFAULT_LOOK: ZigiLook = {animation: 'calm', side: 'right', size: 'm', edgeTab: true, knock: false};
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => allowed.includes(value as T) ? value as T : fallback;
export function readZigiLook(storage: Pick<Storage, 'getItem'>): ZigiLook {
  let raw: string | null;
  try { raw = storage.getItem(ZIGI_KEY); } catch { return DEFAULT_LOOK; }
  if (raw === null) return DEFAULT_LOOK;
  try {
    const o: unknown = JSON.parse(raw);
    if (!o || typeof o !== 'object' || (o as {version?: unknown}).version !== 1) return DEFAULT_LOOK;
    const r = o as Record<string, unknown>;
    return {animation: pick(r.animation, ['full', 'calm', 'off'], 'calm'), side: pick(r.side, ['right', 'left'], 'right'), size: pick(r.size, ['s', 'm', 'l'], 'm'), edgeTab: r.edgeTab !== false, knock: !!r.knock && typeof r.knock === 'object' && (r.knock as {enabled?: unknown}).enabled === true};
  } catch { return DEFAULT_LOOK; }
}
/**
 * The original skin's still frame, the one figure the launcher shell carries (the manifest stays out of the shell); the
 * manifest test keeps these equal to the manifest's default skin, and its optical offset to the shell CSS's.
 */
export const SHELL_FRAME = {x1: '/brand/figures/zigi-placeholder.webp', x2: '/brand/figures/zigi-placeholder-2x.webp', width: 96, height: 126} as const;
