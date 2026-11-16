/**
 * Session AM-2 (security review, finding 7): when a press on a hand-off card's button counts. Pure, so the rule is tested
 * without a browser; the card (components/nova/handoff/handoff-card.tsx) asks it synchronously, inside the click handler,
 * with values it keeps in refs (state would still hold the old value for a second click in the same moment).
 * A press counts only when all of this holds:
 * - it is the person's own (`isTrusted`: not a script's `click()`, not a dispatched event);
 * - the card has been on screen for at least `ARM_MS` (a stray Enter, or a click that was already under way when the
 *   card arrived, cannot approve a card nobody has read);
 * - no button of the card is running right now, and this button has not already done its work (after a successful press
 *   it stays locked: a double click opens one tab, saves one file, writes one line in the history).
 */
export const ARM_MS = 500;
export type PressMoment = {trusted: boolean; now: number; shownAt: number; running: boolean; done: boolean};
export const mayPress = ({trusted, now, shownAt, running, done}: PressMoment): boolean => trusted === true && !running && !done && Number.isFinite(now) && Number.isFinite(shownAt) && now - shownAt >= ARM_MS;
