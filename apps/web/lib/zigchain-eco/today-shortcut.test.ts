import {expect, test} from 'vitest';
import {emptyDashboardSettings} from '../dashboard-settings';
import {addShortcut, removeShortcut, restoreShortcut, shortcutOf} from './today-shortcut';

// Session AL (P-BN-57, BN-097; A7): the Ecosystem ⋯ menu adds once, removes, and its Undo restores the same widget.
test('BN-097: add is idempotent, remove takes it off, Undo puts the same widget back in the store record', () => {
  const start = emptyDashboardSettings();
  const added = addShortcut(start, 'valdora', '11111111-1111-4111-8111-111111111111');
  const widget = shortcutOf(added, 'valdora');
  expect(widget).toMatchObject({kind: 'ecosystem', metric: 'directory', entity: 'valdora'});
  expect(addShortcut(added, 'valdora', '22222222-2222-4222-8222-222222222222').widgets.filter(w => w.entity === 'valdora')).toHaveLength(1);
  const removed = removeShortcut(added, 'valdora');
  expect(shortcutOf(removed, 'valdora')).toBeUndefined();
  const back = restoreShortcut(removed, widget!);
  expect(shortcutOf(back, 'valdora')).toMatchObject({id: widget!.id, entity: 'valdora'});
  // Undo after the person added it again: no second copy.
  const again = addShortcut(removed, 'valdora', '33333333-3333-4333-8333-333333333333');
  expect(restoreShortcut(again, widget!).widgets.filter(w => w.entity === 'valdora')).toHaveLength(1);
});
