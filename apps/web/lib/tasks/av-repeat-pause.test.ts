import {describe, expect, it} from 'vitest';
import {addTask, finishTask, pausedDue, PAUSE_PAST_MESSAGE} from './engine';
import {DEFAULT_RULES, levelForMove, matrix, quadrantOf, readRules, ruleWords} from './matrix';
import {emptyTasks} from './schema';

/** Session AV (owner follow-up 1, F-REPEAT-PAUSE and F-MATRIX-RULES; TickTick, Things). */
const TODAY = '2026-11-23', at = new Date('2026-11-23T09:00:00Z');
describe('Session AV (F-REPEAT-PAUSE)', () => {
  const weekly = addTask(emptyTasks(), {title: 'Fictional bins out', due: TODAY, recur: {every: 'week', interval: 1}}, {id: 'p', at, today: TODAY});
  it('pauses until the first time on or after the day; the times before are skipped, not done', () => {
    expect(pausedDue(weekly.tasks[0]!, '2026-12-10', TODAY)).toBe('2026-12-14');
    expect(pausedDue(weekly.tasks[0]!, '2026-11-30', TODAY)).toBe('2026-11-30');
    expect(() => pausedDue(weekly.tasks[0]!, TODAY, TODAY)).toThrow(PAUSE_PAST_MESSAGE);
    const ending = addTask(emptyTasks(), {title: 'x', due: TODAY, recur: {every: 'week', interval: 1, until: '2026-12-01'}}, {id: 'e', at, today: TODAY});
    expect(() => pausedDue(ending.tasks[0]!, '2026-12-20', TODAY)).toThrow('The repeat ends before then.');
    expect(() => pausedDue({due: TODAY}, '2026-12-20', TODAY)).toThrow('Only a repeating task can be paused.');
  });
  it('opens its finished subtasks again when it comes round; a last time leaves them done', () => {
    let r = addTask(weekly, {title: 'Paper bin', parentId: 'p'}, {id: 'c1', at, today: TODAY});
    r = addTask(r, {title: 'Glass bin', parentId: 'p'}, {id: 'c2', at, today: TODAY});
    r = finishTask(r, 'c1', at, {today: TODAY});
    expect(r.tasks.find(t => t.id === 'c1')!.doneAt).toBeTruthy();
    r = finishTask(r, 'p', at, {today: TODAY});
    expect(r.tasks.find(t => t.id === 'p')).toMatchObject({due: '2026-11-30'});
    expect(r.tasks.filter(t => t.parentId).map(t => [t.id, !!t.doneAt])).toEqual([['c1', false], ['c2', false]]);
  });
});
describe('Session AV (F-MATRIX-RULES)', () => {
  const r = addTask(addTask(emptyTasks(), {title: 'Due in 4 days, P3', due: '2026-11-27', level: 3}, {id: 'a', at, today: TODAY}), {title: 'Today, P2', due: TODAY, level: 2}, {id: 'b', at, today: TODAY});
  it('uses the person\'s own lines, and reads a bad value as the usual ones', () => {
    const own = {urgentDays: 5, importantUpTo: 3 as const};
    expect([quadrantOf(r.tasks[0]!, TODAY), quadrantOf(r.tasks[0]!, TODAY, own)]).toEqual(['later', 'do']);
    expect(matrix(r.tasks, TODAY, {urgentDays: 0, importantUpTo: 1}).quick.map(t => t.id)).toEqual(['b']);
    expect(levelForMove(r.tasks[1]!, 'do', TODAY, {urgentDays: 0, importantUpTo: 1})).toBe(1);
    expect(levelForMove(r.tasks[0]!, 'quick', TODAY, own)).toBe(4); // out of "important" under P1–P3: P4
    expect(readRules({urgentDays: 30, importantUpTo: 7})).toEqual(DEFAULT_RULES);
    // Session AV (1c, q1 #15, deliberate): the rule now also says a near deadline is urgent (the matrix counts it); the whole line is still pinned.
    expect(ruleWords({urgentDays: 0, importantUpTo: 1})).toBe('Urgent: overdue or due today. Important: priority P1. Moving a card changes only its priority; its day stays. A deadline that near is urgent too.');
  });
});
