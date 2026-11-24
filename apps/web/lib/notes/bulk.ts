import {propNameIssue} from './props';
import {MAX_PROPS, MAX_TAGS, notePropSchema, type Note, type NoteProp, type Notes, type PropType} from './schema';
import {checked, toTrash, type NotesUndo} from './store';
import {textTags} from './tags';

/**
 * Session AV lane 2 (r5-notes; LEDGER #359, Logseq's bulk actions): one change to several chosen notes at once — add or
 * remove a tag, pin or unpin, archive, or delete (to Recently deleted) — with ONE Undo that puts every chosen note back
 * as it was. Normal writes of `tags`, `pinned`, `archived` and the trash. Pure.
 */
export type BulkAction = {kind: 'tag-add'; tag: string} | {kind: 'tag-remove'; tag: string} | {kind: 'pin'; on: boolean} | {kind: 'archive'} | {kind: 'delete'}
  /** Session AV lane 2 (r6-notes; LEDGER #405, Capacities): one property given one value, or taken off, on every chosen note. */
  | {kind: 'prop-set'; prop: {k: string; t: PropType; v: NoteProp['v']}} | {kind: 'prop-remove'; name: string};
export type BulkResult = {record: Notes; undo: NotesUndo; changed: number; /** Notes the action did not fit (a pin on a daily note, a tag on a full note, a tag written in the words). */ skipped: number;
  /** Session AV lane 2 (r6-notes; LEDGER #405): of the skipped, the notes that hold ten properties already, and the locked ones (left as they are). */ full?: number; locked?: number};
// Session AV lane 2 (r6-notes): cleanTag lives in its own small module (the Notes page's first chunk reads it through
// the tag templates), so this module, with the property checks of LEDGER #405, loads only with Select.
export {cleanTag} from './clean-tag';
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export function bulkChange(record: Notes, ids: readonly string[], action: BulkAction, now: string): BulkResult {
  const chosen = new Set(ids), picked = record.notes.filter(n => chosen.has(n.id));
  if (!picked.length) throw new Error('Choose one note or more first.');
  if (action.kind === 'delete') {
    const n = picked.length;
    return {record: checked(toTrash(record, picked, now)), undo: {before: picked, created: [], said: n === 1 ? 'The note is back.' : `The ${n} notes are back.`}, changed: n, skipped: 0};
  }
  let prop: NoteProp | null = null;
  if (action.kind === 'prop-set') {
    const name = action.prop.k.trim().replace(/\s+/g, ' '), issue = propNameIssue(name);
    if (issue) throw new Error(issue);
    const parsed = notePropSchema.safeParse({...action.prop, k: name});
    if (!parsed.success) throw new Error('That value does not fit this property.');
    prop = parsed.data;
  }
  const before: Note[] = [];
  let skipped = 0, full = 0, locked = 0;
  const notes = record.notes.map(n => {
    if (!chosen.has(n.id)) return n;
    // Session AV lane 2 (r6-notes; LEDGER #405): a locked note's properties are never shown, so they are left as they are.
    if ((action.kind === 'prop-set' || action.kind === 'prop-remove') && n.locked) { skipped++; locked++; return n; }
    if (prop && !(n.props ?? []).some(p => p.k.toLowerCase() === prop.k.toLowerCase()) && (n.props ?? []).length >= MAX_PROPS) { skipped++; full++; return n; }
    const next = edit(n, action, prop);
    if (!next) { skipped++; return n; }
    before.push(n);
    return {...next, updatedAt: now};
  });
  if (!before.length) throw new Error(action.kind === 'pin' ? 'Only topic notes can be pinned; a daily note or a capture keeps its place.' : action.kind === 'tag-add' ? 'Those notes have that tag already, or hold 12 tags.' : action.kind === 'tag-remove' ? 'None of those notes has that tag outside its words. A #tag written in a note’s words stays until you edit them.'
    : action.kind === 'prop-set' ? (full && !locked ? `Those notes hold ${MAX_PROPS} properties already. Take one off a note first.` : locked && !full ? 'Those notes are locked: their properties stay as they are.' : 'Those notes have that value already, are locked, or hold ten properties.') : action.kind === 'prop-remove' ? `None of those notes has the property “${action.name}”${locked ? ' (a locked note is left as it is)' : ''}.` : 'Nothing to change.');
  const n = before.length;
  return {record: checked({...record, notes}), undo: {before, created: [], said: n === 1 ? 'The note is back as it was.' : `The ${n} notes are back as they were.`}, changed: n, skipped, ...(full ? {full} : {}), ...(locked ? {locked} : {})};
}
function edit(n: Note, action: Exclude<BulkAction, {kind: 'delete'}>, prop: NoteProp | null): Note | null {
  switch (action.kind) {
    case 'prop-set': {
      const list = n.props ?? [], at = list.findIndex(p => p.k.toLowerCase() === prop!.k.toLowerCase());
      if (at >= 0 && list[at]!.t === prop!.t && list[at]!.v === prop!.v) return null;
      return {...n, props: at < 0 ? [...list, prop!] : list.map((p, i) => i === at ? prop! : p)};
    }
    case 'prop-remove': {
      const list = (n.props ?? []).filter(p => p.k.toLowerCase() !== action.name.trim().toLowerCase());
      if (list.length === (n.props ?? []).length) return null;
      const next: Note = {...n, props: list};
      if (!list.length) delete next.props;
      return next;
    }
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
