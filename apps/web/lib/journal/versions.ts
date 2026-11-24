import {MAX_TEXT, MAX_VERSION_CHARS, MAX_VERSIONS, VERSIONS_PER_ENTRY, journalSchema, type EntryVersion, type Journal, type JournalEntry} from './schema';

/**
 * Session AV lane 2 (journal; LEDGER #33, Notion's version history; Day One edits an entry): an entry can be changed
 * after it was saved, and each change keeps the words it replaced as an earlier version (the journal record's
 * `versions`), newest last: at most 10 per entry, 200 in all and 200,000 characters together (the oldest go first), and
 * none for an entry that is gone. Restoring a version keeps the words it replaces as a version too, so nothing is lost
 * by a restore; Undo puts the entry and its versions back exactly. Pure; everything stays on this device.
 */
export const newVersionId = () => `v-${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}`;
/** The versions kept within the caps: only for entries still here, 10 per entry, 200 and 200,000 characters in all. */
export function capVersions(versions: readonly EntryVersion[], entries: readonly Pick<JournalEntry, 'id'>[]): EntryVersion[] {
  const here = new Set(entries.map(e => e.id)), perEntry = new Map<string, number>(), kept: EntryVersion[] = [];
  let chars = 0;
  for (const v of [...versions].reverse()) { // newest first, so the oldest are the ones left out
    if (!here.has(v.entryId)) continue;
    const n = perEntry.get(v.entryId) ?? 0;
    if (n >= VERSIONS_PER_ENTRY || kept.length >= MAX_VERSIONS || chars + v.text.length > MAX_VERSION_CHARS) continue;
    perEntry.set(v.entryId, n + 1); chars += v.text.length; kept.push(v);
  }
  return kept.reverse();
}
/** An entry's earlier versions, newest first. */
export const versionsOf = (journal: Pick<Journal, 'versions'>, entryId: string) => [...(journal.versions ?? [])].filter(v => v.entryId === entryId).reverse();
/** What Undo of an edit or a restore needs: the entry and its versions as they were. */
export type EntryUndo = {entry: JournalEntry; versions: EntryVersion[]};
const undoOf = (journal: Journal, entry: JournalEntry): EntryUndo => ({entry, versions: (journal.versions ?? []).filter(v => v.entryId === entry.id)});
/** The entry with new words; the words it had become an earlier version. Unchanged words change nothing. */
export function editEntry(journal: Journal, id: string, text: string, now: string, versionId = newVersionId()): {journal: Journal; undo: EntryUndo | null} {
  const entry = journal.entries.find(e => e.id === id);
  if (!entry) throw new Error('This entry is no longer on this device.');
  const words = text.trim();
  if (!words) throw new Error('An entry needs a few words. To take it away, use Remove.');
  if (words.length > MAX_TEXT) throw new Error(`An entry holds at most ${MAX_TEXT.toLocaleString('en-US')} characters.`);
  if (words === entry.text) return {journal, undo: null};
  const version: EntryVersion = {id: versionId, entryId: id, text: entry.text, ...(entry.tags?.length ? {tags: entry.tags} : {}), savedAt: entry.updatedAt ?? entry.createdAt};
  const entries = journal.entries.map(e => e.id === id ? {...e, text: words, updatedAt: now} : e);
  return {journal: journalSchema.parse({...journal, entries, versions: capVersions([...(journal.versions ?? []), version], entries)}), undo: undoOf(journal, entry)};
}
/** An earlier version back as the entry's words; the words it replaces are kept as a version. */
export function restoreVersion(journal: Journal, entryId: string, versionId: string, now: string, newId = newVersionId()): {journal: Journal; undo: EntryUndo} {
  const entry = journal.entries.find(e => e.id === entryId), version = (journal.versions ?? []).find(v => v.id === versionId && v.entryId === entryId);
  if (!entry || !version) throw new Error('That version is no longer on this device.');
  const replaced: EntryVersion = {id: newId, entryId, text: entry.text, ...(entry.tags?.length ? {tags: entry.tags} : {}), savedAt: entry.updatedAt ?? entry.createdAt};
  const entries = journal.entries.map(e => e.id === entryId ? {...e, text: version.text, updatedAt: now} : e);
  const versions = [...(journal.versions ?? []).filter(v => v.id !== versionId), replaced];
  return {journal: journalSchema.parse({...journal, entries, versions: capVersions(versions, entries)}), undo: undoOf(journal, entry)};
}
/** Undo of an edit or a restore: the entry's words and its versions exactly as they were (the rest of the journal as it is now). */
export function undoEntryChange(journal: Journal, undo: EntryUndo): Journal {
  if (!journal.entries.some(e => e.id === undo.entry.id)) return journal;
  const versions = [...(journal.versions ?? []).filter(v => v.entryId !== undo.entry.id), ...undo.versions].sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  return journalSchema.parse({...journal, entries: journal.entries.map(e => e.id === undo.entry.id ? undo.entry : e), versions});
}
/** Removing an entry takes its earlier versions with it; the Undo gets both back. */
export function removeWithVersions(journal: Journal, id: string): {journal: Journal; versions: EntryVersion[]} {
  const versions = (journal.versions ?? []).filter(v => v.entryId === id);
  return {journal: journalSchema.parse({...journal, entries: journal.entries.filter(e => e.id !== id), versions: (journal.versions ?? []).filter(v => v.entryId !== id)}), versions};
}
export function putBackVersions(journal: Journal, versions: readonly EntryVersion[]): Journal {
  if (!versions.length) return journal;
  const have = new Set((journal.versions ?? []).map(v => v.id));
  return journalSchema.parse({...journal, versions: capVersions([...(journal.versions ?? []), ...versions.filter(v => !have.has(v.id))].sort((a, b) => a.savedAt.localeCompare(b.savedAt)), journal.entries)});
}
/**
 * Review b1 #5 (privacy; Notion and Day One delete history): one earlier version of an entry, or all of them, deleted
 * from this device — the words leave the journal record, so every later export and backup is without them. `removed`
 * is what Undo puts back (putBackVersions). A version already gone throws.
 */
export function deleteVersions(journal: Journal, entryId: string, versionId?: string): {journal: Journal; removed: EntryVersion[]} {
  const removed = (journal.versions ?? []).filter(v => v.entryId === entryId && (versionId === undefined || v.id === versionId));
  if (!removed.length) throw new Error(versionId ? 'That version is no longer on this device.' : 'This entry has no earlier versions.');
  const gone = new Set(removed.map(v => v.id)), versions = (journal.versions ?? []).filter(v => !gone.has(v.id)), next: Record<string, unknown> = {...journal};
  if (versions.length) next.versions = versions; else delete next.versions;
  return {journal: journalSchema.parse(next), removed};
}
