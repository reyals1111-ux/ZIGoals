import {expect, test, type Page} from '@playwright/test';
import {HABIT_HEALTH_LINKS_KEY} from '../lib/habit-health-links/schema';
import {isPhone} from './phone-nav';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {SYNC_WRITES} from '../lib/vault/sync-writes';

// H7 (Session P): a habit that ticks itself off from the Health journal; the rule and the markers stay on this device.
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
// Session U Part 9: with the sync writes on (lib/vault/sync-writes.ts), links and markers live in Health v3 (`habitLinks`) and
// the device key is never written; switched off, they live in the device key as before.
const HOME = SYNC_WRITES ? HEALTH_STORAGE_KEY : HABIT_HEALTH_LINKS_KEY;
const sessionLinks = (page: Page) => page.evaluate(key => JSON.stringify(Object.entries(sessionStorage).filter(([k]) => k.includes(key))), HOME);
type Links = {applied: {habitId: string; date: string; measure: string; value: number; undone?: true}[]};
const storedLinks = async (page: Page): Promise<Links | null> => { const raw = JSON.parse((await page.evaluate(key => localStorage.getItem(key), HOME)) ?? 'null'); return SYNC_WRITES ? raw?.habitLinks ?? null : raw; };
async function addHabit(page: Page, title: string) {
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}

test('Showcase: the Walk card says it was done automatically, and viewing writes nothing', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const before = await sessionLinks(page);
  expect(before).not.toBe('[]');
  await page.goto('/app/habits');
  const walk = page.getByRole('article', {name: 'Walk', exact: true});
  await expect(walk.locator('.habit-auto-badge')).toContainText('Done automatically');
  await expect(walk.locator('.habit-auto-badge')).toContainText(/\d[\d,]* steps/);
  await expect(walk.locator('.habit-auto-badge')).toContainText('Showcase example');
  await page.goto('/app/health');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  expect(await sessionLinks(page)).toBe(before);
});

test('Local Demo: a water link ticks the habit off once the day reaches the target; a tap and Undo always win', async ({page}) => {
  const hosts = new Set<string>();
  page.on('request', request => hosts.add(new URL(request.url()).hostname));
  await page.goto('/app/habits');
  await addHabit(page, 'Drink water');
  await page.getByRole('button', {name: 'Edit Drink water', exact: true}).click();
  const section = page.getByRole('group', {name: 'Done automatically from Health', exact: true});
  await expect(section).toBeVisible();
  const when = section.getByLabel('Done automatically when');
  await when.selectOption('water');
  await section.getByRole('radio', {name: 'the day reaches at least'}).check();
  await section.getByLabel('Target', {exact: true}).fill('500');
  if (await isPhone(page)) {
    for (const control of [when, section.getByRole('radio', {name: 'the day reaches at least'}), section.getByLabel('Target', {exact: true})]) {
      expect((await control.boundingBox())!.height, 'touch target').toBeGreaterThanOrEqual(22);
      expect(await control.evaluate(el => getComputedStyle(el).fontSize)).toBe('16px');
    }
    expect((await when.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await when.focus(); await page.keyboard.press('Tab');
  await expect(section.getByRole('radio', {name: 'the day reaches at least'})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(section.getByLabel('Target', {exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Drink water', exact: true})).toBeVisible();
  expect((await storedLinks(page))?.applied ?? []).toEqual([]);
  await page.goto('/app/health');
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Water journal'})).toContainText('250 mL recorded');
  await page.goto('/app/habits');
  const card = page.getByRole('article', {name: 'Drink water', exact: true});
  await expect(card.locator('.habit-count')).toHaveText('0 / 1 time per day');
  await expect(card.locator('.habit-auto-badge')).toHaveCount(0);
  await page.goto('/app/health');
  await page.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Water journal'})).toContainText('500 mL recorded');
  await page.goto('/app/habits');
  await expect(card.locator('.habit-count')).toHaveText('1 / 1 time per day');
  await expect(card.locator('.habit-auto-badge')).toContainText('Done automatically · from your water journal · 500 mL');
  const applied = (await storedLinks(page))!.applied;
  expect(applied).toHaveLength(1);
  expect(applied[0]).toMatchObject({date: '2026-09-15', measure: 'water', value: 500});
  expect(applied[0]!.undone).toBeUndefined();
  await card.getByRole('button', {name: 'Undo completion for Drink water', exact: true}).click();
  await expect(card.locator('.habit-count')).toHaveText('0 / 1 time per day');
  await expect(card.locator('.habit-auto-badge')).toContainText('Undone · it won’t be ticked off again today.');
  expect((await storedLinks(page))!.applied).toMatchObject([{date: '2026-09-15', undone: true}]);
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.goto('/app/habits');
  await expect(card.locator('.habit-count')).toHaveText('0 / 1 time per day');
  expect((await storedLinks(page))!.applied).toHaveLength(1);
  expect([...hosts]).toEqual(['127.0.0.1']);
});
