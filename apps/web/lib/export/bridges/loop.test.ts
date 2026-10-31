import {expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus} from '../../habits';
import {HABITBULL_HEADER, habitsToHabitBullCsv} from './loop';

// Session AK Part 8.8 (A16): the CSV Loop really imports (HabitBull's format), checked against Loop's own rules.
const ID = '00000000-0000-4000-8000-00000000000';
test('one row per day done; Loop\'s header; a check is 1; skipped and failed days left out; text kept plain and safe', () => {
  let data = emptyHabitData();
  data = createHabit(data, {title: 'Read, slowly', category: 'Mind', description: '=SUM(1)', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-10-01T08:00:00Z'), ID + '1');
  data = logHabitValue(data, ID + '1', '2026-10-02', 1, {note: 'A "good" chapter'}, new Date('2026-10-02T20:00:00Z'));
  data = logHabitValue(data, ID + '1', '2026-10-03', 1, {}, new Date('2026-10-03T20:00:00Z'));
  data = setHabitEntryStatus(data, ID + '1', '2026-10-04', 'skipped', '', new Date('2026-10-04T20:00:00Z'));
  const out = habitsToHabitBullCsv(data, '2026-10-05');
  const lines = out.csv.trim().split('\n');
  expect(lines[0]).toBe(HABITBULL_HEADER);
  expect(lines[0]!.startsWith('HabitName,HabitDescription,HabitCategory')).toBe(true);
  expect(lines.slice(1)).toEqual(['"Read, slowly",\'=SUM(1),Mind,2026-10-02,1,"A ""good"" chapter"', '"Read, slowly",\'=SUM(1),Mind,2026-10-03,1,']);
  expect(out).toMatchObject({rows: 2, habits: 1});
  expect(habitsToHabitBullCsv(emptyHabitData(), '2026-10-05')).toEqual({csv: HABITBULL_HEADER + '\n', rows: 0, habits: 0});
});
