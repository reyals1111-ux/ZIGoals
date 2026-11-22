import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {HEALTH_EXTRAS_KEY} from '../lib/health-extras';
import {NOTIFY_KEY} from '../lib/notify/prefs';

/**
 * Session AV lane 2 (health r3; LEDGER #280–#283, Waterllama): Health → Water. "Your drinks" makes Orange juice (Juice,
 * 250 mL, 110 kcal, 21.5 g sugar, orange); one tap logs it with Undo; a soft drink typed with 140 kcal joins it; the
 * energy and sugar show on the water card and beside the food day as typed, never guessed; "Show a water tip each day"
 * shows one tip, in Dutch on request; "Reminders through the day" saves 09:00–21:00 every 2 hours and lists today's times
 * — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: own drinks, energy from drinks, a tip a day, reminders through the day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/health'); await settle(page);
  const water = page.getByRole('region', {name: 'Water journal'});
  await expect(water.locator('.r3-water')).toBeVisible();

  // Your drinks: the empty state teaches, then Orange juice is made.
  await water.locator('details.r3-fold > summary', {hasText: 'Your drinks'}).click();
  const editor = water.locator('.r3-drinks-editor');
  await expect(editor).toContainText('log it with one tap');
  await expect(editor).toContainText('nothing is looked up or guessed');
  const make = editor.getByRole('form', {name: 'Make a drink'});
  await make.getByRole('textbox', {name: 'Name'}).fill('Orange juice');
  await make.getByRole('combobox', {name: 'Counts as'}).selectOption('juice');
  await make.getByRole('textbox', {name: 'Usual size (mL)'}).fill('250');
  await make.getByRole('textbox', {name: 'Energy (kcal, optional)'}).fill('110');
  await make.getByRole('textbox', {name: 'Sugar (g, optional)'}).fill('21.5');
  await make.getByRole('radio', {name: 'Orange'}).check();
  await make.getByRole('button', {name: 'Add drink'}).click();
  await expect(editor.getByRole('status')).toHaveText('Orange juice added: one tap logs it above.');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), HEALTH_EXTRAS_KEY);
  expect(stored.ownDrinks).toEqual([expect.objectContaining({id: 'orange-juice', name: 'Orange juice', type: 'juice', sizeMl: 250, colour: 'orange', kcal: 110, sugarG: 21.5})]);
  // A field that cannot be read is said under it and focused.
  await make.getByRole('textbox', {name: 'Name'}).fill('Tea');
  await make.getByRole('textbox', {name: 'Usual size (mL)'}).fill('0');
  await make.getByRole('button', {name: 'Add drink'}).click();
  await expect(make.getByRole('textbox', {name: 'Usual size (mL)'})).toBeFocused();
  await expect(make.getByRole('alert')).toContainText('from 1 to 2,000');

  // One tap logs it.
  await water.getByRole('button', {name: /^Log Orange juice, 250 mL/}).click();
  await expect(water).toContainText('250 mL recorded');
  await expect(water).toContainText('From today’s drinks, as you typed them: 110 kcal · 21.5 g sugar.');

  // A drink typed with its energy.
  const entry = water.getByRole('form', {name: 'Water entry'});
  await entry.getByLabel('Water amount', {exact: true}).fill('330');
  // Session AV lane 2 (fixb3: a label around a list takes its options' words, so an exact label never matched, deliberate):
  // the list named exactly Drink.
  await entry.getByRole('combobox', {name: 'Drink', exact: true}).selectOption('soft drink');
  await entry.getByRole('textbox', {name: 'Energy (kcal, optional)'}).fill('140');
  await entry.getByRole('button', {name: 'Log water'}).click();
  await expect(water).toContainText('580 mL recorded');
  await expect(water).toContainText('From today’s drinks, as you typed them: 250 kcal · 21.5 g sugar.');
  await expect(page.locator('.r3-drink-line')).toContainText('Drinks: 250 kcal · 21.5 g sugar from 2 drinks as you typed them');
  await expect(page.locator('.r3-drink-line')).not.toContainText(/estimate|about/i);

  // A tip a day, off until chosen.
  await expect(water.getByRole('heading', {name: 'A water tip'})).toHaveCount(0);
  const tips = water.getByRole('button', {name: 'Show a water tip each day'});
  await expect(tips).toHaveAttribute('aria-pressed', 'false');
  await tips.click();
  await expect(tips).toHaveAttribute('aria-pressed', 'true');
  const tip = water.locator('.r3-tip');
  await expect(tip.getByRole('heading', {name: 'A water tip'})).toBeVisible();
  await tip.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(tip.getByRole('heading', {name: 'Een watertip'})).toBeVisible();
  await expect(tip.locator('p[lang="nl"]')).not.toBeEmpty();

  // Reminders through the day.
  await water.locator('details.r3-fold > summary', {hasText: 'Reminders through the day'}).click();
  const spread = water.locator('.r3-spread');
  await expect(spread).toContainText('halfway through the day, half your target');
  await spread.getByRole('checkbox', {name: 'Remind me through the day'}).check();
  await expect(spread.getByRole('status')).toContainText('Water reminders on, every 2 hours');
  await expect(spread.locator('.r3-slots > li')).toHaveCount(7);
  await expect(spread.locator('.r3-slots > li').first()).toContainText('skipped: you are on pace');
  await expect(spread).toContainText('Notifications are off on this device');
  const prefs = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), NOTIFY_KEY);
  expect(prefs.waterSpread).toEqual({on: true, from: '09:00', to: '21:00', every: 120});
  expect(prefs.types.water).toBe(true);

  const findings = await axe(page, water);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await water.evaluate(el => [...el.querySelectorAll<HTMLElement>('.r3-water p, .r3-water li, .r3-water label, .r3-water summary, .r3-water button')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
