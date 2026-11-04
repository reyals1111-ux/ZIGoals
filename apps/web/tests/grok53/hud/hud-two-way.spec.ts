import {expect, test} from '@playwright/test';
import {hydrated} from '../../ah-helpers';
import {NOON, freshNova, openNova, panel} from './hud-helpers';

/**
 * Session AL Part 11 (lane L8), spec (a): the HUD is interconnected like the Checklist. A HUD quick action (log water)
 * writes the real Health record with Undo; /app/health shows it without a reload; a log on /app/health in another tab
 * updates the HUD without a reload (the app's BroadcastChannel and storage events); and a HUD action updates that other
 * tab's Health page too. Desktop 1440, Brussels, a fresh profile with a 2,000 mL water target.
 */
test.skip(({isMobile}) => isMobile, 'computer layout (the phone column is spec f)');
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels'});

test('HUD water → Health without reload; Health in a second tab → HUD live; HUD → that tab live', async ({page, context}) => {
  await page.clock.install({time: NOON});
  await freshNova(page, {widgets: [{id: 'health-hud', size: 'L'}, {id: 'water', size: 'S'}], waterTarget: true});
  const hud = panel(page, 'Health HUD'), water = panel(page, 'Water');
  await expect(hud).toContainText('No water logged yet today');
  await page.evaluate(() => { (window as Window & {__hudNoReload?: number}).__hudNoReload = 1; });

  // The quick action writes the record, with the app's one Undo.
  await hud.getByRole('button', {name: 'Quick actions: Health HUD'}).click();
  const sheet = page.getByRole('dialog', {name: 'Quick actions · Health HUD'});
  await sheet.getByRole('button', {name: 'Log 250 mL of water'}).click();
  await expect(page.locator('.aa-toast')).toContainText('Water logged: 250 mL.');
  await sheet.getByRole('button', {name: 'Close Quick actions · Health HUD'}).click();
  await expect(water).toContainText('250 mL');
  await expect(water).toContainText('of 2,000 mL');

  // Health shows it after a client-side navigation (the widget → page morph or a plain navigation), with no reload.
  await water.getByRole('link', {name: /Open Health/}).click();
  await expect(page).toHaveURL(/\/app\/health/);
  await expect(page.getByRole('region', {name: 'Water journal'})).toContainText('250 mL recorded');
  expect(await page.evaluate(() => (window as Window & {__hudNoReload?: number}).__hudNoReload)).toBe(1);

  // Back on NOVA; a second tab logs on Health; the HUD follows without a reload.
  await openNova(page);
  await page.evaluate(() => { (window as Window & {__hudNoReload?: number}).__hudNoReload = 2; });
  const other = await context.newPage();
  await other.clock.install({time: NOON});
  await other.goto('/app/health'); await hydrated(other);
  const otherWater = other.getByRole('region', {name: 'Water journal'});
  await expect(otherWater).toContainText('250 mL recorded');
  await otherWater.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(otherWater).toContainText('500 mL recorded');
  await expect(water).toContainText('500 mL');
  await expect(hud).toContainText('500 mL');

  // And the other way: a HUD action on this tab reaches the other tab's Health page live.
  await water.getByRole('button', {name: 'Quick actions: Water'}).click();
  await page.getByRole('dialog', {name: 'Quick actions · Water'}).getByRole('button', {name: 'Log 250 mL of water'}).click();
  await expect(water).toContainText('750 mL');
  await expect(otherWater).toContainText('750 mL recorded');
  expect(await page.evaluate(() => (window as Window & {__hudNoReload?: number}).__hudNoReload)).toBe(2);

  // Undo puts the store record back, everywhere.
  await page.locator('.aa-toast').getByRole('button', {name: /^Undo/}).click();
  await expect(page.locator('.aa-toast')).toContainText('Water entry removed.');
  await expect(water).toContainText('500 mL');
  await expect(otherWater).toContainText('500 mL recorded');
});

test('quick actions add a task and tick it on the Tasks panel; the panel counts the same as the Tasks page', async ({page}) => {
  await page.clock.install({time: NOON});
  await freshNova(page, {preset: 'command'});
  const tasks = panel(page, 'Tasks');
  await tasks.getByRole('button', {name: 'Quick actions: Tasks'}).click();
  const sheet = page.getByRole('dialog', {name: 'Quick actions · Tasks'});
  await sheet.getByLabel('New task').fill('Fictional call to the library');
  await sheet.getByRole('button', {name: 'Add task'}).click();
  await expect(page.locator('.aa-toast')).toContainText('Added “Fictional call to the library” for today.');
  await sheet.getByRole('button', {name: 'Close Quick actions · Tasks'}).click();
  await expect(tasks.locator('.holo-counters')).toContainText('Today1');
  await expect(tasks).toContainText('1 to do today.');
  await tasks.getByRole('checkbox', {name: 'Mark “Fictional call to the library” done'}).check();
  await expect(tasks).toContainText('Nothing left to do today.');
});
