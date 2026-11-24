import {describe, expect, test} from 'vitest';
import {deleteVersions, editEntry, putBackVersions, versionsOf} from './versions';
import {JOURNAL_KEY, emptyJournal, journalSchema} from './schema';
import {deleteNoteVersions, noteVersionsOf, updateNoteKeepingVersion} from '../notes/versions';
import {addTopic, applyUndo} from '../notes/store';
import {NOTES_KEY, emptyNotes} from '../notes/schema';
import {collectEverything} from '../export/everything';

/**
 * Session AV lane 2 (review b1 #5, privacy): an earlier version of a journal entry or a note — one, or all of an entry's
 * or note's — can be deleted; Undo puts it back; and the words are then in no export (the journal and notes are never
 * synced: ADR-034 N18 and the notes schema, so the device record is the only copy the app keeps).
 */
const AT = '2026-11-20T09:00:00.000Z', LATER = '2026-11-21T09:00:00.000Z', APP = {now: new Date(LATER), version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
const journalWithTwo = () => {
  const j = journalSchema.parse({...emptyJournal(), entries: [{id: 'e1', date: '2026-11-20', text: 'Words I regret.', createdAt: AT}, {id: 'e2', date: '2026-11-20', text: 'Other entry.', createdAt: AT}]});
  const a = editEntry(j, 'e1', 'Kinder words.', LATER, 'v-journal01').journal;
  const b = editEntry(a, 'e1', 'Kinder words, again.', LATER, 'v-journal02').journal;
  return editEntry(b, 'e2', 'Other entry, changed.', LATER, 'v-journal03').journal;
};

describe('journal: deleting earlier versions', () => {
  test('one version goes, the entry and the other versions stay; Undo puts it back', () => {
    const j = journalWithTwo(), out = deleteVersions(j, 'e1', 'v-journal01');
    expect(out.removed.map(v => v.text)).toEqual(['Words I regret.']);
    expect(versionsOf(out.journal, 'e1').map(v => v.id)).toEqual(['v-journal02']);
    expect(out.journal.entries.find(e => e.id === 'e1')!.text).toBe('Kinder words, again.');
    expect(JSON.stringify(collectEverything({[JOURNAL_KEY]: JSON.stringify(out.journal)}, APP))).not.toContain('Words I regret.');
    expect(versionsOf(putBackVersions(out.journal, out.removed), 'e1').map(v => v.id)).toEqual(['v-journal02', 'v-journal01']);
  });
  test('all of an entry’s versions go, another entry’s stay; nothing left to delete throws', () => {
    const out = deleteVersions(journalWithTwo(), 'e1');
    expect(out.removed).toHaveLength(2);
    expect(out.journal.versions!.map(v => v.id)).toEqual(['v-journal03']);
    const none = deleteVersions(out.journal, 'e2').journal;
    expect(none.versions).toBeUndefined();
    expect(() => deleteVersions(none, 'e2')).toThrow('This entry has no earlier versions.');
    expect(() => deleteVersions(journalWithTwo(), 'e1', 'v-gone')).toThrow('That version is no longer on this device.');
  });
});

describe('notes: deleting earlier versions', () => {
  const notes = () => {
    let r = addTopic(emptyNotes(), {title: 'Fictional plans', body: 'A secret I wrote down.', now: AT, id: 'n1'}).record;
    r = updateNoteKeepingVersion(r, 'n1', {body: 'Plans, tidied.'}, LATER, 'v-note0001');
    return updateNoteKeepingVersion(r, 'n1', {body: 'Plans, tidied again.'}, LATER, 'v-note0002');
  };
  test('one version, then all; Undo puts them back; the words are in no export', () => {
    const one = deleteNoteVersions(notes(), 'n1', 'v-note0001');
    expect(noteVersionsOf(one.record, 'n1').map(v => v.id)).toEqual(['v-note0002']);
    expect(JSON.stringify(collectEverything({[NOTES_KEY]: JSON.stringify(one.record)}, APP))).not.toContain('A secret I wrote down.');
    expect(noteVersionsOf(applyUndo(one.record, one.undo), 'n1').map(v => v.id)).toEqual(['v-note0002', 'v-note0001']);
    expect(one.undo.said).toBe('The earlier version is back.');
    const all = deleteNoteVersions(notes(), 'n1');
    expect(all.record.versions).toBeUndefined();
    expect(all.record.notes[0]!.body).toBe('Plans, tidied again.');
    expect(applyUndo(all.record, all.undo).versions).toHaveLength(2);
    expect(() => deleteNoteVersions(all.record, 'n1')).toThrow('This note has no earlier versions.');
  });
});
