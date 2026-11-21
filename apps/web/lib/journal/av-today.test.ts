import {describe, expect, it} from 'vitest';
import {firstLine, journalToday} from './today';
import {journalSchema} from './schema';

/**
 * Session AV (1c, q4 #33, fresh-agent review; owner decision, the smaller suggestion): what Today's journal line knows,
 * and the opt-in first lines (off unless the person switched them on).
 */
const e = (id: string, date: string, text: string) => ({id, date, text, createdAt: `${date}T09:00:00.000Z`});
describe('Session AV (1c): the journal on Today', () => {
  const journal = journalSchema.parse({version: 1, entries: [e('a', '2026-11-14', 'Today'), e('b', '2025-11-14', 'A year ago'), e('c', '2026-11-13', 'Yesterday')]});
  it('today’s entries and the On this day memories; none when the person hid it, or hid that entry', () => {
    const day = journalToday(journal, '2026-11-14', {shown: true});
    expect([day.today.map(x => x.id), day.memories.map(m => m.entry.id)]).toEqual([['a'], ['b']]);
    expect(journalToday(journal, '2026-11-14', {shown: false}).memories).toEqual([]);
    expect(journalToday(journal, '2026-11-14', {shown: true, hidden: ['b']}).memories).toEqual([]);
  });
  it('the first line only, without a heading mark, cut with an ellipsis', () => {
    expect(firstLine('\n# A good thing today\nmore')).toBe('A good thing today');
    expect(firstLine('x'.repeat(100), 20)).toBe(`${'x'.repeat(19)}…`);
  });
  it('the switch is off unless set; a value this build cannot read is dropped', () => {
    expect(journal.todayLines).toBeUndefined();
    expect(journalSchema.parse({...journal, todayLines: true}).todayLines).toBe(true);
    expect(journalSchema.parse({...journal, todayLines: 'yes'}).todayLines).toBeUndefined();
  });
});
