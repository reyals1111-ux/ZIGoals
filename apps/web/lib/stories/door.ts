import {STORY_MIN_DAYS, loggedDays, weekStart, type StoryRecords} from './days';
import {weekStoryOpenedRecently, type StoriesRecord} from './store';

/**
 * Today's Stories door (Session AF, L5b; P9.3): shown while the week's story is ready — at least three logged days in the
 * last seven — and the person has not opened a week's story in those seven days; hidden otherwise, so Today stays short.
 * Derived from the records and `zigoals:stories:v1`; deciding writes nothing.
 */
export type StoriesDoor = {state: 'loading' | 'shown' | 'hidden'; loggedDays: number};
export function storiesDoor({records, stories, unreadable = false}: {records: StoryRecords | null; stories: StoriesRecord | null; unreadable?: boolean}): StoriesDoor {
  if (!records || !stories) return {state: 'loading', loggedDays: 0};
  const days = loggedDays(records, weekStart(records.today), records.today);
  return {state: days >= STORY_MIN_DAYS && (unreadable || !weekStoryOpenedRecently(stories, records.today)) ? 'shown' : 'hidden', loggedDays: days};
}
