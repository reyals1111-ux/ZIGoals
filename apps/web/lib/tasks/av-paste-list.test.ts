import {describe, expect, it} from 'vitest';
import {lineList, PASTE_MAX, pastedList, pastedOutline} from './paste-list';

/** Session AV (owner follow-up 1, F-PASTE-LIST): a pasted list, one task per line. */
describe('Session AV (F-PASTE-LIST)', () => {
  it('one task per line, bullets, numbers and boxes dropped, empty lines skipped', () => {
    expect(pastedList('- Buy milk tomorrow\n\n* Call the fictional bank p1\r\n1. Book the dentist\n2) Pay rent #Home\n- [ ] Water the plants\n☐ Fix the bike\n• Read')).toEqual({
      lines: ['Buy milk tomorrow', 'Call the fictional bank p1', 'Book the dentist', 'Pay rent #Home', 'Water the plants', 'Fix the bike', 'Read'], more: 0});
  });
  it('one line is an ordinary paste; a number in the title stays', () => {
    expect(pastedList('Buy 2 cartons of milk')).toBeNull();
    expect(pastedList('\n  - only one  \n\n')).toBeNull();
    expect(pastedList('2026 tax return\n3 emails')).toEqual({lines: ['2026 tax return', '3 emails'], more: 0});
  });
  it('at most 50 at once, the rest counted', () => {
    const r = pastedList(Array.from({length: 53}, (_, i) => `Task ${i + 1}`).join('\n'))!;
    expect([r.lines.length, r.lines.at(-1), r.more]).toEqual([PASTE_MAX, 'Task 50', 3]);
  });
});

/** Session AV (1c, q1 #17, fresh-agent review): an indented paste makes subtasks; one typed line can be several tasks. */
describe('Session AV (1c): outline and one-line lists', () => {
  it('indentation becomes subtasks of the nearest less-indented line above', () => {
    expect(pastedOutline('- Trip\n  - Book the train\n  - Pack\n      - Charger\n- Pay rent\n\tPrint the receipt')).toEqual({
      lines: ['Trip', 'Book the train', 'Pack', 'Charger', 'Pay rent', 'Print the receipt'], parents: [null, 0, 0, 2, null, 4], more: 0});
    expect(pastedOutline('only one')).toBeNull();
  });
  it('a typed line with commas or semicolons between short items', () => {
    expect(lineList('melk, brood en eieren')).toEqual(['melk', 'brood', 'eieren']);
    expect(lineList('Call the bank; book the dentist tomorrow; pay rent p1')).toEqual(['Call the bank', 'book the dentist tomorrow', 'pay rent p1']);
    expect(lineList('milk, bread and eggs')).toEqual(['milk', 'bread', 'eggs']);
    // Not a list: one item, a decimal comma, an empty part, a long sentence.
    expect(lineList('Buy milk')).toBeNull();
    expect(lineList('Les 1,5 uur')).toBeNull();
    expect(lineList('milk,, bread')).toBeNull();
    expect(lineList('Write the long report about the year that went by so fast, then rest')).toBeNull();
  });
});
