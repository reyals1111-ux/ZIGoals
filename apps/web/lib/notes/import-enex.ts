import {parseXml, XmlReadError, type MiniElement} from '../workouts/mini-xml';
import {MAX_NOTE_PHOTOS_EACH} from './schema';
import type {ImportFile} from './markdown';
import {safeFileBase} from './markdown';
import type {ZipFile, ZipSkip} from './zip-read';

/**
 * Session AV lane 2 (r4-notes; LEDGER #321, Bear's imports): notes from Evernote and from Bear, read on this device and
 * turned into Markdown files for the notes' own import (lib/notes/markdown.ts planImport → applyImport, with its caps,
 * its plan shown first and its Undo). Nothing in a file is ever run.
 * - Evernote's .enex: its documented XML (en-export → note → title, content, created, tag, resource). The app's Content
 *   Security Policy refuses the browser's DOMParser on plain strings (Trusted Types), so the export and each note's ENML
 *   are read with the repository's small strict XML reader (lib/workouts/mini-xml.ts); a file that declares its own
 *   entities is refused. ENML becomes Markdown: headings, paragraphs, lists, to-dos (as tick boxes), bold, italics,
 *   https links, code, quotes and tables. Its first eight images come in as the note's photos, each placed where it was.
 * - Bear's TextBundle export (.textbundle, .textpack) and backup (.bear2bk): ZIPs of `<name>.textbundle/text.md` (or
 *   text.markdown), `info.json` and `assets/`. Bear's first `# line` is the title; `#tags` (nested ones too, and Bear's
 *   `#multi word#`) stay in the text, where Notes reads them (LEDGER #306); `![](assets/…)` photos come in as the note's
 *   photos, up to eight.
 * Each photo is written in the text as `![photo](imp-<n>)` until the caller keeps it on this device and names its id.
 */
export type ForeignImage = {key: string; data: Uint8Array; type: string};
export type ForeignNote = {name: string; title: string; created?: string; tags: string[]; body: string; images: ForeignImage[]};
export const ENEX_MAX_BYTES = 50 * 1024 * 1024, FOREIGN_MAX_NOTES = 1000, FOREIGN_IMAGE_MAX = 10 * 1024 * 1024;
export const isEnex = (name: string) => /\.enex$/i.test(name);
export const isBearArchive = (name: string) => /\.(?:bear2bk|textpack|textbundle)$/i.test(name);
const IMAGE = /^image\/(?:png|jpe?g|gif|webp|heic|heif|bmp)$/i;
const placeholder = (n: number) => `![photo](imp-${n})`;

/* ---- Evernote ---------------------------------------------------------------------------------------------------- */
/** HTML's named characters ENML may use; any other name is read as a space. */
const NAMED: Record<string, string> = {nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', bull: '•', middot: '·', copy: '©', reg: '®', trade: '™', deg: '°', euro: '€', pound: '£', yen: '¥', cent: '¢', times: '×', divide: '÷', plusmn: '±', frac12: '½', frac14: '¼', frac34: '¾', sect: '§', para: '¶', iexcl: '¡', iquest: '¿', larr: '←', rarr: '→', uarr: '↑', darr: '↓', check: '✓', hearts: '♥', zwnj: '‌', zwj: '‍', shy: ''};
const XML_OWN = new Set(['lt', 'gt', 'amp', 'quot', 'apos']);
const entities = (text: string) => text.replace(/&([A-Za-z][A-Za-z0-9]{1,10});/g, (all, name: string) => XML_OWN.has(name) ? all : NAMED[name] ?? (/^[A-Za-z]+$/.test(name) ? ' ' : all));
/** Evernote's stamp ("20201231T120000Z") as an ISO time, or undefined. */
export function enexTime(raw: string | undefined): string | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec((raw ?? '').trim());
  if (!m) return undefined;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : undefined;
}
const child = (el: MiniElement, name: string) => el.children.find(c => c.localName.toLowerCase() === name);
const SKIP = new Set(['script', 'style', 'object', 'embed', 'iframe', 'head', 'title', 'applet', 'form', 'input', 'button', 'select', 'textarea']);
const LINE_BLOCKS = new Set(['div', 'section', 'article', 'header', 'footer', 'center', 'address', 'dd', 'dt', 'figure', 'figcaption']);
type Out = {lines: string[]; cur: string; prefix: string; lists: {ordered: boolean; n: number}[]; images: number; imageAt: (type: string) => string};
const flush = (o: Out) => { if (o.cur.trim()) o.lines.push(`${o.prefix}${o.cur.replace(/[ \t]+$/g, '')}`); o.cur = ''; };
const gap = (o: Out) => { flush(o); if (o.lines.length && o.lines[o.lines.length - 1] !== '') o.lines.push(''); };
/** Puts a mark round the words written since `at`, with any space outside the mark (`** tea **` would not read). */
function wrap(o: Out, at: number, mark: string): void {
  const before = o.cur.slice(0, at), inner = o.cur.slice(at), words = inner.trim();
  if (!words) return;
  o.cur = `${before}${/^\s/.test(inner) && before && !/\s$/.test(before) ? ' ' : ''}${mark}${words}${mark}${/\s$/.test(inner) ? ' ' : ''}`;
}
const safeHttps = (href: string | null) => href && /^https:\/\/[^\s<>"'`]+$/i.test(href.trim()) ? href.trim() : null;
function walk(node: string | MiniElement, o: Out): void {
  if (typeof node === 'string') { o.cur += node.replace(/\s+/g, ' ').replace(/^ /, o.cur && !o.cur.endsWith(' ') ? ' ' : ''); return; }
  const name = node.localName.toLowerCase(), kids = (n: MiniElement) => { for (const c of parts(n)) walk(c, o); };
  if (SKIP.has(name)) return;
  const heading = /^h([1-6])$/.exec(name);
  if (heading) { gap(o); o.cur = `${'#'.repeat(Math.min(3, Number(heading[1])))} `; kids(node); gap(o); return; }
  switch (name) {
    case 'br': flush(o); return;
    case 'p': gap(o); kids(node); gap(o); return;
    case 'hr': gap(o); return;
    case 'ul': case 'ol': flush(o); o.lists.push({ordered: name === 'ol', n: 0}); kids(node); o.lists.pop(); if (!o.lists.length) gap(o); return;
    case 'li': { flush(o); const l = o.lists[o.lists.length - 1], depth = Math.max(1, o.lists.length); o.cur = `${'  '.repeat(depth - 1)}${l?.ordered ? `${++l.n}. ` : '- '}`; kids(node); flush(o); return; }
    case 'en-todo': { const box = /^true$/i.test(node.getAttribute('checked') ?? '') ? '[x] ' : '[ ] '; if (!o.cur.trim()) o.cur = `${o.cur}${o.lists.length ? '' : '- '}${box}`; else o.cur += box; return; }
    case 'b': case 'strong': { const at = o.cur.length; kids(node); wrap(o, at, '**'); return; }
    case 'i': case 'em': { const at = o.cur.length; kids(node); wrap(o, at, '*'); return; }
    case 'code': if (!o.cur.includes('```')) { o.cur += `\`${node.textContent.replace(/`/g, "'").replace(/\s+/g, ' ')}\``; return; } kids(node); return;
    case 'a': { const href = safeHttps(node.getAttribute('href')), text = node.textContent.replace(/\s+/g, ' ').trim(); if (href && text && text !== href) o.cur += `[${text.replace(/[[\]]/g, '')}](${href})`; else o.cur += href ?? text; return; }
    case 'pre': { gap(o); o.lines.push('```', ...node.textContent.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n'), '```'); gap(o); return; }
    case 'blockquote': { gap(o); const was = o.prefix; o.prefix = `${was}> `; kids(node); flush(o); o.prefix = was; gap(o); return; }
    case 'table': {
      gap(o);
      const rows = node.getElementsByTagName('*').filter(e => e.localName.toLowerCase() === 'tr').map(tr => tr.children.filter(c => /^t[dh]$/i.test(c.localName)).map(c => c.textContent.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim()));
      const width = Math.max(0, ...rows.map(r => r.length));
      if (width) rows.forEach((r, i) => { o.lines.push(`| ${Array.from({length: width}, (_, c) => r[c] ?? '').join(' | ')} |`); if (i === 0) o.lines.push(`| ${Array.from({length: width}, () => '---').join(' | ')} |`); });
      gap(o); return;
    }
    case 'en-media': { const type = node.getAttribute('type') ?? ''; if (IMAGE.test(type)) { const line = o.imageAt(type); if (line) { gap(o); o.lines.push(line); gap(o); } else o.cur += '(an image from Evernote, left out) '; } else o.cur += '(an attachment from Evernote, left out) '; return; }
    case 'en-crypt': o.cur += '(encrypted text from Evernote, left out) '; return;
    default:
      if (LINE_BLOCKS.has(name)) { flush(o); kids(node); flush(o); return; }
      kids(node);
  }
}
/** The element's text and child elements in order (the reader keeps them as parts). */
function parts(el: MiniElement): (string | MiniElement)[] { return (el as unknown as {parts: (string | MiniElement)[]}).parts; }
/** ENML (a note's content) as Markdown; `imageAt` names the next image's line (or null when no more are taken). */
export function enmlToMarkdown(enml: string, imageAt: (type: string) => string | null = () => null): string {
  const src = entities(enml.replace(/^﻿/, '').replace(/^\s*<\?xml[^>]*\?>/, ''));
  let root: MiniElement;
  try { root = parseXml(src).documentElement; }
  catch { return src.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(?:div|p|li|h[1-6])>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim(); }
  const o: Out = {lines: [], cur: '', prefix: '', lists: [], images: 0, imageAt: t => imageAt(t) ?? ''};
  walk(root, o); flush(o);
  return o.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
const fromBase64 = (text: string): Uint8Array | null => { try { const raw = atob(text.replace(/\s+/g, '')); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; } catch { return null; } };
/** The notes of an Evernote export; a note that cannot be read is skipped with its reason. */
export function readEnex(text: string, fileName = 'Evernote.enex'): {notes: ForeignNote[]; skipped: ZipSkip[]} {
  const skipped: ZipSkip[] = [], notes: ForeignNote[] = [];
  if (/<!ENTITY/i.test(text)) return {notes, skipped: [{name: fileName, reason: 'it declares its own XML entities, which ZIGoals does not open'}]};
  let doc;
  try { doc = parseXml(text.replace(/^﻿/, '')); } catch (e) { return {notes, skipped: [{name: fileName, reason: e instanceof XmlReadError ? 'it is not an Evernote export ZIGoals can read' : 'it could not be read'}]}; }
  if (doc.documentElement.localName !== 'en-export') return {notes, skipped: [{name: fileName, reason: 'it is not an Evernote export (.enex)'}]};
  const all = doc.documentElement.children.filter(c => c.localName === 'note');
  for (const [i, n] of all.entries()) {
    const title = (child(n, 'title')?.textContent ?? '').replace(/\s+/g, ' ').trim() || 'Evernote note';
    if (i >= FOREIGN_MAX_NOTES) { skipped.push({name: title, reason: `only the first ${FOREIGN_MAX_NOTES} notes of an export are read`}); continue; }
    const images: ForeignImage[] = [], pending = n.children.filter(c => c.localName === 'resource').flatMap(r => {
      const mime = (child(r, 'mime')?.textContent ?? '').trim(), data = child(r, 'data');
      return IMAGE.test(mime) && data ? [{mime, data}] : [];
    });
    let next = 0;
    const imageAt = (type: string) => {
      if (images.length >= MAX_NOTE_PHOTOS_EACH) return null;
      const at = pending.findIndex((p, k) => k >= next && p.mime.toLowerCase() === type.toLowerCase()), pick = at >= 0 ? at : next < pending.length ? next : -1;
      if (pick < 0) return null;
      next = pick + 1;
      const bytes = fromBase64(pending[pick]!.data.textContent);
      if (!bytes || !bytes.length || bytes.length > FOREIGN_IMAGE_MAX) return null;
      const key = `imp-${images.length + 1}`; images.push({key, data: bytes, type: pending[pick]!.mime.toLowerCase()});
      return placeholder(images.length);
    };
    const body = enmlToMarkdown(child(n, 'content')?.textContent ?? '', imageAt);
    const tags = n.children.filter(c => c.localName === 'tag').map(t => t.textContent.trim()).filter(Boolean);
    notes.push({name: `Evernote/${safeFileBase(title)}.md`, title, created: enexTime(child(n, 'created')?.textContent), tags, body, images});
  }
  return {notes, skipped};
}

/* ---- Bear (TextBundle) ------------------------------------------------------------------------------------------- */
const BUNDLE = /^(?:.*\/)?([^/]+)\.textbundle\/(text\.(?:md|markdown|txt)|info\.json|assets\/[^/]+)$/i;
/** The entries of a Bear archive this reader wants: each bundle's text, info.json and assets. */
export const bearWanted = (name: string) => BUNDLE.test(name) || /^(?:text\.(?:md|markdown|txt)|info\.json|assets\/[^/]+)$/i.test(name);
const imageType = (name: string) => /\.png$/i.test(name) ? 'image/png' : /\.gif$/i.test(name) ? 'image/gif' : /\.webp$/i.test(name) ? 'image/webp' : /\.hei[cf]$/i.test(name) ? 'image/heic' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : null;
/** Bear's `#multi word#` tags as `#multi-word` (a tag of one word stays as written). */
export const bearTags = (text: string) => text.replace(/(^|[\s(])#([\p{L}\p{N}][^#\n]*?[\p{L}\p{N}])#(?=$|[\s.,;:!?)])/gmu, (all, lead: string, words: string) => /\s/.test(words) ? `${lead}#${words.trim().replace(/\s+/g, '-')}` : all);
/** The notes in a Bear archive's files (bundles by folder; a .textbundle opened on its own has its files at the top). */
export function readBear(files: readonly ZipFile[], archive = 'Bear'): {notes: ForeignNote[]; skipped: ZipSkip[]} {
  const bundles = new Map<string, {text?: Uint8Array; info?: Uint8Array; assets: Map<string, Uint8Array>}>(), skipped: ZipSkip[] = [];
  for (const f of files) {
    const m = BUNDLE.exec(f.name), key = m ? f.name.slice(0, f.name.toLowerCase().lastIndexOf('.textbundle/') + 11) : archive, part = m ? m[2]! : f.name;
    const b = bundles.get(key) ?? {assets: new Map()}; bundles.set(key, b);
    if (/^text\./i.test(part)) b.text = f.data; else if (/^info\.json$/i.test(part)) b.info = f.data; else b.assets.set(part.replace(/^assets\//i, ''), f.data);
  }
  const notes: ForeignNote[] = [], decode = (d: Uint8Array) => new TextDecoder('utf-8').decode(d);
  for (const [key, b] of bundles) {
    const label = key.split('/').pop()!.replace(/\.textbundle$/i, '');
    if (!b.text) { skipped.push({name: key, reason: 'it has no text.md'}); continue; }
    if (notes.length >= FOREIGN_MAX_NOTES) { skipped.push({name: label, reason: `only the first ${FOREIGN_MAX_NOTES} notes are read`}); continue; }
    let created: string | undefined;
    try { const info = b.info ? JSON.parse(decode(b.info)) as Record<string, unknown> : {}; const bear = (info['net.shinyfrog.bear'] ?? {}) as Record<string, unknown>; const c = bear.creationDate; if (typeof c === 'string' && Number.isFinite(Date.parse(c))) created = new Date(c).toISOString(); } catch { /* no dates then */ }
    const images: ForeignImage[] = [];
    let text = bearTags(decode(b.text).replace(/^﻿/, '').replace(/\r\n?/g, '\n'));
    // Photos: `![…](assets/x.jpg)` (Bear also writes `[assets/x.jpg]`), each on a line of its own, up to eight.
    text = text.replace(/!\[[^\]\n]*\]\((?:\.\/)?assets\/([^)\n]+)\)|\[(?:\.\/)?assets\/([^\]\n]+)\]/g, (all, a?: string, c?: string) => {
      const name = decodeURIComponent((a ?? c ?? '').trim()), data = b.assets.get(name), type = imageType(name);
      if (!data || !type) return `(${name.split('/').pop()}, a file from Bear, left out)`;
      if (images.length >= MAX_NOTE_PHOTOS_EACH || data.length > FOREIGN_IMAGE_MAX) return '(a photo from Bear, left out)';
      images.push({key: `imp-${images.length + 1}`, data, type});
      return `\n\n${placeholder(images.length)}\n\n`;
    }).replace(/\n{3,}/g, '\n\n');
    const first = /^\s*#\s+(.+?)\s*#*\s*$/m.exec(text.split('\n').find(l => l.trim()) ?? '');
    const title = (first?.[1] ?? label).replace(/\s+/g, ' ').trim().slice(0, 120) || 'Bear note';
    if (first) text = text.replace(/^\s*#\s+.+\n?/, '');
    notes.push({name: `Bear/${safeFileBase(title)}.md`, title, created, tags: [], body: text.trim(), images});
  }
  return {notes, skipped};
}

/** The notes as Markdown files for planImport (front matter: title, created, tags), each with a file name of its own. */
export function foreignFiles(notes: readonly ForeignNote[]): {files: ImportFile[]; images: Map<string, ForeignImage[]>} {
  const used = new Set<string>(), files: ImportFile[] = [], images = new Map<string, ForeignImage[]>(), enc = new TextEncoder();
  for (const n of notes) {
    let name = n.name, k = 2;
    while (used.has(name.toLowerCase())) name = n.name.replace(/\.md$/, ` ${k++}.md`);
    used.add(name.toLowerCase());
    const fm = ['---', `title: ${JSON.stringify(n.title)}`, ...(n.created ? [`created: ${n.created}`] : []), ...(n.tags.length ? [`tags: [${n.tags.map(t => JSON.stringify(t.replace(/\s+/g, '-'))).join(', ')}]`] : []), '---', ''];
    files.push({name, data: enc.encode(`${fm.join('\n')}${n.body}\n`)});
    if (n.images.length) images.set(name, n.images);
  }
  return {files, images};
}
/** A kept note's body with each import placeholder named by its kept photo id (a photo not kept loses its line); the first photo has no line. */
export function namePhotos(body: string, kept: ReadonlyMap<string, string>): {body: string; photoId?: string; photos: string[]} {
  const ids: string[] = [];
  const out = body.replace(/^[ \t]*!\[photo\]\((imp-\d+)\)[ \t]*$/gm, (_l, key: string) => { const id = kept.get(key); if (!id) return ''; ids.push(id); return ids.length === 1 ? '' : `![photo](${id})`; });
  return {body: out.replace(/\n{3,}/g, '\n\n').trim(), ...(ids[0] ? {photoId: ids[0]} : {}), photos: ids.slice(1)};
}
