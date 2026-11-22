import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #43, Day One's journals, themes and search by date): Journal → "Your journals" makes
 * a journal with a colour; Write puts an entry in it; "Show a journal" filters; More → Move moves an entry; "Search by
 * date" (From / To, the calendar, a typed date, ?day= in the address) shows a day's entries; removing a journal keeps its
 * entries, with Undo. At 390 and 1440, in Nebula, Light and Dark, axe-clean, focus kept, no sideways scroll at 320.
 * Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
type Stored = {journals?: {id: string; name: string; theme: string}[]; entries: {id: string; text: string; journal?: string}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: several journals, a colour each, and search by date`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'e1', date: '2026-11-03', text: 'A fictional walk by the sea.', createdAt: '2026-11-03T20:00:00.000Z'},
    {id: 'e2', date: '2026-11-20', text: 'A fictional busy day.', createdAt: '2026-11-20T20:00:00.000Z'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const entries = page.getByRole('region', {name: 'Entries'}), rows = page.locator('ol.journal-entries > li');
  // Make a journal with a colour.
  await entries.locator('details.journal-books-fold > summary').click();
  const make = entries.getByRole('form', {name: 'Make a journal'});
  await make.getByLabel('A new journal').fill('Fictional travel');
  await make.getByRole('group', {name: 'Its colour'}).getByLabel('Teal').check();
  await make.getByRole('button', {name: 'Make a journal'}).click();
  await expect.poll(async () => (await read(page)).journals).toEqual([{id: expect.stringMatching(/^j-[a-z0-9]+$/), name: 'Fictional travel', theme: 'teal'}]);
  const findings = await axe(page, entries.locator('details.journal-books-fold'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // The new journal is shown, so Write puts the next entry in it.
  const filter = entries.getByRole('group', {name: 'Show a journal'});
  await expect(filter.getByRole('button', {name: /Fictional travel/})).toHaveAttribute('aria-pressed', 'true');
  const write = page.getByRole('form', {name: 'Write in your journal'});
  await expect(write.getByLabel('Journal', {exact: true})).toHaveValue(/^j-/);
  await write.getByLabel('Today’s entry').fill('A fictional train to the coast.');
  await write.getByRole('button', {name: 'Save entry'}).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAttribute('data-tone', 'teal');
  // More → Move: the walk joins the travel journal.
  await filter.getByRole('button', {name: /^Every journal/}).click();
  await expect(rows).toHaveCount(3);
  const walk = rows.filter({hasText: 'walk by the sea'});
  await walk.locator('details.journal-entry-more > summary').click();
  await walk.getByLabel('Journal', {exact: true}).selectOption({label: 'Fictional travel'});
  await walk.getByRole('button', {name: 'Move', exact: true}).click();
  await expect.poll(async () => (await read(page)).entries.find(e => e.id === 'e1')?.journal).toMatch(/^j-/);
  await filter.getByRole('button', {name: /Fictional travel/}).click();
  await expect(rows).toHaveCount(2);
  await filter.getByRole('button', {name: /^Every journal/}).click();
  // Search by date: a typed date, From / To, and the calendar.
  await entries.getByLabel('Search your journal').fill('3 nov');
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText('walk by the sea');
  await entries.getByLabel('Search your journal').fill('');
  await entries.locator('details.journal-date-fold > summary').click();
  const range = entries.getByRole('group', {name: 'Day range'});
  await range.getByLabel('From').fill('2026-11-10');
  await expect(rows).toHaveCount(2);
  await range.getByRole('button', {name: 'Clear the dates'}).click();
  await expect(rows).toHaveCount(3);
  const day = entries.getByRole('button', {name: /Nov 20, 2026: 1 entry$/});
  await day.click();
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText('busy day');
  await expect(day).toBeFocused();
  const calendarFindings = await axe(page, entries.locator('details.journal-date-fold'));
  expect(calendarFindings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(calendarFindings)).toEqual([]);
  // ?day= in the address opens that day.
  await page.goto('/app/journal?day=2026-11-03'); await hydrated(page);
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText('walk by the sea');
  // Removing the journal keeps its entries, in the main Journal; Undo puts them back.
  await page.goto('/app/journal'); await hydrated(page);
  await entries.locator('details.journal-books-fold > summary').click();
  await entries.getByRole('button', {name: 'Remove Fictional travel'}).click();
  await expect.poll(async () => { const s = await read(page); return [s.journals, s.entries.length, s.entries.filter(e => e.journal).length]; }).toEqual([[], 3, 0]);
  await page.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read(page)).entries.filter(e => e.journal).length).toBe(2);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
