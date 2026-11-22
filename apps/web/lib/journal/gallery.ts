import {inBook, type BookChoice} from './books';
import {isSealed} from './letters';
import {entryPhotos} from './more-photos';
import type {Journal} from './schema';

/**
 * Session AV lane 2 (r6-notes; LEDGER #404, Diarium's media gallery): every journal photo and voice note in one place,
 * newest first, each opening its entry; one journal or every journal, and one year or every year. A letter still folded
 * away keeps its photos and voice notes folded too (left out until its day), as the list leaves its words out. Derived
 * from the entries; the bytes stay in the journal's media store on this device. Pure.
 */
export type GalleryItem = {entryId: string; date: string; mediaId: string; kind: 'photo' | 'audio'; seconds?: number; /** Its place among the entry's photos (1-based), for the name. */ n: number; of: number};
export function galleryItems(journal: Pick<Journal, 'entries' | 'journals'>, today: string, {book = 'all', year = null, kind = 'all'}: {book?: BookChoice; year?: string | null; kind?: 'all' | 'photo' | 'audio'} = {}): GalleryItem[] {
  const out: GalleryItem[] = [];
  const entries = [...journal.entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  for (const e of entries) {
    if (isSealed(e, today) || !inBook(journal, e, book) || (year && !e.date.startsWith(year))) continue;
    const photos = entryPhotos(e);
    if (kind !== 'audio') photos.forEach((id, i) => out.push({entryId: e.id, date: e.date, mediaId: id, kind: 'photo', n: i + 1, of: photos.length}));
    if (kind !== 'photo') (e.audio ?? []).forEach((a, i) => out.push({entryId: e.id, date: e.date, mediaId: a.id, kind: 'audio', seconds: a.seconds, n: i + 1, of: (e.audio ?? []).length}));
  }
  return out;
}
/** The years that hold a photo or a voice note (newest first), for the year choice. */
export const galleryYears = (journal: Pick<Journal, 'entries' | 'journals'>, today: string, book: BookChoice = 'all'): string[] =>
  [...new Set(galleryItems(journal, today, {book}).map(i => i.date.slice(0, 4)))].sort().reverse();
/** How many photos and voice notes the Journal holds (letters still folded away left out). */
export function galleryCount(journal: Pick<Journal, 'entries'>, today: string): {photos: number; audio: number} {
  let photos = 0, audio = 0;
  for (const e of journal.entries) if (!isSealed(e, today)) { photos += entryPhotos(e).length; audio += (e.audio ?? []).length; }
  return {photos, audio};
}
