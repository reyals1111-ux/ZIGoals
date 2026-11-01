import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AK (BUILD list 2 #9, COMPETITORS_2: YNAB Card Mode): "One at a time" for the money review inbox. The cards
 * come in the inbox's own order (newest first, lib/money-review `toReview`), without the ones skipped in this sitting.
 * Accept marks the entry reviewed (with Undo, which puts it back and shows it again); Skip only moves on (nothing
 * stored, the entry stays in To review); Make a rule opens the rules with the payee filled in. Keyboard: A, S, R and
 * Z for Undo, never with Ctrl, Alt or Meta held (those stay the browser's). Pure; the session's skips live in the page.
 */
export type CardAction = 'accept' | 'skip' | 'rule' | 'undo';
export const CARD_KEYS: Record<string, CardAction> = {a: 'accept', s: 'skip', r: 'rule', z: 'undo'};

/** The cards still to show, in order: the pending entries the person has not skipped in this sitting. */
export function cardQueue(pending: readonly MoneyEntry[], skipped: ReadonlySet<string>): MoneyEntry[] {
  return pending.filter(e => !skipped.has(e.id));
}

/** The action of a key press, or null (a key with Ctrl, Alt or Meta, a repeat, or another key). */
export function keyAction(event: {key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean; repeat?: boolean}): CardAction | null {
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return null;
  return CARD_KEYS[event.key.toLowerCase()] ?? null;
}

/** A swipe's meaning from its distance: right past the share accepts, left past it skips, else nothing. */
export function swipeAction(dx: number, width: number, share = 0.35): 'accept' | 'skip' | null {
  const limit = Math.max(48, width * share);
  return dx >= limit ? 'accept' : dx <= -limit ? 'skip' : null;
}

/** The plain words for where the person is ("4 to go · 2 reviewed"), or the end. */
export function progressWords(queueLength: number, skippedCount: number, reviewedThisSitting: number): string {
  if (queueLength > 0) return `${queueLength} to go${reviewedThisSitting ? ` · ${reviewedThisSitting} reviewed` : ''}`;
  return skippedCount ? `You skipped ${skippedCount}; ${skippedCount === 1 ? 'it stays' : 'they stay'} in To review.` : 'All reviewed. Nothing left in To review.';
}
