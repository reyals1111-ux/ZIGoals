import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {ENERGY_KEY} from '../lib/energy/schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #310, Journey's favourites, search by mood and sort): ☆ Favourite on an entry stars
 * it (stored as `star`), Favourites shows only starred entries, a feeling word shows the entries of its days, Oldest first
 * turns the list round, and an empty choice says how to fill it. At 390 and 1440, Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {entries: {id: string; star?: true}[]} | null, JOURNAL_KEY);
const AT = '2026-11-20T09:00:00.000Z';
for (const theme of THEMES) test(`${theme}: favourites, a feeling word and the order of the list`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([jk, ek, at]) => {
    if (localStorage.getItem(jk)) return;
    localStorage.setItem(jk, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
      {id: 'a', date: '2026-11-18', text: 'A fictional calm morning.', createdAt: '2026-11-18T09:00:00.000Z'},
      {id: 'b', date: '2026-11-19', text: 'A fictional busy day.', createdAt: '2026-11-19T09:00:00.000Z'},
      {id: 'c', date: '2026-11-20', text: 'A fictional walk by the river.', createdAt: '2026-11-20T09:00:00.000Z'}]}));
    localStorage.setItem(ek, JSON.stringify({version: 1, days: {}, words: {
      '2026-11-18': {energy: 'low', pleasantness: 'pleasant', word: 'calm', at},
      '2026-11-19': {energy: 'high', pleasantness: 'unpleasant', word: 'stressed', at}}}));
  }, [JOURNAL_KEY, ENERGY_KEY, AT] as const);
  await page.goto('/app/journal'); await hydrated(page);
  const rows = page.locator('ol.journal-entries > li'), options = page.getByRole('group', {name: 'Show entries'});
  await expect(rows).toHaveCount(3);
  await options.getByRole('button', {name: /Favourites/}).click();
  await expect(page.getByText('No favourite yet. Press ☆ Favourite on an entry to keep it here.')).toBeVisible();
  await page.getByRole('button', {name: 'Show every entry'}).click();
  await expect(rows).toHaveCount(3);
  const walk = rows.filter({hasText: 'walk by the river'});
  const starButton = walk.getByRole('button', {name: /^Favourite: the entry of /});
  await expect(starButton).toHaveAttribute('aria-pressed', 'false');
  await starButton.click();
  await expect(starButton).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await read(page))?.entries.find(e => e.id === 'c')?.star).toBe(true);
  await options.getByRole('button', {name: /Favourites/}).click();
  await expect(options.getByRole('button', {name: /Favourites/})).toHaveAttribute('aria-pressed', 'true');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('walk by the river');
  await options.getByRole('button', {name: /Favourites/}).click();
  // A feeling word: only the entries of its days.
  await options.getByLabel('Mood').selectOption({label: 'Feeling: calm (1 day)'});
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('A fictional calm morning.');
  await options.getByLabel('Mood').selectOption('');
  // Oldest first.
  await options.getByLabel('Order').selectOption('oldest');
  await expect(rows.first()).toContainText('A fictional calm morning.');
  await expect(rows.last()).toContainText('walk by the river');
  const findings = await axe(page, page.locator('section[aria-labelledby="journal-entries"]'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
