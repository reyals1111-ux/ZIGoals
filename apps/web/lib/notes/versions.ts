import {MAX_NOTE_VERSIONS, MAX_NOTE_VERSION_CHARS, NOTE_VERSIONS_PER_NOTE, type NoteVersion, type Notes} from './schema';
import {checked, updateNote, type NotePatch, type NotesUndo} from './store';

/**
 * Session AV lane 2 (notes; LEDGER #33, Notion's version history): each save that changes a note's title or words keeps
 * what it replaced as an earlier version (the notes record's `versions`, newest last): at most 10 per note, 300 in all
 * and 300,000 characters together (the oldest go first), none for a note that is gone. Restoring one keeps the words it
 * replaces too (a version already holding those words is not doubled), and offers Undo. Pure; on this device only.
 */
export const newNoteVersionId = () => `v-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`;
export function capNoteVersions(versions: readonly NoteVersion[], noteIds: ReadonlySet<string>): NoteVersion[] {
  const per = new Map<string, number>(), kept: NoteVersion[] = [];
  let chars = 0;
  for (const v of [...versions].reverse()) {
    if (!noteIds.has(v.noteId)) continue;
    const n = per.get(v.noteId) ?? 0, size = v.title.length + v.body.length;
    if (n >= NOTE_VERSIONS_PER_NOTE || kept.length >= MAX_NOTE_VERSIONS || chars + size > MAX_NOTE_VERSION_CHARS) continue;
    per.set(v.noteId, n + 1); chars += size; kept.push(v);
  }
  return kept.reverse();
}
export const noteVersionsOf = (record: Pick<Notes, 'versions'>, noteId: string) => [...(record.versions ?? [])].filter(v => v.noteId === noteId).reverse();
const withVersion = (record: Notes, version: NoteVersion): Notes => {
  const same = (record.versions ?? []).some(v => v.noteId === version.noteId && v.body === version.body && v.title === version.title);
  return same ? record : {...record, versions: capNoteVersions([...(record.versions ?? []), version], new Set(record.notes.map(n => n.id)))};
};
/** updateNote, keeping the replaced title and words as an earlier version when they change. */
export function updateNoteKeepingVersion(record: Notes, id: string, patch: NotePatch, now: string, versionId = newNoteVersionId()): Notes {
  const old = record.notes.find(n => n.id === id);
  const next = updateNote(record, id, patch, now);
  const now2 = next.notes.find(n => n.id === id);
  if (!old || !now2 || (old.body === now2.body && old.title === now2.title) || (!old.body.trim() && old.title === now2.title)) return next; // no words before: nothing to keep
  return checked(withVersion(next, {id: versionId, noteId: id, title: old.title, body: old.body, savedAt: old.updatedAt ?? old.createdAt}));
}
/** An earlier version back as the note's title and words; the replaced ones are kept as a version. Undo puts the note back. */
export function restoreNoteVersion(record: Notes, noteId: string, versionId: string, now: string, newId = newNoteVersionId()): {record: Notes; undo: NotesUndo} {
  const note = record.notes.find(n => n.id === noteId), v = (record.versions ?? []).find(x => x.id === versionId && x.noteId === noteId);
  if (!note || !v) throw new Error('That version is no longer on this device.');
  const kept = withVersion(record, {id: newId, noteId, title: note.title, body: note.body, savedAt: note.updatedAt ?? note.createdAt});
  const next = updateNote(kept, noteId, {...(note.kind === 'daily' ? {} : {title: v.title || note.title}), body: v.body}, now);
  return {record: checked(next), undo: {before: [note], created: [], said: 'The note is back as it was.'}};
}
