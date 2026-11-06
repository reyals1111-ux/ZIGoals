/**
 * Session AL (MO-125, P-MO-89): Health says when an entry that may have completed a habit is removed. A "Weigh in" habit
 * ticked by a weight stayed "✓ Done" after that weight was removed, even after a reload: the tick is stored on the habit
 * when the entry is added and never re-read. Health cannot change the habit (Habits owns it); it announces the removal,
 * on this tab, as a window event, and Habits re-reads the day (lib/habit-health-links `measureValue` against the live
 * store) and takes back an automatic tick the journal no longer backs.
 *
 *   window.addEventListener(HEALTH_ENTRY_REMOVED, e => recheck((e as CustomEvent<HealthRemoval>).detail));
 *
 * A removal in another tab reaches Habits through the store's own storage event, so Habits should also re-check on load.
 */
export const HEALTH_ENTRY_REMOVED = 'zigoals:health-entry-removed';
export type HealthMeasure = 'weight' | 'water' | 'steps' | 'activeMinutes' | 'sleepMinutes' | 'meditationMinutes' | 'exercise';
export type HealthRemoval = {measures: HealthMeasure[]; dates: string[]};

/** Which linked measures a removal from these record lists touches (paths as lib/undo-removal `Removed.path`). */
export function measuresOfPaths(paths: readonly (readonly string[])[]): HealthMeasure[] {
  const out = new Set<HealthMeasure>();
  for (const path of paths) {
    const last = path.at(-1) ?? '';
    if (last === 'weights' || last === 'measurements') out.add('weight');
    else if (last === 'water') out.add('water');
    else if (last === 'activity') { out.add('steps'); out.add('activeMinutes'); }
    else if (last === 'nights') out.add('sleepMinutes');
    else if (last === 'sessions' && path.includes('meditation')) out.add('meditationMinutes');
    else if (path.includes('quick') || path.includes('exercise')) out.add('exercise');
  }
  return [...out];
}

/** Tells this tab's pages that Health entries were removed. Never throws (a page without listeners is fine). */
export function announceHealthRemoval(removal: HealthRemoval): void {
  if (!removal.measures.length || typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent<HealthRemoval>(HEALTH_ENTRY_REMOVED, {detail: removal})); } catch { /* an announcement only */ }
}
