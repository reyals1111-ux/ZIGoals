import {describe, expect, test} from 'vitest';
import {notesSchema} from './schema';
import {isLocked, lockNote, readableNotes, snippetOf, unlockNote, withoutLocked} from './lock';
import {notesPackLines} from './pack';
import {openTicks} from './ticks';
import {backlinks, linkIndex} from './links';
import {remindersInNote} from './reminders';
import {notesExportEntries} from './markdown';
import {noteSearchItems, searchNotes} from '../search/notes';
import {readNovaToolSources} from '../ai/tools/nova-sources';
import {NOTES_KEY} from './schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #318, built in its conservative form): a locked note's words stay out of Search,
 * NOVA (its sources, its packed notes), the open tick boxes, backlinks, reminders' words, the lists' snippets and the
 * Markdown export; locking and unlocking are ordinary writes. No key and no new crypto: the PIN check is the screen
 * cover's own (lib/device-lock.ts, untouched).
 */
const AT = '2026-11-20T09:00:00.000Z';
const record = notesSchema.parse({version: 1, notes: [
  {id: 'n1', kind: 'topic', title: 'Fictional diary', body: 'Secret fictional words about [[Fictional plan]].\n\n- [ ] secret tick\n\n@remind tomorrow call the secret friend', locked: true, createdAt: AT},
  {id: 'n2', kind: 'topic', title: 'Fictional plan', body: 'Open words.\n\n- [ ] open tick', createdAt: AT}]});
const words = (x: unknown) => JSON.stringify(x);

describe('a locked note', () => {
  test('lock and unlock are plain writes of the note', () => {
    const open = unlockNote(record, 'n1', AT);
    expect('locked' in open.notes[0]!).toBe(false);
    expect(isLocked(lockNote(open, 'n1', AT).notes[0]!)).toBe(true);
    expect(readableNotes(record.notes).map(n => n.id)).toEqual(['n2']);
    expect(withoutLocked(record).notes.map(n => n.id)).toEqual(['n2']);
  });
  test('its words never reach Search, NOVA, the tick boxes, backlinks or the export', () => {
    expect(searchNotes(record.notes, 'secret')).toEqual([]);
    expect(noteSearchItems(record.notes).map(i => i.id)).toEqual(['note:n2']);
    expect(words(notesPackLines(record.notes, {question: 'secret', includeInbox: true}).lines)).not.toMatch(/[Ss]ecret/);
    expect(openTicks(record.notes).map(t => t.text)).toEqual(['open tick']);
    const index = linkIndex({notes: record.notes, goals: [], habits: []});
    expect(backlinks(record.notes, {kind: 'note', id: 'n2'}, index)).toEqual([]);
    expect(remindersInNote(record.notes[0]!, '2026-11-20', 'UTC').map(r => r.what)).toEqual(['A reminder in a locked note']);
    const md = notesExportEntries(record, {goals: [], habits: []}, {now: new Date(AT)});
    expect(md.map(e => e.name)).toEqual(['Notes/Fictional plan.md']);
    expect(snippetOf(record.notes[0]!)).toBe('Locked note: its words show after your PIN.');
  });
  test('NOVA’s sources leave it out', () => {
    const store = new Map([[NOTES_KEY, JSON.stringify(record)]]);
    const sources = readNovaToolSources({getItem: (k: string) => store.get(k) ?? null} as never, {notes: true});
    expect(sources.notes!.notes.map(n => n.id)).toEqual(['n2']);
  });
});
