import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #266, Grid Diary's grid layout and the Mandala): Start from a prompt → "Grids and
 * look-backs" → the Mandala opens a 3 × 3 grid of labelled boxes (the centre first); "Write as one text" and back; the
 * entry is saved as text with headings and drawn as its grid in the list; any other template can be written as a grid.
 * At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {entries: {text: string; template?: string}[]} | null, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: a grid entry and the Mandala`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: []})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.locator('details.prompt-fold > summary', {hasText: 'Start from a prompt'}).click();
  await form.getByRole('list', {name: 'Grids and look-backs'}).getByRole('button', {name: /^Mandala: one theme, eight sides/}).click();
  const grid = form.getByRole('group', {name: 'Mandala: one theme, eight sides, as a 3 by 3 grid'});
  await expect(grid.getByRole('textbox')).toHaveCount(9);
  await grid.getByRole('textbox', {name: 'My theme, in the centre:'}).fill('Fictional calm');
  await grid.getByRole('textbox', {name: 'Money:'}).fill('Fictional savings');
  await expect(form.getByRole('button', {name: 'Write as one text'})).toHaveAttribute('aria-pressed', 'true');
  const findings = await axe(page, grid);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  if (!isMobile) { // the 3 × 3: the centre box sits between the others
    const centre = (await grid.locator('.compose-grid-cell.is-centre').boundingBox())!, first = (await grid.locator('.compose-grid-cell').nth(1).boundingBox())!;
    expect(centre.x).toBeGreaterThan(first.x); expect(centre.y).toBeGreaterThan(first.y);
  }
  await form.getByRole('button', {name: 'Write as one text'}).click();
  await expect(form.getByRole('textbox', {name: 'Today’s entry'})).toHaveValue(/My theme, in the centre:\nFictional calm\n[\s\S]*Money:\nFictional savings/);
  await form.getByRole('button', {name: 'Write as a grid'}).click();
  await expect(grid.getByRole('textbox', {name: 'Money:'})).toHaveValue('Fictional savings');
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(async () => (await read(page))?.entries[0]).toMatchObject({template: 'mandala', text: expect.stringContaining('Money:\nFictional savings')});
  const shown = page.locator('ol.journal-entries > li').first().getByRole('list', {name: /as a grid/});
  await expect(shown.getByRole('listitem').first()).toContainText('Fictional calm');
  // Another template, written as a grid.
  await form.locator('details.prompt-fold > summary', {hasText: 'Start from a prompt'}).click();
  await form.getByRole('list', {name: 'Prompts'}).getByRole('button', {name: /^Gratitude/}).click();
  await form.getByRole('button', {name: 'Write as a grid'}).click();
  await expect(form.getByRole('group', {name: 'Gratitude, as a grid'}).getByRole('textbox')).toHaveCount(2);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
