import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {ENERGY_KEY} from '../lib/energy/schema';

/**
 * Session AV lane 2, round 6 (r6-body; Moodfit, LEDGER #412): in the Journal's feeling words, an unpleasant word ("tense")
 * shows "What lifts you" first — empty, it teaches; the person adds their own lines (kept as `lifts` in the energy
 * record), and "Make it a task for today" adds one as a task for today with Undo; a pleasant word does not show it; the
 * link to their own "On a low day" page sits under it — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const lifts = (page: import('@playwright/test').Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? 'null') as {lifts?: string[]} | null)?.lifts ?? [], ENERGY_KEY);
const taskTitles = (page: import('@playwright/test').Page) => page.evaluate(() => ((JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? 'null') as {tasks?: {title: string; due?: string}[]} | null)?.tasks ?? []).map(t => `${t.title}@${t.due ?? ''}`));
for (const theme of THEMES) test(`${theme}: what lifts me, first on an unpleasant word`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, days: {'2026-11-22': {energy: 2, at: '2026-11-22T08:00:00.000Z'}}})); }, ENERGY_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  await page.getByRole('button', {name: 'Add a feeling word (optional)'}).click();
  const grid = page.locator('section.mood-words');
  await grid.getByRole('button', {name: 'High energy, unpleasant'}).click();
  await grid.getByRole('group', {name: 'Words: High energy, unpleasant'}).getByRole('button', {name: 'tense', exact: true}).click();
  const own = grid.getByRole('group', {name: /What lifts you/});
  await expect(own).toContainText('Nothing here yet.');
  await own.getByLabel(/Something that lifts you/).fill('A walk round the block');
  await own.getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(() => lifts(page)).toEqual(['A walk round the block']);
  await expect(own.getByLabel(/Something that lifts you/)).toBeFocused();
  await own.getByLabel(/Something that lifts you/).fill('Call my sister');
  await own.getByLabel(/Something that lifts you/).press('Enter');
  await expect.poll(() => lifts(page)).toEqual(['A walk round the block', 'Call my sister']);
  await expect(own.getByRole('link', {name: 'Open your “On a low day” page'})).toHaveAttribute('href', '/app/health?view=meditation#low-day');
  const findings = await axe(page, grid);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  await own.getByRole('button', {name: 'Make it a task for today: Call my sister'}).click();
  await expect.poll(() => taskTitles(page)).toEqual(['Call my sister@2026-11-22']);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => taskTitles(page)).toEqual([]);

  await own.getByRole('button', {name: 'Edit what lifts you'}).click();
  await own.getByRole('button', {name: 'Move “Call my sister” up'}).click();
  await expect.poll(() => lifts(page)).toEqual(['Call my sister', 'A walk round the block']);
  await own.getByRole('button', {name: 'Remove “A walk round the block”'}).click();
  await expect.poll(() => lifts(page)).toEqual(['Call my sister']);

  // A pleasant word: the built-in choices only.
  await grid.getByRole('button', {name: 'High energy, pleasant'}).click();
  await grid.getByRole('group', {name: 'Words: High energy, pleasant'}).getByRole('button', {name: 'hopeful', exact: true}).click();
  await expect(grid.getByRole('group', {name: /What lifts you/})).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
