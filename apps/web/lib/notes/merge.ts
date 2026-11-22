import {checklistZone, zonedDay} from '../checklist/zone';
import {anchorReminders} from './reminder-anchors';
import {MAX_BODY, MAX_NOTE_PHOTOS_EACH, MAX_PROPS, MAX_TAGS, noteName, notePhotoIdsOf, notesSchema, type Note, type NoteProp, type Notes} from './schema';
import {checked, keptNoteIds, toTrash, type NotesUndo} from './store';
import {capNoteVersions, newNoteVersionId} from './versions';
import {linkIndex, linkKey, parseLinks} from './links';
import {valueWords} from './props';

/**
 * Session AV lane 2 (r6-notes; LEDGER #407, Capacities' merge of two objects): "Merge into …" on a topic note. Its words
 * go under the other note's, below a heading with its name; its kept tags, photos and properties are added where the
 * other has none (a property the other already has with another value, or one past the ten, is written as a line in
 * the merged words, so nothing is lost); every [[link]] to it — in any note, a locked one too, and on a board — points
 * at its heading in the other note (`[[Other#Its name]]`, so an embed still shows just its words). The other note's
 * earlier words are kept as a version, and the merged note itself waits 30 days in Recently deleted, whole, with its
 * own earlier versions. One Undo puts every note and board back. A locked note is never merged, into or from. Pure.
 */
export const MERGE_NEEDS_TOPIC = 'Only a topic note can be merged into another note.';
const cleanHeading = (s: string) => s.replace(/[[\]|#\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Merged note';
/** The words with every [[link]] to `fromKey` pointed at `to`'s heading (its own heading kept when it had one). */
export function repointLinks(body: string, fromKey: string, to: string, heading: string): string {
  const links = parseLinks(body).filter(l => linkKey(l.target) === fromKey);
  if (!links.length) return body;
  let out = '', at = 0;
  for (const l of links) {
    out += body.slice(at, l.start) + `${l.embed ? '!' : ''}[[${to}#${l.heading ?? heading}${l.alias ? `|${l.alias}` : ''}]]`;
    at = l.end;
  }
  return out + body.slice(at);
}
export type MergePreview = {photos: number; tags: number; props: number; propLines: number; links: number; locked: number; problem: string | null};
type Plan = {body: string; photoId?: string; photos?: string[]; tags?: string[]; props?: NoteProp[]; propLines: string[]; problem: string | null};
function plan(source: Note, target: Note, targetName: string): Plan {
  const heading = cleanHeading(noteName(source)), have = notePhotoIdsOf(target), add = notePhotoIdsOf(source).filter(p => !have.includes(p)), all = [...have, ...add];
  const tags = [...(target.tags ?? [])];
  for (const t of source.tags ?? []) if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) tags.push(t);
  const props = [...(target.props ?? [])], propLines: string[] = [];
  for (const p of source.props ?? []) {
    const same = props.find(x => x.k.toLowerCase() === p.k.toLowerCase());
    if (same) { if (same.t !== p.t || same.v !== p.v) propLines.push(`- ${p.k}: ${valueWords(p)}`); continue; }
    if (props.length < MAX_PROPS) props.push(p); else propLines.push(`- ${p.k}: ${valueWords(p)}`);
  }
  const section = [`## ${heading}`, source.body.trim(), propLines.length ? `Properties it had:\n${propLines.join('\n')}` : ''].filter(Boolean).join('\n\n');
  const body = [target.body.trimEnd(), section].filter(Boolean).join('\n\n');
  const problem = all.length > MAX_NOTE_PHOTOS_EACH ? `“${targetName}” can hold ${MAX_NOTE_PHOTOS_EACH} photos, and together they have ${all.length}. Take some photos out first; nothing was merged.`
    : tags.length > MAX_TAGS ? `Together they would keep ${tags.length} tags, and a note keeps ${MAX_TAGS}. Take some tags off first; nothing was merged.`
    : body.length > MAX_BODY ? `“${targetName}” would hold more than ${MAX_BODY.toLocaleString('en-US')} characters. Shorten one of them first; nothing was merged.` : null;
  return {body, ...(all.length ? {photoId: all[0]!} : {}), ...(all.length > 1 ? {photos: all.slice(1, MAX_NOTE_PHOTOS_EACH)} : {}), ...(tags.length ? {tags} : {}), ...(props.length ? {props} : {}), propLines, problem};
}
const nameFor = (n: Note) => n.kind === 'daily' && n.day ? n.day : noteName(n);
function checkPair(record: Notes, sourceId: string, targetId: string): {source: Note; target: Note} {
  const source = record.notes.find(n => n.id === sourceId), target = record.notes.find(n => n.id === targetId);
  if (!source || !target) throw new Error('That note is no longer on this device.');
  if (source.kind !== 'topic') throw new Error(MERGE_NEEDS_TOPIC);
  if (source.id === target.id) throw new Error('A note cannot be merged into itself.');
  if (target.kind === 'inbox') throw new Error('File the capture first; a note is merged into a daily or topic note.');
  if (source.locked || target.locked) throw new Error('A locked note is never merged. Remove its lock first.');
  return {source, target};
}
/** The notes a topic note can be merged into: every other daily or topic note that is not locked. */
export const mergeTargets = (record: Pick<Notes, 'notes'>, sourceId: string): Note[] => record.notes.filter(n => n.id !== sourceId && n.kind !== 'inbox' && !n.locked)
  .sort((a, b) => nameFor(a).localeCompare(nameFor(b)));
/** What a merge would bring and change, and why it cannot happen (null when it can). */
export function mergePreview(record: Notes, sourceId: string, targetId: string): MergePreview {
  const {source, target} = checkPair(record, sourceId, targetId), p = plan(source, target, nameFor(target));
  const key = linkKey(nameFor(source)), index = linkIndex({notes: record.notes}), mine = index.byKey.get(key)?.id === source.id;
  const linking = mine ? record.notes.filter(n => n.id !== source.id && parseLinks(n.body).some(l => linkKey(l.target) === key)) : [];
  return {photos: notePhotoIdsOf(source).filter(x => !notePhotoIdsOf(target).includes(x)).length, tags: (source.tags ?? []).length, props: (source.props ?? []).length, propLines: p.propLines.length, links: linking.length, locked: linking.filter(n => n.locked).length, problem: p.problem};
}
export type MergeResult = {record: Notes; undo: NotesUndo; into: string; links: number};
export function mergeNotes(record: Notes, sourceId: string, targetId: string, now: string, zone: string = checklistZone()): MergeResult {
  const {source, target} = checkPair(record, sourceId, targetId), targetName = nameFor(target), p = plan(source, target, targetName);
  if (p.problem) throw new Error(p.problem);
  const heading = cleanHeading(noteName(source)), key = linkKey(nameFor(source));
  const index = linkIndex({notes: record.notes}), mine = index.byKey.get(key)?.id === source.id; // a name two notes share stays with its first owner
  const merged: Note = {...target, body: p.body, updatedAt: now};
  for (const f of ['photoId', 'photos', 'tags', 'props'] as const) { if (p[f] !== undefined) (merged as Record<string, unknown>)[f] = p[f]; else delete merged[f]; }
  const remindFrom = anchorReminders({...target, remindFrom: {...(source.remindFrom ?? {}), ...(target.remindFrom ?? {})}}, merged.body, zonedDay(new Date(now), zone), zone);
  if (remindFrom) merged.remindFrom = remindFrom; else delete merged.remindFrom;
  const before: Note[] = [source, target];
  let links = 0;
  const notes = record.notes.map(n => {
    if (n.id === target.id) { const body = mine ? repointLinks(merged.body, key, targetName, heading) : merged.body; return {...merged, body}; }
    if (n.id === source.id || !mine) return n;
    const body = repointLinks(n.body, key, targetName, heading);
    if (body === n.body) return n;
    if (body.length > MAX_BODY) throw new Error(`“${noteName(n)}” would hold more than ${MAX_BODY.toLocaleString('en-US')} characters with its links changed. Nothing was merged.`);
    before.push(n); links++;
    return {...n, body, updatedAt: now};
  });
  let next: Notes = {...record, notes};
  if (target.body.trim()) next.versions = capNoteVersions([...(record.versions ?? []), {id: newNoteVersionId(), noteId: target.id, title: target.title, body: target.body, savedAt: target.updatedAt ?? target.createdAt}], keptNoteIds(next));
  // A board card of the merged note shows the other note.
  const canvases = record.canvases;
  if (canvases?.some(c => c.nodes.some(x => x.note === source.id))) next.canvases = canvases.map(c => ({...c, nodes: c.nodes.map(x => x.note === source.id ? {...x, note: target.id} : x)}));
  next = toTrash(next, [source], now);
  const also = (r: Notes): Notes => canvases === r.canvases ? r : notesSchema.parse({...r, ...(canvases ? {canvases} : {})});
  return {record: checked(next), into: target.id, links, undo: {before, created: [], said: `“${noteName(source)}” is its own note again, and “${noteName(target)}” is as it was.`, also}};
}
