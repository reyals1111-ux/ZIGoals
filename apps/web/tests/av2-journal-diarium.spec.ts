import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {JOURNAL_DISPLAY_KEY} from '../lib/on-this-day/store';

/**
 * Session AV lane 2 (r6-notes; LEDGER #400, #401, #403, #404, #409, #410; Diarium): Sanne's journal — a daily word goal
 * (today's words beside it while writing, the days it was met on the calendar), who was there on an entry ("Entries
 * with …"), On this day for the day after with the arrows, every photo in one place (the empty state teaches), the sun and
 * the moon under That day for a chosen city, and a CSV import planned first and undone. Nebula, Light and Dark; keyboard;
 * axe-clean; no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
type Stored = {wordGoal?: number; entries: {id: string; text: string; people?: string[]; imported?: string}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored | null, JOURNAL_KEY);
const ENTRIES = [
  {id: 'y1', date: '2025-11-23', text: 'A fictional autumn walk, a year before.', createdAt: '2025-11-23T09:00:00.000Z'},
  {id: 'a', date: '2026-11-21', text: 'one two three four five six seven eight nine ten', createdAt: '2026-11-21T09:00:00.000Z'},
  {id: 'b', date: '2026-11-22', text: 'A fictional morning by the river.', createdAt: '2026-11-22T08:00:00.000Z'}];
async function open(page: Page, theme: (typeof THEMES)[number], isMobile: boolean) {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [JOURNAL_KEY, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: ENTRIES})] as const);
  await page.goto('/app/journal'); await hydrated(page);
}
const serious = async (page: Page, where: ReturnType<Page['locator']>) => { const f = await axe(page, where); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => { await page.setViewportSize({width: 320, height: 720}); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); };

for (const theme of THEMES) {
  test(`${theme}: a word goal, who was there, and every photo in one place`, async ({page, isMobile}) => {
    await open(page, theme, isMobile);
    // #400: set the goal; Write shows today's words beside it; the calendar marks the 21st.
    await page.locator('#journal-word-goal > summary').click();
    const goal = page.getByRole('form', {name: 'Daily word goal'});
    await goal.getByLabel('Words a day').fill('10');
    await goal.getByRole('button', {name: 'Set the goal'}).click();
    await expect.poll(async () => (await read(page))?.wordGoal).toBe(10);
    await expect(page.locator('.journal-word-goal')).toHaveText('6 of 10 words today.');
    await page.getByLabel('Today’s entry').fill('more words here now');
    await expect(page.locator('.journal-word-goal')).toHaveText('10 words today: your 10 are written.');
    await page.locator('.journal-date-fold > summary').click();
    await expect(page.getByRole('button', {name: /Nov 21, 2026: 1 entry, word goal met/})).toBeVisible();
    // #401: who was there, then "Entries with …".
    const row = page.locator('ol.journal-entries > li').filter({hasText: 'by the river'});
    await row.getByRole('button', {name: /^Who was there: add a name/}).click();
    await row.getByLabel('Name').fill('Fictional Anna');
    await row.getByLabel('Name').press('Enter');
    await expect.poll(async () => (await read(page))?.entries.find(e => e.id === 'b')?.people).toEqual(['Fictional Anna']);
    await expect(row.getByRole('button', {name: /^Who was there: add a name/})).toBeFocused();
    await serious(page, row);
    await row.getByRole('button', {name: 'Entries with Fictional Anna'}).click();
    await expect(page.locator('.journal-person-line')).toContainText('Entries with Fictional Anna.');
    await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
    await page.locator('.journal-person-line').getByRole('button', {name: 'Show every entry'}).click();
    // #404: no photos yet, so the fold teaches where they come from.
    await page.locator('#journal-photos > summary').click();
    await expect(page.locator('#journal-photos')).toContainText('No photos or voice notes in your journal yet.');
    await noSideways(page);
  });
  test(`${theme}: On this day for another day, the sun and the moon, and a CSV import`, async ({page, isMobile}) => {
    await open(page, theme, isMobile);
    // #403 (review b6n B6N-4): today has no memory, so no empty panel; "On this day for another date" opens it with its arrows.
    await expect(page.locator('details.on-this-day')).toHaveCount(0);
    await page.getByRole('button', {name: 'On this day for another date'}).click();
    await expect(page.locator('details.on-this-day')).toContainText('Nothing written on Nov 22 in the years before.');
    await expect(page.locator('details.on-this-day').getByRole('button', {name: /^The day before/})).toBeFocused();
    await page.locator('details.on-this-day').getByRole('button', {name: /^The day after/}).click();
    await expect(page.locator('details.on-this-day')).toContainText('A fictional autumn walk, a year before.');
    await page.locator('details.on-this-day').getByRole('button', {name: 'Back to today'}).click();
    await expect(page.locator('details.on-this-day')).toContainText('Nothing written on Nov 22 in the years before.');
    // A day chosen on the calendar brings it too, then the arrows move it.
    await page.locator('.journal-date-fold > summary').click();
    await page.getByRole('button', {name: /Nov 21, 2026: 1 entry/}).click();
    const otd = page.locator('details.on-this-day');
    await expect(otd.locator('summary')).toContainText('On Nov 21');
    await expect(otd).toContainText('Nothing written on Nov 21 in the years before.');
    await otd.getByRole('button', {name: /^The day after/}).click();
    await otd.getByRole('button', {name: /^The day after/}).click();
    await expect(otd).toContainText('A fictional autumn walk, a year before.');
    await expect(otd).toContainText('A year earlier');
    await serious(page, otd);
    await page.locator('.journal-calendar').getByRole('button', {name: 'Show every day again'}).click();
    // #409: the sun and the moon for Amsterdam (this device's time zone), under That day.
    await page.locator('#journal-sky > summary').click();
    await expect(page.getByLabel('Place')).toHaveValue('zone');
    await page.getByLabel('Place').selectOption('paris');
    await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}').sky, JOURNAL_DISPLAY_KEY)).toEqual({city: 'paris'});
    const row = page.locator('ol.journal-entries > li').filter({hasText: 'by the river'});
    await row.locator('.journal-that-day > summary').click();
    await expect(row.locator('.journal-sky-line')).toContainText(/Sunrise \d\d:\d\d · sunset \d\d:\d\d in Paris · Waxing gibbous/);
    // #410: a CSV is planned first, then imported, then undone in one step.
    await page.locator('.journal-files-fold > summary').click();
    await page.locator('.journal-files input[type="file"]').setInputFiles({name: 'dagboek.csv', mimeType: 'text/csv', buffer: Buffer.from('Datum;Tekst;Tags\n2026-11-03;Een fictieve dag;werk\n;Geen datum;\n')});
    const plan = page.getByRole('group', {name: 'What the files hold'});
    await expect(plan).toContainText('1 entry');
    await expect(plan.getByRole('button', {name: 'Import 1 entry'})).toBeFocused();
    await plan.getByRole('button', {name: 'Import 1 entry'}).click();
    await expect.poll(async () => (await read(page))?.entries.filter(e => e.imported === 'csv').length).toBe(1);
    await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).first().click();
    await expect.poll(async () => (await read(page))?.entries.length).toBe(3);
    await noSideways(page);
  });
}
