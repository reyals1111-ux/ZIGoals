import type {Plan, Stores} from '../../lib/ai/actions/plan';
import {deviceUndoOf, undoDeviceWrite} from '../../lib/ai/actions/device-undo';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';

/**
 * Session AL (DV-071, PRIMITIVES 3e): the one Undo of cards added together, for ZIGi's inline Undo and for NOVA's toast
 * (showUndo). Newest first: a card that wrote a device record (a task, a note) is undone on the device; every other card
 * through the runner's own undo, which checks each record is still as the Add left it before it changes anything.
 * Resolves with the sentence to show when it was refused (nothing more changes), or null when every card was undone.
 */
export const UNDO_REFUSED = 'Something changed since, so this undo was not applied. Your records are as they are now.';
export type UndoableCard = {plan: Plan; after: Stores};
type RunnerUndo = (plans: readonly Plan[], after: readonly Stores[]) => Promise<string | null>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;

/** The runner's check, before anything is undone: every record must still be as its write left it. */
export function undoRefused(plans: readonly Plan[], after: readonly Stores[], latest: Stores): string | null {
  return plans.some((p, i) => p.undo && after[i] && !p.undo.unchanged(after[i]!, latest)) ? UNDO_REFUSED : null;
}
export async function undoCards(cards: readonly UndoableCard[], undo: RunnerUndo, storage: ReadWrite): Promise<string | null> {
  const device = cards.filter(card => deviceUndoOf(card.plan));
  for (const card of [...device].reverse()) {
    const refused = undoDeviceWrite(storage, card.plan);
    if (refused) return refused;
    try { window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: card.plan.device!.key})); } catch { /* no window (tests) */ }
  }
  const rest = cards.filter(card => !device.includes(card));
  return rest.length ? undo(rest.map(card => card.plan), rest.map(card => card.after)) : null;
}
/** What the toast says once the cards are gone ('Taken back: Create the goal "New bike".'). */
export function undoneText(plans: readonly Plan[]): string {
  return plans.length === 1 ? `Taken back: ${plans[0]!.card.title}.` : `Taken back: ${plans.length} additions.`;
}
