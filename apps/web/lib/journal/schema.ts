import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3 competitor gap "notes and a journal"; feature 6), TIER 3 (stored format): the journal, a new device-only
 * key, loose and versioned. Private by default: an entry is shared with ZIGi's AI only when the person turns that on for
 * the journal (`shareWithAi`), and ZIGi's follow-up question is made on the device unless they did. Each entry may carry
 * ZIGi's one follow-up question and the person's answer. The day's energy lives in its own record (lib/energy). In Export everything and the backup; not synced (ADR-034 N18).
 */
export const JOURNAL_KEY = 'zigoals:journal:v1';
export const MAX_ENTRIES = 5000, MAX_TEXT = 5000;
const id = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const journalEntrySchema = z.looseObject({
  id, date: day, text: z.string().trim().min(1).max(MAX_TEXT), createdAt: z.iso.datetime({offset: true}), updatedAt: z.iso.datetime({offset: true}).optional(),
  /** Short tags the person chose (gratitude, work, family …). */
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
  /** ZIGi's one follow-up question after the entry, and where it came from. */
  followUp: z.looseObject({question: z.string().trim().min(1).max(300), from: z.enum(['device', 'ai']), answer: z.string().trim().max(2000).optional(), answeredAt: z.iso.datetime({offset: true}).optional()}).optional(),
});
export const journalSchema = z.looseObject({
  version: z.literal(1),
  entries: z.array(journalEntrySchema).max(MAX_ENTRIES),
  /** Whether ZIGi may send journal entries to the person's own AI (off by default; the device asks its own questions). */
  shareWithAi: z.boolean().default(false),
  /** Whether ZIGi asks its one question after an entry at all. */
  followUps: z.boolean().default(true),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type Journal = z.infer<typeof journalSchema>;
export const emptyJournal = (): Journal => ({version: 1, entries: [], shareWithAi: false, followUps: true});
export const JOURNAL: DeviceRecordSpec<Journal> = {key: JOURNAL_KEY, schema: journalSchema, empty: emptyJournal};
