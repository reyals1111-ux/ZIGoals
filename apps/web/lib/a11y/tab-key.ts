/**
 * Session AK P6 (keyboard, the ARIA tabs pattern): where a key moves in a tab list of `count` tabs from the tab at `at`.
 * Left and right arrows step back and forth and wrap; Home and End go to the first and last. Any other key, or an empty
 * list, moves nowhere (null).
 */
export function nextTabIndex(key: string, at: number, count: number): number | null {
  if (count <= 0) return null;
  const from = Math.min(Math.max(0, at), count - 1);
  switch (key) {
    case 'ArrowRight': return (from + 1) % count;
    case 'ArrowLeft': return (from - 1 + count) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}
