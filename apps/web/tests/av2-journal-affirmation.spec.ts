import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #176, Fabulous's daily affirmations): off by default, Today's journal card shows no
 * affirmation (and no extra Tab stop); switched on in Journal → Privacy, the card shows today's affirmation with "Another
 * one", in Dutch when the daily question is. At 390 and 1440, three themes, axe-clean, no sideways scroll at 320.
 */
for (const theme of THEMES) test(`${theme}: a daily affirmation on Today, only when switched on`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: true, entries: []}});
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const card = page.locator('.today-journal-card');
  await expect(card.getByRole('heading', {name: 'How was today?'})).toBeVisible();
  await expect(card.getByRole('group', {name: 'Today’s affirmation'})).toHaveCount(0);
  // Switch it on in Journal → Privacy.
  await page.goto('/app/journal'); await hydrated(page);
  await page.getByRole('region', {name: 'Privacy'}).getByRole('checkbox', {name: /^Show a daily affirmation on Today/}).check();
  await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}') as {affirmations?: boolean}).affirmations, JOURNAL_KEY)).toBe(true);
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const line = page.locator('.today-journal-card').getByRole('group', {name: 'Today’s affirmation'});
  await expect(line).toBeVisible();
  const first = await line.locator('.today-affirmation-text').innerText();
  expect(first).toMatch(/^I .+\.$|^My .+\.$|^Today I .+\.$/);
  await line.getByRole('button', {name: 'Another one'}).click();
  await expect(line.locator('.today-affirmation-text')).not.toHaveText(first);
  await expect(line.getByRole('button', {name: 'Another one'})).toBeFocused();
  const findings = await axe(page, page.locator('.today-journal-card'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // In Dutch with the daily question.
  await page.evaluate(() => localStorage.setItem('zigoals:journal-question-lang', 'nl'));
  await page.reload(); await hydrated(page);
  const nl = page.locator('.today-journal-card').getByRole('group', {name: 'Affirmatie van vandaag'});
  await expect(nl.getByRole('button', {name: 'Nog een'})).toBeVisible();
  await expect(nl.locator('[lang="nl"]')).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
