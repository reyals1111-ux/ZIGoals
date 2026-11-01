import type {ZipEntry} from '../export/zip';
import {linkIndex, linkKey, outgoing, type LinkSources} from './links';
import {MAX_BODY, MAX_TAG, MAX_TAGS, MAX_TITLE, NOTE_KINDS, noteName, type Note, type NoteKind, type Notes} from './schema';
import {checked, newNoteId, type NotesUndo} from './store';

/**
 * Session AK (B5): notes as Markdown files, the way Obsidian keeps them — one .md per note with YAML front-matter,
 * [[links]] kept exactly as written, daily notes named by their day in Daily/, captures in Inbox/, the rest in Notes/.
 * Goals and habits a note links to get a small stub file in ZIGoals/ so the links land somewhere in Obsidian too.
 * Import reads .md files (alone or from a ZIP, lib/notes/zip-read.ts) with caps, parses front-matter as plain text
 * (no YAML tags, anchors or code: a value is only ever a string or a list of strings), and plans every change before
 * anything is written; the person confirms, and Undo takes the import back. Nothing in a file is ever run.
 */

/* ---- Front-matter ------------------------------------------------------------------------------------------------ */
export type FrontMatter = Record<string, string | string[]>;
const FM_MAX_CHARS = 8000, FM_MAX_KEYS = 60, FM_MAX_VALUE = 1000, FM_MAX_LIST = 50;
const FM_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/, BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);
/** A YAML double-quoted string written as JSON (valid YAML), so any title round-trips. */
const quoted = (s: string) => JSON.stringify(s);
function scalar(raw: string): string {
  const v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) { try { const s: unknown = JSON.parse(v); if (typeof s === 'string') return s.slice(0, FM_MAX_VALUE); } catch { /* read as written */ } return v.slice(1, -1).slice(0, FM_MAX_VALUE); }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) return v.slice(1, -1).replace(/''/g, "'").slice(0, FM_MAX_VALUE);
  return v.replace(/\s+#.*$/, '').slice(0, FM_MAX_VALUE);
}
function inlineList(raw: string): string[] {
  return raw.trim().slice(1, -1).split(',').map(scalar).filter(Boolean).slice(0, FM_MAX_LIST);
}
/** Splits a Markdown file into its front-matter (as plain strings) and its body. Text without front-matter is all body. */
export function parseFrontMatter(text: string): {data: FrontMatter; body: string} {
  const src = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const data: FrontMatter = Object.create(null) as FrontMatter;
  const fm = /^---\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/.exec(src.slice(0, FM_MAX_CHARS + 16));
  if (!fm) return {data, body: src};
  const head = fm[1] ?? '', after = src.slice(fm[0].length);
  let keys = 0, listKey: string | null = null;
  for (const line of head.split('\n')) {
    const item = /^\s+-\s+(.*)$/.exec(line) ?? /^-\s+(.*)$/.exec(line);
    if (item && listKey) { const list = data[listKey]; if (Array.isArray(list) && list.length < FM_MAX_LIST) list.push(scalar(item[1]!)); continue; }
    const m = /^([^:\s][^:]*):(.*)$/.exec(line);
    listKey = null;
    if (!m) continue;
    const key = m[1]!.trim(), value = m[2]!;
    if (!FM_KEY.test(key) || BLOCKED.has(key) || ++keys > FM_MAX_KEYS) continue;
    const v = value.trim();
    if (!v) { data[key] = []; listKey = key; }
    else if (v.startsWith('[') && v.endsWith(']')) data[key] = inlineList(v);
    else data[key] = scalar(v);
  }
  return {data, body: after};
}
const fmString = (data: FrontMatter, key: string) => { const v = data[key]; return typeof v === 'string' ? v : undefined; };
const fmList = (data: FrontMatter, key: string) => { const v = data[key]; return Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(/[,\s]+/) : []; };

/* ---- Export ------------------------------------------------------------------------------------------------------ */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** A file name Obsidian, Windows, macOS and Linux all accept: no path or link characters, no trailing dot, ≤ 100 chars. */
export function safeFileBase(name: string): string {
  const base = name.normalize('NFC').replace(/[\\/:*?"<>|#^[\]\0-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').replace(/[. ]+$/, '').slice(0, 100).trim();
  return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(base) ? `${base} note` : base || 'Untitled note';
}
const FOLDER: Record<NoteKind, string> = {daily: 'Daily', inbox: 'Inbox', topic: 'Notes'};
/** One note as Markdown: front-matter, then the body as written (links kept as [[…]]); a photo is embedded by file name. */
export function noteToMarkdown(note: Note, photoFile?: string): string {
  const lines = ['---', `title: ${quoted(note.kind === 'daily' && note.day ? note.day : noteName(note))}`, `zigoals-id: ${note.id}`, `type: ${note.kind}`];
  if (note.day) lines.push(`day: ${note.day}`);
  lines.push(`created: ${note.createdAt}`);
  if (note.updatedAt) lines.push(`updated: ${note.updatedAt}`);
  if (note.tags?.length) lines.push(`tags: [${note.tags.map(quoted).join(', ')}]`);
  if (note.source) lines.push(`source: ${note.source}`);
  if (photoFile) lines.push(`photo: ${quoted(photoFile)}`);
  if (note.example) lines.push('example: true');
  lines.push('---', '');
  const body = note.body.replace(/\r\n?/g, '\n');
  return `${lines.join('\n')}${body}${photoFile ? `${body ? '\n\n' : ''}![[${photoFile}]]` : ''}\n`;
}
/** Paths for every note: Daily/2026-11-01.md, Notes/<title>.md, Inbox/<first words>.md; a repeated name gets " 2". */
export function exportPaths(notes: readonly Note[]): Map<string, string> {
  const used = new Set<string>(), out = new Map<string, string>();
  for (const n of notes) {
    const base = safeFileBase(n.kind === 'daily' && n.day ? n.day : noteName(n));
    let path = `${FOLDER[n.kind]}/${base}.md`, i = 2;
    while (used.has(path.toLowerCase())) path = `${FOLDER[n.kind]}/${base} ${i++}.md`;
    used.add(path.toLowerCase()); out.set(n.id, path);
  }
  return out;
}
export type ExportPhoto = {data: Uint8Array; type: string};
/**
 * The ZIP's entries: every note, its photo beside it in attachments/ (when given), and a stub for each goal or habit a
 * note links to (front-matter `zigoals-stub`, so an import skips it).
 */
export function notesExportEntries(record: Notes, sources: Omit<LinkSources, 'notes'>, {now = new Date(), photos = new Map<string, ExportPhoto>()}: {now?: Date; photos?: ReadonlyMap<string, ExportPhoto>} = {}): ZipEntry[] {
  const notes = record.notes, paths = exportPaths(notes), entries: ZipEntry[] = [];
  for (const n of notes) {
    const photo = n.photoId ? photos.get(n.photoId) : undefined;
    const photoFile = photo ? `${safeFileBase(n.photoId!)}.${photo.type === 'image/jpeg' ? 'jpg' : 'webp'}` : undefined;
    if (photo && photoFile) entries.push({name: `attachments/${photoFile}`, data: photo.data, modified: now});
    entries.push({name: paths.get(n.id)!, data: noteToMarkdown(n, photoFile), modified: now});
  }
  const index = linkIndex({notes, ...sources}), stubs = new Map<string, {kind: 'goal' | 'habit'; name: string}>();
  for (const n of notes) for (const t of outgoing(n, index).targets) if (t.kind !== 'note') stubs.set(`${t.kind}:${t.id}`, {kind: t.kind, name: t.name});
  const usedStub = new Set<string>();
  for (const s of stubs.values()) {
    const base = safeFileBase(s.name), path = `ZIGoals/${s.kind === 'goal' ? 'Goals' : 'Habits'}/${base}.md`;
    if (usedStub.has(path.toLowerCase())) continue;
    usedStub.add(path.toLowerCase());
    entries.push({name: path, data: `---\ntitle: ${quoted(s.name)}\nzigoals-stub: ${s.kind}\n---\n\nA ${s.kind} in ZIGoals. Its progress stays in the app; notes that link here are about it.\n`, modified: now});
  }
  return entries;
}

/* ---- Import ------------------------------------------------------------------------------------------------------ */
export const IMPORT_MAX_FILES = 1000, IMPORT_MAX_FILE_BYTES = 512 * 1024;
export const isNoteFile = (name: string) => /\.(?:md|markdown|txt)$/i.test(name);
export type ImportFile = {name: string; data: Uint8Array};
export type ImportPlan = {add: Note[]; append: {id: string; name: string; text: string}[]; skipped: {name: string; reason: string}[]};
const clean = (text: string) => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/[\0-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
const baseOf = (path: string) => path.split('/').pop()!.replace(/\.(?:md|markdown|txt)$/i, '');
const validStamp = (s: string | undefined) => !!s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s));
/**
 * What importing these files would do, without doing it: new notes, words added to an existing daily note of the same
 * day, and what is skipped and why (a stub, a note already here, too long, not text, over the caps).
 */
export function planImport(record: Notes, files: readonly ImportFile[], now: string, today: string): ImportPlan {
  const plan: ImportPlan = {add: [], append: [], skipped: []};
  const ids = new Set(record.notes.map(n => n.id)), titles = new Set(record.notes.filter(n => n.kind !== 'daily').map(n => linkKey(noteName(n))));
  const daily = new Map(record.notes.filter(n => n.kind === 'daily' && n.day).map(n => [n.day!, n]));
  let room = Math.max(0, 2000 - record.notes.length), chars = record.notes.reduce((s, n) => s + n.title.length + n.body.length, 0);
  const decoder = new TextDecoder('utf-8');
  for (const [i, file] of files.entries()) {
    const skip = (reason: string) => plan.skipped.push({name: file.name, reason});
    if (i >= IMPORT_MAX_FILES) { skip(`only the first ${IMPORT_MAX_FILES} files are read`); continue; }
    if (!isNoteFile(file.name)) { skip('it is not a Markdown or text file'); continue; }
    if (file.data.length > IMPORT_MAX_FILE_BYTES) { skip('it is over 512 kB'); continue; }
    const {data, body: rawBody} = parseFrontMatter(clean(decoder.decode(file.data)));
    if (fmString(data, 'zigoals-stub')) { skip('it is a goal or habit stub from a ZIGoals export'); continue; }
    const body = rawBody.replace(/\n*!\[\[[^\]\n]+\.(?:png|jpe?g|webp|gif|avif|heic)\]\]\s*$/i, '').trimEnd();
    if (body.length > MAX_BODY) { skip(`it is longer than ${MAX_BODY.toLocaleString('en-US')} characters`); continue; }
    const fmId = fmString(data, 'zigoals-id'), base = baseOf(file.name);
    if (fmId && ids.has(fmId)) { skip('this note is already on this device'); continue; }
    const type = fmString(data, 'type'), dayValue = fmString(data, 'day') ?? (ISO_DAY.test(base) ? base : undefined);
    const kind: NoteKind = type && (NOTE_KINDS as readonly string[]).includes(type) ? type as NoteKind : dayValue && ISO_DAY.test(dayValue) && (type === undefined || type === 'daily') && ISO_DAY.test(base) ? 'daily' : 'topic';
    const day = dayValue && ISO_DAY.test(dayValue) && dayValue <= '9999-12-31' ? dayValue : undefined;
    if (kind === 'daily' && !day) { skip('its day is not a date'); continue; }
    if (kind === 'daily' && daily.has(day!)) {
      const existing = daily.get(day!)!;
      if (!body.trim() || existing.body.includes(body.trim())) { skip('this day’s note already holds these words'); continue; }
      if (existing.body.length + body.length + 2 > MAX_BODY) { skip(`that day’s note would be longer than ${MAX_BODY.toLocaleString('en-US')} characters`); continue; }
      if (chars + body.length > 1_500_000) { skip('notes would be too large to keep in this browser'); continue; }
      const prior = plan.append.find(a => a.id === existing.id);
      if (prior) prior.text += `\n\n${body.trim()}`; else plan.append.push({id: existing.id, name: day!, text: body.trim()});
      chars += body.length; continue;
    }
    if (!room) { skip(`notes are full on this device (at most 2000)`); continue; }
    let title = kind === 'daily' ? day! : (fmString(data, 'title') ?? base).replace(/[\r\n]+/g, ' ').trim().slice(0, MAX_TITLE);
    if (!title && kind !== 'inbox') title = 'Imported note';
    if (kind === 'topic' && titles.has(linkKey(title))) { title = `${title.slice(0, MAX_TITLE - 11)} (imported)`; }
    if (chars + title.length + body.length > 1_500_000) { skip('notes would be too large to keep in this browser'); continue; }
    const tags = fmList(data, 'tags').map(t => t.replace(/^#/, '').trim().slice(0, MAX_TAG)).filter(Boolean).slice(0, MAX_TAGS);
    const created = fmString(data, 'created');
    const note: Note = {id: newNoteId(), kind, title, body, ...(day && kind !== 'topic' ? {day} : {}), source: 'import', ...(tags.length ? {tags} : {}), createdAt: validStamp(created) ? new Date(created!).toISOString() : now};
    if (kind === 'inbox' && !note.day) note.day = today;
    plan.add.push(note); room--; chars += title.length + body.length;
    titles.add(linkKey(title)); if (kind === 'daily') daily.set(day!, note);
  }
  return plan;
}
/** Applies a plan the person confirmed; Undo takes every change back. */
export function applyImport(record: Notes, plan: ImportPlan, now: string): {record: Notes; undo: NotesUndo} {
  const before = record.notes.filter(n => plan.append.some(a => a.id === n.id));
  const notes = record.notes.map(n => { const a = plan.append.find(x => x.id === n.id); return a ? {...n, body: [n.body.trimEnd(), a.text].filter(Boolean).join('\n\n'), updatedAt: now} : n; });
  const next = checked({...record, notes: [...notes, ...plan.add].sort((a, b) => a.createdAt.localeCompare(b.createdAt))});
  return {record: next, undo: {before, created: plan.add.map(n => n.id), said: 'The import is undone.'}};
}
