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
/** Session AV lane 2 (r4-notes; LEDGER #307): a note's photos — `photoId` and up to seven more. */
export const MAX_EXTRA_PHOTOS = 7, MAX_NOTE_PHOTOS_EACH = MAX_EXTRA_PHOTOS + 1;
/** All notes' text together (titles and bodies): keeps the record well inside this browser's storage. */
export const MAX_TOTAL_CHARS = 1_500_000;
export const NOTE_KINDS = ['inbox', 'daily', 'topic'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];
export const NOTE_SOURCES = ['text', 'voice', 'photo', 'import', 'nova'] as const;
export type NoteSource = (typeof NOTE_SOURCES)[number];

export const noteIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
/** Session AV lane 2 (r3-notes; LEDGER #270): a note's own property (name, type, value). */
export const MAX_PROPS = 10, PROP_NAME_MAX = 40, PROP_TEXT_MAX = 500, PROP_CHOICE_MAX = 60;
export const PROP_TYPES = ['text', 'number', 'date', 'choice', 'tick'] as const;
export type PropType = (typeof PROP_TYPES)[number];
const propName = z.string().trim().min(1).max(PROP_NAME_MAX).refine(n => !['__proto__', 'constructor', 'prototype'].includes(n));
export const notePropSchema = z.union([
  z.looseObject({k: propName, t: z.literal('text'), v: z.string().max(PROP_TEXT_MAX)}),
  z.looseObject({k: propName, t: z.literal('number'), v: z.number().finite().min(-1e12).max(1e12)}),
  z.looseObject({k: propName, t: z.literal('date'), v: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
  z.looseObject({k: propName, t: z.literal('choice'), v: z.string().trim().min(1).max(PROP_CHOICE_MAX)}),
  z.looseObject({k: propName, t: z.literal('tick'), v: z.boolean()}),
]);
export type NoteProp = z.infer<typeof notePropSchema>;
export const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const stamp = z.iso.datetime({offset: true});
/** Session AV lane 2 (r5-notes; LEDGER #367): the calm page colours a note's look can take. */
export const NOTE_LOOK_COLOURS = ['sand', 'sage', 'sky', 'lilac', 'rose', 'stone'] as const;
export type NoteLookColour = (typeof NOTE_LOOK_COLOURS)[number];
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
  /**
   * Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's properties and Bases; TIER 3 (stored format), additive and
   * optional): the person's own properties on the note — up to ten, each a name with a typed value (text, a number, a
   * day, a choice, a tick). An item this build cannot read is dropped on read (the rest kept); older builds keep the list
   * untouched (the note is loose) and never show it.
   */
  props: z.preprocess(v => Array.isArray(v) ? v.filter(x => notePropSchema.safeParse(x).success).slice(0, MAX_PROPS) : undefined, z.array(notePropSchema).max(MAX_PROPS).optional()),
  /**
   * Session AV lane 2 (r4-notes; LEDGER #307, Bear's photos in a note; TIER 3 (stored format), additive and optional): the
   * note's further photos after `photoId` (the first, which older builds keep showing), at most seven, so a note holds
   * eight. Each is placed in the words by a written `![photo](<id>)` line the reading view draws. An id this build cannot
   * read is dropped on read (the rest kept); older builds keep the list untouched (the note is loose) and never show it.
   */
  photos: z.preprocess(v => Array.isArray(v) ? [...new Set(v.filter(x => noteIdSchema.safeParse(x).success))].slice(0, MAX_EXTRA_PHOTOS) : undefined, z.array(noteIdSchema).max(MAX_EXTRA_PHOTOS).optional()),
  /**
   * Session AV lane 2 (r4-notes; LEDGER #315, Bear's archive; TIER 3 (stored format), additive and optional): an archived
   * note leaves the lists and the graph, and stays in Search and in the exports. Older builds show it as before.
   */
  archived: z.boolean().optional().catch(undefined),
  /**
   * Session AV lane 2 (r4-notes; LEDGER #318, Bear's locked notes, in its conservative form; TIER 3 (stored format),
   * additive and optional): the note's words show only after this device's screen-cover PIN, and are left out of Search,
   * the Graph, NOVA and the Markdown export (lib/notes/lock.ts). They are hidden, not encrypted. Older builds read the
   * note as before (its words are plain) and keep the field untouched; nothing they write can overwrite other data.
   */
  locked: z.boolean().optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-notes; LEDGER #367, Craft's page look; TIER 3 (stored format), additive and optional): the
   * note's look in the reading view — a cover (one of the note's own photos) and one of the calm page colours. A value
   * this build cannot read is dropped (the note reads as before); older builds keep it untouched and never show it.
   */
  look: z.looseObject({cover: noteIdSchema.optional().catch(undefined), colour: z.enum(NOTE_LOOK_COLOURS).optional().catch(undefined)}).optional().catch(undefined),
  /**
   * Session AV lane 2 (r6-notes; LEDGER #402, Capacities' daily notes read back; TIER 3 (stored format), additive and
   * optional): the day a daily note was read back (absent: not yet). A quiet mark on its day; never a count against the
   * person. A value this build cannot read is dropped (the note reads as not read back); older builds keep it untouched.
   */
  readBack: daySchema.optional().catch(undefined),
  /** A fictional Showcase note. */
  example: z.boolean().optional(),
  createdAt: stamp,
  updatedAt: stamp.optional(),
});
/** Session AV lane 2 (r5-notes; LEDGER #360, #362): a note in Recently deleted (the whole note and when it was deleted). */
export const MAX_TRASH = 200, MAX_TRASH_CHARS = 400_000, TRASH_DAYS = 30, MAX_TAG_TEMPLATES = 10;
export const trashedNoteSchema = noteSchema.extend({deletedAt: stamp});
export type TrashedNote = z.infer<typeof trashedNoteSchema>;
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
/** Session AV lane 2 (r3-notes; LEDGER #273): a board's cards and lines, in the shape JSON Canvas uses (jsoncanvas.org). */
export const MAX_CANVASES = 10, MAX_CANVAS_NODES = 200, MAX_CANVAS_EDGES = 400, CANVAS_TEXT_MAX = 2000, CANVAS_LABEL_MAX = 60, CANVAS_SPAN = 20_000;
export const CANVAS_COLOURS = ['1', '2', '3', '4', '5', '6'] as const;
const coord = z.number().int().min(-CANVAS_SPAN).max(CANVAS_SPAN), size = z.number().int().min(40).max(4000);
const canvasId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
export const canvasNodeSchema = z.looseObject({
  id: canvasId, type: z.enum(['text', 'note', 'photo', 'group']), x: coord, y: coord, w: size, h: size,
  text: z.string().max(CANVAS_TEXT_MAX).optional().catch(undefined),
  note: noteIdSchema.optional().catch(undefined),
  photo: noteIdSchema.optional().catch(undefined),
  label: z.string().max(CANVAS_LABEL_MAX).optional().catch(undefined),
  color: z.enum(CANVAS_COLOURS).optional().catch(undefined),
});
export const canvasEdgeSchema = z.looseObject({id: canvasId, from: canvasId, to: canvasId, label: z.string().max(CANVAS_LABEL_MAX).optional().catch(undefined)});
export type CanvasNode = z.infer<typeof canvasNodeSchema>;
export type CanvasEdge = z.infer<typeof canvasEdgeSchema>;
const keep = <T extends z.ZodType>(item: T, max: number) => z.preprocess(v => Array.isArray(v) ? v.filter(x => item.safeParse(x).success).slice(0, max) : [], z.array(item).max(max));
export const canvasSchema = z.looseObject({
  id: z.string().regex(/^cv-[A-Za-z0-9_-]{4,40}$/), name: z.string().trim().min(1).max(CANVAS_LABEL_MAX),
  nodes: keep(canvasNodeSchema, MAX_CANVAS_NODES), edges: keep(canvasEdgeSchema, MAX_CANVAS_EDGES), updatedAt: stamp,
});
export type NoteCanvas = z.infer<typeof canvasSchema>;
const readable = <T extends z.ZodType>(item: T, max: number) => z.preprocess(v => Array.isArray(v) ? v.filter(x => item.safeParse(x).success).slice(-max) : undefined, z.array(item).max(max).optional());
export const notesSchema = z.looseObject({
  version: z.literal(1),
  notes: z.array(noteSchema).max(MAX_NOTES).default([]),
  /** Speaking a note (browser speech recognition) is off until the person turns it on, after reading where audio goes. */
  voice: z.boolean().default(false),
  versions: readable(noteVersionSchema, MAX_NOTE_VERSIONS),
  dailyTemplate: z.string().max(MAX_TEMPLATE_BODY).optional().catch(undefined),
  schedules: readable(noteScheduleSchema, MAX_SCHEDULES),
  /**
   * Session AV lane 2 (r3-notes; LEDGER #273, Obsidian's Canvas; TIER 3 (stored format), additive and optional): boards
   * of cards placed by hand — note cards, text cards, photos (their bytes in the notes' photo store) and named groups —
   * joined by labelled lines; at most 10 boards, 200 cards and 400 lines each (lib/notes/canvas.ts). Kept in the notes
   * record, so Export everything, the backup, Restore and Erase carry it with the notes. A board or a card this build
   * cannot read is dropped on read (the rest kept); older builds keep the field untouched and never show it.
   */
  canvases: readable(canvasSchema, MAX_CANVASES),
  /**
   * Session AV lane 2 (r4-notes; LEDGER #306 Bear's tag as a workspace, #316 its typewriter mode; TIER 3 (stored format),
   * additive and optional): this device's two Notes choices, kept beside `voice` in the device-only notes record (so no
   * new key): the one tag Notes is focused on (its list, search and graph) until cleared, and whether the writing view
   * keeps the line being written in the middle. A value this build cannot read is dropped; older builds never read them.
   */
  focusTag: z.string().trim().min(1).max(MAX_TAG).optional().catch(undefined),
  typewriter: z.boolean().optional().catch(undefined),
  /**
   * Session AV lane 2 (r5-notes; LEDGER #360, Logseq's recycled pages; TIER 3 (stored format), additive and optional):
   * notes deleted in the last 30 days, each the whole note with the moment it was deleted (`deletedAt`), newest last; at
   * most 200 and 400,000 characters together (the oldest leave first). Kept apart from `notes`, so every reader of the
   * notes (Search, the Graph, the lists, NOVA's notes, the Markdown export, backlinks) leaves them out by construction,
   * and an older build never shows a deleted note again (it keeps the list untouched; the record is loose).
   */
  trash: readable(trashedNoteSchema, MAX_TRASH),
  /**
   * Session AV lane 2 (r5-notes; LEDGER #362, Logseq's templates for a tag; TIER 3 (stored format), additive and
   * optional): words a new, still empty note starts from once it is given that tag (at most 10). An item this build
   * cannot read is dropped (the rest kept); older builds keep the list untouched and never read it.
   */
  tagTemplates: readable(z.looseObject({tag: z.string().trim().min(1).max(MAX_TAG), body: z.string().max(MAX_TEMPLATE_BODY)}), MAX_TAG_TEMPLATES),
});
export type Note = z.infer<typeof noteSchema>;
export type Notes = z.infer<typeof notesSchema>;
export const emptyNotes = (): Notes => ({version: 1, notes: [], voice: false});
export const NOTES: DeviceRecordSpec<Notes> = {key: NOTES_KEY, schema: notesSchema, empty: emptyNotes};

/**
 * Session AV lane 2 (review b4g B4G-1, B4G-2; LEDGER #318): whether a note shows nothing of itself (its words, tags,
 * photos or properties) until the screen-cover PIN — the one test every view uses.
 */
export const isLockedHidden = (note: Pick<Note, 'locked'>): boolean => note.locked === true;
/** Session AV lane 2 (r4-notes; LEDGER #307): every photo id a note names — the first (`photoId`), then the rest. */
export const notePhotoIdsOf = (note: Pick<Note, 'photoId' | 'photos'>): string[] => [...(note.photoId ? [note.photoId] : []), ...(note.photos ?? []).filter(id => id !== note.photoId)];
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
