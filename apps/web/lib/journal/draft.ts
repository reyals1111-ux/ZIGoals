import * as z from 'zod';
import {readDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {MAX_TEXT} from './schema';
import {formatDate} from '../visual-format';

/**
 * Session AW (fr-journal, FR-AW-1; TIER 3 (stored formats), a new device-only key, additive): the Journal page's unsaved
 * entry, kept on this device while it is typed, so leaving the page (a tap on Today, a reload, the phone closing the app)
 * never loses it. It comes back when the Journal opens again, with one line and "Discard draft"; Save entry removes it,
 * and so does emptying the box. One draft at a time: its words, its tags as typed and the template it started from.
 * Photos and a voice note still wait in the page only (they are files, kept on Save).
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
});
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
export function draftOf({day, text, tags, template, now, worth}: {day: string; text: string; tags: string; template: {id: string; lang: 'en' | 'nl'} | null; now: Date; worth: boolean}): JournalDraft | null {
  if (!worth) return null;
  return {day, text: text.slice(0, MAX_TEXT), at: now.toISOString(), ...(tags.trim() ? {tags: tags.slice(0, DRAFT_TAGS_MAX)} : {}), ...(template ? {template} : {})};
}
/** The one line shown when a draft comes back: today's says so plainly; an older one names its day and where it saves. */
export function draftBackLine(draft: Pick<JournalDraft, 'day'>, today: string): string {
  return draft.day === today ? 'Your unsaved draft is back.' : `Your unsaved draft from ${formatDate(draft.day, {weekday: true})} is back. Saving files it under today.`;
}
