/**
 * Session AF (L3b): where the person was before the full-screen Checklist opened, so its close (X, Escape) returns there.
 * The shell notes every route it shows (ChecklistLauncher, mounted on every app page); a Checklist opened directly (the
 * Home Screen shortcut, a shared address, a reload) has nothing before it in this document and returns to Today. Pure and
 * in memory only: nothing is stored.
 */
const trail: string[] = [];
export function notePath(path: string) {
  if (!path || trail.at(-1) === path) return;
  trail.push(path);
  if (trail.length > 24) trail.shift();
}
/** The route shown just before the last visit to `route` in this document, or null. */
export function pathBefore(route: string): string | null {
  const at = trail.lastIndexOf(route);
  return at > 0 ? trail[at - 1] ?? null : null;
}
/** Test seam: forget the trail. */
export function resetTrail() { trail.length = 0; }
