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
// Session AK Q1 (WIRING_AUDIT 1d, #6, #13): the Journal and Music pages have no sidebar entry, so search must find them by
// name (and by what people call them), as pages that open the page, ahead of Help answers and templates.
test('"Journal" and "Music" find their pages first; "diary", "mood", "spotify" and "calm sounds" find them too', async () => {
  const {HELP_ITEMS} = await import('./static');
  const all = [...PAGES, ...HELP_ITEMS];
  for (const [query, href] of [['Journal', '/app/journal'], ['journal', '/app/journal'], ['Music', '/app/music'], ['music', '/app/music']] as const) expect(search(all, query)[0], query).toMatchObject({kind: 'page', href});
  for (const [query, href] of [['diary', '/app/journal'], ['mood', '/app/journal'], ['spotify', '/app/music'], ['calm sounds', '/app/music']] as const) expect(search(all, query).filter(h => h.kind === 'page').map(h => h.href), query).toContain(href);
});
