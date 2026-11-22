import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {addPlace, forgetPayeeAt, keepPayeeAt, placesOf, removePlace, restorePayeeAt, restorePlace} from './places';
import type {MoneyMore} from '../money-more/schema';

/** Review b4f #9 (Minor): "Remove" on a place and "Forget" on one payee offer Undo, as "Forget places" does. */
const base: MoneyMore = keepPayeeAt(keepPayeeAt(addPlace(addPlace({version: 1}, 'Work', 'w'), 'The market', 'm'), 'w', 'Coffee corner'), 'w', 'Canteen');

describe('review b4f #9: Undo for a removed place and a forgotten payee', () => {
  test('a removed place comes back where it was, with its payees', () => {
    const work = placesOf(base)[0]!, gone = removePlace(base, 'w');
    expect(restorePlace(gone, work, 0)).toEqual(base);
    expect(restorePlace(base, work, 0)).toBe(base); // already there: nothing doubled
  });
  test('a forgotten payee comes back in its place', () => {
    const gone = forgetPayeeAt(base, 'w', 'Coffee corner');
    expect(placesOf(gone)[0]!.payees).toEqual(['Canteen']);
    expect(restorePayeeAt(gone, 'w', 'Coffee corner', 1)).toEqual(base);
  });
  test('the picker offers both Undos', () => {
    const src = readFileSync(`${process.cwd().endsWith('web') ? '' : 'apps/web/'}components/wealth/spending/places.tsx`, 'utf8');
    expect(src).toContain('undoLabel: `Undo removing ${p.name}`');
    expect(src).toContain('undoLabel: `Undo forgetting ${p.payee}`');
  });
});
