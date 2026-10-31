import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AK (lane M, item 10, COMPETITORS M2): the review inbox for imported money, TIER 3 (stored format). A NEW
 * device-only key holding only the ids of entries an import added that the person has not looked at yet (bounded:
 * the newest 2,000). The entries stay in the money log and count in every total; reviewing never changes an amount.
 * An id whose entry is gone (removed, or the import undone) simply drops out. Not synced; for Export everything.
 */
export const MONEY_REVIEW_KEY = 'zigoals:money-review:v1';
export const MAX_REVIEW = 2000;
export const moneyReviewSchema = z.looseObject({
  version: z.literal(1),
  ids: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,80}$/)).max(MAX_REVIEW).default([]),
});
export type MoneyReview = z.infer<typeof moneyReviewSchema>;
export const emptyMoneyReview = (): MoneyReview => ({version: 1, ids: []});
export const MONEY_REVIEW: DeviceRecordSpec<MoneyReview> = {key: MONEY_REVIEW_KEY, schema: moneyReviewSchema, empty: emptyMoneyReview};

/** Marks an import's new entries for review: added once, the newest kept when the inbox is full. */
export function markForReview(record: MoneyReview, ids: readonly string[]): MoneyReview {
  const seen = new Set(record.ids), added = ids.filter(id => !seen.has(id) && (seen.add(id), true));
  return {...record, ids: [...record.ids, ...added].slice(-MAX_REVIEW)};
}
export const acceptReview = (record: MoneyReview, ids: Iterable<string>): MoneyReview => { const done = new Set(ids); return {...record, ids: record.ids.filter(id => !done.has(id))}; };
/** The entries still to review, newest first; only entries that are still in the log. */
export function toReview(record: MoneyReview, entries: readonly MoneyEntry[]): MoneyEntry[] {
  const wanted = new Set(record.ids);
  return entries.filter(e => wanted.has(e.id)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}
/** The record without ids whose entries are gone (written only with the person's next review action). */
export const pruneReview = (record: MoneyReview, entries: readonly MoneyEntry[]): MoneyReview => { const live = new Set(entries.map(e => e.id)); return {...record, ids: record.ids.filter(id => live.has(id))}; };
