import {isCardArt, type CardArt} from './catalog';

/**
 * Session AB-Design (owner request 17, ADR-024 owner edit 5): a read-only mirror of AB-Cloud's `cardArt` field on a goal's
 * extras (`zigoals:goal-extras:v1`, `goals[key].cardArt`), read from the record's bytes without its schema so the card
 * never ships the extras store. Anything but a catalogue id reads as "no choice". Never writes.
 */
export const GOAL_EXTRAS_KEY = 'zigoals:goal-extras:v1'; // lib/goal-extras/store.ts's key, kept equal by lib/card-art/card-art.test.ts
export function readCardArt(storage: Pick<Storage, 'getItem'>, goalKey: string): CardArt | null {
  try {
    const raw = storage.getItem(GOAL_EXTRAS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {goals?: Record<string, {cardArt?: unknown}>};
    const value = parsed?.goals?.[goalKey]?.cardArt;
    return isCardArt(value) ? value : null;
  } catch { return null; }
}
