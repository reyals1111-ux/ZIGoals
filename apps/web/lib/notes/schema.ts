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
  /** A fictional Showcase note. */
  example: z.boolean().optional(),
  createdAt: stamp,
  updatedAt: stamp.optional(),
});
export const notesSchema = z.looseObject({
  version: z.literal(1),
  notes: z.array(noteSchema).max(MAX_NOTES).default([]),
  /** Speaking a note (browser speech recognition) is off until the person turns it on, after reading where audio goes. */
  voice: z.boolean().default(false),
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
