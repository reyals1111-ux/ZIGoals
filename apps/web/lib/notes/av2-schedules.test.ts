import {describe, expect, test} from 'vitest';
import {addSchedule, changeSchedule, dailyStart, dueSchedules, everyWords, pauseSchedule, periodStart, removeSchedule, restoreSchedule, runSchedules, withDailyTemplate} from './schedules';
import {emptyNotes, notesSchema} from './schema';
import {showcaseNotes} from './showcase';

/** Session AV lane 2 (notes; LEDGER #32, Notion's repeating database templates and a daily note from a template), pure. */
const NOW = '2026-11-25T08:00:00.000Z';
describe('repeating notes', () => {
  test('the period a day is in: every day, a weekday, a day of the month', () => {
    expect(periodStart({every: 'day'}, '2026-11-25')).toBe('2026-11-25');
    expect(periodStart({every: 'week', weekday: 1}, '2026-11-25')).toBe('2026-11-23'); // Wednesday → Monday
    expect(periodStart({every: 'week', weekday: 3}, '2026-11-25')).toBe('2026-11-25');
    expect(periodStart({every: 'month', monthDay: 1}, '2026-11-25')).toBe('2026-11-01');
    expect(periodStart({every: 'month', monthDay: 28}, '2026-11-25')).toBe('2026-10-28');
    expect(periodStart({every: 'month', monthDay: 28}, '2026-01-05')).toBe('2025-12-28');
    expect(everyWords({every: 'week', weekday: 1})).toBe('every Monday'); expect(everyWords({every: 'month', monthDay: 2})).toBe('on the 2nd of every month'); expect(everyWords({every: 'day'})).toBe('every day');
  });
  test('the note for this period is made once, titled with its first day, {date} in its words; never twice', () => {
    let r = addSchedule(emptyNotes(), {title: 'Week plan', body: 'Week of {date}\n- ', every: 'week', weekday: 1}, 's-week0001');
    expect(dueSchedules(r, '2026-11-25').map(s => s.id)).toEqual(['s-week0001']);
    const first = runSchedules(r, '2026-11-25', NOW);
    expect(first.made.map(n => [n.kind, n.title, n.body])).toEqual([['topic', 'Week plan · 2026-11-23', 'Week of 2026-11-23\n- ']]);
    r = first.record;
    expect(r.schedules![0]!.lastMade).toBe('2026-11-23');
    expect(runSchedules(r, '2026-11-27', NOW).made).toEqual([]);
    const next = runSchedules(r, '2026-11-30', NOW);
    expect(next.made.map(n => n.title)).toEqual(['Week plan · 2026-11-30']);
    expect(next.record.notes).toHaveLength(2);
  });
  test('a note of the same title already there counts as made; paused makes none; checks on input', () => {
    let r = addSchedule(emptyNotes(), {title: 'Daily log', body: '', every: 'day'}, 's-day00001');
    r = notesSchema.parse({...r, notes: [{id: 'n1', kind: 'topic', title: 'Daily log · 2026-11-25', body: 'mine', createdAt: NOW}]});
    const out = runSchedules(r, '2026-11-25', NOW);
    expect(out.made).toEqual([]); expect(out.record.schedules![0]!.lastMade).toBe('2026-11-25');
    expect(runSchedules(pauseSchedule(out.record, 's-day00001', true), '2026-11-26', NOW).made).toEqual([]);
    expect(() => addSchedule(r, {title: 'daily LOG', body: '', every: 'day'})).toThrow('You have a repeating note with that title.');
    expect(() => addSchedule(r, {title: ' ', body: '', every: 'day'})).toThrow('Give the repeating note a title.');
  });
  test('a changed rule makes this period’s note again; the same rule keeps its last one; remove and Undo', () => {
    const r = runSchedules(addSchedule(emptyNotes(), {title: 'Week plan', body: '', every: 'week', weekday: 1}, 's-week0001'), '2026-11-25', NOW).record;
    expect(changeSchedule(r, 's-week0001', {title: 'Week plan', body: 'new', every: 'week', weekday: 1}).schedules![0]!.lastMade).toBe('2026-11-23');
    expect(changeSchedule(r, 's-week0001', {title: 'Week plan', body: '', every: 'week', weekday: 3}).schedules![0]!.lastMade).toBeUndefined();
    const gone = removeSchedule(r, 's-week0001');
    expect(gone.record.schedules).toEqual([]);
    expect(restoreSchedule(gone.record, gone.removed!, gone.at).schedules).toEqual(r.schedules);
  });
  test('the daily note template: its words with {date}, cleared when empty', () => {
    const r = withDailyTemplate(emptyNotes(), 'Day {date}\nToday I want to:');
    expect(dailyStart(r, '2026-11-25')).toBe('Day 2026-11-25\nToday I want to:');
    expect(withDailyTemplate(r, '  ')).not.toHaveProperty('dailyTemplate');
    expect(dailyStart(emptyNotes(), '2026-11-25')).toBe('');
  });
  test('the Showcase has one repeating note, labelled, already made for this week (it makes nothing itself)', () => {
    const s = showcaseNotes('2026-11-25');
    expect(s.schedules).toEqual([expect.objectContaining({title: 'Example · Week plan', every: 'week', weekday: 1, lastMade: '2026-11-23'})]);
    expect(dueSchedules(s, '2026-11-25')).toEqual([]);
    expect(s.notes).toHaveLength(8);
  });
});
