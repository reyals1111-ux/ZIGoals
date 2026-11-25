import {sleepSchema, type Sleep} from './schema';

/**
 * Session AW (X6; LEDGER #459, Sleep as Android's tag editing): rename or remove a sleep tag on every night at once, with
 * one Undo. Ordinary writes of each night's `tags` in Health's strict, synced sleep group — no new field: a changed night
 * gets a new `updatedAt`, so the newer edit wins in sync as any edit does. A rename onto a tag a night already has keeps
 * one (tags are compared without regard to case), so a night never holds the same tag twice; a night left with no tag has
 * no `tags` at all, as a night saved without tags. (lib/notes/tag-rename.ts is the notes' own.)
 */
export const SLEEP_TAG_MAX = 24;
const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();
export type TagCount = {tag: string; nights: number};
/** Every tag in use, the most used first (then A–Z), with the number of nights and naps that carry it. */
export function tagCounts(s: Sleep): TagCount[] {
  const counts = new Map<string, TagCount>();
  for (const n of s.nights) for (const t of new Set(n.tags ?? [])) {
    const key = t.toLocaleLowerCase(), hit = counts.get(key);
    if (hit) hit.nights++; else counts.set(key, {tag: t, nights: 1});
  }
  return [...counts.values()].sort((a, b) => b.nights - a.nights || a.tag.localeCompare(b.tag));
}
/** What a change did: the next sleep group and each changed night's tags before it (for Undo). */
export type TagChange = {next: Sleep; before: Map<string, string[] | undefined>; nights: number};
function change(s: Sleep, at: Date, edit: (tags: string[]) => string[] | null): TagChange {
  const now = at.toISOString(), before = new Map<string, string[] | undefined>();
  const nights = s.nights.map(n => {
    const tags = n.tags ?? [], next = tags.length ? edit(tags) : null;
    if (!next) return n;
    before.set(n.id, n.tags);
    const {tags: _old, ...rest} = n; void _old;
    return next.length ? {...rest, tags: next, updatedAt: now} : {...rest, updatedAt: now};
  });
  return {next: before.size ? sleepSchema.parse({...s, nights}) : s, before, nights: before.size};
}
/** Every night's `from` becomes `to` (trimmed, at most 24 characters); a night that has both keeps one. */
export function renameSleepTag(s: Sleep, from: string, to: string, at: Date): TagChange {
  const name = to.trim().replace(/\s+/g, ' ');
  if (!name) throw Error('Give the tag a name.');
  if (name.length > SLEEP_TAG_MAX) throw Error(`Keep a tag to ${SLEEP_TAG_MAX} characters.`);
  if (name === from) throw Error('That is the name it has already.');
  return change(s, at, tags => {
    if (!tags.some(t => same(t, from))) return null;
    const out: string[] = [];
    for (const t of tags.map(t => same(t, from) ? name : t)) if (!out.some(o => same(o, t))) out.push(t);
    return out;
  });
}
/** The tag taken off every night that carries it. */
export function removeSleepTag(s: Sleep, tag: string, at: Date): TagChange {
  return change(s, at, tags => tags.some(t => same(t, tag)) ? tags.filter(t => !same(t, tag)) : null);
}
/**
 * The one Undo: each changed night gets its tags from before back (a night removed meanwhile stays removed; nothing else
 * on a night is touched), stamped now so the undo also wins in sync.
 */
export function restoreSleepTags(s: Sleep, before: ReadonlyMap<string, string[] | undefined>, at: Date): Sleep {
  if (!before.size) return s;
  const now = at.toISOString();
  return sleepSchema.parse({...s, nights: s.nights.map(n => {
    if (!before.has(n.id)) return n;
    const tags = before.get(n.id), {tags: _old, ...rest} = n; void _old;
    return tags?.length ? {...rest, tags, updatedAt: now} : {...rest, updatedAt: now};
  })});
}
