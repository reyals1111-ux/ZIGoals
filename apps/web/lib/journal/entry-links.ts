/**
 * Session AV lane 2 (journal; LEDGER #35, Day One's links to other entries): [[links]] in a journal entry's words, kept in
 * the text itself (nothing else is stored). `[[2026-11-03]]` links that day's entries (the Journal opens on that day);
 * any other `[[name]]` links a note, a goal or a habit by its name, as Notes' links do (lib/notes/links.ts). Pure.
 */
export type EntrySegment = {kind: 'text'; text: string} | {kind: 'day'; day: string; label: string} | {kind: 'name'; name: string};
const LINK = /\[\[([^[\]\n]{1,120})\]\]/g, DAY = /^\d{4}-\d{2}-\d{2}$/;
export const hasLinks = (text: string) => /\[\[[^[\]\n]{1,120}\]\]/.test(text);
export function entrySegments(text: string): EntrySegment[] {
  const out: EntrySegment[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index! > at) out.push({kind: 'text', text: text.slice(at, m.index)});
    const inner = m[1]!.trim(), [target, alias] = inner.split('|').map(x => x.trim()) as [string, string | undefined];
    if (DAY.test(target) && !Number.isNaN(Date.parse(`${target}T12:00:00Z`))) out.push({kind: 'day', day: target, label: alias || target});
    else out.push({kind: 'name', name: target});
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({kind: 'text', text: text.slice(at)});
  return out;
}
/** The days an entry links to (for "linked from" lines). */
export const linkedDays = (text: string) => [...new Set(entrySegments(text).flatMap(s => s.kind === 'day' ? [s.day] : []))];
/** The entries that link to `day` (newest first), for "Linked from" under a day's entries. */
export function entriesLinkingTo<T extends {date: string; text: string; id: string}>(entries: readonly T[], day: string): T[] {
  return entries.filter(e => e.date !== day && linkedDays(e.text).includes(day)).reverse();
}
/** A day link to put in an entry: `[[2026-11-03]]`. */
export const dayLink = (day: string) => `[[${day}]]`;
