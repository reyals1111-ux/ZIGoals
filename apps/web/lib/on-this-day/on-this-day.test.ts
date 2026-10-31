import {describe, expect, test} from 'vitest';
import {journalEntrySchema} from '../journal/schema';
import {anniversaryIn, onThisDay, preview} from './on-this-day';
import {MAX_HIDDEN_MEMORIES, emptyJournalDisplay, hideMemory, journalDisplaySchema, onThisDayShown, setOnThisDay, unhideAll} from './store';
import {showcaseOnThisDayEntries} from './showcase';

const e = (id: string, date: string, text = `Entry ${id}`) => ({id, date, text});

describe('On this day (Session AK, BUILD list 2 #3)', () => {
  test('nothing matches: an empty list, so the card stays away', () => {
    expect(onThisDay([], '2026-10-31')).toEqual([]);
    expect(onThisDay([e('a', '2026-10-30'), e('b', '2025-10-30'), e('c', '2026-10-31')], '2026-10-31')).toEqual([]); // today's own entry is not a memory
  });
  test('several years: 1 year ago first, then 2, then 3 or more, each labelled', () => {
    const out = onThisDay([e('old', '2021-10-31'), e('one', '2025-10-31'), e('two', '2024-10-31'), e('noise', '2025-11-01')], '2026-10-31');
    expect(out.map(x => [x.entry.id, x.label])).toEqual([['one', '1 year ago'], ['two', '2 years ago'], ['old', '5 years ago']]);
  });
  test('29 February meets 28 February in a common year, and itself in a leap year', () => {
    expect(anniversaryIn('2024-02-29', 2025)).toBe('2025-02-28');
    expect(anniversaryIn('2024-02-29', 2028)).toBe('2028-02-29');
    expect(onThisDay([e('leap', '2024-02-29')], '2025-02-28').map(x => x.label)).toEqual(['1 year ago']);
    expect(onThisDay([e('leap', '2024-02-29')], '2028-02-29').map(x => x.label)).toEqual(['4 years ago']);
    // A 28 February entry does not show again on 29 February (it already had its day).
    expect(onThisDay([e('common', '2027-02-28')], '2028-02-29')).toEqual([]);
  });
  test('a month ago, only when no year matches; the 31st meets a shorter month\'s last day', () => {
    expect(onThisDay([e('m', '2026-09-30')], '2026-10-30').map(x => x.label)).toEqual(['A month ago']);
    expect(onThisDay([e('m', '2026-09-30'), e('y', '2025-10-30')], '2026-10-30').map(x => x.entry.id)).toEqual(['y']);
    expect(onThisDay([e('jan31', '2026-01-31')], '2026-02-28').map(x => x.entry.id)).toEqual(['jan31']);
    expect(onThisDay([e('dec', '2025-12-15')], '2026-01-15').map(x => x.label)).toEqual(['A month ago']); // across the new year
    expect(onThisDay([e('two-months', '2026-08-30')], '2026-10-30')).toEqual([]);
  });
  test('a hidden entry is left out; blank text and bad dates are ignored; the list is capped', () => {
    const entries = [e('a', '2025-10-31'), e('b', '2024-10-31'), e('blank', '2023-10-31', '   '), e('bad', 'yesterday')];
    expect(onThisDay(entries, '2026-10-31', {hidden: ['a']}).map(x => x.entry.id)).toEqual(['b']);
    expect(onThisDay(Array.from({length: 9}, (_, i) => e(`y${i}`, `${2016 + i}-10-31`)), '2026-10-31')).toHaveLength(5);
    expect(onThisDay(entries, 'not a date')).toEqual([]);
  });
  test('the preview cuts at a word', () => {
    expect(preview('Short.')).toEqual({text: 'Short.', more: false});
    const long = preview('word '.repeat(80), 50);
    expect(long.more).toBe(true); expect(long.text.endsWith('word…')).toBe(true); expect(long.text.length).toBeLessThanOrEqual(51);
  });
});

describe('the display key zigoals:journal-display:v1', () => {
  test('shown by default; the switch and "Not this one" are kept; bounded', () => {
    const d = emptyJournalDisplay();
    expect(onThisDayShown(d)).toBe(true);
    expect(onThisDayShown(setOnThisDay(d, false))).toBe(false);
    let h = hideMemory(hideMemory(d, 'a'), 'a');
    expect(h.hidden).toEqual(['a']);
    for (let i = 0; i < MAX_HIDDEN_MEMORIES + 5; i++) h = hideMemory(h, `x${i}`);
    expect(h.hidden).toHaveLength(MAX_HIDDEN_MEMORIES);
    expect(unhideAll(h).hidden).toBeUndefined();
    expect(journalDisplaySchema.safeParse({version: 1, future: 'kept'}).success).toBe(true);
    expect(journalDisplaySchema.safeParse({version: 2}).success).toBe(false);
  });
  test('the Showcase memories are valid journal entries, labelled, on the Showcase day one and two years back', () => {
    const rows = showcaseOnThisDayEntries('2026-10-31');
    for (const r of rows) { expect(journalEntrySchema.safeParse(r).success).toBe(true); expect(r.text).toContain('(SHOWCASE DATA)'); }
    expect(onThisDay(rows, '2026-10-31').map(x => x.label)).toEqual(['1 year ago', '2 years ago']);
    expect(showcaseOnThisDayEntries('2028-02-29').map(r => r.date)).toEqual(['2027-02-28', '2026-02-28']);
  });
});
