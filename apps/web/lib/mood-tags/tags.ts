import {addLocalDays} from '../local-date';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';
import {MAX_TAG_CHARS, MAX_TAGGED_ENTRIES, MAX_TAGS_PER_ENTRY, moodTagsSchema, tagSchema, type MoodTags} from './schema';

/**
 * Session AP (feature 1): tags on a day's mood check-in, and "what goes with your good days". Pure; the caller passes the
 * moods (Health v4 `moods`, read where Health is read) and this device's tags record. Nothing here is sent anywhere.
 */
export const GOOD_MOOD = 4;
export const TAG_MIN_DAYS = 5;
export const TAG_WINDOW_DAYS = 365;
export const GOES_WITH = 'Goes with, not a cause.';

/** One tag as typed: spaces folded, trimmed; refused when empty or too long (a plain sentence). */
export function cleanTag(raw: string): string {
  const tag = raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!tag) throw Error('Type a word or two for the tag.');
  if (tag.length > MAX_TAG_CHARS) throw Error(`A tag is up to ${MAX_TAG_CHARS} characters.`);
  return tagSchema.parse(tag);
}
const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** The day's tags (its mood entry id is the day). */
export const tagsOn = (record: MoodTags, day: string): readonly string[] => record.entries[day] ?? [];

/** Adds a tag to a day's mood entry (once; up to eight); the oldest tagged days drop past the cap. */
export function addTag(record: MoodTags, day: string, raw: string): MoodTags {
  const tag = cleanTag(raw), current = tagsOn(record, day);
  if (current.some(t => same(t, tag))) return record;
  if (current.length >= MAX_TAGS_PER_ENTRY) throw Error(`A day keeps up to ${MAX_TAGS_PER_ENTRY} tags. Remove one first.`);
  const entries = {...record.entries, [day]: [...current, tag]};
  const keys = Object.keys(entries).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TAGGED_ENTRIES))) delete entries[k];
  return moodTagsSchema.parse({...record, entries});
}
/** Removes one tag from a day; a day left without tags is removed. */
export function removeTag(record: MoodTags, day: string, tag: string): MoodTags {
  const current = tagsOn(record, day), next = current.filter(t => !same(t, tag));
  if (next.length === current.length) return record;
  const entries = {...record.entries};
  if (next.length) entries[day] = next; else delete entries[day];
  return moodTagsSchema.parse({...record, entries});
}
/** The person's own tags, most used first (then the most recent), for one-tap reuse; at most `limit`. */
export function recentTags(record: MoodTags, limit = 8): string[] {
  const seen = new Map<string, {tag: string; count: number; last: string}>();
  for (const [day, tags] of Object.entries(record.entries)) for (const tag of tags) {
    const key = tag.toLocaleLowerCase(), held = seen.get(key);
    if (!held) seen.set(key, {tag, count: 1, last: day});
    else { held.count++; if (day > held.last) { held.last = day; held.tag = tag; } }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last) || a.tag.localeCompare(b.tag)).slice(0, limit).map(x => x.tag);
}

export type TagFinding = {tag: string; withDays: number; withGood: number; otherDays: number; otherGood: number; sentence: string};
export type TagPending = {tag: string; days: number; need: number};
export type GoodDayTags = {ready: TagFinding[]; pending: TagPending[]; window: {start: string; end: string}; moodDays: number};

/**
 * "What goes with your good days": over the last 365 days, for each tag on at least five days that have a mood, how many
 * of those days were Good or Great (4 or 5) against the other days with a mood. Only tags whose days were good more often
 * than the other days are listed as findings, highest share first; the words are counts and "goes with", never why.
 */
export function goodDayTags(moods: Readonly<Record<string, {mood: number}>>, record: MoodTags, today: string, max = 5): GoodDayTags {
  const window = {start: addLocalDays(today, 1 - TAG_WINDOW_DAYS), end: today};
  const moodDays = Object.keys(moods).filter(d => d >= window.start && d <= window.end && moods[d]?.mood !== undefined);
  const byTag = new Map<string, {tag: string; days: Set<string>; last: string}>();
  for (const day of moodDays) for (const tag of tagsOn(record, day)) {
    const key = tag.toLocaleLowerCase(), held = byTag.get(key);
    if (!held) byTag.set(key, {tag, days: new Set([day]), last: day});
    else { held.days.add(day); if (day > held.last) { held.last = day; held.tag = tag; } }
  }
  const good = (d: string) => (moods[d]?.mood ?? 0) >= GOOD_MOOD;
  const ready: (TagFinding & {lift: number})[] = [], pending: TagPending[] = [];
  for (const {tag, days} of byTag.values()) {
    const others = moodDays.filter(d => !days.has(d));
    if (days.size < TAG_MIN_DAYS || others.length < TAG_MIN_DAYS) { pending.push({tag, days: days.size, need: TAG_MIN_DAYS}); continue; }
    const withGood = [...days].filter(good).length, otherGood = others.filter(good).length;
    const lift = withGood / days.size - otherGood / others.length;
    if (lift <= 0) continue;
    const sentence = `On ${withGood} of the ${days.size} days you tagged “${tag}”, your mood was Good or Great; on the other ${others.length} days with a mood, ${otherGood}. ${GOES_WITH}`;
    if (FORBIDDEN_INSIGHT_WORDS.some(w => new RegExp(`\\b${w}\\b`, 'i').test(sentence.replace(`“${tag}”`, '')))) throw Error(`A tag sentence used "${sentence}".`);
    ready.push({tag, withDays: days.size, withGood, otherDays: others.length, otherGood, sentence, lift});
  }
  ready.sort((a, b) => b.lift - a.lift || b.withDays - a.withDays || a.tag.localeCompare(b.tag));
  pending.sort((a, b) => b.days - a.days || a.tag.localeCompare(b.tag));
  return {ready: ready.slice(0, max).map(({lift: _lift, ...f}) => { void _lift; return f; }), pending, window, moodDays: moodDays.length};
}
