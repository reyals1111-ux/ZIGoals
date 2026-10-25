import {describe, expect, it} from 'vitest';
import {reinsertItems, removedItems} from './undo-removal';

describe('removedItems / reinsertItems (Session AH, DS5)', () => {
  const before = {version: 1, water: [{id: 'a', ml: 250}, {id: 'b', ml: 500}], daily: {entries: [{id: 'x'}, {id: 'y'}]}, name: 'n'};
  it('finds what a save removed, at any depth, with its place', () => {
    const after = {...before, water: [{id: 'a', ml: 250}]};
    expect(removedItems(before, after)).toEqual([{path: ['water'], index: 1, item: {id: 'b', ml: 500}}]);
    const nested = {...before, daily: {entries: [{id: 'y'}]}};
    expect(removedItems(before, nested)).toEqual([{path: ['daily', 'entries'], index: 0, item: {id: 'x'}}]);
  });
  it('a save that also added an item, or removed nothing, is not a plain removal', () => {
    expect(removedItems(before, {...before, water: [{id: 'a', ml: 250}, {id: 'c', ml: 1}]})).toBeNull();
    expect(removedItems(before, {...before, name: 'm'})).toBeNull();
  });
  it('Undo puts the items back into the latest record where they were, keeping what changed since', () => {
    const removed = removedItems(before, {...before, water: [{id: 'a', ml: 250}]})!;
    const latest = {...before, water: [{id: 'a', ml: 250}, {id: 'later', ml: 100}], name: 'changed since'};
    expect(reinsertItems(latest, removed)).toEqual({...latest, water: [{id: 'a', ml: 250}, {id: 'b', ml: 500}, {id: 'later', ml: 100}]});
    // Already back (another tab undid it): left alone.
    const back = reinsertItems(latest, removed);
    expect(reinsertItems(back, removed)).toEqual(back);
    // The latest record is never changed in place.
    expect(latest.water).toHaveLength(2);
  });
  it('several removed items come back in their order', () => {
    const many = {list: [{id: '1'}, {id: '2'}, {id: '3'}, {id: '4'}]};
    const removed = removedItems(many, {list: [{id: '2'}, {id: '4'}]})!;
    expect(reinsertItems({list: [{id: '2'}, {id: '4'}]}, removed)).toEqual(many);
  });
  it('follows lists inside list items by their id (a portfolio\'s transactions)', () => {
    const b = {portfolios: [{id: 'p1', transactions: [{id: 't1'}, {id: 't2'}]}, {id: 'p2', transactions: [{id: 't3'}]}]};
    const a = {portfolios: [{id: 'p1', transactions: [{id: 't2'}]}, {id: 'p2', transactions: [{id: 't3'}]}]};
    const removed = removedItems(b, a)!;
    expect(removed).toEqual([{path: ['portfolios', '#p1', 'transactions'], index: 0, item: {id: 't1'}}]);
    expect(reinsertItems(a, removed)).toEqual(b);
  });
});
