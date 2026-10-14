import {describe, expect, test} from 'vitest';
import {canonical, mergeExtras} from './extras-merge';

// Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C3): the extras' three-way merge.
describe('mergeExtras', () => {
  test('one side changed (or nothing): that side; the same value on both: kept', () => {
    expect(mergeExtras({a: 1}, {a: 1}, {a: 2})).toEqual({a: 2});
    expect(mergeExtras({a: 1}, {a: 3}, {a: 1})).toEqual({a: 3});
    expect(mergeExtras({a: 1}, {a: 4}, {a: 4})).toEqual({a: 4});
    // Key order never reads as a change.
    expect(mergeExtras({a: 1, b: 2}, {b: 2, a: 1}, {a: 1, b: 2, c: 3})).toEqual({a: 1, b: 2, c: 3});
  });
  test('both changed different keys of an unstamped container: both kept (two devices, two goals)', () => {
    const base = {version: 1, goals: {'private:1': {area: 'fun'}}};
    const local = {version: 1, goals: {'private:1': {area: 'fun'}, 'private:2': {why: 'Mine'}}};
    const remote = {version: 1, goals: {'private:1': {area: 'fun'}, 'private:3': {why: 'Theirs'}}};
    expect(mergeExtras(base, local, remote)).toEqual({version: 1, goals: {'private:1': {area: 'fun'}, 'private:2': {why: 'Mine'}, 'private:3': {why: 'Theirs'}}});
  });
  test('a stamped value both changed from a common value: each side\'s own field change survives; a field both changed takes the later stamp', () => {
    const base = {g: {why: 'a', vision: {kind: 'gradient', gradient: 'aurora'}, updatedAt: '2026-10-13T08:00:00.000Z'}};
    // A chose a photo (earlier); B edited the reason (later). Both survive; the stamp is B's.
    const local = {g: {why: 'a', vision: {kind: 'photo', imageId: 'img-1234abcd'}, updatedAt: '2026-10-13T09:00:00.000Z'}};
    const remote = {g: {why: 'B\'s reason', vision: {kind: 'gradient', gradient: 'aurora'}, updatedAt: '2026-10-13T10:00:00.000Z'}};
    const merged = {g: {why: 'B\'s reason', vision: {kind: 'photo', imageId: 'img-1234abcd'}, updatedAt: '2026-10-13T10:00:00.000Z'}};
    expect(mergeExtras(base, local, remote)).toEqual(merged);
    expect(mergeExtras(base, remote, local)).toEqual(merged);
    // Both changed the same field: the later-stamped side's value.
    const both = mergeExtras(base, {g: {...local.g, why: 'A'}}, remote) as {g: {why: string}};
    expect(both.g.why).toBe('B\'s reason');
    // Both added it (no common value): the later stamp is kept whole, never spliced.
    const x = {answer: 'adjust', kcal: 1800, at: '2026-10-13T08:00:00.000Z'}, y = {answer: 'keep', at: '2026-10-13T09:00:00.000Z'};
    expect(mergeExtras({}, {w: x}, {w: y})).toEqual({w: y});
  });
  test('equal stamps or no stamps: the same winner from either side (fixed order of the texts)', () => {
    const x = {answer: 'keep', at: '2026-10-13T08:00:00.000Z'}, y = {answer: 'adjust', at: '2026-10-13T08:00:00.000Z'};
    expect(mergeExtras(undefined, {c: x}, {c: y})).toEqual(mergeExtras(undefined, {c: y}, {c: x}));
    expect(mergeExtras(1, 2, 3)).toBe(mergeExtras(1, 3, 2));
    expect(mergeExtras(['a'], ['b'], ['c'])).toEqual(mergeExtras(['a'], ['c'], ['b']));
  });
  test('removed on one side, untouched on the other: removed; removed against an edit: the edit is kept', () => {
    expect(mergeExtras({g: {x: 1}, h: {y: 1}}, {h: {y: 1}}, {g: {x: 1}, h: {y: 1}})).toEqual({h: {y: 1}});
    expect(mergeExtras({g: {x: 1}}, {}, {g: {x: 2}})).toEqual({g: {x: 2}});
    expect(mergeExtras({g: {x: 1}}, {g: {x: 3}}, {})).toEqual({g: {x: 3}});
  });
  test('lists with identities merge item by item, in this device\'s order with the other\'s new items after', () => {
    const s = (id: string, name: string) => ({id, name});
    const base = [s('1', 'a'), s('2', 'b')], local = [s('2', 'b'), s('1', 'a'), s('3', 'c')], remote = [s('1', 'A'), s('2', 'b'), s('4', 'd')];
    expect(mergeExtras(base, local, remote)).toEqual([s('2', 'b'), s('1', 'A'), s('3', 'c'), s('4', 'd')]);
    // Removed on one side and untouched on the other: removed.
    expect(mergeExtras(base, [s('1', 'a')], [s('1', 'a'), s('2', 'b'), s('4', 'd')])).toEqual([s('1', 'a'), s('4', 'd')]);
    // Entries keyed by day (an average goal's log).
    expect(mergeExtras([{day: '2026-10-01', value: 1}], [{day: '2026-10-01', value: 1}, {day: '2026-10-02', value: 2}], [{day: '2026-10-01', value: 1}, {day: '2026-10-03', value: 3}]))
      .toEqual([{day: '2026-10-01', value: 1}, {day: '2026-10-02', value: 2}, {day: '2026-10-03', value: 3}]);
  });
  test('a first sync (no base): two devices\' records join key by key and item by item', () => {
    expect(mergeExtras(undefined, {version: 1, areas: [{id: 'custom-a', label: 'A', color: '#000000'}], goals: {'private:1': {area: 'fun'}}},
      {version: 1, areas: [{id: 'custom-b', label: 'B', color: '#ffffff'}], goals: {'private:2': {area: 'mind'}}}))
      .toEqual({version: 1, areas: [{id: 'custom-a', label: 'A', color: '#000000'}, {id: 'custom-b', label: 'B', color: '#ffffff'}], goals: {'private:1': {area: 'fun'}, 'private:2': {area: 'mind'}}});
    // Present on one device only: taken as it is.
    expect(mergeExtras(undefined, undefined, {a: 1})).toEqual({a: 1});
    expect(mergeExtras(undefined, {a: 1}, undefined)).toEqual({a: 1});
  });
  test('canonical text sorts keys at every depth', () => {
    expect(canonical({b: 1, a: {d: 1, c: [{z: 1, y: 2}]}})).toBe('{"a":{"c":[{"y":2,"z":1}],"d":1},"b":1}');
  });
});
