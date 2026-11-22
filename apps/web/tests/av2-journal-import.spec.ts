import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #44, Day One's imports): Journal → Import and export reads a Day One JSON export and
 * a Markdown file, shows what it found (how many, from when to when, the journals, what is left out) before anything is
 * added, imports with one Undo, and exports the journal as a ZIP. At 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, focus kept, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const DAY_ONE = JSON.stringify({metadata: {version: '1.0'}, entries: [
  {uuid: 'F1', creationDate: '2026-10-04T18:00:00Z', timeZone: 'UTC', text: 'A fictional hike\\.\n![](dayone-moment://X1)', tags: ['outdoors']},
  {uuid: 'F2', creationDate: '2026-10-05T18:00:00Z', timeZone: 'UTC', text: 'A fictional rest day.'}]});
const MARKDOWN = '## 2026-10-10\nA fictional market morning.\n\n## 2026-10-11\nA fictional slow Sunday.\n';
type Stored = {entries: {text: string; date: string; imported?: string; journal?: string}[]; journals?: {name: string}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored | null, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: import a Day One export and Markdown, then export`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal'); await hydrated(page);
  const panel = page.getByRole('region', {name: 'Import and export'});
  await panel.locator('details.journal-files-fold > summary').click();
  await panel.locator('input[type="file"]').setInputFiles([
    {name: 'Hikes.json', mimeType: 'application/json', buffer: Buffer.from(DAY_ONE)},
    {name: 'diary.md', mimeType: 'text/markdown', buffer: Buffer.from(MARKDOWN)}]);
  const plan = panel.getByRole('group', {name: 'What the files hold'});
  await expect(plan).toContainText('4 entries from Oct 4, 2026 to Oct 11, 2026');
  await expect(plan).toContainText('Journals: Hikes');
  const importButton = plan.getByRole('button', {name: 'Import 4 entries'});
  await expect(importButton).toBeFocused();
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await importButton.click();
  await expect(panel.getByText('4 entries added to your journal.')).toBeVisible();
  await expect.poll(async () => { const s = await read(page); return [s?.entries.length, s?.entries.filter(e => e.imported).length, s?.journals?.map(b => b.name)]; }).toEqual([4, 4, ['Hikes']]);
  await expect.poll(async () => (await read(page))?.entries.find(e => e.date === '2026-10-04')?.text).toBe('A fictional hike.');
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(4);
  // Undo of the import: its entries and the journal it made go; then the same files again import the same.
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => { const s = await read(page); return [s?.entries.length, s?.journals ?? []]; }).toEqual([0, []]);
  await panel.locator('input[type="file"]').setInputFiles([
    {name: 'Hikes.json', mimeType: 'application/json', buffer: Buffer.from(DAY_ONE)},
    {name: 'diary.md', mimeType: 'text/markdown', buffer: Buffer.from(MARKDOWN)}]);
  await plan.getByRole('button', {name: 'Import 4 entries'}).click();
  await expect.poll(async () => (await read(page))?.entries.length).toBe(4);
  // The same files again: nothing new.
  await panel.locator('input[type="file"]').setInputFiles([{name: 'diary.md', mimeType: 'text/markdown', buffer: Buffer.from(MARKDOWN)}]);
  await expect(plan).toContainText('No new entry in these files.');
  await plan.getByRole('button', {name: 'Cancel'}).click();
  // Export: one ZIP of the journal.
  const [download] = await Promise.all([page.waitForEvent('download'), panel.getByRole('button', {name: 'Export the journal'}).click()]);
  expect(download.suggestedFilename()).toBe('zigoals-journal-2026-11-23.zip');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
