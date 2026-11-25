import {inBook, type BookChoice} from './books';
import {isSealed} from './letters';
import {entryPhotos} from './more-photos';
import {journalSchema, type Journal, type JournalEntry} from './schema';

/**
 * Session AW (x3; LEDGER #445, The Five Minute Journal's photo of the day): one photo stands for each day that has one —
 * the photo the person marked "Photo of the day" on one of that day's entries (`dayPhoto`), else the day's first photo —
 * and "A photo a day" lays a month's days out as a strip of those photos, paged by month, each opening its day. A day
 * without a photo is left blank, never counted as missed. A letter still folded away keeps its photos folded, and a
 * journal not chosen stays out, as the photo grid leaves them out (lib/journal/gallery.ts). Derived from the entries;
 * the bytes stay in the journal's media store on this device. Pure.
 */
export type DayPhoto = {entryId: string; mediaId: string; /** The person marked it; false: the day's first photo stands for it. */ chosen: boolean};
export type StripDay = {date: string; future: boolean; photo: DayPhoto | null};
const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const byTime = (a: JournalEntry, b: JournalEntry) => a.createdAt.localeCompare(b.createdAt);

/** The photo of one day among the entries given (those of that day, the folded letters and other journals already left out). */
export function photoOfDay(entries: readonly JournalEntry[]): DayPhoto | null {
  const sorted = [...entries].sort(byTime);
  for (const e of sorted) if (e.dayPhoto && entryPhotos(e).includes(e.dayPhoto)) return {entryId: e.id, mediaId: e.dayPhoto, chosen: true};
  for (const e of sorted) { const first = entryPhotos(e)[0]; if (first) return {entryId: e.id, mediaId: first, chosen: false}; }
  return null;
}
const shown = (journal: Pick<Journal, 'entries' | 'journals'>, today: string, book: BookChoice) => journal.entries.filter(e => !isSealed(e, today) && inBook(journal, e, book));
/** The days of a month that have a photo, each with the photo that stands for it. */
export function dayPhotos(journal: Pick<Journal, 'entries' | 'journals'>, today: string, month: string, book: BookChoice = 'all'): Map<string, DayPhoto> {
  const byDay = new Map<string, JournalEntry[]>();
  for (const e of shown(journal, today, book)) if (e.date.startsWith(`${month}-`)) byDay.set(e.date, [...byDay.get(e.date) ?? [], e]);
  const out = new Map<string, DayPhoto>();
  for (const [date, list] of byDay) { const p = photoOfDay(list); if (p) out.set(date, p); }
  return out;
}
const daysIn = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
/** Every day of the month in order, each with its photo or none; days after today are marked as still to come. */
export function dayStrip(journal: Pick<Journal, 'entries' | 'journals'>, today: string, month: string, book: BookChoice = 'all'): StripDay[] {
  if (!MONTH.test(month)) return [];
  const photos = dayPhotos(journal, today, month, book);
  return Array.from({length: daysIn(month)}, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, '0')}`; return {date, future: date > today, photo: photos.get(date) ?? null}; });
}
/** The months the strip pages through: from the first month with a photo to this month (this month alone when none has one). */
export function stripMonths(journal: Pick<Journal, 'entries' | 'journals'>, today: string, book: BookChoice = 'all'): string[] {
  const now = today.slice(0, 7);
  const first = shown(journal, today, book).filter(e => entryPhotos(e).length).reduce((m, e) => e.date.slice(0, 7) < m ? e.date.slice(0, 7) : m, now);
  const out: string[] = [];
  for (let m = first; m <= now && out.length < 600; m = nextMonth(m)) out.push(m);
  return out;
}
export const nextMonth = (month: string) => { const y = Number(month.slice(0, 4)), n = Number(month.slice(5, 7)); return n === 12 ? `${y + 1}-01` : `${y}-${String(n + 1).padStart(2, '0')}`; };
/** How many days of the month have a photo, and how many of its days have come so far (today included). */
export function stripCount(strip: readonly StripDay[]): {withPhoto: number; soFar: number} {
  return {withPhoto: strip.filter(d => d.photo).length, soFar: strip.filter(d => !d.future).length};
}
/**
 * One photo of an entry marked as its day's photo (null: unmarked, the day's first photo stands for it again). The mark
 * leaves every other entry of that day, so a day has one. A photo the entry does not hold changes nothing.
 */
export function setDayPhoto(journal: Journal, entryId: string, mediaId: string | null): Journal {
  const entry = journal.entries.find(e => e.id === entryId);
  if (!entry) throw new Error('This entry is no longer on this device.');
  if (mediaId && !entryPhotos(entry).includes(mediaId)) return journal;
  const entries = journal.entries.map(e => {
    if (e.id === entryId) { if (mediaId) return {...e, dayPhoto: mediaId}; const {dayPhoto: _d, ...rest} = e; void _d; return rest; }
    if (e.date === entry.date && e.dayPhoto && mediaId) { const {dayPhoto: _d, ...rest} = e; void _d; return rest; }
    return e;
  });
  return journalSchema.parse({...journal, entries});
}
