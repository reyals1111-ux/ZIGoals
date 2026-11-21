import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-HIGH-IN; Cronometer's Oracle): Health → Targets → Micronutrients → "Which of my foods
 * are high in…" → Iron → "Also look in the offline food library" lists the library's richest foods per 100 g, with what
 * 100 g covers of today's gap — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. The
 * library is the app's own offline food data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: iron in the offline library, richest first, with today's gap`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Targets', exact: true}).click();
  const rich = page.locator('.health-rich').filter({has: page.getByRole('heading', {name: 'Which of my foods are high in…'})});
  await rich.getByRole('group', {name: 'Nutrient'}).getByRole('button', {name: 'Iron', exact: true}).click();
  await rich.getByRole('button', {name: 'Also look in the offline food library'}).click();
  const list = rich.getByRole('list', {name: 'Foods high in iron, per 100 g'});
  await expect(list.getByRole('listitem')).toHaveCount(8, {timeout: 20_000});
  await expect(list.getByRole('listitem').first()).toContainText(/· \d+(\.\d+)? mg per 100 g · 100 g covers \d+% of today’s gap · /);
  const values = await list.getByRole('listitem').evaluateAll(items => items.map(li => Number(/· (\d+(?:\.\d+)?) mg per 100 g/.exec(li.textContent ?? '')?.[1])));
  expect(values).toEqual([...values].sort((a, b) => b - a));
  const findings = await axe(page, rich);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
