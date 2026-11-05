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
/**
 * Session AL fourth pass (C-MO-39): typical MET values per type (2011 Compendium of Physical Activities, moderate pace),
 * for a labelled estimate of the energy an activity used. Information only: it never changes a calorie target.
 */
export const ACTIVITY_MET: Readonly<Record<ActivityType, number>> = {Walk: 3.5, Run: 9.8, Cycling: 7.5, Swimming: 6, 'Strength training': 5, Yoga: 2.5, Pilates: 3, Hiking: 6, Dance: 5, 'Team sport': 7, Rowing: 7, Stretching: 2.3};
/**
 * kcal ≈ MET × body weight (kg) × hours, rounded to 5 kcal; null (unknown, never zero) without a known type, minutes or
 * a weight reading.
 */
export function activityKcalEstimate(name: string, minutes: number, weightGrams: number | null): number | null {
  const type = activityTypeOf(name);
  if (!type || !(minutes > 0) || weightGrams === null || !(weightGrams > 0)) return null;
  return Math.round(ACTIVITY_MET[type] * weightGrams / 1000 * minutes / 60 / 5) * 5;
}
