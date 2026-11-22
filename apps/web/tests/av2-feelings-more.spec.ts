import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {ENERGY_KEY} from '../lib/energy/schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #324, #325, #326, How We Feel): in the Journal's feeling words — "What the words mean"
 * shows a plain line under each word; the chosen word's line shows under the grid; choices that may help open existing
 * tools (Breathe for a minute first for a tense word); "Where do you feel it?" keeps up to three places with a word each
 * (stored as `body` on the day) and counts them over 90 days. At 390 and 1440, Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const day = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? 'null') as {words?: Record<string, {word: string; body?: {area: string; feel: string}[]}>} | null)?.words?.['2026-11-22'], ENERGY_KEY);
for (const theme of THEMES) test(`${theme}: what a word means, choices, and where you feel it`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, days: {'2026-11-22': {energy: 3, at: '2026-11-22T08:00:00.000Z'}}})); }, ENERGY_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  await page.getByRole('button', {name: 'Add a feeling word (optional)'}).click();
  const grid = page.locator('section.mood-words');
  await grid.getByRole('button', {name: 'High energy, unpleasant'}).click();
  const words = grid.getByRole('group', {name: 'Words: High energy, unpleasant'});
  await words.getByRole('button', {name: 'What the words mean'}).click();
  await expect(words.getByText('can’t settle; the body wants to move')).toBeVisible();
  await words.getByRole('button', {name: 'tense', exact: true}).click();
  await expect(grid.locator('.mood-words-chosen-meaning')).toHaveText('tense: tight and braced, as if waiting for something to happen.');
  const choices = grid.getByRole('group', {name: 'If you like, for “tense”'});
  await expect(choices.getByRole('link')).toHaveCount(2);
  await expect(choices.getByRole('link').first()).toHaveText('Breathe for a minute');
  await expect(choices.getByRole('link', {name: 'Check a thought'})).toHaveAttribute('href', '/app/journal#thought-check');
  await expect(choices).toContainText('Step outside for a few minutes');
  let findings = await axe(page, grid);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Where you feel it: shoulders, tight.
  await grid.locator('details.mood-words-body-fold > summary').click();
  const body = grid.getByRole('group', {name: 'Where you feel it'});
  await body.getByLabel('Shoulders').selectOption('tight');
  await body.getByLabel('Jaw').selectOption('tight');
  await expect.poll(async () => (await day(page))?.body).toEqual([{area: 'shoulders', feel: 'tight'}, {area: 'jaw', feel: 'tight'}]);
  // Session AV lane 2 (fixb4; deliberate): shoulders and jaw are tied at one day each, and a tie goes to the area listed
  // first, head to foot (lib/mood-words/body.ts bodyCounts, the list's own order: jaw before shoulders). The same exact
  // line with that area.
  await expect(grid.locator('.mood-body-counts')).toContainText('High energy, unpleasant: jaw most often (1 of 1 day), most often tight.');
  findings = await axe(page, grid);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // A new word for the day keeps where it is felt.
  await words.getByRole('button', {name: 'worried', exact: true}).click();
  await expect.poll(async () => [(await day(page))?.word, (await day(page))?.body?.length]).toEqual(['worried', 2]);
  // The thought check opens from its link (the choices now follow "worried").
  await grid.getByRole('group', {name: 'If you like, for “worried”'}).getByRole('link', {name: 'Check a thought'}).click();
  await expect(page.locator('details#thought-check')).toHaveAttribute('open', '');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
