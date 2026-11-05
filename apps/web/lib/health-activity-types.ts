/**
 * Session AL third pass (GAP-042, N-085): the activity types offered when you name movement or exercise minutes. A
 * suggestion list only: the stored activity keeps the words you typed, so nothing about the record changes.
 */
export const ACTIVITY_TYPES = ['Walk', 'Run', 'Cycling', 'Swimming', 'Strength training', 'Yoga', 'Pilates', 'Hiking', 'Dance', 'Team sport', 'Rowing', 'Stretching'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];
/** The type an activity's name starts with ("Run with Sam" → "Run"), or null for your own words. */
export function activityTypeOf(name: string): ActivityType | null {
  const text = name.trim().toLowerCase();
  return ACTIVITY_TYPES.find(t => text === t.toLowerCase() || text.startsWith(`${t.toLowerCase()} `)) ?? null;
}
