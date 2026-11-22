import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #277, Stoic's quotes): off by default, Today's journal card shows no quote (and no
 * extra Tab stop); switched on in Journal → Privacy, the card shows a quote of the day with its writer, "Another one" and
 * "Write about this", which opens the Journal with an entry starting with the quote; in Dutch with the daily question.
 * At 390 and 1440, three themes, axe-clean, no sideways scroll at 320.
 */
for (const theme of THEMES) test(`${theme}: a Stoic quote of the day on Today, only when switched on`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: true, entries: []}});
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const card = page.locator('.today-journal-card');
  await expect(card.getByRole('heading', {name: 'How was today?'})).toBeVisible();
  await expect(card.getByRole('group', {name: 'Today’s quote'})).toHaveCount(0);
  await page.goto('/app/journal'); await hydrated(page);
  await page.getByRole('region', {name: 'Privacy'}).getByRole('checkbox', {name: /^Show a quote of the day from the Stoic writers/}).check();
  await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}') as {quotes?: boolean}).quotes, JOURNAL_KEY)).toBe(true);
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const quote = page.locator('.today-journal-card').getByRole('group', {name: 'Today’s quote'});
  await expect(quote).toBeVisible();
  await expect(quote.locator('figcaption')).toHaveText(/^— (?:Marcus Aurelius, Meditations|Seneca, Letters to Lucilius letter|Epictetus, Encheiridion) /);
  const first = await quote.locator('.today-quote-text').innerText();
  await quote.getByRole('button', {name: 'Another one'}).click();
  await expect(quote.locator('.today-quote-text')).not.toHaveText(first);
  await expect(quote.getByRole('button', {name: 'Another one'})).toBeFocused();
  const findings = await axe(page, page.locator('.today-journal-card'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const words = await quote.locator('.today-quote-text').innerText();
  await quote.getByRole('link', {name: 'Write about this'}).click();
  await expect(page).toHaveURL(/\/app\/journal\?quote=[a-z0-9-]+$/); await hydrated(page);
  await expect(page.getByRole('form', {name: 'Write in your journal'}).getByRole('textbox', {name: 'Today’s entry'})).toHaveValue(new RegExp(`^> ${words.trim().slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  // In Dutch with the daily question.
  await page.evaluate(() => localStorage.setItem('zigoals:journal-question-lang', 'nl'));
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const nl = page.locator('.today-journal-card').getByRole('group', {name: 'Citaat van vandaag'});
  await expect(nl.getByRole('button', {name: 'Nog een'})).toBeVisible();
  await expect(nl.locator('blockquote[lang="nl"]')).toBeVisible();
  await expect(nl.locator('figcaption')).toContainText('Nederlandse woorden geschreven voor ZIGoals');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
