import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #363, Craft's table quick actions): while editing a note with a table, Change a
 * table shows it as a grid; a cell changed, a row and a column added, a sort by price, all written back as Markdown;
 * Save keeps the earlier words as a version. Esc closes it, focus back on its button. Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320 (the grid scrolls in its own region).
 */
test.use({timezoneId: 'UTC'});
const BODY = '| Item | Price |\n| --- | --- |\n| Tea | 4 |\n| Apples | 12 |\n| Bread | 2 |';
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional shopping', body: BODY, createdAt: '2026-11-01T09:00:00.000Z'}]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), NOTES_KEY);
for (const theme of THEMES) test(`${theme}: change a table in a note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByRole('button', {name: 'Edit', exact: true}).click();
  await note.getByRole('button', {name: 'Change a table'}).click();
  const edit = note.getByRole('group', {name: 'Change a table'});
  await edit.getByLabel('Row 1, Item').fill('Green tea');
  await edit.getByRole('button', {name: 'Add a row'}).click();
  await edit.getByLabel('Row 4, Item').fill('Milk');
  await edit.getByLabel('Row 4, Price').fill('3');
  await edit.getByLabel('New column').fill('Shop');
  await edit.getByRole('button', {name: 'Add a column'}).click();
  await edit.getByLabel('Column', {exact: true}).selectOption({label: 'Price'});
  await edit.getByRole('button', {name: 'Sort A to Z'}).click();
  await expect(edit.getByRole('status')).toHaveText('Sorted by “Price”, A to Z (small to large).');
  const findings = await axe(page, edit);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await expect(note.getByRole('textbox', {name: 'Note'})).toHaveValue('| Item | Price | Shop |\n| --- | --- | --- |\n| Bread | 2 |  |\n| Milk | 3 |  |\n| Green tea | 4 |  |\n| Apples | 12 |  |');
  await page.keyboard.press('Escape');
  await expect(note.getByRole('button', {name: 'Change a table'})).toBeFocused();
  await note.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await stored(page)).notes[0].body).toContain('| Bread | 2 |  |');
  await expect.poll(async () => (await stored(page)).versions?.[0]?.body).toBe(BODY);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
