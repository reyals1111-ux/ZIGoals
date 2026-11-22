import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {NOTIFY_KEY} from '../lib/notify/prefs';

/**
 * Session AV lane 2 (health r3; LEDGER #286, Carb Manager): Health → Weight → "Weigh-in reminder" is off and teaches;
 * "On chosen days", Monday and Thursday at 07:15 is saved ("Mon and Thu at 7:15 AM"), the Weigh-in type switched on, and
 * the card says notifications are off on this device; Once a month on the 1st; Turn it off — at 390 and 1440, in Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320, and no weight figure in the card. Fictional data; every /api 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: a weigh-in reminder`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/health?view=weight'); await settle(page);
  const card = page.getByRole('region', {name: 'Weigh-in reminder'});
  await expect(card).toContainText('Off. Choose when you like to weigh in');
  await expect(card).toContainText('never says a weight');

  await card.getByRole('radio', {name: 'On chosen days'}).check();
  await card.getByRole('checkbox', {name: 'Thursday'}).check();
  await card.getByLabel('Time').fill('07:15');
  await card.getByRole('button', {name: 'Remind me to weigh in'}).click();
  await expect(card.getByRole('status')).toContainText('Weigh-in reminder set: Mon and Thu at');
  await expect(card.locator('p strong').first()).toContainText('Mon and Thu at');
  await expect(card).toContainText('Notifications are off on this device');
  let prefs = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), NOTIFY_KEY);
  expect(prefs.weighIn).toEqual({time: '07:15', repeat: 'weekdays', weekdays: 9});
  expect(prefs.types.weighIn).toBe(true);

  await card.getByRole('radio', {name: 'Once a month'}).check();
  await card.getByLabel('Day of the month').selectOption('1');
  await card.getByRole('button', {name: 'Save the reminder'}).click();
  await expect(card.getByRole('status')).toContainText('On the 1st of each month at');
  prefs = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), NOTIFY_KEY);
  expect(prefs.weighIn).toEqual({time: '07:15', repeat: 'monthly', day: 1});
  await expect(card).not.toContainText(/\d+(\.\d+)?\s?(kg|lb)/);

  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await card.getByRole('button', {name: 'Turn it off'}).click();
  await expect(card.getByRole('status')).toHaveText('Weigh-in reminder off.');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
