import {describe, expect, test} from 'vitest';
import {AW_X3_CATALOG_LABELS, AW_X3_DISPLAY_KEYS, AW_X3_ERASE_KEYS, AW_X3_EXPORT_KEYS, AW_X3_JOURNAL_DEVICE_FIELDS, AW_X3_PERSONAL_KEYS, AW_X3_RESTORE, NOTE_SEARCHES_KEY_LITERAL} from './aw-x3-notes-journal-keys';
import {NOTE_SEARCHES, NOTE_SEARCHES_KEY, emptyNoteSearches} from './notes/saved-searches';
import {JOURNAL, emptyJournal} from './journal/schema';
import {JOURNAL_DISPLAY} from './on-this-day/store';

/** Session AW (x3): each literal equals its owner's constant; the journal's new fields live on records already registered. */
describe('group x3 device keys', () => {
  test('literals equal their owners’ constants', () => {
    expect(NOTE_SEARCHES_KEY_LITERAL).toBe(NOTE_SEARCHES_KEY);
    expect(NOTE_SEARCHES.key).toBe(NOTE_SEARCHES_KEY);
    expect(AW_X3_PERSONAL_KEYS).toEqual([NOTE_SEARCHES_KEY]);
    expect(AW_X3_DISPLAY_KEYS).toEqual([]);
    expect(Object.values(AW_X3_EXPORT_KEYS)).toEqual([NOTE_SEARCHES_KEY]);
    expect(Object.keys(AW_X3_CATALOG_LABELS)).toEqual(Object.keys(AW_X3_EXPORT_KEYS));
    expect(Object.keys(AW_X3_RESTORE)).toEqual(Object.keys(AW_X3_EXPORT_KEYS));
    expect(AW_X3_ERASE_KEYS).toEqual([NOTE_SEARCHES_KEY]);
    expect(NOTE_SEARCHES_KEY).toMatch(/^zigoals:[a-z-]+:v1$/);
  });
  test('the journal fields that stay on the device are fields the journal reads', () => {
    const journal = JOURNAL.schema.parse({...emptyJournal(), morningReminder: {on: true, time: '07:30', days: 127}});
    for (const f of AW_X3_JOURNAL_DEVICE_FIELDS) expect(journal).toHaveProperty(f);
    expect(JOURNAL_DISPLAY.schema.parse({version: 1, voiceSpeed: 1.5})).toEqual({version: 1, voiceSpeed: 1.5});
    expect(emptyNoteSearches()).toEqual({version: 1, searches: []});
  });
});
