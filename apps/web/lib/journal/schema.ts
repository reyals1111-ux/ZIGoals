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
const stamp = z.iso.datetime({offset: true});
/**
 * Session AV lane 2 (journal; Day One's journals, media and imports; TIER 3 (stored format), additive and optional): ids
 * and bounds of the fields below. A media id names a photo or an audio note kept in IndexedDB `zigoals-journal-media-v1`
 * (lib/journal/media.ts), never in this record; a journal id names one of `journals`.
 */
export const JOURNAL_ID = /^j-[a-z0-9]{4,30}$/, MEDIA_ID = /^m-[A-Za-z0-9_-]{6,60}$/;
export const MAX_ENTRY_PHOTOS = 4, MAX_ENTRY_AUDIO = 3, MAX_AUDIO_SECONDS = 300;
export const MAX_JOURNALS = 10, JOURNAL_NAME_MAX = 40;
/** A journal's colour, drawn from the theme's own tokens (journal.css) so it reads in Nebula, Light and Dark. */
export const JOURNAL_THEMES = ['violet', 'cyan', 'magenta', 'teal', 'gold', 'green'] as const;
export type JournalTheme = (typeof JOURNAL_THEMES)[number];
export const IMPORT_SOURCES = ['dayone', 'text', 'markdown'] as const;
/** Session AV lane 2 (r3-notes; LEDGER #269): an entry's period — an ISO week, a month or a year. */
export const PERIOD = /^\d{4}(?:-W(?:0[1-9]|[1-4]\d|5[0-3])|-(?:0[1-9]|1[0-2]))?$/;
const mediaId = z.string().regex(MEDIA_ID);
/** Keeps the items `item` reads; null when the value is no list (the field then reads as absent). */
const readable = <T extends z.ZodType>(item: T, max: number) => z.preprocess(v => Array.isArray(v) ? v.filter(x => item.safeParse(x).success).slice(-max) : undefined, z.array(item).max(max).optional());
export const journalEntrySchema = z.looseObject({
  id, date: day, text: z.string().trim().min(1).max(MAX_TEXT), createdAt: z.iso.datetime({offset: true}), updatedAt: z.iso.datetime({offset: true}).optional(),
  /** Short tags the person chose (gratitude, work, family …). */
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
  /** ZIGi's one follow-up question after the entry, and where it came from. */
  followUp: z.looseObject({question: z.string().trim().min(1).max(300), from: z.enum(['device', 'ai']), answer: z.string().trim().max(2000).optional(), answeredAt: z.iso.datetime({offset: true}).optional()}).optional(),
  /**
   * Session AK (BUILD list 2 #13; TIER 3 (stored format), additive and optional): the "Start from a prompt" template the
   * entry began from (lib/journal-prompts/templates.ts). A value this build cannot read is dropped on read, never failing
   * the journal; older builds keep it as it is (the entry is loose).
   */
  template: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
  /**
   * Session AV lane 2 (journal; TIER 3 (stored format), additive and optional; a value this build cannot read is dropped on
   * read, never failing the journal; older builds keep it as it is, the entry being loose, and show the entry in their one
   * journal): the journal the entry is in (absent: the main Journal); its photos and audio notes (ids only; the bytes stay
   * in this browser); where an imported entry came from.
   */
  journal: z.string().regex(JOURNAL_ID).optional().catch(undefined),
  photos: z.array(mediaId).max(MAX_ENTRY_PHOTOS).optional().catch(undefined),
  audio: z.array(z.looseObject({id: mediaId, seconds: z.number().int().min(0).max(MAX_AUDIO_SECONDS)})).max(MAX_ENTRY_AUDIO).optional().catch(undefined),
  imported: z.enum(IMPORT_SOURCES).optional().catch(undefined),
  /**
   * Session AV lane 2 (r3-notes; TIER 3 (stored format), additive and optional; a value this build cannot read is dropped
   * on read, never failing the journal; older builds keep it untouched, the entry being loose, and show the entry on its
   * `date` as before):
   * - `period` (LEDGER #269, Grid Diary's week, month and year entries): the week ("2026-W47", ISO weeks, Monday first),
   *   month ("2026-11") or year ("2026") the entry is about, listed under that period on the journal calendar;
   * - `night` (LEDGER #278, Stoic's dream journal): the sleep log's night (the day it ended) a dream entry belongs to;
   * - `opensOn` (LEDGER #279, Stoic's letter to open later): the day a letter opens; until then it stays folded away.
   */
  period: z.string().regex(PERIOD).optional().catch(undefined),
  night: day.optional().catch(undefined),
  opensOn: day.optional().catch(undefined),
});
/**
 * Session AV (owner follow-up 1, F-OWN-TEMPLATES; Day One's own templates; TIER 3 (stored format), additive and optional):
 * the person's own journal templates — a title and two to six headings — at most 20. An item this build cannot read is
 * dropped on read (the others are kept); older builds keep the list untouched (the record is loose) and do not show it.
 */
export const MAX_OWN_TEMPLATES = 20, OWN_TITLE_MAX = 60, OWN_HEADING_MAX = 120;
export const ownTemplateSchema = z.looseObject({
  id: z.string().regex(/^own-[a-z0-9]{6,30}$/),
  title: z.string().trim().min(1).max(OWN_TITLE_MAX),
  headings: z.array(z.string().trim().min(1).max(OWN_HEADING_MAX)).min(1).max(6),
  /**
   * Session AV lane 2 (journal; Day One saves an entry as a template; TIER 3 (stored format), additive and optional): the
   * whole text a template starts from and its tags, when it was saved from an entry. Older builds start from the headings.
   */
  body: z.string().trim().min(1).max(MAX_TEXT).optional().catch(undefined),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().catch(undefined),
});
export type OwnTemplate = z.infer<typeof ownTemplateSchema>;
/** Session AV lane 2 (journal; Day One's journals and themes): one journal beside the main one. */
export const journalBookSchema = z.looseObject({id: z.string().regex(JOURNAL_ID), name: z.string().trim().min(1).max(JOURNAL_NAME_MAX), theme: z.enum(JOURNAL_THEMES).catch('violet')});
export type JournalBook = z.infer<typeof journalBookSchema>;
/** Session AV lane 2 (journal; Notion's version history): an earlier text of an entry, kept when the entry is changed. */
export const MAX_VERSIONS = 200, VERSIONS_PER_ENTRY = 10, MAX_VERSION_CHARS = 200_000;
export const entryVersionSchema = z.looseObject({id: z.string().regex(/^v-[A-Za-z0-9_-]{4,60}$/), entryId: id, text: z.string().min(1).max(MAX_TEXT), tags: z.array(z.string().trim().min(1).max(24)).max(8).optional().catch(undefined), savedAt: stamp});
export type EntryVersion = z.infer<typeof entryVersionSchema>;
/** Session AV lane 2 (journal; Day One's reminders): a reminder to write, its time and weekdays (bit 0 is Monday … bit 6 Sunday, as the notification plan's weekday masks). */
export const journalReminderSchema = z.looseObject({on: z.boolean(), time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), days: z.number().int().min(1).max(127)});
export type JournalReminder = z.infer<typeof journalReminderSchema>;
const ownTemplates = z.preprocess(v => Array.isArray(v) ? v.filter(x => ownTemplateSchema.safeParse(x).success).slice(0, MAX_OWN_TEMPLATES) : undefined, z.array(ownTemplateSchema).max(MAX_OWN_TEMPLATES).optional());
export const journalSchema = z.looseObject({
  version: z.literal(1),
  entries: z.array(journalEntrySchema).max(MAX_ENTRIES),
  templates: ownTemplates,
  /** Whether ZIGi may send journal entries to the person's own AI (off by default; the device asks its own questions). */
  shareWithAi: z.boolean().default(false),
  /** Whether ZIGi asks its one question after an entry at all. */
  followUps: z.boolean().default(true),
  /**
   * Session AV (1c, q4 #33, owner decision: the reviewer's smaller suggestion; Day One's Today lists entries): the person
   * chose to see the first line of today's entries and of "On this day" on Today. Off unless switched on (Today shows
   * counts only, ADR-045's privacy choice). TIER 3 (stored format), additive and optional: a value this build cannot read
   * is dropped on read; older builds keep it untouched (the record is loose) and show counts only.
   */
  todayLines: z.boolean().optional().catch(undefined),
  /**
   * Session AV lane 2 (journal; Day One's journals, prompt packs, reminders and default template; Notion's version history;
   * TIER 3 (stored format), additive and optional). Each reads on its own: an item or a value this build cannot read is
   * dropped on read and the rest kept; older builds keep the record's fields untouched (it is loose) and show one journal.
   * - `journals`: up to 10 journals beside the main one, each with a name and a colour;
   * - `packs`: the prompt packs switched on (lib/journal-prompts/packs.ts ids);
   * - `reminder`: a reminder to write, read by the notification plan (lib/notify/plan.ts, kind `journal`);
   * - `defaultTemplate`: the template a new entry starts from (a built-in or an own template's id);
   * - `versions`: earlier texts of changed entries, at most 10 per entry and 200 in all (lib/journal/versions.ts).
   */
  journals: readable(journalBookSchema, MAX_JOURNALS),
  packs: z.array(z.string().regex(/^[a-z0-9-]{1,30}$/)).max(20).optional().catch(undefined),
  reminder: journalReminderSchema.optional().catch(undefined),
  defaultTemplate: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
  versions: readable(entryVersionSchema, MAX_VERSIONS),
  /**
   * Session AV lane 2 (journal; LEDGER #176, Fabulous's daily affirmations; TIER 3 (stored format), additive and
   * optional): the person chose to see one affirmation a day on Today (lib/journal/affirmations.ts). Off unless switched
   * on; a value this build cannot read is dropped on read; older builds keep it untouched and show none.
   */
  affirmations: z.boolean().optional().catch(undefined),
  /**
   * Session AV lane 2 (bodymind-r2; LEDGER #230, Reflectly's daily challenge; TIER 3 (stored format), additive and
   * optional): the person chose to see one small challenge a day beside the affirmation (lib/journal/challenges.ts), and
   * the last day they tapped Done (never counted or streaked against them). Off unless switched on; a value this build
   * cannot read is dropped on read; older builds keep both untouched and show none.
   */
  challenges: z.boolean().optional().catch(undefined),
  challengeDone: day.optional().catch(undefined),
  /**
   * Session AV lane 2 (r3-notes; LEDGER #277, Stoic's quotes; TIER 3 (stored format), additive and optional): the person
   * chose to see a quote of the day from the Stoic writers beside the affirmation on Today (lib/journal/quotes.ts). Off
   * unless switched on; a value this build cannot read is dropped on read; older builds keep it untouched and show none.
   */
  quotes: z.boolean().optional().catch(undefined),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type Journal = z.infer<typeof journalSchema>;
export const emptyJournal = (): Journal => ({version: 1, entries: [], shareWithAi: false, followUps: true});
export const JOURNAL: DeviceRecordSpec<Journal> = {key: JOURNAL_KEY, schema: journalSchema, empty: emptyJournal};

/**
 * Session AL (A7, PRIMITIVES 3e): removing an entry and its Undo, on the LATEST record. The Undo puts the entry back in
 * its place by time (once: an entry already back is not doubled) and keeps every entry written since.
 */
export const removeJournalEntry = (journal: Journal, id: string): Journal => ({...journal, entries: journal.entries.filter(e => e.id !== id)});
export const restoreJournalEntry = (journal: Journal, entry: JournalEntry): Journal => journal.entries.some(e => e.id === entry.id) ? journal
  : {...journal, entries: [...journal.entries, entry].sort((a, b) => a.createdAt.localeCompare(b.createdAt))};
