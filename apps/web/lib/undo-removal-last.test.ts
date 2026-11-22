import {expect, test} from 'vitest';
import {reinsertItems, removedItems} from './undo-removal';
import {withoutOwnBudget} from './money-more/own-budgets';

/**
 * Session AV lane 2 (fixb2): removing the last item of a list that its record then leaves out (Wealth → Budgets → your own
 * budgets drops `budgets` when it is empty) is a removal with an Undo, as any other; Undo puts the list back with it.
 * tests/av2-money-own-budgets.spec.ts found the missing Undo.
 */
test('the last item removed, its list key dropped: one removal, put back by Undo', () => {
  const holiday = {id: 'own-1', name: 'Holiday', tag: 'holiday', every: 'once', from: '2026-11-01', to: '2026-11-30', amount: '500.00', currency: 'EUR'};
  const before = {version: 1, budgets: [holiday]} as never;
  const after = withoutOwnBudget(before, 'own-1');
  expect((after as {budgets?: unknown}).budgets).toBeUndefined();
  const removed = removedItems(before, after);
  expect(removed).toEqual([{path: ['budgets'], index: 0, item: holiday}]);
  expect(reinsertItems(after, removed!)).toEqual(before);
});

test('an empty list left out, or a record with nothing removed, is still no removal', () => {
  expect(removedItems({version: 1, budgets: []}, {version: 1})).toBeNull();
  expect(removedItems({version: 1, budgets: [{id: 'a'}]}, {version: 1, budgets: [{id: 'a'}]})).toBeNull();
});
