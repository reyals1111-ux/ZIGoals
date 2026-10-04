import {z} from 'zod';

/**
 * Weekly review (Session P, PR 3, G1; docs/product/features/G1-weekly-review.md). One device key, per account, never
 * synced and in no backup until "Export everything": {version: 1, weekday, reviews}. Byte-for-byte the future synced
 * home, `dashboardSettings.weeklyReview` in settings v2 (docs/product/SYNC_HOMES.md). The numbers of a week are never
 * stored, only the person's own words.
 */
export const WEEKLY_REVIEW_KEY = 'zigoals:weekly-review:v1';
export const MAX_REVIEWS = 520;
export const REVIEW_NOTE_FIELDS = ['wentWell', 'goals', 'habits', 'health', 'wealth', 'intention'] as const;
export type ReviewNoteField = typeof REVIEW_NOTE_FIELDS[number];
const note = z.string().max(2000);
export const reviewSchema = z.strictObject({
  weekStart: z.iso.date(), completedAt: z.iso.datetime().optional(), skipped: z.literal(true).optional(),
  notes: z.strictObject({wentWell: note.optional(), goals: note.optional(), habits: note.optional(), health: note.optional(), wealth: note.optional(), intention: note.optional()}).optional(),
});
export type Review = z.infer<typeof reviewSchema>;
export const weeklyReviewSchema = z.strictObject({version: z.literal(1), weekday: z.number().int().min(0).max(6), reviews: z.array(reviewSchema).max(MAX_REVIEWS)})
  .refine(r => new Set(r.reviews.map(x => x.weekStart)).size === r.reviews.length, 'One review per week.');
export type WeeklyReview = z.infer<typeof weeklyReviewSchema>;
export const emptyWeeklyReview = (): WeeklyReview => ({version: 1, weekday: 0, reviews: []});
