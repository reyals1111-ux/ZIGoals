import * as z from 'zod';
import {readDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {JOURNAL_ID, MAX_TEXT, PERIOD} from './schema';
import {formatDate} from '../visual-format';

/**
 * Session AW (fr-journal, FR-AW-1; TIER 3 (stored formats), a new device-only key, additive): the Journal page's unsaved
 * entry, kept on this device while it is typed, so leaving the page (a tap on Today, a reload, the phone closing the app)
 * never loses it. It comes back when the Journal opens again, with one line and "Discard draft"; Save entry removes it,
 * and so does emptying the box. One draft at a time: its words, its tags as typed, the template it started from, and
 * (review fix, Session AW fr-journal) what the entry is about (`period`), whether it is a letter to open later (`opens`,
 * `opensDay`), the journal it goes in (`book`, null for the main Journal) and the night of a dream (`dream`); each of
 * these is optional and dropped alone when unreadable. Photos and a voice note still wait in the page only (they are
 * files, kept on Save). Text the secret guard flags (recovery words, a private key) is never kept as a draft.
 *
 * Device only and never synced, never read by ZIGi or NOVA, never sent anywhere and never logged. Deliberately not in
 * Export everything and never restored from a backup: it is unfinished writing, and a restore must not put words in the
 * box that were saved or thrown away since (the saved entry is what is exported). Erased by Erase everything (prefix) and
 * the account erase; per account and per Showcase tab through `getAppStorage()` at the call site.
 */
export const JOURNAL_DRAFT_KEY = 'zigoals:journal-draft:v1';
/** How long typing rests before the draft is written (leaving the page writes it at once). */
export const DRAFT_DELAY_MS = 600;
export const DRAFT_TAGS_MAX = 200;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const journalDraftSchema = z.looseObject({
  day, text: z.string().max(MAX_TEXT), at: z.iso.datetime({offset: true}),
  tags: z.string().max(DRAFT_TAGS_MAX).optional().catch(undefined),
  template: z.looseObject({id: z.string().regex(/^[a-z0-9-]{1,40}$/), lang: z.enum(['en', 'nl'])}).optional().catch(undefined),
  period: z.string().regex(PERIOD).optional().catch(undefined),
  opens: z.enum(['month', 'half', 'year', 'day']).optional().catch(undefined),
  opensDay: day.optional().catch(undefined),
  book: z.string().regex(JOURNAL_ID).nullable().optional().catch(undefined),
  dream: day.optional().catch(undefined),
});
/** The entry's choices beside its words that a draft keeps (each optional). */
export type DraftChoices = {period?: string; opens?: 'month' | 'half' | 'year' | 'day'; opensDay?: string; book?: string | null; dream?: string | null};
export type JournalDraft = z.infer<typeof journalDraftSchema>;
const recordSchema = z.looseObject({version: z.literal(1), draft: journalDraftSchema.nullable()});
export type JournalDraftRecord = z.infer<typeof recordSchema>;
export const JOURNAL_DRAFT: DeviceRecordSpec<JournalDraftRecord> = {key: JOURNAL_DRAFT_KEY, schema: recordSchema, empty: () => ({version: 1, draft: null})};

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** The draft this device holds, or null (none, or bytes this build cannot read: those are left as they are). */
export function readJournalDraft(storage: Pick<Storage, 'getItem'>): JournalDraft | null {
  const draft = readDeviceRecord(storage, JOURNAL_DRAFT).data.draft;
  return draft && draft.text.trim() ? draft : null;
}
/** Keeps the draft, or removes it (null). Throws when the storage refuses, with nothing changed. */
export function keepJournalDraft(storage: Store, draft: JournalDraft | null): void {
  if (!draft) { storage.removeItem(JOURNAL_DRAFT_KEY); return; }
  storage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify(recordSchema.parse({version: 1, draft})));
}
/**
 * Whether the box holds the person's own words: not empty, not only a template's headings, and not just the words a
 * template or the default template put there (`started`, each compared trimmed).
 */
export function draftWorthKeeping(text: string, started: readonly (string | null | undefined)[], onlyHeadings: (text: string) => boolean): boolean {
  const t = text.trim();
  return !!t && !onlyHeadings(t) && !started.some(s => !!s && s.trim() === t);
}
/** What is kept for the box as it is now, or null when there is nothing worth keeping. */
export function draftOf({day, text, tags, template, now, worth, secret = false, choices = {}}: {day: string; text: string; tags: string; template: {id: string; lang: 'en' | 'nl'} | null; now: Date; worth: boolean; /** The secret guard flags the text: never kept. */ secret?: boolean; choices?: DraftChoices}): JournalDraft | null {
  if (!worth || secret) return null;
  const {period, opens, opensDay, book, dream} = choices;
  return {day, text: text.slice(0, MAX_TEXT), at: now.toISOString(), ...(tags.trim() ? {tags: tags.slice(0, DRAFT_TAGS_MAX)} : {}), ...(template ? {template} : {}),
    ...(period ? {period} : {}), ...(opens ? {opens} : {}), ...(opens === 'day' && opensDay ? {opensDay} : {}), ...(book !== undefined ? {book} : {}), ...(dream ? {dream} : {})};
}
/**
 * Review fix (two open Journal tabs): the draft's words are already an entry of its day or of today (saved in another
 * tab, whose draft removal this tab then wrote over), so it is not kept or brought back again.
 */
export function savedAlready(entries: readonly {date: string; text: string}[], draft: Pick<JournalDraft, 'day' | 'text'>, today: string): boolean {
  const words = draft.text.trim().slice(0, MAX_TEXT);
  return !!words && entries.some(e => (e.date === draft.day || e.date === today) && e.text === words);
}
/** The one line shown when a draft comes back: today's says so plainly; an older one names its day and where it saves. */
export function draftBackLine(draft: Pick<JournalDraft, 'day'>, today: string): string {
  return draft.day === today ? 'Your unsaved draft is back.' : `Your unsaved draft from ${formatDate(draft.day, {weekday: true})} is back. Saving files it under today.`;
}
