import {z} from 'zod';

/**
 * The Guide's device key (ADR-011): {version: 1, enabled, enabledOn?, dismissed: {[nudgeId]: "YYYY-MM-DD"}}, through
 * getAppStorage() like every device key. Off by default; written only by the switch and "Not today"; unreadable bytes
 * read as off and are never rewritten. It is never synced.
 */
export const GUIDE_KEY = 'zigoals:guide:v1';
export const MAX_DISMISSALS = 100;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const guideSchema = z.strictObject({
  version: z.literal(1),
  enabled: z.boolean(),
  enabledOn: day.optional(),
  dismissed: z.record(z.string().min(1).max(160), day).refine(d => Object.keys(d).length <= MAX_DISMISSALS),
});
export type Guide = z.infer<typeof guideSchema>;
export const emptyGuide = (): Guide => ({version: 1, enabled: false, dismissed: {}});
