import {expect, test} from 'vitest';
import {normalize, search} from './engine';
import {PAGES} from './static';

// Session AH (TO11): markup in the box is text; "refresh" and "tax" find something.
test('"<b>x</b>" is read as "x", never as the words b, x, b', () => {
  expect(normalize('<b>x</b>')).toBe('x');
  expect(normalize('a < b and c > d')).toBe('a b and c d');
});
test('"refresh" finds Refresh prices and "tax" finds the realised gains file', () => {
  expect(search(PAGES, 'refresh')[0]?.title).toBe('Refresh prices');
  expect(search(PAGES, 'tax')[0]?.title).toBe('Realised gains by year (CSV)');
});
