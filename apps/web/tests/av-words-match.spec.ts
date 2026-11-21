import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, saveFood, HEALTH_STORAGE_KEY} from '../lib/health';
import {MEAL_WORDS_KEY} from '../lib/meal-words/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-WORDS-MATCH; MyFitnessPal, Cronometer, with no model): a breakfast written in words
 * ("2 eggs and a fictional zyxq") becomes a diary entry: "Find these foods" matches "eggs" to the person's own Egg at
 * two servings, says the other was not found, logs the egg instead of the words, and one Undo puts the words back — at
 * 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const NOW = new Date('2026-11-23T09:00:00+01:00'), AT = '2026-11-20T10:00:00.000Z';
const health = saveFood(createEmptyHealth(), {id: 'health_fictional-egg-01', name: 'Egg', brand: '', servingGrams: 50, nutrients: {kcal: 78, proteinMg: 6300, carbsMg: 600, fatMg: 5300}, createdAt: AT, updatedAt: AT});
const words = {version: 1, entries: [{id: 'words_fictional-breakfast-01', date: '2026-11-23', meal: 'Breakfast', words: '2 eggs and a fictional zyxq', at: AT}]};
const read = (page: Page) => page.evaluate(([h, w]) => ({diary: (JSON.parse(localStorage.getItem(h) ?? '{"diary":[]}').diary as {snapshot: {name: string}; quantityMilli: number; meal: string}[]).map(e => [e.meal, e.snapshot.name, e.quantityMilli]), words: (JSON.parse(localStorage.getItem(w) ?? '{"entries":[]}').entries as {words: string}[]).map(e => e.words)}), [HEALTH_STORAGE_KEY, MEAL_WORDS_KEY] as const);
for (const theme of THEMES) test(`${theme}: "2 eggs" from the words logged as two servings of Egg, with Undo`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([h, hv, w, wv]) => { localStorage.setItem(h, hv); localStorage.setItem(w, wv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health), MEAL_WORDS_KEY, JSON.stringify(words)] as const);
  await page.goto('/app/health'); await hydrated(page);
  const breakfast = page.getByRole('list', {name: 'Breakfast in words'});
  await breakfast.getByRole('button', {name: 'Find foods for 2 eggs and a fictional zyxq'}).click();
  const found = breakfast.getByRole('group', {name: /^Foods read from/});
  await expect(found.locator('.words-match-row').first()).toContainText('Egg · your food · 78 kcal a serving');
  await expect(found.getByLabel('Servings of Egg')).toHaveValue('2');
  await expect(found.locator('.words-match-row').nth(1)).toContainText('Not found: log it another way');
  const findings = await axe(page, found);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await found.getByRole('button', {name: 'Log 1 food'}).click();
  await expect.poll(() => read(page)).toEqual({diary: [['Breakfast', 'Egg', 2000]], words: []});
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => read(page)).toEqual({diary: [], words: ['2 eggs and a fictional zyxq']});
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
