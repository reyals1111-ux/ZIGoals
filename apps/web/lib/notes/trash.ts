import {MAX_TITLE, TRASH_DAYS, noteName, notePhotoIdsOf, shortNoteName, type Note, type Notes, type TrashedNote} from './schema';
import {linkKey} from './links';
import {checked, withTrash} from './store';
export {capTrash, keptNoteIds, toTrash, untrashBack} from './store';

/**
 * Session AV lane 2 (r5-notes; LEDGER #360, Logseq's recycled pages): Recently deleted. A deleted note (with its photos,
 * its earlier versions and everything on it) waits in the notes record's `trash` for 30 days, then leaves for good;
 * Restore puts it back in one tap and "Empty now" removes them all at once. Kept apart from `notes`, so Search, the
 * Graph, the lists, the day's notes, backlinks, NOVA's notes context and the Markdown export leave a deleted note out
 * by construction. Pure; nothing here reads storage.
 */
const DAY_MS = 86_400_000;
export const trashOf = (record: Pick<Notes, 'trash'>): TrashedNote[] => [...(record.trash ?? [])].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
/** Whole days left before a deleted note leaves for good (0 on its last day). */
export const daysLeft = (note: Pick<TrashedNote, 'deletedAt'>, now: number): number => Math.max(0, TRASH_DAYS - Math.floor((now - Date.parse(note.deletedAt)) / DAY_MS) - 1);
const plain = (n: TrashedNote): Note => { const {deletedAt: _d, ...rest} = n; void _d; return rest as Note; };
/**
 * A deleted note back in Notes, as it was — pinned, tagged, locked, with its photos, properties, look and earlier
 * versions. Review b5i B5I-3, B5I-4: a daily note whose day has a new daily note meanwhile is never merged into that note
 * (a merge could carry a locked note's words into an unlocked one, or drop photos, tags, properties or its look): it comes
 * back as its own topic note, "2026-11-20 · restored", with everything it had, its lock included, and the message says so.
 */
export function restoreFromTrash(record: Notes, id: string, now: string): {record: Notes; said: string; into: string} {
  const t = (record.trash ?? []).find(n => n.id === id);
  if (!t) throw new Error('That note is no longer in Recently deleted.');
  let note = plain(t);
  const rest = (record.trash ?? []).filter(n => n.id !== id);
  const taken = note.kind === 'daily' && record.notes.some(n => n.kind === 'daily' && n.day === note.day);
  if (taken) {
    const names = new Set(record.notes.map(n => linkKey(noteName(n)))), base = `${note.day} · restored`;
    let title = base;
    for (let i = 2; names.has(linkKey(title)) && i < 100; i++) title = `${base} (${i})`;
    note = {...note, kind: 'topic', title: title.slice(0, MAX_TITLE), updatedAt: now};
  }
  const notes = [...record.notes, note].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {record: checked(withTrash({...record, notes}, rest)), into: id,
    said: taken ? `Restored as its own note, “${note.title}”, because ${note.day} has a new daily note; nothing was added to that one.` : `“${shortNoteName(note)}” is back in your notes.`};
}
/**
 * Removes deleted notes for good: one (`ids`), all of them (Empty now), or those past 30 days (on arrival). Their earlier
 * versions go with them. `photos` are the photo ids no other note or board names any more (their bytes can go now).
 */
export function purgeTrash(record: Notes, which: {ids?: readonly string[]; before?: number}): {record: Notes; gone: TrashedNote[]; photos: string[]} {
  const trash = record.trash ?? [], ids = which.ids ? new Set(which.ids) : null;
  const gone = trash.filter(n => ids ? ids.has(n.id) : which.before === undefined || Date.parse(n.deletedAt) < which.before);
  if (!gone.length) return {record, gone: [], photos: []};
  const goneIds = new Set(gone.map(n => n.id)), next = withTrash(record, trash.filter(n => !goneIds.has(n.id)));
  const named = new Set([...next.notes.flatMap(notePhotoIdsOf), ...(next.trash ?? []).flatMap(notePhotoIdsOf), ...(next.canvases ?? []).flatMap(c => c.nodes.flatMap(n => n.photo ? [n.photo] : []))]);
  const photos = [...new Set(gone.flatMap(notePhotoIdsOf))].filter(p => !named.has(p));
  return {record: checked(next), gone, photos};
}
/** The moment before which a deleted note has been kept its 30 days. */
export const trashCutoff = (now: number) => now - TRASH_DAYS * DAY_MS;
/** A deleted note's name in the list (a daily note by its day). */
export const trashName = (n: TrashedNote) => n.kind === 'daily' && n.day ? n.day : noteName(n);
