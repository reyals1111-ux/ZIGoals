/**
 * Session AM-2 (security review, finding 7): when a press on the confirm card's button counts. The card can appear by
 * itself (a model's reply lands), so a press must be the person's own and must come after they could have read it:
 * - a real event from the person (`isTrusted`): a click made by script is ignored;
 * - not in the first `ARM_MS` after the card appeared: a click or a key already on its way when the dialog opened
 *   lands on nothing (the button is not armed yet, and it never has the focus when the card opens);
 * - once: after a press the card is locked, whatever the call's outcome (one run per card).
 * Pure, so the rule is tested without a browser; components/nova/agent/tool-card.tsx applies it.
 */
export const ARM_MS = 500;
export type CardState = 'ask' | 'running' | 'done';
export function pressCounts(press: {trusted: boolean; shownAt: number; now: number; state: CardState; pressed: boolean}): boolean {
  return press.trusted === true && !press.pressed && press.state === 'ask' && Number.isFinite(press.shownAt) && press.now - press.shownAt >= ARM_MS;
}
