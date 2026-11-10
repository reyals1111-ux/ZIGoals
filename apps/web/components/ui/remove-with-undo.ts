'use client';
import {itemChanges, reinsertItems, removedItems, revertItemChanges, type Removed} from '../../lib/undo-removal';
import {showStatus, showUndo, shownToasts} from './undo-toast';

/**
 * Session AL third pass (P-LS-08, LS-058): removals that stack. The app shows one toast at a time, so three quick
 * removals used to leave an Undo for the last one only. A removal that names a `stack` key while the previous removal of
 * the same key still shows its unused Undo joins it: the new toast's Undo puts every one of them back, newest first, so
 * each lands where it was. Any other toast in between, or an Undo used, starts a new stack.
 */
export type RemovalStack = {key: string; many?: (count: number) => string; manyUndone?: (count: number) => string};
let stacked: {key: string; toast: number; removals: Removed[][]} | null = null;
/** The removals a new one joins: the shown stack of the same key, else none. Exported for its unit test. */
export function joinableRemovals(key: string): Removed[][] {
  return stacked && stacked.key === key && shownToasts().some(t => t.id === stacked!.toast) ? stacked.removals : [];
}
/** Puts several removals back into the latest record, the newest first, so every item returns to its own place. */
export const reinsertAll = <T,>(latest: T, removals: readonly (readonly Removed[])[]): T => removals.reduceRight((acc, r) => reinsertItems(acc, r), latest);

/**
 * Session AH Part 3 (DS5): runs a removal through a store's own `update` (it reads the latest record) and, when the save
 * was a plain removal, shows the app's one toast with a labelled Undo that puts exactly the removed items back
 * (lib/undo-removal.ts). Errors propagate to the caller, which says them its own way. With `stack`, see above.
 */
export async function removeWithUndo<T>(
  update: (updater: (latest: T) => T) => unknown,
  updater: (latest: T) => T,
  message: string,
  undone = 'Put back.',
  {stack}: {stack?: RemovalStack} = {},
): Promise<void> {
  let before: T | undefined, after: T | undefined;
  await update(latest => { const next = updater(latest); before = latest; after = next; return next; });
  const removed = before === undefined ? null : removedItems(before, after);
  if (!removed) { showStatus(message); return; }
  if (!stack) { showUndo({message, undone, restore: () => update(latest => reinsertItems(latest, removed))}); return; }
  const removals = [...joinableRemovals(stack.key), removed], count = removals.length;
  const toast = showUndo({
    message: count > 1 ? stack.many?.(count) ?? `${message} Undo puts all ${count} back.` : message,
    undone: count > 1 ? stack.manyUndone?.(count) ?? `All ${count} are back.` : undone,
    undoLabel: count > 1 ? `Undo: put all ${count} back` : undefined,
    restore: () => { if (stacked?.toast === toast) stacked = null; return update(latest => reinsertAll(latest, removals)); },
  });
  stacked = {key: stack.key, toast, removals};
}

/**
 * Session AL (3e, NB-081/NB-089, PR-030, PR-044): any save that adds, removes or edits items (a water entry logged, a
 * task removed, a habit day skipped) through a store's own `update`, then the toast with an Undo whose restore reverses
 * exactly that in the STORE's latest record (lib/undo-removal.ts itemChanges / revertItemChanges) — never only the
 * screen. A save that changed no listed item says `message` without an Undo. Resolves to whether Undo was offered.
 * Errors from the save propagate; an Undo that fails says "Could not undo: …" in the toast.
 *
 *   await changeWithUndo(health.update, latest => addWater(latest, entry, now), 'Water logged: 250 mL.', {undone: 'Water entry removed.'});
 */
export async function changeWithUndo<T>(
  update: (updater: (latest: T) => T) => unknown,
  updater: (latest: T) => T,
  message: string,
  {undone = 'Undone.', undoLabel, timeoutMs}: {undone?: string; undoLabel?: string; timeoutMs?: number} = {},
): Promise<boolean> {
  let before: T | undefined, after: T | undefined;
  await update(latest => { const next = updater(latest); before = latest; after = next; return next; });
  const changes = before === undefined ? null : itemChanges(before, after);
  if (!changes) { showStatus(message, {timeoutMs}); return false; }
  showUndo({message, undoLabel, timeoutMs, restore: async () => {
    let kept = 0;
    await update(latest => { const out = revertItemChanges(latest, changes); kept = out.kept; return out.record; });
    return {undone: kept ? `${undone.replace(/\.$/, '')}, except what was changed since.` : undone};
  }});
  return true;
}
