import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, open, toast} from '../l3-helpers';

/**
 * Session AL fourth pass (lane L3, GROK53_REPLAY_L3_1 "exact steps" 12, 13, 14, 16, 17, 19): the welcome as Nairobi ran
 * it, a fresh profile at 1280×800 in Brussels before 07:00 (en-GB, as the replay used).
 */
test.use({viewport: {width: 1280, height: 800}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T03:20:00Z')}); });
const flow = (page: Page) => page.locator('main');
const nav = (page: Page) => page.getByRole('navigation', {name: 'Main navigation'});

test('N-NB-01/N-NB-02: an empty step says "Skip this step"; the preview names the Checklist and the small apps', async ({page}) => {
  await emptyDevice(page, {welcomeSeen: false});
  await open(page, '/app/welcome');
  await flow(page).getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await expect(flow(page).getByRole('button', {name: 'Skip this step', exact: true})).toBeVisible();
  await expect(flow(page).getByRole('button', {name: 'Continue without choosing'})).toHaveCount(0);
  await flow(page).getByRole('checkbox', {name: /^Habits/}).check();
  await expect(flow(page).locator('.onboarding-shown')).toContainText('You’ll see:');
  await expect(flow(page).locator('.onboarding-apps')).toContainText('The Checklist and the small apps (NOVA, Tasks, Notes, Journal, Agenda)');
});

test('NB-019/NB-234/NB-006/NB-241: the tour rings + Quick add, Finish is in view, a name is kept, and Undo setup puts the pages back', async ({page}) => {
  await emptyDevice(page, {welcomeSeen: false});
  await open(page, '/app');
  await expect(nav(page).getByRole('link', {name: 'Health', exact: true})).toBeVisible();
  await open(page, '/app/welcome');
  await flow(page).getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await flow(page).getByRole('checkbox', {name: /^Habits/}).check();
  await flow(page).getByRole('button', {name: 'Continue', exact: true}).click();
  await flow(page).getByRole('checkbox', {name: /^Read more/}).check();
  await flow(page).getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow(page).getByRole('heading', {level: 1, name: 'A few things to start with.'})).toBeVisible();
  await flow(page).getByRole('button', {name: 'Continue', exact: true}).click();
  // NB-234: a step with nothing to choose says so.
  await expect(flow(page).locator('.onboarding-progress')).toContainText('nothing to choose here');
  // NB-019: the Quick add card rings the real button; the ring goes with the card.
  await flow(page).getByRole('button', {name: 'Show me', exact: true}).click();
  await flow(page).getByRole('button', {name: 'Next', exact: true}).click();
  await flow(page).getByRole('button', {name: 'Next', exact: true}).click();
  await expect(flow(page).locator('.onboarding-tour-card h2')).toHaveText('Quick add');
  await expect(page.locator('.quick-add-trigger[data-tour-spot]').first()).toBeVisible();
  await flow(page).getByRole('button', {name: 'Next', exact: true}).click();
  await expect(page.locator('.quick-add-trigger[data-tour-spot]')).toHaveCount(0);
  await flow(page).getByRole('button', {name: 'Done', exact: true}).click();
  await flow(page).getByRole('button', {name: 'Continue', exact: true}).click(); // install
  // NB-006: an optional name, on this device only.
  await flow(page).getByLabel('What should ZIGi call you? (optional)').fill('  Sam  ');
  await flow(page).getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow(page).getByText('ZIGi calls you “Sam” (on this device only).')).toBeVisible();
  // NB-234: Finish setup sits in the 800 px window without a scroll.
  const finish = flow(page).getByRole('button', {name: 'Finish setup', exact: true});
  await expect(finish).toBeInViewport();
  await finish.click();
  await page.waitForURL(/\/app$/);
  await expect(page.getByRole('heading', {name: 'You’re set, Sam.'})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:profile-name:v1') ?? 'null'))).toMatchObject({version: 1, name: 'Sam'});
  await expect(nav(page).getByRole('link', {name: 'Health', exact: true})).toHaveCount(0);
  const setup = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:onboarding-setup:v1') ?? 'null'));
  expect(setup.pages).toEqual(expect.arrayContaining([{id: 'health', was: true}]));
  // NB-241: Undo setup takes the habits back and the pages it switched.
  await open(page, '/app/welcome');
  await page.getByRole('button', {name: 'Undo setup', exact: true}).click();
  await expect(toast(page)).toContainText('back as they were');
  await open(page, '/app');
  await expect(nav(page).getByRole('link', {name: 'Health', exact: true})).toBeVisible();
});

test('NB-033: on an empty Today after "Not now", Start setup is the one primary action; the destination link steps back', async ({page}) => {
  await emptyDevice(page);
  await open(page, '/app');
  const entry = page.locator('.onboarding-entry');
  await expect(entry.getByRole('link', {name: 'Start setup', exact: true})).toHaveClass(/\bprimary\b/);
  const plan = page.getByRole('link', {name: 'Plan my first goal →', exact: true});
  if (await plan.count()) await expect(plan).not.toHaveClass(/\bprimary\b/);
});
