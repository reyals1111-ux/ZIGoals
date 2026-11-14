import {describe, expect, it} from 'vitest';
import {editTask} from './engine';
import {taskLevel, tasksSchema} from './schema';
import {MATRIX_RULE, isImportant, isUrgent, levelForMove, matrix, partnerOf, quadrantOf} from './matrix';

/** Session AP: the Priority matrix, read from priority and due day only; a move changes only the priority level. */
const TODAY = '2026-11-14', at = '2026-11-10T09:00:00.000Z';
const record = tasksSchema.parse({version: 1, tasks: [
  {id: 'late-p1', title: 'Tax form', priority: 'high', level: 1, due: '2026-11-12', createdAt: at},
  {id: 'two-days-p3', title: 'Call the plumber', priority: 'normal', due: '2026-11-16', createdAt: at},
  {id: 'three-days-p2', title: 'Plan the trip', priority: 'high', level: 2, due: '2026-11-17', createdAt: at},
  {id: 'none-p4', title: 'Sort the photos', priority: 'low', createdAt: at},
  {id: 'none-old-high', title: 'Older high', priority: 'high', createdAt: at},
  {id: 'done', title: 'Finished', priority: 'high', due: TODAY, createdAt: at, doneAt: '2026-11-14T08:00:00.000Z'},
]});
const task = (id: string) => record.tasks.find(t => t.id === id)!;

describe('the four boxes', () => {
  it('urgent: overdue or due within 2 days; important: P1 or P2 (an older "high" reads as P1)', () => {
    expect(isUrgent(task('late-p1'), TODAY)).toBe(true);
    expect(isUrgent(task('two-days-p3'), TODAY)).toBe(true);
    expect(isUrgent(task('three-days-p2'), TODAY)).toBe(false);
    expect(isUrgent(task('none-p4'), TODAY)).toBe(false);
    expect([isImportant(task('three-days-p2')), isImportant(task('none-old-high')), isImportant(task('two-days-p3'))]).toEqual([true, true, false]);
  });
  it('every open task in one box, in the order given; finished ones left out', () => {
    expect(Object.fromEntries(Object.entries(matrix(record.tasks, TODAY)).map(([q, list]) => [q, list.map(t => t.id)]))).toEqual({
      do: ['late-p1'], quick: ['two-days-p3'], plan: ['three-days-p2', 'none-old-high'], later: ['none-p4'],
    });
  });
  it('a day passing moves a card from "plan" to "do" by itself', () => {
    expect(quadrantOf(task('three-days-p2'), TODAY)).toBe('plan');
    expect(quadrantOf(task('three-days-p2'), '2026-11-15')).toBe('do');
  });
  it('says its rule in one line', () => { expect(MATRIX_RULE).toMatch(/^Urgent: overdue or due within 2 days\. Important: priority P1 or P2\./); expect(MATRIX_RULE).not.toContain('\n'); });
});

describe('moving a card', () => {
  it('changes only the priority level, within its row; its day stays', () => {
    expect(partnerOf('quick')).toBe('do');
    expect(levelForMove(task('two-days-p3'), 'do', TODAY)).toBe(1);
    expect(levelForMove(task('late-p1'), 'quick', TODAY)).toBe(3);
    expect(levelForMove(task('none-p4'), 'plan', TODAY)).toBe(2);
    expect(levelForMove(task('three-days-p2'), 'later', TODAY)).toBe(3);
    expect(levelForMove(task('late-p1'), 'do', TODAY)).toBeNull();
    const moved = editTask(record, 'two-days-p3', {level: levelForMove(task('two-days-p3'), 'do', TODAY)!}, TODAY, {allowPast: true});
    const after = moved.tasks.find(t => t.id === 'two-days-p3')!, before = task('two-days-p3');
    expect(taskLevel(after)).toBe(1);
    expect(quadrantOf(after, TODAY)).toBe('do');
    expect({...after, level: undefined, priority: undefined, updatedAt: undefined}).toEqual({...before, level: undefined, priority: undefined, updatedAt: undefined});
  });
  it('refuses to cross the urgency line, which only the day decides', () => {
    expect(() => levelForMove(task('none-p4'), 'do', TODAY)).toThrow(/by its day/);
    expect(() => levelForMove(task('late-p1'), 'plan', TODAY)).toThrow(/by its day/);
  });
});
