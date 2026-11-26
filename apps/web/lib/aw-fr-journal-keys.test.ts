import {describe, expect, test} from 'vitest';
import {AW_FR_JOURNAL_CATALOG_LABELS, AW_FR_JOURNAL_DISPLAY_KEYS, AW_FR_JOURNAL_ERASE_KEYS, AW_FR_JOURNAL_EXPORT_KEYS, AW_FR_JOURNAL_NEVER_RESTORED, AW_FR_JOURNAL_NEVER_RESTORED_WORDS, AW_FR_JOURNAL_NOT_RECORDS, AW_FR_JOURNAL_PERSONAL_KEYS, JOURNAL_DRAFT_KEY_LITERAL} from './aw-fr-journal-keys';
import {JOURNAL_DRAFT, JOURNAL_DRAFT_KEY} from './journal/draft';

/** Session AW (fr-journal, FR-AW-1): the literal equals its owner's constant, and each registry row names it as intended. */
describe('fr-journal device key', () => {
  test('the literal is the owner\'s constant', () => {
    expect(JOURNAL_DRAFT_KEY_LITERAL).toBe(JOURNAL_DRAFT_KEY);
    expect(JOURNAL_DRAFT.key).toBe(JOURNAL_DRAFT_KEY_LITERAL);
    expect(JOURNAL_DRAFT_KEY).toMatch(/^zigoals:[a-z-]+:v1$/);
  });
  test('personal, erased, catalogued, never exported or restored', () => {
    expect(AW_FR_JOURNAL_PERSONAL_KEYS).toEqual([JOURNAL_DRAFT_KEY]);
    expect(AW_FR_JOURNAL_DISPLAY_KEYS).toEqual([]);
    expect(AW_FR_JOURNAL_ERASE_KEYS).toEqual([JOURNAL_DRAFT_KEY]);
    expect(Object.values(AW_FR_JOURNAL_EXPORT_KEYS)).toEqual([]);
    expect(AW_FR_JOURNAL_NEVER_RESTORED).toEqual([JOURNAL_DRAFT_KEY]);
    expect(Object.keys(AW_FR_JOURNAL_NOT_RECORDS)).toEqual([JOURNAL_DRAFT_KEY]);
    expect(AW_FR_JOURNAL_NOT_RECORDS[JOURNAL_DRAFT_KEY]).toMatch(/never exported or restored/);
    expect(AW_FR_JOURNAL_CATALOG_LABELS.journalDraft).toEqual(['Journal: your unsaved entry, until you save or discard it (not in Export everything)', 'Today']);
    expect(AW_FR_JOURNAL_NEVER_RESTORED_WORDS).toBe('the Journal’s unsaved draft');
  });
  test('an empty record is valid and holds no draft', () => {
    expect(JOURNAL_DRAFT.schema.parse(JOURNAL_DRAFT.empty())).toEqual({version: 1, draft: null});
  });
});
