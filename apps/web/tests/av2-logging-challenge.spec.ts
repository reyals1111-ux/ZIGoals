import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #90; MyFitnessPal's challenges and meal reminders): Health → Insights → "Weekly
 * logging challenge" starts a challenge (3 days a week); a quick add counts today; the Diary shows the challenge's line;
 * the challenge is changed and stopped. Settings → Notifications lists "Meal reminders" (off by default). At 390 and
 * 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call answers 503.
 */
// Session AV lane 2 (missing setup: "3 more to go" needs at least three days left in the week, so the week is pinned to a
// Monday; on a real Sunday the card rightly says the week can't reach it any more, deliberate)
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: a weekly logging challenge, a logged day, and the meal-reminder switch`, async ({page, isMobile}) => {
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health?view=insights'); await hydrated(page);
  await page.getByText('Weekly logging challenge', {exact: true}).click();
  const card = page.locator('#health-challenge');
  await expect(card).toContainText('Set yourself a number of days a week to log your food');
  await card.getByLabel('Days a week').selectOption('3');
  await card.getByRole('button', {name: 'Start the challenge'}).click();
  await expect(card).toContainText('Challenge started: log your food on 3 days a week.');
  await expect(card.getByRole('status')).toContainText('0 of 3 days logged this week · 3 more to go.');
  await expect(card.getByRole('list', {name: /^This week, /}).getByRole('listitem')).toHaveCount(7);
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  await page.goto('/app/health?view=diary'); await hydrated(page);
  await expect(page.getByText('Logging challenge:', {exact: true})).toBeVisible();
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Just the calories', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Log just the calories'});
  await form.getByLabel('Calories (kcal)').fill('400');
  await form.getByRole('button', {name: 'Log calories'}).click();
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await expect(page.locator('.food-plus-challenge-line')).toContainText('1 of 3 days logged this week · 2 more to go.');
  await page.locator('.food-plus-challenge-line').getByRole('link', {name: 'See the week'}).click();
  await expect(page.locator('#health-challenge')).toBeVisible();
  await page.locator('#health-challenge').getByLabel('Days a week').selectOption('1');
  await page.locator('#health-challenge').getByRole('button', {name: 'Change the challenge'}).click();
  await expect(page.locator('#health-challenge').getByRole('status')).toContainText('Done for this week: 1 of 1 days logged.');
  await page.locator('#health-challenge').getByRole('button', {name: 'Stop the challenge'}).click();
  await expect(page.locator('#health-challenge')).toContainText('The logging challenge is stopped. Your diary is unchanged.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  await page.goto('/app/settings#notifications'); await hydrated(page);
  const types = page.getByRole('group', {name: 'What to be told about'});
  await expect(types.getByText('Meal reminders', {exact: true})).toBeVisible();
  await expect(types.getByText('At each meal’s usual time set in Health, while nothing is logged for it; never what you ate.')).toBeVisible();
});
