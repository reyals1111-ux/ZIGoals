import {expect, test} from 'vitest';
import {dropMilestoneOn, insertMilestoneAfter, moveMilestone} from './milestone-templates';

const list = [{id: 'a'}, {id: 'b'}, {id: 'c'}];
const ids = (l: {id: string}[]) => l.map(m => m.id).join('');
test('AL-COMPETITOR-GAP-114: insert after any milestone, first, or at the end; drag onto a row; the old list stays', () => {
  expect(ids(insertMilestoneAfter(list, {id: 'n'}, 'a'))).toBe('anbc');
  expect(ids(insertMilestoneAfter(list, {id: 'n'}, 'c'))).toBe('abcn');
  expect(ids(insertMilestoneAfter(list, {id: 'n'}, 'start'))).toBe('nabc');
  expect(ids(insertMilestoneAfter(list, {id: 'n'}, null))).toBe('abcn');
  expect(ids(insertMilestoneAfter(list, {id: 'n'}, 'gone'))).toBe('abcn');
  expect(ids(dropMilestoneOn(list, 'c', 'a'))).toBe('cab');
  expect(ids(dropMilestoneOn(list, 'a', 'c'))).toBe('bca');
  expect(ids(dropMilestoneOn(list, 'x', 'a'))).toBe('abc');
  expect(ids(moveMilestone(list, 'b', 'top'))).toBe('bac');
  expect(ids(list)).toBe('abc');
});
