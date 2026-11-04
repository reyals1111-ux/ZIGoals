'use client';
import {itemChanges, reinsertItems, removedItems, revertItemChanges} from '../../lib/undo-removal';
import {showStatus, showUndo} from './undo-toast';

/**
 * Session AH Part 3 (DS5): runs a removal through a store's own `update` (it reads the latest record) and, when the save
 * was a plain removal, shows the app's one toast with a labelled Undo that puts exactly the removed items back
 * (lib/undo-removal.ts). Errors propagate to the caller, which says them its own way.
 */
export async function removeWithUndo<T>(
  update: (updater: (latest: T) => T) => unknown,
  updater: (latest: T) => T,
  message: string,
  undone = 'Put back.',
): Promise<void> {
  let before: T | undefined, after: T | undefined;
  await update(latest => { const next = updater(latest); before = latest; after = next; return next; });
  const removed = before === undefined ? null : removedItems(before, after);
  if (!removed) { showStatus(message); return; }
  showUndo({message, undone, restore: () => update(latest => reinsertItems(latest, removed))});
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
