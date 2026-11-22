import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #100; Cronometer's Oracle): Health → Insights → "Foods high in a nutrient (the Oracle)"
 * lists the offline library's richest foods in protein, then vitamin C (by a usual portion, then per 100 kcal), never a
 * dried herb, spice, seaweed or powder — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * The library is the app's own offline food data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: protein and vitamin C in the Oracle`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/health?view=insights'); await hydrated(page);
  await page.getByText('Foods high in a nutrient (the Oracle)', {exact: true}).click();
  const card = page.getByRole('region', {name: 'Foods high in a nutrient'});
  const protein = card.getByRole('list', {name: 'Foods high in protein, by a usual portion'});
  await expect(protein.getByRole('listitem')).toHaveCount(10, {timeout: 20_000});
  await expect(protein.getByRole('listitem').first()).toContainText(/\d+(\.\d+)? g in \d+ g · \d+(\.\d+)? g per 100 g/);
  await card.getByLabel('Nutrient').selectOption('vitamin-c');
  const vitC = card.getByRole('list', {name: 'Foods high in vitamin c, by a usual portion'});
  await expect(vitC.getByRole('listitem')).toHaveCount(10, {timeout: 20_000});
  const values = await vitC.getByRole('listitem').evaluateAll(items => items.map(li => Number((/(\d+(?:\.\d+)?) mg in \d+ g/.exec(li.textContent?.replace(/,/g, '') ?? '')?.[1]))));
  expect(values).toEqual([...values].sort((a, b) => b - a));
  expect(await vitC.getByRole('listitem').allTextContents()).not.toContainEqual(expect.stringMatching(/thyme|basil|parsley, dried|seaweed|chlorella|spirulina|powder|dried or dehydrated/i));
  await card.getByLabel('Per 100 kcal').check();
  await expect(card.getByRole('list', {name: 'Foods high in vitamin c, per 100 kcal'}).getByRole('listitem').first()).toContainText(/mg per 100 kcal/, {timeout: 20_000});
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
