import type {MoneyEntry} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import {MAX_TAGGED_ENTRIES, MAX_TAGS_PER_ENTRY, MAX_TAG_LENGTH, moneyTagsSchema, tagText, type MoneyTags} from './schema';

/**
 * Session AP (owner-approved): tags on money entries, pure (lib/money-tags/schema.ts holds the record). Every reader goes
 * through the ids the money log holds now, so a removed entry's tags never show and never count; totals are exact cents,
 * one currency at a time (never added across currencies), spending and income apart.
 */
/** A tag as typed → as stored ("  Holiday   Trip " → "holiday trip"), or null when it is not a tag. */
export function normaliseTag(raw: string): string | null {
  const t = raw.normalize('NFC').trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase();
  return tagText.safeParse(t).success ? t : null;
}
/** "holiday, Work trip; #gifts" → the tags (each once, in order) or the reason they cannot be saved. */
export function parseTags(raw: string): {ok: true; tags: string[]} | {ok: false; problem: string} {
  const parts = raw.split(/[,;\n]/).map(p => p.trim()).filter(Boolean), tags: string[] = [];
  for (const p of parts) {
    const t = normaliseTag(p);
    if (!t) return {ok: false, problem: p.length > MAX_TAG_LENGTH + 1 ? `“${p.slice(0, 30)}” is longer than ${MAX_TAG_LENGTH} characters.` : `“${p.slice(0, 30)}” can’t be a tag: use letters, digits, spaces, “-” or “_”.`};
    if (!tags.includes(t)) tags.push(t);
  }
  if (tags.length > MAX_TAGS_PER_ENTRY) return {ok: false, problem: `Up to ${MAX_TAGS_PER_ENTRY} tags for one entry.`};
  return {ok: true, tags};
}
const own = (record: MoneyTags, id: string) => Object.hasOwn(record.tags, id) ? record.tags[id]! : undefined;
/** The entry's tags (none: an empty list). */
export const tagsOf = (record: MoneyTags, id: string): readonly string[] => own(record, id) ?? [];
/**
 * The record with one entry's tags set (an empty list removes them). With the record full, the tags of entries the log no
 * longer holds are dropped first; still full, it throws with nothing changed.
 */
export function setEntryTags(record: MoneyTags, id: string, tags: readonly string[], liveIds: ReadonlySet<string>): MoneyTags {
  const clean = [...new Set(tags.map(t => normaliseTag(t)).filter((t): t is string => !!t))];
  if (clean.length > MAX_TAGS_PER_ENTRY) throw Error(`Up to ${MAX_TAGS_PER_ENTRY} tags for one entry.`);
  let rest = Object.entries(record.tags).filter(([k]) => k !== id);
  if (clean.length && rest.length + 1 > MAX_TAGGED_ENTRIES) rest = rest.filter(([k]) => liveIds.has(k));
  if (clean.length && rest.length + 1 > MAX_TAGGED_ENTRIES) throw Error(`Up to ${MAX_TAGGED_ENTRIES.toLocaleString('en')} entries can have tags.`);
  return moneyTagsSchema.parse({version: 1, tags: Object.fromEntries(clean.length ? [...rest, [id, clean]] : rest)});
}
export type TagCount = {tag: string; entries: number};
/** Every tag on an entry the log still holds, most used first. */
export function allTags(record: MoneyTags, entries: readonly MoneyEntry[]): TagCount[] {
  const by = new Map<string, number>();
  for (const e of entries) for (const t of tagsOf(record, e.id)) by.set(t, (by.get(t) ?? 0) + 1);
  return [...by.entries()].map(([tag, n]) => ({tag, entries: n})).sort((a, b) => b.entries - a.entries || a.tag.localeCompare(b.tag));
}
/** The log's entries that carry the tag (the log's own order). */
export const withTag = (entries: readonly MoneyEntry[], record: MoneyTags, tag: string) => entries.filter(e => tagsOf(record, e.id).includes(tag));
export type TagTotal = {tag: string; currency: string; spent: number; received: number; entries: number};
/** Totals per tag and currency, from `from` to `to` (both included), biggest spending first. An entry counts whole under each of its tags. */
export function tagTotals(entries: readonly MoneyEntry[], record: MoneyTags, from: string, to: string): TagTotal[] {
  const by = new Map<string, TagTotal>();
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    for (const tag of tagsOf(record, e.id)) {
      const k = `${tag}\u0000${e.currency}`, row = by.get(k) ?? {tag, currency: e.currency, spent: 0, received: 0, entries: 0};
      if (e.kind === 'income') row.received += minorUnits(e.amount); else row.spent += minorUnits(e.amount);
      row.entries++; by.set(k, row);
    }
  }
  return [...by.values()].sort((a, b) => b.spent - a.spent || b.received - a.received || a.tag.localeCompare(b.tag) || a.currency.localeCompare(b.currency));
}
