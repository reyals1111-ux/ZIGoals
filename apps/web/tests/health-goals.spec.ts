import {expect, test, type Page} from '@playwright/test';
import {HEALTH_GOALS_KEY} from '../lib/health-goals/schema';
import {isPhone} from './phone-nav';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {SYNC_WRITES} from '../lib/vault/sync-writes';

// G3 (Session P): health goals on the Goals page and Today, counted from the Health journal only; kept on this device.
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
// Session U Part 9: with the sync writes on (lib/vault/sync-writes.ts), health goals live in Health v3 (`healthGoals`) and the
// device key is never written; switched off, they live in the device key as before.
const HOME = SYNC_WRITES ? HEALTH_STORAGE_KEY : HEALTH_GOALS_KEY;
const sessionGoals = (page: Page) => page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), HOME);

test('Showcase: the fictional goal is counted from the Showcase journal on Goals and Today, and viewing writes nothing', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = await sessionGoals(page);
  expect(before).not.toBe('[]');
  const forYou = page.getByRole('region', {name: 'For you', exact: true});
  await expect(forYou).toBeVisible();
  const card = page.getByRole('region', {name: 'From your Health journal.', exact: true});
  if (!(await card.isVisible().catch(() => false))) { const fold = forYou.getByRole('button', {name: /^Show more/}); if (await fold.count()) await fold.click(); }
  await expect(card).toBeVisible();
  await expect(card).toContainText('Walk more (Showcase)');
  const line = (await card.textContent())!.match(/(\d[\d,]* of 8,000 steps)/)![1]!;
  await page.goto('/app/goals');
  const section = page.getByRole('region', {name: 'Health goals', exact: true});
  await expect(section.getByRole('list', {name: 'Active health goals'})).toContainText('Walk more (Showcase)');
  await expect(section.getByRole('list', {name: 'Active health goals'})).toContainText(`${line} · Showcase example`);
  expect(await sessionGoals(page)).toBe(before);
});

test('Local Demo: create, count from a water entry, close and reopen a health goal', async ({page}) => {
  await page.goto('/app/goals');
  const section = page.getByRole('region', {name: 'Health goals', exact: true});
  await expect(section).toContainText('No health goals yet.');
  await section.getByRole('button', {name: '+ Health goal', exact: true}).click();
  const creator = page.getByRole('region', {name: 'New health goal', exact: true}).or(page.getByRole('dialog', {name: 'New health goal'}));
  const name = page.getByLabel('Name', {exact: true});
  await name.fill('Water days');
  await page.getByLabel(/^Measure/).selectOption('water');
  await page.getByLabel('Target', {exact: true}).fill('5');
  await page.getByRole('radio', {name: /^Rolling/}).check();
  await page.getByLabel('Weeks', {exact: true}).fill('2');
  if (await isPhone(page)) {
    await expect(page.getByRole('dialog', {name: 'New health goal'})).toBeVisible();
    expect(await name.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
    expect((await page.getByRole('button', {name: 'Create health goal', exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  } else await expect(creator).toBeVisible();
  await page.getByRole('button', {name: 'Create health goal', exact: true}).click();
  await expect(section.getByRole('status')).toContainText('Health goal created.');
  const list = section.getByRole('list', {name: 'Active health goals'});
  await expect(list).toContainText('Water days');
  await expect(list).toContainText('No data yet');
  const home = JSON.parse((await page.evaluate(key => localStorage.getItem(key), HOME))!), stored = SYNC_WRITES ? home.healthGoals : home;
  if (SYNC_WRITES) { expect(home.schemaVersion).toBe(3); expect(await page.evaluate(key => localStorage.getItem(key), HEALTH_GOALS_KEY)).toBeNull(); }
  expect(stored.version).toBe(1); expect(stored.goals).toHaveLength(1);
  expect(stored.goals[0]).toMatchObject({version: 1, name: 'Water days', measure: 'water', direction: 'at-least', target: {value: '5', decimals: 0}, unit: 'days', window: {kind: 'rolling', weeks: 2}, status: 'active'});
  await page.goto('/app/health');
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Water journal'})).toContainText('250 mL recorded');
  await page.goto('/app/goals');
  await expect(list).toContainText('1 of 5 days');
  await section.getByRole('button', {name: 'End Water days', exact: true}).click();
  await expect(section.getByRole('status')).toContainText('Water days ended.');
  await section.getByRole('button', {name: 'Show done and ended (1)', exact: true}).click();
  await section.getByRole('button', {name: 'Reopen Water days', exact: true}).click();
  await expect(section.getByRole('status')).toContainText('Water days reopened.');
  await expect(list).toContainText('1 of 5 days');
  await page.setViewportSize({width: 320, height: 568});
  await page.goto('/app/goals');
  await expect(section).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
