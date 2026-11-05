import {describe, expect, it} from 'vitest';
import {itemChanges, revertItemChanges, sameValue} from '../undo-removal';

describe('itemChanges / revertItemChanges (Session AL 3e)', () => {
  const before = {updatedAt: 't0', habits: [{id: 'h1', days: {'2026-11-04': 'done'}}, {id: 'h2', days: {}}], p: {list: [{id: 'x', tx: [{id: 't1'}]}]}};
  it('finds added, removed and edited items, nested lists followed by their item', () => {
    const after = {updatedAt: 't1', habits: [{id: 'h1', days: {'2026-11-04': 'skipped'}}, {id: 'h3', days: {}}], p: {list: [{id: 'x', tx: [{id: 't1'}, {id: 't2'}]}]}};
    const c = itemChanges(before, after)!;
    expect(c.removed).toEqual([{path: ['habits'], index: 1, item: {id: 'h2', days: {}}}]);
    expect(c.added).toEqual([{path: ['habits'], item: {id: 'h3', days: {}}}, {path: ['p', 'list', '#x', 'tx'], item: {id: 't2'}}]);
    expect(c.edited).toEqual([{path: ['habits'], before: before.habits[0], after: after.habits[0]}]);
  });
  it('nothing listed changed: null (no Undo offered)', () => {
    expect(itemChanges(before, {...before, updatedAt: 't9'})).toBeNull();
  });
  it('a list that appears or disappears counts', () => {
    expect(itemChanges({}, {water: [{id: 'a'}]})!.added).toHaveLength(1);
    expect(itemChanges({water: [{id: 'a'}]}, {})!.removed).toHaveLength(1);
  });
  it('reverts into the latest record, keeps later work, and never changes the latest in place (PR-044: a skip undone)', () => {
    const after = {updatedAt: 't1', habits: [{id: 'h1', days: {'2026-11-04': 'skipped'}}, {id: 'h3', days: {}}], p: {list: [{id: 'x', tx: [{id: 't1'}, {id: 't2'}]}]}};
    const c = itemChanges(before, after)!;
    const latest = {...after, habits: [...after.habits, {id: 'later', days: {}}]};
    const {record, kept} = revertItemChanges(latest, c);
    expect(kept).toBe(0);
    expect(record.habits.map(h => h.id)).toEqual(['h1', 'h2', 'later']);
    expect(record.habits[0]!.days).toEqual({'2026-11-04': 'done'});
    expect(record.p.list[0]!.tx).toEqual([{id: 't1'}]);
    expect(latest.habits).toHaveLength(3);
  });
  it('an item edited again since is kept, and counted', () => {
    const after = {items: [{id: 'a', v: 2}]};
    const c = itemChanges({items: [{id: 'a', v: 1}]}, after)!;
    expect(revertItemChanges({items: [{id: 'a', v: 3}]}, c)).toEqual({record: {items: [{id: 'a', v: 3}]}, kept: 1});
  });
  it('sameValue compares plain data deeply, ignoring undefined fields', () => {
    expect(sameValue({a: [1, {b: 2}], c: undefined}, {a: [1, {b: 2}]})).toBe(true);
    expect(sameValue({a: 1}, {a: 2})).toBe(false);
    expect(sameValue([1], {0: 1})).toBe(false);
  });
  it('NB-081: sees and undoes items inside an object that one side does not have yet (a first water entry on an empty device)', () => {
    const before = {kind: 'health'}, after = {kind: 'health', daily: {water: [{id: 'w1', ml: 250}]}};
    const changes = itemChanges(before, after)!;
    expect(changes.added).toEqual([{path: ['daily', 'water'], item: {id: 'w1', ml: 250}}]);
    const reverted = revertItemChanges(after, changes) as {daily?: {water?: unknown[]}};
    expect(reverted.daily?.water ?? []).toEqual([]);
    const removal = itemChanges(after, before)!;
    expect(removal.removed.map(r => r.item)).toEqual([{id: 'w1', ml: 250}]);
  });
});
