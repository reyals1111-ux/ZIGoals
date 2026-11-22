import {checklistZone, zonedDay} from '../checklist/zone';
import {anchorReminders} from './reminder-anchors';
import {MAX_BODY, MAX_TAG, MAX_TAGS, noteName, notesSchema, type Note, type NoteVersion, type Notes} from './schema';
import {checked, keptNoteIds, type NotesUndo} from './store';
import {capNoteVersions, newNoteVersionId} from './versions';
import {TAG_IN_TEXT, noteTags} from './tags';
import {cleanTag} from './clean-tag';

/**
 * Session AV lane 2 (r6-notes; LEDGER #399, Capacities' rename and merge of a tag): "Rename tag" and "Merge into …" in
 * the Tags list. Every note's `#old` in its words and in its Tags field — with the tags nested under it (#old/sub becomes
 * #new/sub) — becomes `#new`, in one step with one Undo; a note whose words change keeps its earlier words as a version.
 * Merging is a rename into a tag that is already there: the two become one (a note never holds a tag twice). A locked
 * note is changed too but never shown (it is only counted). The template of the old tag follows it (when the new tag has
 * none of its own; else it stays as it was), and so does the focus. Notes in Recently deleted keep their words as they
 * were deleted. A # inside code is never touched. Pure.
 */
const key = (t: string) => t.toLowerCase();
const FENCE = /^\s*(```+|~~~+)/;
/** The tag a tag becomes: `from` itself and the tags under it move to `to`; any other tag stays (null). */
export function movedTag(tag: string, from: string, to: string): string | null {
  const t = tag.replace(/^#+/, ''), f = key(from);
  if (key(t) === f) return to;
  if (key(t).startsWith(`${f}/`)) return `${to}${t.slice(from.length)}`.slice(0, MAX_TAG);
  return null;
}
/** The words with every `#from` (and `#from/…`) written as `#to`; code (fenced or inline) is left as it is. */
export function renameTagInText(body: string, from: string, to: string): string {
  let fence: string | null = null;
  return body.split('\n').map(line => {
    const f = FENCE.exec(line);
    if (f) { if (!fence) fence = f[1]![0]!; else if (line.trim().startsWith(fence)) fence = null; return line; }
    if (fence) return line;
    return line.split(/(`[^`\n]*`)/).map((part, i) => i % 2 ? part : part.replace(TAG_IN_TEXT, (all: string, lead: string, tag: string) => { const moved = movedTag(tag, from, to); return moved ? `${lead}#${moved}` : all; })).join('');
  }).join('\n');
}
function uniqueTags(tags: readonly string[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const t of tags) if (!seen.has(key(t))) { seen.add(key(t)); out.push(t); }
  return out.slice(0, MAX_TAGS);
}
/** A new tag name as typed: without its #, spaces as -, and with a letter (null when it cannot be a tag). */
export function newTagName(text: string): string | null {
  const t = cleanTag(text);
  return t && /\p{L}/u.test(t) ? t : null;
}
const carries = (n: Note, from: string) => noteTags(n).some(t => movedTag(t, from, from) !== null);
/** What a rename would change: how many notes (and how many of them are locked), and whether `to` is a tag already (a merge). */
export function tagRenamePreview(record: Pick<Notes, 'notes'>, from: string, to: string): {notes: number; locked: number; merge: boolean} {
  const hit = record.notes.filter(n => carries(n, from));
  const merge = key(to) !== key(from) && record.notes.some(n => noteTags(n).some(t => key(t) === key(to)));
  return {notes: hit.length, locked: hit.filter(n => n.locked).length, merge};
}
export type TagRenameResult = {record: Notes; undo: NotesUndo; changed: number; locked: number; merge: boolean; /** The old tag's template stayed because the new tag has its own. */ templateKept: boolean;
  /** Review b6n B6N-3: changed notes whose earlier words were not kept as a version, because Earlier versions is full and keeping them would push out other notes' versions. */ unversioned: number};
export function renameTag(record: Notes, fromRaw: string, toRaw: string, now: string, zone: string = checklistZone()): TagRenameResult {
  const from = fromRaw.replace(/^#+/, '').trim(), to = newTagName(toRaw);
  if (!from) throw new Error('Choose the tag to rename first.');
  if (!to) throw new Error('Give the tag a new name with a letter in it, for example travel or work/meetings.');
  if (key(to) === key(from)) throw new Error(`The tag is already called #${from}.`);
  if (key(to).startsWith(`${key(from)}/`)) throw new Error(`#${to} sits under #${from}, so the tag cannot move into it.`);
  const {merge} = tagRenamePreview(record, from, to), today = zonedDay(new Date(now), zone);
  const before: Note[] = [], versions: NoteVersion[] = [];
  let locked = 0;
  const notes = record.notes.map(n => {
    if (!carries(n, from)) return n;
    const body = renameTagInText(n.body, from, to);
    if (body.length > MAX_BODY) throw new Error(`“${noteName(n)}” would hold more than ${MAX_BODY.toLocaleString('en-US')} characters. Nothing was renamed.`);
    const tags = n.tags ? uniqueTags(n.tags.map(t => movedTag(t, from, to) ?? t)) : undefined;
    const next: Note = {...n, body, updatedAt: now};
    if (tags?.length) next.tags = tags; else delete next.tags;
    if (body !== n.body) {
      const remindFrom = anchorReminders(n, body, today, zone);
      if (remindFrom) next.remindFrom = remindFrom; else delete next.remindFrom;
      if (n.body.trim()) versions.push({id: newNoteVersionId(), noteId: n.id, title: n.title, body: n.body, savedAt: n.updatedAt ?? n.createdAt});
    }
    before.push(n); if (n.locked) locked++;
    return next;
  });
  if (!before.length) throw new Error(`No note carries #${from} any more.`);
  let next: Notes = {...record, notes};
  // Review b6n B6N-3: a rename never pushes out another note's earlier versions. Each changed note's earlier words are
  // kept while Earlier versions has room for them (a note's own tenth version may give way to it, as on any save of that
  // note); the rest are counted and said. Undo puts the versions back exactly as they were.
  const ids = keptNoteIds(next), oldVersions = record.versions, oldIds = new Set((oldVersions ?? []).map(v => v.id)), added = new Set<string>();
  let kept = [...(oldVersions ?? [])], unversioned = 0;
  for (const v of versions) {
    const tried = capNoteVersions([...kept, v], ids), here = new Set(tried.map(x => x.id));
    if (!here.has(v.id) || kept.some(x => x.noteId !== v.noteId && !here.has(x.id))) { unversioned++; continue; }
    kept = tried; added.add(v.id);
  }
  if (added.size) next.versions = kept;
  // The template of the old tag (and of the tags under it) follows it, unless the new tag has its own.
  let templateKept = false;
  const templates = record.tagTemplates;
  if (templates?.length) {
    const moved = templates.map(t => { const m = movedTag(t.tag, from, to); if (!m) return t; if (templates.some(o => o !== t && key(o.tag) === key(m))) { templateKept = true; return t; } return {...t, tag: m}; });
    next.tagTemplates = moved;
  }
  const focus = record.focusTag ? movedTag(record.focusTag, from, to) : null;
  if (focus) next.focusTag = focus;
  const {tagTemplates: oldTemplates, focusTag: oldFocus} = record;
  const also = (r: Notes): Notes => {
    const back: Notes = {...r};
    // Review b6n B6N-3: the versions exactly as they were (any added since the rename by another save stay after them).
    const later = (r.versions ?? []).filter(v => !added.has(v.id) && !oldIds.has(v.id)), versionsBack = [...(oldVersions ?? []), ...later];
    if (versionsBack.length) back.versions = versionsBack; else delete back.versions;
    if (oldTemplates) back.tagTemplates = oldTemplates; else delete back.tagTemplates;
    if (oldFocus) back.focusTag = oldFocus; else delete back.focusTag;
    return notesSchema.parse(back);
  };
  next = checked(next);
  const n = before.length;
  return {record: next, changed: n, locked, merge, templateKept, unversioned,
    undo: {before, created: [], said: n === 1 ? `#${from} is back on its note.` : `#${from} is back on its ${n} notes.`, also}};
}
