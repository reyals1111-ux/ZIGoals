/**
 * Session AO (D-028, AL-A11Y-016): a roving tabindex for a list or grid of repeated controls (the week's day cells,
 * What's new's links, the goal cards' titles, My links). The whole list is ONE Tab stop; the arrow keys move inside it
 * (in a grid, Up and Down move by a row), Home and End go to the first and last. Every control stays reachable by
 * keyboard: Tab enters on the one last used, the arrows reach the rest. The pure part is here, for its unit test; the
 * DOM part is components/ui/use-roving-focus.ts.
 *
 * The index the focus moves to for `key` from `index` among `count` items, or null when the key is not a move here.
 * With `columns`, ArrowUp/ArrowDown move by a row and stop at the first and last row; without, every arrow moves by one
 * and the ends wrap (as a menu's items do).
 */
export function rovingTarget(key: string, index: number, count: number, columns?: number): number | null {
  if (count <= 0 || index < 0) return null;
  const last = count - 1;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  if (columns && columns > 0) {
    if (key === 'ArrowRight') return Math.min(last, index + 1);
    if (key === 'ArrowLeft') return Math.max(0, index - 1);
    if (key === 'ArrowDown') return index + columns <= last ? index + columns : index;
    if (key === 'ArrowUp') return index - columns >= 0 ? index - columns : index;
    return null;
  }
  if (key === 'ArrowRight' || key === 'ArrowDown') return index === last ? 0 : index + 1;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return index === 0 ? last : index - 1;
  return null;
}

/** Which item holds the one Tab stop: the one used last while it is still there, else the first. */
export function rovingCurrent<T>(items: readonly T[], last: T | null): T | undefined {
  return last !== null && items.includes(last) ? last : items[0];
}
