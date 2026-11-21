import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, loadShowcase, offline, settle} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-FACTORS; Bearable): the Life review's "What goes with your mood, sleep and energy" —
 * a fresh device is taught what it will compare; the Showcase lists ranked factors with their labels and days, never a
 * cause — at 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: a fresh device is taught; the Showcase ranks its factors`, async ({page, isMobile}) => {
  test.setTimeout(90_000);
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/review'); await settle(page);
  const card = page.getByRole('region', {name: 'What goes with your mood, sleep and energy'});
  await expect(card).toContainText('not what causes what');
  await expect(card.locator('.cross-empty')).toBeVisible();
  await loadShowcase(page);
  await page.goto('/app/review'); await settle(page);
  await expect(card.locator('ol.factor-list > li').first()).toBeVisible({timeout: 15_000});
  await expect(card.locator('ol.factor-list > li').first()).toContainText(/days compared\./);
  await expect(card.locator('.cross-label').first()).toHaveText(/Early sign|Consistent/);
  // q3 #8 (Minor): the factor name, what it is set against and the label sit on one line, the label at 14 px.
  const head = card.locator('ol.factor-list > li .factor-head').first();
  const [name, outcome] = [head.locator('strong'), head.locator('.factor-outcome')];
  expect(Math.abs((await name.boundingBox())!.y - (await outcome.boundingBox())!.y)).toBeLessThan(8);
  await expect(card.locator('.cross-label').first()).toHaveCSS('font-size', '14px');
  await expect(card).toContainText('symptom, supplement');
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
