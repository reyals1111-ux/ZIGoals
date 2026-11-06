import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';

/**
 * Session AL sweep 3 (lane SW3): Today's rows the fourth passes sent on (L4, L3). Europe/Brussels, en-GB, a fixed clock;
 * the Showcase at 1280 × 800 Dark for the tab stops, a fresh profile for the rest. Written, not run here.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});

test('D-028: "What matters today" is one tab stop for its goal; its page stays reachable', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-05T09:00:00Z')});
  await emptyDevice(page, {theme: 'dark'});
  await loadShowcase(page);
  const panel = page.getByRole('region', {name: 'Today financial intelligence'});
  await expect(panel).toBeVisible();
  await expect(panel.locator('h2 a')).toHaveAttribute('tabindex', '-1');
  await expect(panel.getByRole('link', {name: 'Open Goal intelligence →'})).toBeVisible();
  expect(await panel.getByRole('link', {name: 'Open Goal intelligence →'}).getAttribute('tabindex')).toBeNull();
});

test('DV-024b: while arranging Today, "Finish customizing" is the one exit (no second "Done" in the bar)', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-05T09:00:00Z')});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app');
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  const bar = page.getByRole('region', {name: 'Arrange this page'});
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('button', {name: 'Reset this page', exact: true})).toBeVisible();
  await expect(bar.getByRole('button', {name: 'Done', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Finish customizing', exact: true}).click();
  await expect(bar).toHaveCount(0);
  // Another page keeps its bar's Done.
  await open(page, '/app/habits');
  await page.getByRole('button', {name: 'Unlock layout to rearrange', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Arrange this page'}).getByRole('button', {name: 'Done', exact: true})).toBeVisible();
});

test('NB-033: on the empty Today, "+ Quick add" is not a second primary beside "Start setup"', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-05T09:00:00Z')});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app');
  await expect(page.getByRole('link', {name: 'Start setup', exact: true}).first()).toHaveClass(/\bprimary\b/);
  const quick = page.locator('.today-hero .quick-add-trigger');
  await expect(quick).toBeVisible();
  await expect(quick).not.toHaveClass(/\bprimary\b/);
  await expect(quick).toHaveClass(/\bsecondary\b/);
});

test('C-MO-10/C-MO-37: a meal reminder at its usual time, until that meal is logged or "Not today"', async ({page}) => {
  // 13:00 in Brussels on 5 Nov 2026.
  await page.clock.install({time: new Date('2026-11-05T12:00:00Z')});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/health');
  const names = page.locator('details.health-meal-names');
  await names.locator('summary').click();
  const lunch = page.getByRole('form', {name: 'Lunch: name and time'});
  await lunch.getByLabel('Usual time (optional)').fill('12:30');
  await lunch.getByRole('button', {name: 'Save lunch name'}).click();
  await names.getByRole('checkbox', {name: /Remind me on Today at each usual time/}).check();
  await open(page, '/app');
  const card = page.getByRole('article', {name: 'Reminder: Lunch time'});
  await expect(card).toBeVisible();
  await expect(card).toContainText('Reminder · 12:30 · on this device');
  await expect(card).toContainText('Nothing is logged for Lunch yet today.');
  await card.getByRole('button', {name: 'Not today: Lunch'}).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('article', {name: 'Reminder: Lunch time'})).toHaveCount(0);
});
