import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, habitDay, logHabitValue, restoreHabitEntry} from '../habits';
import {applyDayChoice, dayChoiceWords, dayEdit, entryBefore} from './week-day-edit';

/** Session AV lane 2 (habits; q4 #30 Minor — Habitify's per-cell skip and amount in the week grid). */
const START = new Date('2026-11-01T09:00:00Z'), NOW = new Date('2026-11-25T09:00:00Z'), TODAY = '2026-11-25';
const READ = 'aaaaaaaa-0000-4000-8000-000000000011', WALK = 'aaaaaaaa-0000-4000-8000-000000000012', GYM = 'aaaaaaaa-0000-4000-8000-000000000013';
function journal() {
  let d = createHabit(emptyHabitData(), {title: 'Fictional reading', category: 'Mind', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'pages'}, target: 10}, START, READ);
  d = createHabit(d, {title: 'Fictional walk', category: 'Health', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, WALK);
  d = createHabit(d, {title: 'Fictional gym', category: 'Health', description: '', notes: '', timeOfDay: 'anytime', schedule: {kind: 'frequency', times: 3, period: 'week'}, measurement: {kind: 'boolean'}, target: 1}, START, GYM);
  return d;
}
const habit = (d: ReturnType<typeof journal>, id: string) => d.habits.find(h => h.id === id)!;
describe('one day of the week grid: skip, amount, done, clear', () => {
  it('says what a day can become', () => {
    const d = journal();
    expect(dayEdit(habit(d, READ), '2026-11-24', TODAY)).toMatchObject({status: 'failed', count: 0, target: 10, kind: 'count', unit: 'pages', canSkip: true, amount: true, skipped: false});
    expect(dayEdit(habit(d, WALK), TODAY, TODAY)).toMatchObject({status: 'due', amount: false, canSkip: true});
    expect(dayEdit(habit(d, GYM), TODAY, TODAY)?.canSkip).toBe(false); // counted per week: skipped in its History
    expect(dayEdit(habit(d, READ), '2026-11-26', TODAY)).toBeNull(); // after today
  });
  it('skip keeps the day neutral; an amount replaces the skip; clear and Undo put it back', () => {
    let d = journal();
    const before = entryBefore(d, READ, '2026-11-24');
    d = applyDayChoice(d, READ, '2026-11-24', {kind: 'skip'}, NOW);
    expect(habitDay(habit(d, READ), '2026-11-24', TODAY).status).toBe('skipped');
    expect(dayEdit(habit(d, READ), '2026-11-24', TODAY)?.skipped).toBe(true);
    d = applyDayChoice(d, READ, '2026-11-24', {kind: 'amount', value: 6}, NOW);
    expect(habitDay(habit(d, READ), '2026-11-24', TODAY)).toMatchObject({status: 'failed', count: 6});
    d = applyDayChoice(d, READ, '2026-11-24', {kind: 'done'}, NOW);
    expect(habitDay(habit(d, READ), '2026-11-24', TODAY)).toMatchObject({status: 'complete', count: 10});
    d = applyDayChoice(d, READ, '2026-11-24', {kind: 'clear'}, NOW);
    expect(habitDay(habit(d, READ), '2026-11-24', TODAY)).toMatchObject({status: 'failed', count: 0});
    // Undo of a skip puts back what was there (nothing logged).
    let u = applyDayChoice(journal(), WALK, TODAY, {kind: 'skip'}, NOW);
    u = restoreHabitEntry(u, WALK, TODAY, before, NOW);
    expect(habitDay(habit(u, WALK), TODAY, TODAY).status).toBe('due');
    // An amount keeps a note written earlier.
    let n = logHabitValue(journal(), READ, '2026-11-23', 2, {note: 'On the train'}, NOW);
    n = applyDayChoice(n, READ, '2026-11-23', {kind: 'amount', value: 12}, NOW);
    expect(habitDay(habit(n, READ), '2026-11-23', TODAY)).toMatchObject({status: 'complete', count: 12, note: 'On the train'});
  });
  it('a day after today, or a habit counted per week, refuses a skip from here', () => {
    expect(() => applyDayChoice(journal(), READ, '2026-11-27', {kind: 'skip'}, NOW)).toThrow();
    expect(dayChoiceWords('Read', 'Tuesday 24 November', {kind: 'amount', value: 6}, 'pages')).toBe('Read: 6 pages on Tuesday 24 November.');
    expect(dayChoiceWords('Read', 'today', {kind: 'skip'}, '')).toBe('Read: skipped today. A skipped day keeps the streak.');
  });
});

/** Review b2b #5: Skip this day from the week grid keeps the person's note; Undo puts the day back with it. */
describe('a skip from the week keeps the day\'s note (review b2b #5)', () => {
  it('a noted, logged day: skipped, the note unchanged; Undo restores the count and the note', () => {
    const noted = logHabitValue(journal(), READ, '2026-11-23', 4, {note: 'Fictional · read in the rain'}, NOW);
    const before = entryBefore(noted, READ, '2026-11-23');
    const skipped = applyDayChoice(noted, READ, '2026-11-23', {kind: 'skip'}, NOW);
    expect(habitDay(habit(skipped, READ), '2026-11-23', TODAY)).toMatchObject({status: 'skipped', note: 'Fictional · read in the rain'});
    expect(entryBefore(skipped, READ, '2026-11-23')).toMatchObject({disposition: 'skipped', note: 'Fictional · read in the rain'});
    const undone = restoreHabitEntry(skipped, READ, '2026-11-23', before, NOW);
    expect(entryBefore(undone, READ, '2026-11-23')).toMatchObject({disposition: 'logged', count: 4, note: 'Fictional · read in the rain'});
    expect(habitDay(habit(undone, READ), '2026-11-23', TODAY)).toMatchObject({status: 'failed', count: 4, note: 'Fictional · read in the rain'});
  });
  it('a day without a note says where the skip came from; a skip of a skipped day keeps its words', () => {
    const d = applyDayChoice(journal(), WALK, '2026-11-24', {kind: 'skip'}, NOW);
    expect(entryBefore(d, WALK, '2026-11-24')?.note).toBe('Skipped from the week');
    const again = applyDayChoice(d, WALK, '2026-11-24', {kind: 'skip'}, NOW);
    expect(entryBefore(again, WALK, '2026-11-24')?.note).toBe('Skipped from the week');
  });
});

