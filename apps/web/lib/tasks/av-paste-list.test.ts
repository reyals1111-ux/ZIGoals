import {describe, expect, it} from 'vitest';
import {PASTE_MAX, pastedList} from './paste-list';

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
