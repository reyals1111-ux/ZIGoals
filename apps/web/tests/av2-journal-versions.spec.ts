import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #33 Notion's version history, #39 Day One's templates; QUALITY.md "Not fixed": "save
 * this entry as a template"): an entry's More → "Edit the words" keeps the words it replaced as an earlier version, which
 * can be read and restored (with Undo); "Save as a template" keeps the entry's words and tags as a template of your own;
 * "Start new entries here" makes it the default, so a new entry starts from it. At 390 and 1440, in Nebula, Light and
 * Dark, axe-clean, focus kept, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
type Stored = {entries: {id: string; text: string; updatedAt?: string}[]; versions?: {entryId: string; text: string}[]; templates?: {id: string; title: string; body?: string; tags?: string[]}[]; defaultTemplate?: string};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: edit an entry, its earlier versions, and save it as a template`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'e1', date: '2026-11-22', text: 'How the run went:\nA fictional easy 5 km.', createdAt: '2026-11-22T20:00:00.000Z', tags: ['running']}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const row = page.locator('ol.journal-entries > li').first();
  await row.locator('details.journal-entry-more > summary').click();
  // Edit the words: the old ones become an earlier version.
  await row.getByRole('button', {name: 'Edit the words'}).click();
  const edit = row.getByRole('form', {name: /^Edit the entry of/});
  await edit.getByLabel('The entry’s words').fill('How the run went:\nA fictional easy 6 km, in the rain.');
  await edit.getByRole('button', {name: 'Save the change'}).click();
  await expect(row.locator('.journal-entry-text').first()).toHaveText('How the run went:\nA fictional easy 6 km, in the rain.');
  await expect(row.getByRole('button', {name: 'Edit the words'})).toBeFocused();
  await expect.poll(async () => (await read(page)).versions?.map(v => v.text)).toEqual(['How the run went:\nA fictional easy 5 km.']);
  await expect(row.getByText('· changed · 1 earlier version under More')).toBeVisible();
  const versions = row.getByRole('region', {name: /^Earlier versions/});
  await versions.locator('summary').first().click();
  const findings = await axe(page, row);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await versions.getByRole('button', {name: /^Restore the words of/}).click();
  await expect(row.locator('.journal-entry-text').first()).toHaveText('How the run went:\nA fictional easy 5 km.');
  await expect.poll(async () => (await read(page)).versions?.map(v => v.text)).toEqual(['How the run went:\nA fictional easy 6 km, in the rain.']);
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(row.locator('.journal-entry-text').first()).toHaveText('How the run went:\nA fictional easy 6 km, in the rain.');
  // Save as a template: its words and tags.
  await row.getByRole('button', {name: 'Save as a template'}).click();
  const save = row.getByRole('form', {name: /as a template$/});
  await expect(save.getByLabel('Template name')).toHaveValue('How the run went');
  await save.getByLabel('Template name').fill('Fictional run log');
  await save.getByRole('button', {name: 'Keep this template'}).click();
  await expect.poll(async () => (await read(page)).templates).toEqual([{id: expect.stringMatching(/^own-/), title: 'Fictional run log', headings: ['How the run went:'], body: 'How the run went:\nA fictional easy 6 km, in the rain.', tags: ['running']}]);
  // Start new entries from it.
  const write = page.getByRole('form', {name: 'Write in your journal'});
  await write.getByText('Start from a prompt').click();
  await write.getByRole('button', {name: 'Start new entries from “Fictional run log”'}).click();
  await expect.poll(async () => (await read(page)).defaultTemplate).toMatch(/^own-/);
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('form', {name: 'Write in your journal'}).getByLabel('Today’s entry')).toHaveValue('How the run went:\nA fictional easy 6 km, in the rain.\n');
  await expect(page.getByRole('form', {name: 'Write in your journal'}).getByLabel('Tags — optional')).toHaveValue('running');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
