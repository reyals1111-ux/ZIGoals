import {noteName, type Note} from './schema';

/**
 * Session AK (B3): [[links]] between notes, goals and habits, as Obsidian writes them: `[[Name]]`, `[[Name|shown words]]`
 * and `[[Name#heading]]` (the heading is kept, the link goes to the note). The text is the only place a link lives, so a
 * Markdown export keeps every link as it is. A link resolves by name, case and spacing aside: a note first (a daily
 * note's name is its day, "2026-11-01"), then a goal, then a habit; a name that matches nothing is an open link that
 * can become a new note. Pure; nothing here reads storage.
 */
export const MAX_LINKS_PER_NOTE = 200;
export type LinkKind = 'note' | 'goal' | 'habit';
export type LinkTarget = {kind: LinkKind; id: string; name: string; href: string};
export type ParsedLink = {target: string; alias: string | null; heading: string | null; start: number; end: number; embed: boolean};

const LINK = /(!?)\[\[([^[\]\n|#]{1,160}?)(?:#([^[\]\n|]{0,160}))?(?:\|([^[\]\n]{0,160}))?\]\]/g;
/** Every [[link]] in a text, in order (at most 200). */
export function parseLinks(text: string): ParsedLink[] {
  const out: ParsedLink[] = [];
  for (const m of text.matchAll(LINK)) {
    const target = m[2]!.trim();
    if (!target) continue;
    out.push({target, alias: m[4]?.trim() || null, heading: m[3]?.trim() || null, start: m.index!, end: m.index! + m[0].length, embed: m[1] === '!'});
    if (out.length >= MAX_LINKS_PER_NOTE) break;
  }
  return out;
}
/** A name as links compare it: Unicode-normalised, lower case, single spaces. */
export const linkKey = (name: string) => name.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

export type LinkSources = {
  notes: readonly Note[];
  goals?: readonly {id: string; name: string; href: string}[];
  habits?: readonly {id: string; title: string}[];
};
export type LinkIndex = {byKey: Map<string, LinkTarget>; all: LinkTarget[]};
export const noteHref = (id: string) => `/app/notes?note=${encodeURIComponent(id)}`;
export const habitHref = (id: string) => `/app/habits#habit-${id}`;
/** The names links can reach. A name used twice keeps its first owner (notes before goals before habits). */
export function linkIndex({notes, goals = [], habits = []}: LinkSources): LinkIndex {
  const byKey = new Map<string, LinkTarget>(), all: LinkTarget[] = [];
  const add = (t: LinkTarget) => { const key = linkKey(t.name); if (!key) return; all.push(t); if (!byKey.has(key)) byKey.set(key, t); };
  for (const n of notes) if (n.kind !== 'inbox' || n.title.trim()) add({kind: 'note', id: n.id, name: n.kind === 'daily' && n.day ? n.day : noteName(n), href: noteHref(n.id)});
  for (const g of goals) add({kind: 'goal', id: g.id, name: g.name, href: g.href});
  for (const h of habits) add({kind: 'habit', id: h.id, name: h.title, href: habitHref(h.id)});
  return {byKey, all};
}
export const resolveLink = (index: LinkIndex, target: string): LinkTarget | null => index.byKey.get(linkKey(target)) ?? null;
const same = (a: Pick<LinkTarget, 'kind' | 'id'>, b: Pick<LinkTarget, 'kind' | 'id'>) => a.kind === b.kind && a.id === b.id;

/** What a note links to: the reached targets (once each) and the names that reach nothing yet. */
export function outgoing(note: Pick<Note, 'body'>, index: LinkIndex): {targets: LinkTarget[]; open: string[]} {
  const targets: LinkTarget[] = [], open: string[] = [];
  for (const link of parseLinks(note.body)) {
    if (link.embed && /\.(?:png|jpe?g|webp|gif|avif|heic)$/i.test(link.target)) continue;
    const t = resolveLink(index, link.target);
    if (t) { if (!targets.some(x => same(x, t))) targets.push(t); }
    else if (!open.some(o => linkKey(o) === linkKey(link.target))) open.push(link.target);
  }
  return {targets, open};
}
/** The notes that link to a note, a goal or a habit (newest change first; never the note itself). */
export function backlinks(notes: readonly Note[], target: Pick<LinkTarget, 'kind' | 'id'>, index: LinkIndex): Note[] {
  return notes.filter(n => !n.locked && !(target.kind === 'note' && n.id === target.id) && parseLinks(n.body).some(l => { const t = resolveLink(index, l.target); return !!t && same(t, target); }))
    .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
}
/** One line around the first link to the target, for a backlink list (at most ~140 characters). */
export function backlinkSnippet(note: Pick<Note, 'body'>, target: Pick<LinkTarget, 'kind' | 'id'>, index: LinkIndex): string {
  const link = parseLinks(note.body).find(l => { const t = resolveLink(index, l.target); return !!t && same(t, target); });
  if (!link) return '';
  const lineStart = note.body.lastIndexOf('\n', link.start) + 1, lineEnd = note.body.indexOf('\n', link.end);
  const line = note.body.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).trim();
  return line.length > 140 ? `${line.slice(0, 137)}…` : line;
}

/* ---- Autocomplete ------------------------------------------------------------------------------------------------ */
/** The words typed after an unclosed `[[` before the caret, on the same line (null when the caret is not in a link). */
export function linkQueryAt(text: string, caret: number): {query: string; start: number} | null {
  const before = text.slice(0, caret), open = before.lastIndexOf('[[');
  if (open < 0) return null;
  const query = before.slice(open + 2);
  if (/[\]\n|#]/.test(query) || query.includes('[[') || query.length > 80) return null;
  return {query, start: open};
}
const KIND_ORDER: Record<LinkKind, number> = {note: 0, goal: 1, habit: 2};
/** The names that fit what was typed: a whole-name start first, then a word start, then anywhere; at most `limit`. */
export function suggestLinks(index: LinkIndex, query: string, limit = 8, exclude?: Pick<LinkTarget, 'kind' | 'id'>): LinkTarget[] {
  const q = linkKey(query), seen = new Set<string>();
  const scored: {t: LinkTarget; s: number}[] = [];
  for (const t of index.all) {
    if (exclude && same(t, exclude)) continue;
    const key = linkKey(t.name);
    if (seen.has(`${t.kind}:${t.id}`) || index.byKey.get(key) !== t) continue;
    seen.add(`${t.kind}:${t.id}`);
    const s = !q ? 1 : key === q ? 4 : key.startsWith(q) ? 3 : key.split(' ').some(w => w.startsWith(q)) ? 2 : key.includes(q) ? 1 : 0;
    if (s) scored.push({t, s});
  }
  return scored.sort((a, b) => b.s - a.s || KIND_ORDER[a.t.kind] - KIND_ORDER[b.t.kind] || a.t.name.localeCompare(b.t.name)).slice(0, limit).map(x => x.t);
}
/** The text with `[[query` (from `start` to the caret) replaced by a whole `[[Name]]`, and where the caret goes. */
export function completeLink(text: string, start: number, caret: number, name: string): {text: string; caret: number} {
  const rest = text.slice(caret), closing = rest.startsWith(']]') ? 2 : 0;
  const link = `[[${name.replace(/[[\]|#\n]/g, ' ').replace(/\s+/g, ' ').trim()}]]`;
  return {text: `${text.slice(0, start)}${link}${rest.slice(closing)}`, caret: start + link.length};
}

/* ---- Session AV lane 2 (r5-notes; LEDGER #358, Logseq's unlinked references) ------------------------------------- */
export type Mention = {note: Note; line: string; start: number; end: number; words: string};
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The text with the parts that are not words to search blanked (same length): [[links]], `code`, fenced code, addresses. */
function blanked(text: string): string {
  const blank = (m: string) => ' '.repeat(m.length);
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank).replace(/!?\[\[[^\]\n]*\]\]/g, blank).replace(/!?\[[^\]\n]*\]\([^)\n]*\)/g, blank /* review b5i B5I-7: a Markdown link's words too */).replace(/`[^`\n]*`/g, blank).replace(/\b(?:https?:\/\/|www\.)\S+/gi, blank).replace(/\]\([^)\n]*\)/g, blank);
}
/**
 * The notes whose words name a note's title (whole words, any case) but do not link it — never the note itself, a
 * locked or archived note, or a name shorter than three characters. Each with its first such place and the line it is
 * on (at most ~140 characters), newest change first. Derived each time; nothing stored.
 */
export function unlinkedMentions(notes: readonly Note[], target: Pick<Note, 'id'>, name: string, index: LinkIndex, limit = 20): Mention[] {
  const words = name.normalize('NFC').trim();
  if (words.length < 3) return [];
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(words).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}_])`, 'iu'), out: Mention[] = [];
  const self = {kind: 'note' as const, id: target.id};
  for (const n of [...notes].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))) {
    if (n.id === target.id || n.locked || n.archived || !n.body) continue;
    if (parseLinks(n.body).some(l => { const t = resolveLink(index, l.target); return !!t && same(t, self); })) continue;
    const body = n.body.normalize('NFC'), m = re.exec(blanked(body));
    if (!m) continue;
    const start = m.index, end = start + m[0].length;
    const ls = body.lastIndexOf('\n', start) + 1, le = body.indexOf('\n', end), line = body.slice(ls, le < 0 ? undefined : le).trim();
    out.push({note: n, line: line.length > 140 ? `${line.slice(0, 137)}…` : line, start, end, words: body.slice(start, end)});
    if (out.length >= limit) break;
  }
  return out;
}
/** The words with that one place made a [[link]] to the note (its own words kept as the shown words when they differ). */
export function linkMention(body: string, mention: Pick<Mention, 'start' | 'end' | 'words'>, name: string): string {
  const text = body.normalize('NFC');
  if (text.slice(mention.start, mention.end) !== mention.words) throw new Error('The note changed meanwhile. Open it to link the words yourself.');
  const target = name.replace(/[[\]|#\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const link = mention.words === target ? `[[${target}]]` : `[[${target}|${mention.words.replace(/[[\]|\n]/g, ' ')}]]`;
  return `${text.slice(0, mention.start)}${link}${text.slice(mention.end)}`;
}
