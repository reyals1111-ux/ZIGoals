import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (notes; LEDGER #29 Notion's table and gallery, #30 its chart view): Notes → "Show notes as" Table
 * (column buttons sort and say their order), Gallery (a card per note) and Chart (notes per tag and per week, numbers in
 * words). At 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways page scroll at 320 (the table scrolls in its
 * own region). Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional trips', body: 'Kyoto in spring, see [[Fictional books]].', tags: ['travel'], createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-20T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional books', body: 'One two three four five six.', tags: ['reading', 'travel'], createdAt: '2026-11-10T09:00:00.000Z'},
  {id: 'n-c', kind: 'topic', title: 'Another fictional note', body: 'Quiet.', createdAt: '2026-11-12T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: notes as a table, a gallery and a chart`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const layouts = page.getByRole('group', {name: 'Show notes as'});
  await expect(layouts.getByRole('button', {name: 'List'})).toHaveAttribute('aria-pressed', 'true');
  await layouts.getByRole('button', {name: 'Table'}).click();
  const table = page.getByRole('region', {name: 'Notes as a table'}).getByRole('table');
  const names = () => table.locator('tbody th').allInnerTexts();
  await expect.poll(names).toEqual(['Fictional trips', 'Another fictional note', 'Fictional books']); // changed, newest first
  const words = table.getByRole('columnheader', {name: /^Words/});
  await words.getByRole('button').click();
  await expect(words).toHaveAttribute('aria-sort', 'descending');
  await expect.poll(names).toEqual(['Fictional books', 'Fictional trips', 'Another fictional note']);
  await words.getByRole('button').click();
  await expect(words).toHaveAttribute('aria-sort', 'ascending');
  await expect(words.getByRole('button')).toBeFocused();
  await table.getByRole('columnheader', {name: /^Note/}).getByRole('button').click();
  await expect.poll(names).toEqual(['Another fictional note', 'Fictional books', 'Fictional trips']);
  let findings = await axe(page, page.getByRole('region', {name: 'Notes as a table'}));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await layouts.getByRole('button', {name: 'Gallery'}).click();
  const gallery = page.getByRole('list', {name: 'Notes as a gallery'});
  await expect(gallery.getByRole('listitem')).toHaveCount(3);
  await expect(gallery.getByRole('link', {name: 'Fictional books'})).toHaveAttribute('href', '/app/notes?note=n-b');
  await layouts.getByRole('button', {name: 'Chart'}).click();
  const tags = page.getByRole('region', {name: 'Notes per tag'});
  await expect(tags.getByRole('listitem')).toHaveText([/#travel\s*2 notes/, /#reading\s*1 note/, /No tag\s*1 note/]);
  findings = await axe(page, page.locator('.notes-chart'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await layouts.getByRole('button', {name: 'Table'}).click();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
