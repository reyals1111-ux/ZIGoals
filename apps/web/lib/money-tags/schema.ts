import {z} from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AP (owner-approved; TIER 3 stored format): tags on money-log entries, as their own device record
 * `zigoals:money-tags:v1` (entry id → its tags), never a new field on the money-log entry, so builds from before read the
 * log exactly as before and ignore this key. Strict and versioned: a later field makes this build read the record as
 * unreadable (and change nothing) rather than drop it. Up to five tags an entry, each at most 24 characters, lower case,
 * trimmed, single spaces; at most 10,000 entries (the money log's own cap). A removed entry's tags are never shown (every
 * reader filters by the ids the log still holds); they stay in the record so the log's Undo brings them back.
 * Device only: exported, restored with "Goals and Wealth", erased with the account, in the data catalog; never synced.
 */
export const MONEY_TAGS_KEY = 'zigoals:money-tags:v1';
export const MAX_TAGS_PER_ENTRY = 5, MAX_TAG_LENGTH = 24, MAX_TAGGED_ENTRIES = 10_000;
const entryId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).refine(k => k !== '__proto__' && k !== 'constructor' && k !== 'prototype', 'Not an entry id.');
/** A tag as stored: letters or digits at both ends, inside also spaces, "-" and "_", lower case, at most 24 characters. */
export const tagText = z.string().min(1).max(MAX_TAG_LENGTH)
  .regex(/^[\p{L}\p{N}](?:[\p{L}\p{N} _-]*[\p{L}\p{N}])?$/u, 'Letters, digits, spaces, "-" and "_".')
  .refine(t => t === t.toLowerCase() && !t.includes('  '), 'Lower case, single spaces.');
export const entryTagsSchema = z.array(tagText).min(1).max(MAX_TAGS_PER_ENTRY).refine(list => new Set(list).size === list.length, 'Each tag once.');
export const moneyTagsSchema = z.object({
  version: z.literal(1),
  /** Entry id → its tags, in the order the person typed them. */
  tags: z.record(entryId, entryTagsSchema).refine(r => Object.keys(r).length <= MAX_TAGGED_ENTRIES, `Up to ${MAX_TAGGED_ENTRIES} tagged entries.`),
}).strict();
export type MoneyTags = z.infer<typeof moneyTagsSchema>;
export const emptyMoneyTags = (): MoneyTags => ({version: 1, tags: {}});
export const MONEY_TAGS_RECORD: DeviceRecordSpec<MoneyTags> = {key: MONEY_TAGS_KEY, schema: moneyTagsSchema, empty: emptyMoneyTags};
