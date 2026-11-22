import {MAX_TAG, MAX_TAGS, type Note, type Notes} from './schema';
import {checked, toTrash, type NotesUndo} from './store';
import {textTags} from './tags';

/**
 * Session AV lane 2 (r5-notes; LEDGER #359, Logseq's bulk actions): one change to several chosen notes at once — add or
 * remove a tag, pin or unpin, archive, or delete (to Recently deleted) — with ONE Undo that puts every chosen note back
 * as it was. Normal writes of `tags`, `pinned`, `archived` and the trash. Pure.
 */
export type BulkAction = {kind: 'tag-add'; tag: string} | {kind: 'tag-remove'; tag: string} | {kind: 'pin'; on: boolean} | {kind: 'archive'} | {kind: 'delete'};
export type BulkResult = {record: Notes; undo: NotesUndo; changed: number; /** Notes the action did not fit (a pin on a daily note, a tag on a full note, a tag written in the words). */ skipped: number};
/** A tag as typed in the bar: without its #, spaces as -, at most 32 characters (null when nothing is left). */
export function cleanTag(text: string): string | null {
  const t = text.trim().replace(/^#+/, '').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_\-/]/gu, '').replace(/^[-/]+|[-/]+$/g, '').slice(0, MAX_TAG);
  return t || null;
}
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export function bulkChange(record: Notes, ids: readonly string[], action: BulkAction, now: string): BulkResult {
  const chosen = new Set(ids), picked = record.notes.filter(n => chosen.has(n.id));
  if (!picked.length) throw new Error('Choose one note or more first.');
  if (action.kind === 'delete') {
    const n = picked.length;
    return {record: checked(toTrash(record, picked, now)), undo: {before: picked, created: [], said: n === 1 ? 'The note is back.' : `The ${n} notes are back.`}, changed: n, skipped: 0};
  }
  const before: Note[] = [];
  let skipped = 0;
  const notes = record.notes.map(n => {
    if (!chosen.has(n.id)) return n;
    const next = edit(n, action);
    if (!next) { skipped++; return n; }
    before.push(n);
    return {...next, updatedAt: now};
  });
  if (!before.length) throw new Error(action.kind === 'pin' ? 'Only topic notes can be pinned; a daily note or a capture keeps its place.' : action.kind === 'tag-add' ? 'Those notes have that tag already, or hold 12 tags.' : action.kind === 'tag-remove' ? 'None of those notes has that tag outside its words. A #tag written in a note’s words stays until you edit them.' : 'Nothing to change.');
  const n = before.length;
  return {record: checked({...record, notes}), undo: {before, created: [], said: n === 1 ? 'The note is back as it was.' : `The ${n} notes are back as they were.`}, changed: n, skipped};
}
function edit(n: Note, action: Exclude<BulkAction, {kind: 'delete'}>): Note | null {
  switch (action.kind) {
    case 'tag-add': {
      const tags = n.tags ?? [];
      if (tags.some(t => same(t, action.tag)) || tags.length >= MAX_TAGS) return null;
      return {...n, tags: [...tags, action.tag]};
    }
    case 'tag-remove': {
      const tags = (n.tags ?? []).filter(t => !same(t, action.tag));
      if (tags.length === (n.tags ?? []).length || textTags(n.body).some(t => same(t, action.tag))) return null;
      const next: Note = {...n, tags};
      if (!tags.length) delete next.tags;
      return next;
    }
    case 'pin': {
      if (n.kind !== 'topic' || !!n.pinned === action.on) return null;
      const next: Note = {...n, pinned: true};
      if (!action.on) delete next.pinned;
      return next;
    }
    case 'archive': return n.kind === 'inbox' || n.archived ? null : {...n, archived: true};
  }
}
