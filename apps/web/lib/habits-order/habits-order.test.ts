import {describe, expect, test} from 'vitest';
import {dropOn, inOrder, moveById, moveItem, movedWords, orderRecord, reorderKey} from './reorder';
import {habitListModeOf, habitOrderOf, orderedHabits, withHabitListMode, withHabitOrder} from './extras';
import {compactRow} from './compact';
import {habitExtrasSchema, emptyHabitExtras} from '../habits-extras/schema';
import {setHabitArea} from '../habits-extras/store';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus, type HabitData} from '../habits';

// Session AK (5.7): habit order and the compact list.
describe('reorder helpers', () => {
  test('move by index, by id and step, to top or bottom, by drop; out-of-range moves change nothing', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(moveItem(ids, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(ids, 3, -5)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(ids, 9, 0)).toEqual(ids);
    expect(moveById(ids, 'c', -1)).toEqual(['a', 'c', 'b', 'd']);
    expect(moveById(ids, 'a', -1)).toEqual(ids);
    expect(moveById(ids, 'b', 'bottom')).toEqual(['a', 'c', 'd', 'b']);
    expect(moveById(ids, 'd', 'top')).toEqual(['d', 'a', 'b', 'c']);
    expect(moveById(ids, 'zz', 1)).toEqual(ids);
    expect(dropOn(ids, 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
  });
  test('saved order: ordered first, new ones after in their own order', () => {
    const items = ['a', 'b', 'c', 'n1', 'n2'].map(id => ({id}));
    expect(inOrder(items, {c: 0, a: 1, b: 2}).map(x => x.id)).toEqual(['c', 'a', 'b', 'n1', 'n2']);
    expect(inOrder(items, null).map(x => x.id)).toEqual(['a', 'b', 'c', 'n1', 'n2']);
    expect(orderRecord(['x', 'y'])).toEqual({x: 0, y: 1});
  });
  test('keys and words', () => {
    expect(reorderKey({key: 'ArrowUp', altKey: true})).toBe(-1);
    expect(reorderKey({key: 'End', altKey: true})).toBe('bottom');
    expect(reorderKey({key: 'ArrowUp', altKey: false})).toBeNull();
    expect(reorderKey({key: 'x', altKey: true})).toBeNull();
    expect(movedWords('Walk', ['a', 'w', 'c'], 'w')).toBe('Walk moved to position 2 of 3.');
  });
});

describe('order and list mode in the loose habit extras', () => {
  test('stored as optional fields; the extras schema keeps them through its own writes; pruned to the journal\'s ids', () => {
    let r = withHabitOrder(emptyHabitExtras(), ['b', 'a', 'gone'], new Set(['a', 'b']));
    expect(habitOrderOf(r)).toEqual({b: 0, a: 1});
    // The existing store's own mutators keep the field (loose record).
    r = setHabitArea(r, 'a', 'health');
    expect(habitOrderOf(habitExtrasSchema.parse(JSON.parse(JSON.stringify(r))))).toEqual({b: 0, a: 1});
    expect(orderedHabits([{id: 'a'}, {id: 'b'}, {id: 'c'}], r).map(h => h.id)).toEqual(['b', 'a', 'c']);
    expect(habitOrderOf({...emptyHabitExtras(), order: {a: -1}} as never)).toBeNull();
    expect(JSON.parse(JSON.stringify(withHabitOrder(r, [])))).not.toHaveProperty('order');
  });
  test('list mode: cards unless compact was chosen', () => {
    expect(habitListModeOf(emptyHabitExtras())).toBe('cards');
    const c = withHabitListMode(emptyHabitExtras(), 'compact');
    expect(habitListModeOf(c)).toBe('compact');
    expect(JSON.parse(JSON.stringify(withHabitListMode(c, 'cards')))).toEqual({version: 1});
  });
});

describe('compact rows', () => {
  test('the last five days, today last; done, missed, skipped; quit habits are not tappable', () => {
    const now = new Date('2026-10-05T10:00:00.000Z'), then = new Date('2026-09-01T10:00:00.000Z');
    let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
    d = createHabit(d, {title: 'Read', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, then, '11111111-1111-4111-8111-111111111111');
    d = createHabit(d, {title: 'No soda', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 0, type: 'quit'}, then, '22222222-2222-4222-8222-222222222222');
    d = logHabitValue(d, '11111111-1111-4111-8111-111111111111', '2026-10-04', 1, {}, now);
    d = setHabitEntryStatus(d, '11111111-1111-4111-8111-111111111111', '2026-10-03', 'skipped', '', now);
    const row = compactRow(d.habits[0]!, '2026-10-05');
    expect(row.cells.map(c => c.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
    expect(row.cells.map(c => c.status)).toEqual(['failed', 'failed', 'skipped', 'complete', 'due']);
    expect(row.cells.map(c => c.tappable)).toEqual([true, true, false, true, true]);
    expect(compactRow(d.habits[1]!, '2026-10-05').cells.every(c => !c.tappable)).toBe(true);
  });
});
