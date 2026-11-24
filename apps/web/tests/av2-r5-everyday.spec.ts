import {expect, test} from '@playwright/test';
import {AT, health, healthRecord, openHealth, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, LEDGER #376): Health → Activity offers everyday movement beside the
 * twelve types, in English and Dutch; "Gardening" for 45 minutes counts its minutes and shows no energy figure, while a
 * walk (one of the twelve, with a weight logged) keeps the labelled estimate it had — at 390 and 1440, in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
for (const theme of THEMES) test(`${theme}: everyday movement counts minutes, with no energy figure`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health({weights: [{id: 'health_weight-r5-0001', date: TODAY, grams: 80_000, createdAt: AT, updatedAt: AT}]})), '/app/health?view=activity');
  const form = page.getByRole('form', {name: 'Manual activity'});
  const options = await page.locator('datalist#health-activity-types option').evaluateAll(list => list.map(o => (o as HTMLOptionElement).value));
  for (const name of ['Walk', 'Gardening', 'Tuinieren', 'Housework', 'Walking the dog', 'De hond uitlaten', 'Wheelchair push', 'Carrying a child', 'Commuting by bike']) expect(options).toContain(name);
  await expect(form).toContainText('Everyday movement (gardening, housework, walking the dog, a wheelchair push, carrying a child, commuting by bike) counts its minutes, with no energy figure.');

  await form.getByLabel('Activity name').fill('Gardening');
  await form.getByLabel('Minutes').fill('45');
  await form.getByRole('button', {name: 'Save activity'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Activity saved'})).toContainText('Activity saved');
  const garden = page.locator('article.health-library-row').filter({has: page.getByRole('heading', {name: 'Gardening', exact: true})});
  await expect(garden).toContainText('45 minutes');
  await expect(garden).not.toContainText('kcal');

  await form.getByLabel('Activity name').fill('Walk');
  await form.getByLabel('Minutes').fill('30');
  await form.getByRole('button', {name: 'Save activity'}).click();
  const walk = page.locator('article.health-library-row').filter({has: page.getByRole('heading', {name: 'Walk', exact: true})});
  await expect(walk).toContainText('kcal used');

  const findings = await axe(page, page.locator('.health-activity-overview'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
