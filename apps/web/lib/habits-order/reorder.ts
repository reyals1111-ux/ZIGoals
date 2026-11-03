/**
 * Session AK (5.7): pure reorder helpers, shared by the habit list and milestone lists. Every helper returns a new list
 * and leaves the old one untouched; a move outside the list, or of an id that is not there, returns the list as it was.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from >= list.length) return [...list];
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (target === from) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return next;
}
/** Moves one id by a step (−1 up, +1 down), or to the top or bottom. */
export function moveById(ids: readonly string[], id: string, by: -1 | 1 | 'top' | 'bottom'): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return [...ids];
  return moveItem(ids, from, by === 'top' ? 0 : by === 'bottom' ? ids.length - 1 : from + by);
}
/** A drag that ends over another row: the dragged id takes that row's place. */
export function dropOn(ids: readonly string[], dragged: string, over: string): string[] {
  const from = ids.indexOf(dragged), to = ids.indexOf(over);
  return from < 0 || to < 0 ? [...ids] : moveItem(ids, from, to);
}
/** The positions of a list, for storage: {id: index}. */
export const orderRecord = (ids: readonly string[]): Record<string, number> => Object.fromEntries(ids.map((id, i) => [id, i]));
/**
 * Items in their saved order. Items without a saved position (new since the last reorder) follow the ordered ones in
 * their original order, so a new habit appears at the end and nothing jumps.
 */
export function inOrder<T extends {id: string}>(items: readonly T[], order: Readonly<Record<string, number>> | null | undefined): T[] {
  if (!order) return [...items];
  const indexed = items.map((item, i) => ({item, i, at: order[item.id]}));
  return indexed.sort((a, b) => a.at !== undefined && b.at !== undefined ? a.at - b.at || a.i - b.i : a.at !== undefined ? -1 : b.at !== undefined ? 1 : a.i - b.i).map(x => x.item);
}
/** The keyboard moves of a focused row: Alt + ↑/↓ by one, Alt + Home/End to the top or bottom. */
export function reorderKey(event: {key: string; altKey: boolean}): -1 | 1 | 'top' | 'bottom' | null {
  if (!event.altKey) return null;
  return ({ArrowUp: -1, ArrowDown: 1, Home: 'top', End: 'bottom'} as const)[event.key as 'ArrowUp'] ?? null;
}
/** What a screen reader hears after a move: "Walk moved to position 2 of 5." */
export const movedWords = (title: string, ids: readonly string[], id: string) => `${title} moved to position ${ids.indexOf(id) + 1} of ${ids.length}.`;
