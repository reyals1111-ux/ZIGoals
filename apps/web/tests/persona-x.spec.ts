import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitCount} from '../lib/habits';
import {createEmptyHealth, HEALTH_STORAGE_KEY} from '../lib/health';
import {addWater} from '../lib/health-daily';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema} from '../lib/positions';
import {localDate} from '../lib/local-date';

// Session X P2.1: what the fresh-eyes persona round (45 sessions, eight personas; docs/verification/x-cloud/PERSONAS_X.md)
// found in the app, kept fixed. Fictional records; every /api request is answered by a fixture.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

const HABIT = '59a35604-3696-4a78-b455-4015acb66885';
async function seed(page: Page, records: Record<string, unknown>) {
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, JSON.stringify(v)); }, {[DASHBOARD_SETTINGS_KEY]: {...presetSettings('habits-health'), onboarded: true}, ...records});
}

test('Complete, then Undo: today is Due again, not Failed, on Habits and on Today', async ({page}) => {
  await seed(page, {[HABITS_KEY]: createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(Date.now() - 3 * 86_400_000), HABIT)});
  await page.goto('/app/habits');
  const card = page.getByRole('article', {name: 'Stretch', exact: true});
  await card.getByRole('button', {name: 'Complete Stretch', exact: true}).click();
  await expect(card.locator('.habit-result')).toHaveText('Complete');
  await card.getByRole('button', {name: 'Undo completion for Stretch', exact: true}).click();
  await expect(card.locator('.habit-result')).toHaveText('Due');
  await expect(card.locator('.habit-count')).toHaveText('0 / 1 time per day');
  await page.goto('/app');
  await expect(page.locator('main .habit-today-list .habit-result').first()).toHaveText('Due');
});

test('Connect Keplr without the extension: the Local demo and its balance stay; only the reason is shown', async ({page, isMobile}) => {
  test.skip(isMobile, 'The wallet buttons sit in the desktop top bar.');
  await page.goto('/app');
  await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
  await page.getByRole('button', {name: 'Connect Keplr', exact: true}).click();
  await expect(page.getByRole('alert').filter({hasText: 'Install the Keplr'})).toBeVisible();
  await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
  await expect(page.getByRole('button', {name: 'Local demo', exact: true})).toHaveAttribute('aria-pressed', 'true');
});

test('the Habits + Health layout names both areas under Today\'s title', async ({page}) => {
  await seed(page, {});
  await page.goto('/app');
  await expect(page.locator('.hero-truth')).toHaveText('Private daily tracking · Habits and Health');
});

test('funding a EUR Goal: a new cash asset starts in euros with a matching name, and the preview opens', async ({page}) => {
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional holiday', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '300000', targetDate: '2027-06-30', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: []});
  await seed(page, {[PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]}});
  await page.goto('/app/goals/tracked/7');
  await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Fund your Goal'});
  await expect(sheet.getByLabel('Asset name')).toHaveValue('EUR Cash');
  await expect(sheet.getByRole('button', {name: 'EUR', exact: true})).toHaveAttribute('aria-pressed', 'true');
  // The suggested name follows the currency until the person types one.
  await sheet.getByRole('button', {name: 'USD', exact: true}).click();
  await expect(sheet.getByLabel('Asset name')).toHaveValue('USD Cash');
  await sheet.getByRole('button', {name: 'EUR', exact: true}).click();
  await expect(sheet.getByLabel('Asset name')).toHaveValue('EUR Cash');
  await sheet.getByLabel('Cash amount', {exact: true}).fill('200');
  await sheet.getByRole('button', {name: 'Continue with this asset', exact: true}).click();
  await sheet.getByLabel('Contribution quantity (EUR)', {exact: true}).fill('200');
  await sheet.getByRole('button', {name: 'Preview contribution', exact: true}).click();
  await expect(sheet.getByText('REVIEW YOUR CONTRIBUTION', {exact: true})).toBeVisible();
  await expect(sheet.getByRole('alert')).toHaveCount(0);
});

test('phone: the accounts heading keeps the width of the card; its button goes under it', async ({page, isMobile}) => {
  test.skip(!isMobile, 'The squeeze was on a phone.');
  await seed(page, {});
  await page.goto('/app/wealth');
  const title = page.locator('#accounts-title');
  const fold = page.getByRole('button', {name: /^Accounts, debts & net worth/}).first();
  await page.waitForLoadState('networkidle');
  if (await fold.getAttribute('aria-expanded') === 'false') await fold.click();
  await expect(fold).toHaveAttribute('aria-expanded', 'true');
  await expect(title).toBeVisible();
  const [heading, card] = await Promise.all([title.boundingBox(), page.locator('.accounts-section').boundingBox()]);
  expect(heading!.width).toBeGreaterThan(card!.width * 0.7);
  expect(await title.evaluate(el => el.getClientRects().length && Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))).toBeLessThanOrEqual(2);
});

test('Activity: water logged shows under Health', async ({page}) => {
  const today = localDate(), at = new Date().toISOString();
  await seed(page, {[HEALTH_STORAGE_KEY]: addWater(createEmptyHealth(), {id: 'health_water-p21', date: today, amountMilli: 250_000, unit: 'ml'}, at)});
  await page.goto('/app/activity');
  await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: 'Health', exact: true}).click();
  await expect(page.locator('main .activity-event').filter({hasText: 'Water logged'})).toContainText('250 mL');
});

test('a new person is not asked to review a week with nothing in it; a week with a check-in is offered', async ({page}) => {
  // Thursday 8 October 2026: the review covers Monday 28 September to Sunday 4 October (the default review day).
  await page.clock.install({time: new Date('2026-10-08T10:00:00.000Z')});
  await seed(page, {});
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.waitForLoadState('networkidle');
  const empty = page.getByRole('region', {name: 'For you', exact: true}).getByRole('button', {name: /^Show more/});
  if (await empty.count()) await empty.click();
  await expect(page.locator('#for-you-weekly-review')).toHaveCount(0);
  // The same device with one check-in last week: the review is there.
  const lastWeek = new Date('2026-10-02T09:00:00.000Z');
  const habits = logHabitCount(createHabit(emptyHabitData(), {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-09-20T09:00:00.000Z'), HABIT), HABIT, '2026-10-02', 1, '', lastWeek);
  await seed(page, {[HABITS_KEY]: habits});
  await page.goto('/app');
  // On a phone one "For you" card is open; the review may wait behind Show more.
  const forYou = page.getByRole('region', {name: 'For you', exact: true});
  await expect(forYou).toBeVisible();
  const more = forYou.getByRole('button', {name: /^Show more/});
  if (await more.count()) await more.click();
  await expect(page.locator('#for-you-weekly-review')).toHaveCount(1);
});

test('the Goal wizard: each new step takes focus, so the keyboard and a screen reader start from it', async ({page}) => {
  await page.goto('/app/goals/new');
  await page.getByLabel('Goal name', {exact: true}).fill('Fictional bike');
  // An empty target says what is missing (it read "Enter a non-negative decimal amount.").
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.getByText('Enter your target.', {exact: true})).toBeVisible();
  await page.getByLabel(/^Target amount/).fill('500');
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.locator('.wizard-content')).toBeFocused();
  await expect(page.locator('.wizard-content')).toContainText('Step 2 of 4');
});

test('the Showcase says that what is added there stays in the demo, and Exit returns to Today', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const banner = page.getByRole('complementary', {name: 'Showcase data'});
  await expect(banner).toContainText('anything you add here stays in the demo when you exit');
  await banner.getByRole('button', {name: 'Exit Showcase', exact: true}).click();
  await page.waitForURL(url => url.pathname === '/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toHaveCount(0);
});
