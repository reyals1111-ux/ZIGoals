import {expect, test} from 'vitest';
import {emptyChecklist} from './schema';
import {ChecklistError, addCustom, addFavourite} from './store';

// Session AH (TO5, T-111): one planet per name on the Checklist path. Fictional items only.
const at = new Date('2026-10-26T09:00:00Z');
test('a habit starred while a custom item of the same name is on the path takes its place', () => {
  const withCustom = addCustom(emptyChecklist(), {label: 'Read ten pages', section: 'morning'}, {id: 'c1', at});
  const starred = addFavourite(withCustom, {kind: 'habit', habitId: 'h1'}, {id: 'h-item', at, label: 'read ten pages'});
  expect(starred.items).toHaveLength(1);
  expect(starred.items[0]).toMatchObject({id: 'c1', kind: 'habit', ref: {habitId: 'h1'}, section: 'morning'});
});
test('a second custom item with the same name is refused in words', () => {
  const one = addCustom(emptyChecklist(), {label: 'Stretch'}, {id: 'c1', at});
  expect(() => addCustom(one, {label: ' stretch '}, {id: 'c2', at})).toThrow(ChecklistError);
  expect(() => addCustom(one, {label: 'stretch'}, {id: 'c2', at})).toThrow('“stretch” is already on your path.');
});
