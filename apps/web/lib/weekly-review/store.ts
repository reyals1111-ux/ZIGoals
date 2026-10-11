import {MAX_REVIEWS, WEEKLY_REVIEW_KEY, emptyWeeklyReview, weeklyReviewSchema, type Review, type ReviewNoteField, type WeeklyReview} from './schema';

type Read = Pick<Storage, 'getItem'>;
type ReadWrite = Pick<Storage, 'getItem' | 'setItem'>;
let last: {raw: string; data: WeeklyReview} | null = null;
/** What this device holds: unreadable or invalid data reads as no reviews (`unreadable` says so) and is never touched by any automatic path. */
export function readWeeklyReview(storage: Read): {data: WeeklyReview; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(WEEKLY_REVIEW_KEY); } catch { return {data: emptyWeeklyReview(), unreadable: true}; }
  if (raw === null) return {data: emptyWeeklyReview(), unreadable: false};
  if (last?.raw === raw) return {data: last.data, unreadable: false};
  try {
    const parsed = weeklyReviewSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return {data: emptyWeeklyReview(), unreadable: true};
    last = {raw, data: parsed.data};
    return {data: parsed.data, unreadable: false};
  } catch { return {data: emptyWeeklyReview(), unreadable: true}; }
}
/** Applies a change and writes the result. Throws, and writes nothing, when the result is invalid, the key is unreadable or storage refuses. */
export function updateWeeklyReview(storage: ReadWrite, change: (current: WeeklyReview) => WeeklyReview): WeeklyReview {
  const current = readWeeklyReview(storage);
  if (current.unreadable) throw Error('Your saved weekly reviews on this device could not be read. They were not changed.');
  const next = weeklyReviewSchema.parse(change(current.data));
  const raw = JSON.stringify(next);
  storage.setItem(WEEKLY_REVIEW_KEY, raw);
  last = {raw, data: next};
  return next;
}
/** The person's explicit choice to replace unreadable reviews: the old bytes are copied to a recovery key first. */
export function startOverWeeklyReview(storage: ReadWrite): WeeklyReview {
  const previous = storage.getItem(WEEKLY_REVIEW_KEY);
  if (previous !== null) storage.setItem(`${WEEKLY_REVIEW_KEY}:recovery:${crypto.randomUUID()}`, previous);
  const next = emptyWeeklyReview();
  storage.setItem(WEEKLY_REVIEW_KEY, JSON.stringify(next));
  last = null;
  return next;
}
export const reviewFor = (current: WeeklyReview, weekStart: string): Review | undefined => current.reviews.find(r => r.weekStart === weekStart);
/** Replaces the week's review (never a duplicate); a 521st week is refused, nothing is trimmed. */
function putReview(current: WeeklyReview, review: Review): WeeklyReview {
  const others = current.reviews.filter(r => r.weekStart !== review.weekStart);
  if (others.length >= MAX_REVIEWS) throw Error(`This device holds ${MAX_REVIEWS} weekly reviews, the most it keeps.`);
  return {...current, reviews: [...others, review].sort((a, b) => a.weekStart.localeCompare(b.weekStart))};
}
export const setReviewWeekday = (current: WeeklyReview, weekday: number): WeeklyReview => ({...current, weekday});
/** Typed words for one step, trimmed; an empty field is left out, so the record never holds empty strings. */
export function saveReviewNotes(current: WeeklyReview, weekStart: string, notes: Partial<Record<ReviewNoteField, string>>): WeeklyReview {
  const existing = reviewFor(current, weekStart), merged: Record<string, string> = {...existing?.notes};
  for (const [field, value] of Object.entries(notes)) { const text = value?.trim() ?? ''; if (text) merged[field] = text; else delete merged[field]; }
  const next: Review = {weekStart, ...(existing?.completedAt ? {completedAt: existing.completedAt} : {}), ...(existing?.skipped ? {skipped: true as const} : {}), ...(Object.keys(merged).length ? {notes: merged} : {})};
  return putReview(current, next);
}
export const skipReview = (current: WeeklyReview, weekStart: string): WeeklyReview => putReview(current, {weekStart, skipped: true});
export function finishReview(current: WeeklyReview, weekStart: string, now = new Date()): WeeklyReview {
  const existing = reviewFor(current, weekStart);
  const {skipped, ...rest} = existing ?? {weekStart}; void skipped;
  return putReview(current, {...rest, weekStart, completedAt: now.toISOString()});
}
