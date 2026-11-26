import {expect, test} from '@playwright/test';
import {AT, health, healthRecord, openHealth, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2, round 5 (gym; Gentler Streak, LEDGER #376): Health → Activity offers everyday movement beside the
 * twelve types, in English and Dutch; "Gardening" for 45 minutes counts its minutes and shows no energy figure, and so
 * does a walk (one of the twelve, with a weight logged) unless its calories are typed, then "· you entered" (Session AW,
 * owner decision 1a: no estimate) — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional data.
 */
for (const theme of THEMES) test(`${theme}: everyday movement counts minutes, with no energy figure`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health({weights: [{id: 'health_weight-r5-0001', date: TODAY, grams: 80_000, createdAt: AT, updatedAt: AT}]})), '/app/health?view=activity');
  const form = page.getByRole('form', {name: 'Manual activity'});
  // Session AW (D-CI2038, deliberate): the Activity view is its own chunk since speed attempt 2, so the list is read once
  // the form is on the page (was: read at once); every name is still required.
  await expect(form.locator('datalist#health-activity-types option').first()).toBeAttached();
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
  // Session AW (1a, deliberate): this asserted the estimate ("kcal used"), which owner decision 1a removes. Equally strict:
  // the walk shows its minutes and no calorie figure at all (a weight is logged, so the old estimate would have shown),
  // and calories the person types are shown as typed, with their source.
  await expect(walk).toContainText('30 minutes');
  await expect(walk).not.toContainText('kcal');
  await expect(walk).not.toContainText('estimate');
  await walk.getByRole('button', {name: 'Edit activity Walk'}).click();
  await form.getByLabel('Calories (you entered, optional)').fill('210');
  await form.getByRole('button', {name: 'Save correction'}).click();
  await expect(walk).toContainText('210 kcal · you entered');

  const findings = await axe(page, page.locator('.health-activity-overview'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
