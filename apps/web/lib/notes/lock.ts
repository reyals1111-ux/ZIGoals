import type {Note, Notes} from './schema';
import {updateNote} from './store';

/**
 * Session AV lane 2 (r4-notes; LEDGER #318, Bear's locked notes; built in its conservative form). "Lock this note"
 * hides the note's words behind this device's own screen-cover PIN (lib/device-lock.ts: its salted PBKDF2-SHA-256 check,
 * unchanged — no new key, no new crypto): a locked note shows only after the PIN on this visit, and its words are left
 * out of Search (the Notes page, the palette and Search everything), the Graph, NOVA's notes (its tools, its answers and
 * the notes it packs), the open tick boxes, the lists' snippets and the Markdown export. The words are NOT encrypted:
 * they stay in this browser's storage and in Export everything (so a backup is whole), and an older build shows them as
 * before (it reads `locked` as nothing and never writes it away; it cannot overwrite anything that is not its own words).
 * Encrypting a note with its own passphrase (AES-GCM from PBKDF2) is left out: against a named rule (no key changes).
 * Pure.
 */
export const isLocked = (note: Pick<Note, 'locked'>) => note.locked === true;
/** The notes whose words may be read beyond the note itself (search, graph, NOVA, export). */
export const readableNotes = <T extends Pick<Note, 'locked'>>(notes: readonly T[]): T[] => notes.filter(n => !isLocked(n));
/** The record without locked notes (for NOVA's tools and answers). */
export const withoutLocked = (record: Notes): Notes => record.notes.some(isLocked) ? {...record, notes: readableNotes(record.notes)} : record;
export const LOCK_NEEDS_PIN = 'A note locks with this device’s screen-cover PIN. Set one first in Settings → Account & devices → Screen cover with a PIN.';
export function lockNote(record: Notes, id: string, now: string): Notes { return updateNote(record, id, {locked: true}, now); }
export function unlockNote(record: Notes, id: string, now: string): Notes { return updateNote(record, id, {locked: false}, now); }
/** What a list shows for a note's words: nothing of a locked note's. */
export const snippetOf = (note: Pick<Note, 'locked' | 'body'>, max = 120) => isLocked(note) ? 'Locked note: its words show after your PIN.' : note.body.replace(/\s+/g, ' ').slice(0, max);
