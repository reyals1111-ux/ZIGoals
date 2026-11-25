import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #270, Obsidian's properties and Bases): a note's Properties fold adds a typed
 * property (a choice); Notes → Table shows a column per property with filters; Notes → Board groups the notes by a
 * choice property, and a card's "Move to" moves it (focus stays on it). At 390 and 1440, Nebula, Light and Dark,
 * axe-clean, no sideways page scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional trip', body: 'Plans.', createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-20T09:00:00.000Z', props: [{k: 'Status', t: 'choice', v: 'Planning'}, {k: 'Budget', t: 'number', v: 1200}]},
  {id: 'n-b', kind: 'topic', title: 'Fictional house', body: 'Paint.', createdAt: '2026-11-02T09:00:00.000Z', updatedAt: '2026-11-19T09:00:00.000Z', props: [{k: 'Status', t: 'choice', v: 'Done'}, {k: 'Budget', t: 'number', v: 300}]},
  {id: 'n-c', kind: 'topic', title: 'Fictional idea', body: 'Later.', createdAt: '2026-11-03T09:00:00.000Z', updatedAt: '2026-11-18T09:00:00.000Z'}]};
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}') as {notes: {id: string; props?: {k: string; t: string; v: unknown}[]}[]}, NOTES_KEY);
for (const theme of THEMES) test(`${theme}: properties, the table's columns and filters, and the board`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  // A property on a note.
  await page.goto('/app/notes?note=n-c'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.locator('details.note-props-fold > summary').click();
  const add = note.getByRole('form', {name: 'Add a property'});
  await add.getByLabel('Name').fill('Status');
  await expect(add.getByLabel('Type')).toHaveValue('choice'); // the type other notes give it
  await add.getByLabel('Value').fill('Planning');
  await add.getByRole('button', {name: 'Add the property'}).click();
  await expect.poll(async () => (await stored(page)).notes.find(n => n.id === 'n-c')?.props).toEqual([{k: 'Status', t: 'choice', v: 'Planning'}]);
  await expect(add.getByLabel('Name')).toBeFocused();
  let findings = await axe(page, note.locator('details.note-props-fold'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // The table: a column per property, and a filter.
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const layouts = page.getByRole('group', {name: 'Show notes as'});
  await layouts.getByRole('button', {name: 'Table'}).click();
  const table = page.getByRole('region', {name: 'Notes as a table'}).getByRole('table');
  await expect(table.getByRole('columnheader', {name: /^Status/})).toBeVisible();
  await expect(table.getByRole('columnheader', {name: /^Budget/})).toBeVisible();
  const filters = page.getByRole('group', {name: 'Filters on your properties'});
  await filters.getByRole('button', {name: 'Add a filter'}).click();
  const f1 = filters.getByRole('group', {name: 'Filter 1'});
  await f1.getByLabel('Property').selectOption('Status');
  await f1.getByLabel('Which').selectOption('is');
  // Session AV lane 2 (fixb3: "Value" also matched the Which list's "has a value", deliberate): the list named exactly Value.
  await f1.getByRole('combobox', {name: 'Value', exact: true}).selectOption('Planning');
  // Session AV lane 2 (fixb3: the table starts sorted by Last changed, newest first, and the idea was changed just now when its
  // property was added, deliberate): the same two notes, the idea first.
  await expect.poll(() => table.locator('tbody th').allInnerTexts()).toEqual(['Fictional idea', 'Fictional trip']);
  await expect(page.getByText('2 notes of 3 pass the filters.')).toBeVisible();
  // Session AW (#441, deliberate): Notes' search narrows by the same property filters (its own fold), so there are two
  // filter groups now; each one is checked, as the one was.
  expect(await page.locator('.notes-filters').count()).toBeGreaterThanOrEqual(1);
  for (const group of await page.locator('.notes-filters').all()) {
    findings = await axe(page, group);
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  }
  // The board, by Status; move a card.
  await layouts.getByRole('button', {name: 'Board'}).click();
  const board = page.getByRole('region', {name: 'Notes as a board, by Status'});
  await expect(board.getByRole('region', {name: 'Planning: 2 notes'})).toBeVisible();
  await expect(board.getByRole('region', {name: 'Done: 1 note'})).toBeVisible();
  await board.getByRole('combobox', {name: 'Move “Fictional idea” to'}).selectOption('Done');
  await expect(board.getByRole('region', {name: 'Done: 2 notes'})).toBeVisible();
  await expect(board.getByRole('combobox', {name: 'Move “Fictional idea” to'})).toBeFocused();
  await expect.poll(async () => (await stored(page)).notes.find(n => n.id === 'n-c')?.props).toEqual([{k: 'Status', t: 'choice', v: 'Done'}]);
  findings = await axe(page, board);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
