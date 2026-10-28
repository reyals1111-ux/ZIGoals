import {expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount} from './habits';
import {habitShareCard} from './habits-share';

/** Session AI (shareable habit card): counts only, in plain words; a new habit says it is just starting. */
test('the share card of a habit', () => {
  const ID = '94000000-0000-4000-8000-000000000001';
  let data = createHabit(emptyHabitData(), {title: 'Read', category: 'Learning', description: '', notes: 'private note', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-20T08:00:00Z'), ID);
  expect(habitShareCard(data.habits[0]!, '2026-10-28')).toMatchObject({title: 'Read', lines: ['Just getting started.']});
  for (const day of ['2026-10-26', '2026-10-27', '2026-10-28']) data = logHabitCount(data, ID, day, 1, 'a note', new Date(`${day}T20:00:00Z`));
  const card = habitShareCard(data.habits[0]!, '2026-10-28');
  expect(card.lines[0]).toBe('3 days in a row');
  expect(card.lines).toContain('Done 3 times so far');
  expect(JSON.stringify(card)).not.toMatch(/note/);
});
