import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AP (owner-approved feature 1; TIER 3 (stored format), additive): what a day's mood check-in went with, in the
 * person's own short words ("walk", "friends", "late screen"). The mood record (Health v4 `moods`) is strict in every
 * released build, so the tags are NOT a field there: they live in this NEW device-only key, keyed by the mood entry's
 * id. A mood entry is one per day and is named by its day, so the id is the day (YYYY-MM-DD).
 *
 * Private like Health (owner rule, 14 Nov): no ZIGi or NOVA context builder reads this key until the NOVA lane wires it
 * behind the existing Health switches. Exported, restored with Health, erased with the account; never synced.
 */
export const MOOD_TAGS_KEY = 'zigoals:mood-tags:v1';
export const MAX_TAGS_PER_ENTRY = 8;
export const MAX_TAG_CHARS = 24;
export const MAX_TAGGED_ENTRIES = 1100;
/** A tag: one to 24 visible characters, on one line. */
export const tagSchema = z.string().trim().min(1).max(MAX_TAG_CHARS).refine(t => !/[\u0000-\u001f\u007f]/.test(t), 'A tag is one line of text.');
const entryId = z.iso.date();
export const moodTagsSchema = z.strictObject({
  version: z.literal(1),
  /** Mood entry id (its day) → up to eight tags, each kept once (case is ignored when comparing). */
  entries: z.record(entryId, z.array(tagSchema).min(1).max(MAX_TAGS_PER_ENTRY)
    .refine(tags => new Set(tags.map(t => t.toLocaleLowerCase())).size === tags.length, 'Each tag once.')),
}).refine(r => Object.keys(r.entries).length <= MAX_TAGGED_ENTRIES, `Up to ${MAX_TAGGED_ENTRIES} tagged days.`);
export type MoodTags = z.infer<typeof moodTagsSchema>;
export const emptyMoodTags = (): MoodTags => ({version: 1, entries: {}});
export const MOOD_TAGS: DeviceRecordSpec<MoodTags> = {key: MOOD_TAGS_KEY, schema: moodTagsSchema, empty: emptyMoodTags};
