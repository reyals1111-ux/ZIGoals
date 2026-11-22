import {MAX_TAG, MAX_TAGS, type Note} from './schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #306, Bear's tags): a note's tags are written in its text (`#travel`, nested with
 * "/" as `#work/meetings`, which sits under `#work`) and in the editor's Tags field, and both are kept in the note's
 * `tags` when it is saved. Read back, a note's tags are its kept ones and the ones in its text (so a note written before
 * this build counts its #tags too). A tag needs a letter, starts after a space or a line start (so `https://a#b`,
 * `[[Note#part]]` and `# Heading` are not tags) and is never read inside code. Pure.
 */
const FENCE = /^\s*(```+|~~~+)/;
/** A tag in running text: its leading space (or start) in group 1, the tag in group 2. */
export const TAG_IN_TEXT = /(^|[\s(\[{,;"'“‘])#([\p{L}\p{N}_](?:[\p{L}\p{N}_\-/]*[\p{L}\p{N}_])?)(?=$|[\s.,;:!?)\]}"'”’])/gu;
const tidy = (t: string) => t.replace(/^#+/, '').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '').trim();
const ok = (t: string) => !!t && t.length <= MAX_TAG && /\p{L}/u.test(t);
const key = (t: string) => t.toLowerCase();
function unique(tags: Iterable<string>): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const raw of tags) { const t = tidy(raw); if (ok(t) && !seen.has(key(t))) { seen.add(key(t)); out.push(t); } }
  return out;
}
/** The text without fenced code and inline code (where a # is never a tag). */
function prose(body: string): string {
  let fence: string | null = null;
  return body.replace(/\r\n?/g, '\n').split('\n').map(l => {
    const f = FENCE.exec(l);
    if (f) { if (!fence) fence = f[1]![0]!; else if (l.trim().startsWith(fence)) fence = null; return ''; }
    return fence ? '' : l.replace(/`[^`\n]*`/g, ' ');
  }).join('\n');
}
/** The tags written in a text, in the order written, each once (compared without case). */
export function textTags(body: string): string[] {
  return unique([...prose(body).matchAll(TAG_IN_TEXT)].map(m => m[2]!));
}
/** A note's tags: the ones it keeps, then any more in its text. */
export const noteTags = (note: Pick<Note, 'tags' | 'body'>): string[] => unique([...(note.tags ?? []), ...textTags(note.body)]);
/** The kept tags that are not written in the text: what the editor's Tags field shows. */
export function fieldTags(note: Pick<Note, 'tags' | 'body'>): string[] {
  const inText = new Set(textTags(note.body).map(key));
  return unique(note.tags ?? []).filter(t => !inText.has(key(t)));
}
/** The Tags field's words as tags: split on commas and spaces, a leading # dropped. */
export const parseTagField = (text: string): string[] => unique(text.split(/[,\s]+/));
/** What a save keeps as the note's tags: the ones in the text, then the field's; at most twelve. */
export const tagsForSave = (field: readonly string[], body: string): string[] => unique([...textTags(body), ...field]).slice(0, MAX_TAGS);
/** Whether a note carries this tag or one nested under it (`work` matches #work and #work/meetings). */
export function hasTag(note: Pick<Note, 'tags' | 'body'>, tag: string): boolean {
  const t = key(tidy(tag));
  return noteTags(note).some(x => key(x) === t || key(x).startsWith(`${t}/`));
}
export type TagNode = {tag: string; name: string; depth: number; count: number};
/**
 * Every tag and its parents as a tree in reading order (a parent before its children, A→Z), each with how many notes
 * carry it or a tag under it (a note counted once per tag). `#work/meetings` alone makes `work` (1) and `work/meetings` (1).
 */
export function tagTree(notes: readonly Pick<Note, 'tags' | 'body'>[]): TagNode[] {
  const by = new Map<string, {tag: string; notes: Set<number>}>();
  notes.forEach((n, i) => {
    for (const t of noteTags(n)) {
      const parts = t.split('/');
      for (let d = 1; d <= parts.length; d++) {
        const path = parts.slice(0, d).join('/'), k = key(path), hit = by.get(k);
        if (hit) hit.notes.add(i); else by.set(k, {tag: path, notes: new Set([i])});
      }
    }
  });
  return [...by.values()].sort((a, b) => key(a.tag).localeCompare(key(b.tag)))
    .map(x => ({tag: x.tag, name: x.tag.split('/').pop()!, depth: x.tag.split('/').length - 1, count: x.notes.size}));
}
/** The notes Notes shows under a focus tag (all of them when there is none). */
export const focused = <T extends Pick<Note, 'tags' | 'body'>>(notes: readonly T[], tag: string | undefined): T[] => tag ? notes.filter(n => hasTag(n, tag)) : [...notes];
/** Splits running text into words and the tags in it, for the reading view. */
export function splitTags(text: string): (string | {tag: string})[] {
  const out: (string | {tag: string})[] = [];
  let at = 0;
  for (const m of text.matchAll(TAG_IN_TEXT)) {
    const tag = tidy(m[2]!), start = m.index + m[1]!.length;
    if (!ok(tag)) continue;
    if (start > at) out.push(text.slice(at, start));
    out.push({tag}); at = start + 1 + m[2]!.length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
