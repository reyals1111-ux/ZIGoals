import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AK (owner follow-up 2, B), TIER 3 (stored format): notes that connect to the person's life, a NEW device-only key
 * beside the Journal (`zigoals:journal:v1` is not changed). Loose and versioned; every field optional or defaulted;
 * bounded. Three kinds of note:
 * - `inbox`: a quick capture (typed, spoken or a photo) waiting to be filed;
 * - `daily`: one per calendar day, titled with that day ("2026-11-01", as Obsidian's daily notes are), shown with the
 *   day's "This day" strip;
 * - `topic`: any other note, with a title of its own.
 * [[Links]] live in the text itself (lib/notes/links.ts), so nothing else needs storing for them. A photo's bytes live in
 * IndexedDB `zigoals-notes-photos-v1` (lib/notes/photos.ts); the note keeps only its photo id. Never synced, never sent.
 */
export const NOTES_KEY = 'zigoals:notes:v1';
export const MAX_NOTES = 2000, MAX_BODY = 20_000, MAX_TITLE = 120, MAX_TAGS = 12, MAX_TAG = 32;
/** All notes' text together (titles and bodies): keeps the record well inside this browser's storage. */
export const MAX_TOTAL_CHARS = 1_500_000;
export const NOTE_KINDS = ['inbox', 'daily', 'topic'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_SOURCES = ['text', 'voice', 'photo', 'import', 'nova'] as const;
export type NoteSource = (typeof NOTE_SOURCES)[number];

export const noteIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stamp = z.iso.datetime({offset: true});
export const noteSchema = z.looseObject({
  id: noteIdSchema,
  kind: z.enum(NOTE_KINDS),
  /** A daily note's title is its day; an inbox capture may have none yet. */
  title: z.string().trim().max(MAX_TITLE).default(''),
  body: z.string().max(MAX_BODY).default(''),
  /** A daily note's day; for a capture, the day it was captured. */
  day: daySchema.optional(),
  /** Where it came from (a capture's way in). */
  source: z.enum(NOTE_SOURCES).optional(),
  /** The id of this note's device-only photo (IndexedDB), when it has one. */
  photoId: noteIdSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(MAX_TAG)).max(MAX_TAGS).optional(),
  pinned: z.boolean().optional(),
  /**
   * Session AV lane 2 (review b1 #1; TIER 3 (stored format), additive and optional): the day each "@remind" line was
   * first saved, keyed by its words (lib/notes/reminders.ts reminderKey), so "tomorrow" and "friday" keep the day they
   * meant when written instead of moving with every new day. At most 20; a map this build cannot read is dropped (the
   * line then reads against the note's last save), and older builds keep it untouched and never read it.
   */
  remindFrom: z.record(z.string().min(1).max(200), daySchema).optional().catch(undefined),
  /** A fictional Showcase note. */
  example: z.boolean().optional(),
  createdAt: stamp,
  updatedAt: stamp.optional(),
});
/**
 * Session AV lane 2 (journal and notes; Notion's version history and repeating templates; TIER 3 (stored format),
 * additive and optional). Each reads on its own: an item or value this build cannot read is dropped on read and the rest
 * kept; older builds keep the fields untouched (the record is loose) and never show them.
 * - `versions`: earlier words of changed notes (lib/notes/versions.ts), at most 10 per note, 300 in all and 300,000
 *   characters together, so the record stays well inside this browser's storage;
 * - `dailyTemplate`: the words a new daily note starts from (shown in the editor; written only when saved);
 * - `schedules`: note templates that make a new note each day, week or month (lib/notes/schedules.ts), at most 10.
 */
export const MAX_NOTE_VERSIONS = 300, NOTE_VERSIONS_PER_NOTE = 10, MAX_NOTE_VERSION_CHARS = 300_000;
export const MAX_SCHEDULES = 10, MAX_TEMPLATE_BODY = 4000, SCHEDULE_TITLE_MAX = 80;
export const SCHEDULE_EVERY = ['day', 'week', 'month'] as const;
export type ScheduleEvery = (typeof SCHEDULE_EVERY)[number];
export const noteVersionSchema = z.looseObject({id: z.string().regex(/^v-[A-Za-z0-9_-]{4,60}$/), noteId: noteIdSchema, title: z.string().max(MAX_TITLE).default(''), body: z.string().max(MAX_BODY), savedAt: stamp});
export type NoteVersion = z.infer<typeof noteVersionSchema>;
export const noteScheduleSchema = z.looseObject({
  id: z.string().regex(/^s-[a-z0-9]{4,30}$/),
  title: z.string().trim().min(1).max(SCHEDULE_TITLE_MAX),
  body: z.string().max(MAX_TEMPLATE_BODY).default(''),
  every: z.enum(SCHEDULE_EVERY),
  /** A weekly template's weekday (0 Sunday … 6 Saturday); a monthly one's day of the month (1–28). */
  weekday: z.number().int().min(0).max(6).optional().catch(undefined),
  monthDay: z.number().int().min(1).max(28).optional().catch(undefined),
  /** The last period start a note was made for (YYYY-MM-DD), so a period never gets two. */
  lastMade: daySchema.optional().catch(undefined),
  paused: z.boolean().optional().catch(undefined),
});
export type NoteSchedule = z.infer<typeof noteScheduleSchema>;
const readable = <T extends z.ZodType>(item: T, max: number) => z.preprocess(v => Array.isArray(v) ? v.filter(x => item.safeParse(x).success).slice(-max) : undefined, z.array(item).max(max).optional());
export const notesSchema = z.looseObject({
  version: z.literal(1),
  notes: z.array(noteSchema).max(MAX_NOTES).default([]),
  /** Speaking a note (browser speech recognition) is off until the person turns it on, after reading where audio goes. */
  voice: z.boolean().default(false),
  versions: readable(noteVersionSchema, MAX_NOTE_VERSIONS),
  dailyTemplate: z.string().max(MAX_TEMPLATE_BODY).optional().catch(undefined),
  schedules: readable(noteScheduleSchema, MAX_SCHEDULES),
});
export type Note = z.infer<typeof noteSchema>;
export type Notes = z.infer<typeof notesSchema>;
export const emptyNotes = (): Notes => ({version: 1, notes: [], voice: false});
export const NOTES: DeviceRecordSpec<Notes> = {key: NOTES_KEY, schema: notesSchema, empty: emptyNotes};

/** The characters a record holds (titles and bodies), for the total cap. */
export const totalChars = (notes: readonly Pick<Note, 'title' | 'body'>[]) => notes.reduce((n, x) => n + x.title.length + x.body.length, 0);
/** A note's name on screen and in links: its title, else its first line, else "Untitled note". */
/** Session AL (DV-192, P-DV-16): a note's name cut to 40 characters, for a toast or a status line that echoes it. */
export const shortNoteName = (note: Pick<Note, 'title' | 'body' | 'kind' | 'day'>): string => { const n = noteName(note); return n.length > 40 ? `${n.slice(0, 39).trimEnd()}…` : n; };
export function noteName(note: Pick<Note, 'title' | 'body' | 'kind' | 'day'>): string {
  if (note.title.trim()) return note.title.trim();
  const first = note.body.split('\n').map(l => l.replace(/^#+\s*|^[-*]\s+(\[[ xX]\]\s+)?/, '').trim()).find(Boolean);
  return first ? first.slice(0, 80) : note.kind === 'inbox' ? 'Photo or empty capture' : 'Untitled note';
}
