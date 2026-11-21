import type {Journal, JournalEntry} from './schema';

/**
 * Session AV (owner follow-up 1, F-JOURNAL-TAGS; Day One): tags on journal entries — add, remove, filter — in the entry's
 * existing optional `tags` field (at most 8 per entry, 24 characters each; lib/journal/schema.ts). Nothing new is stored
 * and no format changes. A tag is compared without case; the first spelling the person used is kept. Pure.
 */
export const MAX_TAGS = 8, MAX_TAG = 24;
/** A tag as kept: spaces tidied, no leading "#", at most 24 characters; null when nothing is left. */
export function cleanTag(raw: string): string | null {
  const t = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG).trim();
  return t ? t : null;
}
/** Tags typed as "work, family #walk" read as ["work", "family", "walk"] (commas, or a # before each). */
export function readTags(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(/[,;]|\s(?=#)/)) { const t = cleanTag(part); if (t && !out.some(x => x.toLowerCase() === t.toLowerCase())) out.push(t); }
  return out.slice(0, MAX_TAGS);
}
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
/** The entry with `tag` added (no double, never past 8); unchanged when it cannot take it. */
export function withTag(entry: JournalEntry, raw: string): JournalEntry {
  const tag = cleanTag(raw), tags = entry.tags ?? [];
  if (!tag || tags.some(t => same(t, tag)) || tags.length >= MAX_TAGS) return entry;
  return {...entry, tags: [...tags, tag]};
}
/** The entry without `tag`; the field leaves when the last tag goes. */
export function withoutTag(entry: JournalEntry, tag: string): JournalEntry {
  const tags = (entry.tags ?? []).filter(t => !same(t, tag));
  const {tags: _drop, ...rest} = entry; void _drop;
  return tags.length ? {...rest, tags} : rest;
}
/** One entry of the journal changed by `change` (by id); the rest as they are. */
export const changeEntry = (journal: Journal, id: string, change: (e: JournalEntry) => JournalEntry): Journal => ({...journal, entries: journal.entries.map(e => e.id === id ? change(e) : e)});
/** Every tag in use with how many entries carry it, most used first, then by name. */
export function tagCounts(entries: readonly Pick<JournalEntry, 'tags'>[]): {tag: string; count: number}[] {
  const by = new Map<string, {tag: string; count: number}>();
  for (const e of entries) for (const t of e.tags ?? []) { const k = t.toLowerCase(), hit = by.get(k); if (hit) hit.count++; else by.set(k, {tag: t, count: 1}); }
  return [...by.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
export const hasTag = (entry: Pick<JournalEntry, 'tags'>, tag: string | null) => !tag || (entry.tags ?? []).some(t => same(t, tag));
