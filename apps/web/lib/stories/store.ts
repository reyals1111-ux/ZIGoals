import * as z from 'zod';
import {STORIES_KEY} from '../af-extras-keys';
import type {DeviceRecordSpec} from '../device-record';
import {addLocalDays} from '../local-date';

/**
 * Session AF (L5b; TIER 3 storage, ADR-028 H78): Stories' one record, `zigoals:stories:v1` — which stories the person
 * opened and the day they opened each (`week:YYYY-MM-DD`, `month:YYYY-MM`, `year:YYYY` → 'YYYY-MM-DD'). A display record:
 * device only, versioned and loose, never synced; written only when the person opens a story, never on view. The
 * figures of a story are never stored; they are read again from the records each time. Bytes that do not parse read as
 * empty and unreadable and are never rewritten by a read (lib/device-record.ts).
 */
export const MAX_SEEN = 400;
export const STORY_KEY = /^(week:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2}|year:\d{4})$/;
export const storiesSchema = z.looseObject({
  version: z.literal(1),
  seen: z.record(z.string().min(1).max(40), z.iso.date()).refine(s => Object.keys(s).length <= MAX_SEEN, `Up to ${MAX_SEEN} stories.`).default({}),
});
export type StoriesRecord = z.infer<typeof storiesSchema>;
export const emptyStories = (): StoriesRecord => ({version: 1, seen: {}});
export const STORIES: DeviceRecordSpec<StoriesRecord> = {key: STORIES_KEY, schema: storiesSchema, empty: emptyStories};

/** Remembers that the person opened a story today; past the cap the oldest go first. */
export function markOpened(record: StoriesRecord, key: string, today: string): StoriesRecord {
  if (!STORY_KEY.test(key)) throw new Error('Not a story.');
  if (record.seen[key] === today) return record;
  const seen = {...record.seen, [key]: today};
  const keys = Object.keys(seen).sort((a, b) => seen[a]!.localeCompare(seen[b]!) || a.localeCompare(b));
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_SEEN))) delete seen[old];
  return storiesSchema.parse({...record, seen});
}
/** Whether a week's story was opened in the last seven days (so Today's door rests until the next week's). */
export function weekStoryOpenedRecently(record: StoriesRecord, today: string): boolean {
  const from = addLocalDays(today, -6);
  return Object.entries(record.seen).some(([key, day]) => key.startsWith('week:') && day >= from && day <= today);
}
