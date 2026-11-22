import {MAX_PEOPLE, PERSON_MAX, type JournalEntry} from './schema';
import {unsealed} from './letters';

/**
 * Session AV lane 2 (r6-notes; LEDGER #401, Diarium's people): "Who was there" on an entry — up to eight names the person
 * types (offered again from the names used before); nothing is read from the device's contacts. A name is compared
 * without case; the first spelling used is kept. A name shows on its entry and lists "Entries with Anna"; in the search,
 * a name is found as a word ("anna" finds "Anna de Vries", "ann" does not). A letter still folded away shows and finds
 * none of its names until its day. Pure.
 */
export const cleanPerson = (raw: string): string | null => { const n = raw.trim().replace(/\s+/g, ' ').slice(0, PERSON_MAX).trim(); return n && /\p{L}/u.test(n) ? n : null; };
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
export const peopleOf = (e: Pick<JournalEntry, 'people'>): string[] => e.people ?? [];
export function withPerson(entry: JournalEntry, raw: string): JournalEntry {
  const name = cleanPerson(raw), list = peopleOf(entry);
  if (!name || list.some(p => same(p, name)) || list.length >= MAX_PEOPLE) return entry;
  return {...entry, people: [...list, name]};
}
export function withoutPerson(entry: JournalEntry, name: string): JournalEntry {
  const list = peopleOf(entry).filter(p => !same(p, name)), {people: _p, ...rest} = entry; void _p;
  return list.length ? {...rest, people: list} : rest;
}
/** Every name used, with how many entries carry it, most used first, then A to Z. */
export function peopleCounts(entries: readonly Pick<JournalEntry, 'people'>[]): {name: string; count: number}[] {
  const by = new Map<string, {name: string; count: number}>();
  for (const e of entries) for (const p of peopleOf(e)) { const k = p.toLowerCase(), hit = by.get(k); if (hit) hit.count++; else by.set(k, {name: p, count: 1}); }
  return [...by.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
export const hasPerson = (e: Pick<JournalEntry, 'people'>, name: string | null | undefined) => !name || peopleOf(e).some(p => same(p, name));
const words = (s: string) => s.toLowerCase().split(/[^\p{L}\p{N}'’-]+/u).filter(Boolean);
/** Whether the typed words name one of the entry's people, each typed word a whole word of the name. */
export function personMatches(e: Pick<JournalEntry, 'people'>, query: string): boolean {
  const q = words(query);
  return q.length > 0 && peopleOf(e).some(p => { const w = words(p); return q.every(x => w.includes(x)); });
}
/** Review b6n B6N-2: the names offered again under "Who was there" — never one from a letter still folded away. */
export const offeredPeople = (entries: readonly Pick<JournalEntry, 'people' | 'opensOn'>[], today: string): string[] => peopleCounts(unsealed(entries, today)).map(p => p.name);
