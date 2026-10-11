import * as z from 'zod';

/**
 * Insight cards (Session P, PR 3, M3; docs/product/features/M3-insights.md). The engine runs on the device over the
 * person's own records and stores nothing; this key holds only which cards were dismissed and when:
 * {version: 1, dismissed: {[cardId]: "YYYY-MM-DD"}}. A view preference, like reminder dismissals: never synced.
 */
export const INSIGHTS_KEY = 'zigoals:insights:v1';
export const MAX_DISMISSED = 200, DISMISS_DAYS = 28;
export const insightsSchema = z.strictObject({version: z.literal(1), dismissed: z.record(z.string().min(1).max(120), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).refine(d => Object.keys(d).length <= MAX_DISMISSED, `Up to ${MAX_DISMISSED} dismissals are kept.`)});
export type Insights = z.infer<typeof insightsSchema>;
export const emptyInsights = (): Insights => ({version: 1, dismissed: {}});
