import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #320, Journey's e-book and Word export): Journal → Import and export → E-book and
 * Word: a journal and two days, then an .epub (mimetype first, stored) or a .docx; a letter not yet opened is counted
 * and left out. At 390 and 1440, Nebula, Light and Dark, axe-clean. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const AT = '2026-11-20T09:00:00.000Z';
const JOURNAL = {version: 1, shareWithAi: false, followUps: true, journals: [{id: 'j-trips01', name: 'Trips', theme: 'cyan'}], entries: [
  {id: 'e1', date: '2026-10-03', text: 'A fictional walk by the sea.', createdAt: AT},
  {id: 'e2', date: '2026-11-02', text: 'Fictional temples and tea.', createdAt: AT, journal: 'j-trips01'},
  {id: 'e3', date: '2026-11-05', text: 'Dear future me, fictional.', createdAt: AT, opensOn: '2027-11-05'}]};
for (const theme of THEMES) test(`${theme}: the journal as an e-book and Word`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [JOURNAL_KEY, JSON.stringify(JOURNAL)] as const);
  await page.goto('/app/journal'); await hydrated(page);
  const files = page.locator('details.journal-files-fold');
  await files.locator('summary').click();
  const part = page.getByRole('region', {name: 'E-book and Word'});
  await expect(part).toBeVisible();
  await expect(part.getByLabel('From')).toHaveValue('2026-10-03');
  await expect(part).toContainText('2 entries; 1 letter waits until it opens and is left out.');
  await part.getByLabel('Journal').selectOption({label: 'Trips'});
  await expect(part).toContainText('1 entry.');
  await part.getByLabel('Journal').selectOption({label: 'All journals'});
  const findings = await axe(page, part);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const read = async (name: string) => { const wait = page.waitForEvent('download'); await part.getByRole('button', {name}).click(); const d = await wait; return {file: d.suggestedFilename(), bytes: readFileSync((await d.path())!)}; };
  const epub = await read('Save as e-book (.epub)');
  expect(epub.file).toMatch(/^zigoals-all-journals-2026-10-03-to-2026-11-2\d\.epub$/);
  expect(epub.bytes.subarray(30, 38).toString('latin1')).toBe('mimetype');
  expect(epub.bytes.subarray(38, 58).toString('latin1')).toBe('application/epub+zip');
  expect(epub.bytes.toString('utf8')).toContain('A fictional walk by the sea.');
  expect(epub.bytes.toString('utf8')).not.toContain('Dear future me');
  const word = await read('Save as Word (.docx)');
  expect(word.file).toMatch(/\.docx$/);
  expect(word.bytes.toString('utf8')).toContain('Fictional temples and tea.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
