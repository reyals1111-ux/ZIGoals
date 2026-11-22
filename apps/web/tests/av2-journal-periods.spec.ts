import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #269, Grid Diary's week, month and year entries): Write → "This entry is about"
 * (this or last week, month or year) with "Start from the … look-back"; the entry keeps `period`, says it in the list,
 * and the calendar's periods row shows its entries. At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways
 * scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {entries: {text: string; period?: string; template?: string}[]} | null, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: an entry about a week, and the calendar's periods`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'm', date: '2026-11-01', text: 'A fictional October look-back.', createdAt: '2026-11-01T20:00:00.000Z', period: '2026-10'},
    {id: 'd', date: '2026-11-20', text: 'A fictional day.', createdAt: '2026-11-20T20:00:00.000Z'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  const about = form.getByLabel('This entry is about');
  await expect(about).toHaveValue('');
  await about.selectOption('2026-W47');
  await form.getByRole('button', {name: 'Start from the week look-back'}).click();
  const field = form.getByRole('textbox', {name: 'Today’s entry'});
  await expect(field).toHaveValue(/^What went well this week:/);
  await field.fill('What went well this week:\nFictional runs.\n');
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(async () => (await read(page))?.entries.at(-1)).toMatchObject({period: '2026-W47', template: 'week-look-back'});
  await expect(about).toHaveValue('');
  await expect(page.locator('ol.journal-entries > li').first().locator('.journal-entry-period')).toHaveText(' · about Week 47 (Nov 16 – Nov 22, 2026)');
  // The calendar lists the entries about this month's weeks.
  await page.locator('details.journal-date-fold > summary').click();
  const periods = page.getByRole('group', {name: /Entries about a week/});
  await periods.getByRole('button', {name: /Week 47/}).click();
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
  await expect(page.locator('.journal-period-line')).toContainText('Entries about Week 47');
  await page.getByRole('button', {name: 'The month before: Oct 2026'}).click();
  await periods.getByRole('button', {name: /Month Oct 2026/}).click();
  await expect(page.locator('ol.journal-entries > li')).toHaveText([/A fictional October look-back/]);
  await page.getByRole('button', {name: 'Show every entry'}).click();
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(3);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
