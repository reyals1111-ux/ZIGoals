import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, logHealthItem, saveFood, HEALTH_STORAGE_KEY} from '../lib/health';
import {HIDE_FIGURES_KEY} from '../components/hide-figures';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-HIDE-FIGURES; Bearable's "hide triggering data"): Health → Targets → "Hide calories
 * and weight" hides the calorie figures of the day and its diary (a dash stands in; the food's name stays), on this
 * device only and after a reload, and "Show calories and weight" brings them back — at 390 and 1440, in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Nothing stored changes. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const NOW = new Date('2026-11-23T09:00:00+01:00'), AT = '2026-11-23T07:00:00.000Z';
const withFood = saveFood(createEmptyHealth(), {id: 'health_fictional-oats-01', name: 'Fictional oats', brand: '', servingGrams: 50, nutrients: {kcal: 187, proteinMg: 6000, carbsMg: 30000, fatMg: 3500}, createdAt: AT, updatedAt: AT});
const health = logHealthItem(withFood, {id: 'health_fictional-oats-entry-01', sourceId: 'health_fictional-oats-01', sourceKind: 'food', date: '2026-11-23', meal: 'Breakfast', quantityMilli: 1000}, AT);
const shown = (page: Page) => page.locator('.health-entry .health-nutrient-line').first().evaluate(e => getComputedStyle(e).visibility);
for (const theme of THEMES) test(`${theme}: calorie figures hidden on this device and shown again`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([h, hv]) => { localStorage.setItem(h, hv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HEALTH_STORAGE_KEY, JSON.stringify(health)] as const);
  await page.goto('/app/health'); await hydrated(page);
  await expect(page.locator('.health-entry').first()).toContainText('187 kcal');
  expect(await shown(page)).toBe('visible');
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Targets', exact: true}).click();
  const toggle = page.getByRole('button', {name: 'Hide calories and weight'});
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  const findings = await axe(page, page.locator('.hide-figures-row'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await toggle.click();
  await expect(page.getByRole('button', {name: 'Show calories and weight'})).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(k => [localStorage.getItem(k), document.documentElement.dataset.hideFigures], HIDE_FIGURES_KEY)).toEqual(['on', 'on']);
  await page.reload(); await hydrated(page);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Diary', exact: true}).click();
  await expect(page.locator('.health-entry').first()).toContainText('Fictional oats');
  await expect.poll(() => shown(page)).toBe('hidden');
  await expect(page.locator('.health-gauge > div > strong')).toHaveCSS('visibility', 'hidden');
  expect(await page.evaluate(h => (JSON.parse(localStorage.getItem(h)!) as {diary: unknown[]}).diary.length, HEALTH_STORAGE_KEY)).toBe(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Targets', exact: true}).click();
  await page.getByRole('button', {name: 'Show calories and weight'}).click();
  expect(await page.evaluate(k => [localStorage.getItem(k), document.documentElement.dataset.hideFigures ?? null], HIDE_FIGURES_KEY)).toEqual([null, null]);
});
