/**
 * Session AW (showcase): the media ids of the Showcase journal's example photos. A person's own media id is `m-` and
 * letters and digits only (lib/journal/media.ts newMediaId), so the hyphen after `m-showcase` never meets one of theirs.
 * No imports: lib/journal/media.ts reads it without loading the photo itself.
 */
export const SHOWCASE_JOURNAL_PHOTOS = ['m-showcase-walk', 'm-showcase-run'] as const;
export const SHOWCASE_MEDIA_SCOPE = 'showcase';
export const isShowcaseJournalPhoto = (scope: string, mediaId: string): boolean => scope === SHOWCASE_MEDIA_SCOPE && (SHOWCASE_JOURNAL_PHOTOS as readonly string[]).includes(mediaId);
