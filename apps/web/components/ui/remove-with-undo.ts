'use client';
import {reinsertItems, removedItems} from '../../lib/undo-removal';
import {showToast} from './undo-toast';

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
  if (!removed) { showToast({message}); return; }
  showToast({message, undone, undo: () => update(latest => reinsertItems(latest, removed))});
}
