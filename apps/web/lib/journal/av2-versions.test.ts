import {describe, expect, test} from 'vitest';
import {capVersions, editEntry, putBackVersions, removeWithVersions, restoreVersion, undoEntryChange, versionsOf} from './versions';
import {MAX_VERSION_CHARS, emptyJournal, journalSchema, type Journal} from './schema';
import {asJournalTemplate, editOwnTemplate, headingsOf, suggestedTitle, templateFromEntry, withDefault} from '../journal-prompts/own';
import {startFrom} from '../journal-prompts/templates';

/** Session AV lane 2 (journal; LEDGER #33 version history, #39 save an entry as a template and the default), pure. */
const AT = '2026-11-20T20:00:00.000Z';
const base = (): Journal => journalSchema.parse({...emptyJournal(), entries: [{id: 'a', date: '2026-11-20', text: 'First words.', createdAt: AT, tags: ['work']}, {id: 'b', date: '2026-11-21', text: 'Other entry.', createdAt: AT}]});

describe('editing an entry keeps its earlier words', () => {
  test('a change keeps the replaced words as a version; the same words change nothing; Undo puts it back exactly', () => {
    const one = editEntry(base(), 'a', ' Second words. ', '2026-11-21T08:00:00.000Z', 'v-one00001');
    expect(one.journal.entries[0]).toMatchObject({text: 'Second words.', updatedAt: '2026-11-21T08:00:00.000Z', tags: ['work']});
    expect(one.journal.versions).toEqual([{id: 'v-one00001', entryId: 'a', text: 'First words.', tags: ['work'], savedAt: AT}]);
    expect(editEntry(one.journal, 'a', 'Second words.', '2026-11-21T09:00:00.000Z')).toEqual({journal: one.journal, undo: null});
    expect(() => editEntry(one.journal, 'a', '  ', AT)).toThrow('An entry needs a few words.');
    expect(() => editEntry(one.journal, 'gone', 'x', AT)).toThrow();
    expect(undoEntryChange(one.journal, one.undo!)).toEqual({...base(), versions: []});
  });
  test('restoring a version keeps the words it replaces; Undo of the restore', () => {
    const one = editEntry(base(), 'a', 'Second words.', '2026-11-21T08:00:00.000Z', 'v-one00001').journal;
    const back = restoreVersion(one, 'a', 'v-one00001', '2026-11-21T09:00:00.000Z', 'v-two00002');
    expect(back.journal.entries[0]!.text).toBe('First words.');
    expect(versionsOf(back.journal, 'a').map(v => [v.id, v.text])).toEqual([['v-two00002', 'Second words.']]);
    expect(undoEntryChange(back.journal, back.undo)).toEqual(one);
    expect(() => restoreVersion(one, 'b', 'v-one00001', AT)).toThrow('That version is no longer on this device.');
  });
  test('at most ten per entry, none for an entry that is gone, and the character cap; the oldest go first', () => {
    let j = base();
    for (let i = 0; i < 12; i++) j = editEntry(j, 'a', `Words ${i}.`, `2026-11-21T0${Math.floor(i / 10)}:${String(i % 10).padStart(2, '0')}:00.000Z`, `v-many${String(i).padStart(4, '0')}`).journal;
    const kept = versionsOf(j, 'a');
    expect(kept).toHaveLength(10);
    expect(kept[0]!.text).toBe('Words 10.'); expect(kept.at(-1)!.text).toBe('Words 1.');
    expect(capVersions(j.versions!, [{id: 'b'}])).toEqual([]);
    const big = Array.from({length: 50}, (_, i) => ({id: `v-big${String(i).padStart(5, '0')}`, entryId: i % 2 ? 'a' : 'b', text: 'x'.repeat(5000), savedAt: AT}));
    expect(capVersions(big, [{id: 'a'}, {id: 'b'}]).reduce((n, v) => n + v.text.length, 0)).toBeLessThanOrEqual(MAX_VERSION_CHARS);
  });
  test('removing an entry takes its versions; its Undo brings them back', () => {
    const j = editEntry(base(), 'a', 'Second words.', AT, 'v-one00001').journal;
    const out = removeWithVersions(j, 'a');
    expect(out.journal.entries.map(e => e.id)).toEqual(['b']); expect(out.journal.versions).toEqual([]);
    expect(out.versions.map(v => v.id)).toEqual(['v-one00001']);
    const back = putBackVersions(journalSchema.parse({...out.journal, entries: j.entries}), out.versions);
    expect(back.versions).toEqual(j.versions);
  });
});

describe('save an entry as a template, and the default template', () => {
  const text = 'How the run went:\nEasy, 5 km.\nWhat I noticed?\nThe geese.';
  test('the whole words and tags; heading-like lines as the headings older builds use', () => {
    expect(headingsOf(text)).toEqual(['How the run went:', 'What I noticed?']);
    expect(headingsOf('Just one line of words')).toEqual(['Just one line of words']);
    expect(suggestedTitle(text)).toBe('How the run went');
    const j = templateFromEntry(base(), {text, tags: ['running']}, 'Fictional run', 'own-fromentry1');
    expect(j.templates).toEqual([{id: 'own-fromentry1', title: 'Fictional run', headings: ['How the run went:', 'What I noticed?'], body: text, tags: ['running']}]);
    const t = asJournalTemplate(j.templates![0]!);
    expect(startFrom('', t, 'en')).toBe(`${text}\n`);
    expect(t.tags).toEqual(['running']);
    expect(() => templateFromEntry(base(), {text}, ' ', 'own-fromentry2')).toThrow('Give the template a name.');
  });
  test('editing a saved-from-entry template edits its words; a headings template keeps working as before', () => {
    let j = templateFromEntry(base(), {text}, 'Fictional run', 'own-fromentry1');
    j = editOwnTemplate(j, 'own-fromentry1', {title: 'Run', headingsText: 'Distance:\nFeel?'});
    expect(j.templates![0]).toMatchObject({title: 'Run', body: 'Distance:\nFeel?', headings: ['Distance:', 'Feel?']});
  });
  test('the default template is kept, changed and cleared', () => {
    const j = withDefault(base(), 'own-fromentry1');
    expect(j.defaultTemplate).toBe('own-fromentry1');
    expect(withDefault(j, 'gratitude').defaultTemplate).toBe('gratitude');
    expect(withDefault(j, null)).not.toHaveProperty('defaultTemplate');
  });
});
