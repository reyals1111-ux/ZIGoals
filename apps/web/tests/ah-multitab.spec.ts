import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY} from '../lib/habits';
import {PLATFORM_KEY} from '../lib/positions';

// Session AH Part 3 (DS1/A1, BUG-075, N-081, M-142): a second tab that was opened earlier never overwrites what
// another tab saved since. Each tab opens its page first; then both save, the older tab last.
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
});
const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
const stored = <T,>(page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T>;

async function createGoal(page: Page, name: string) {
  await page.getByLabel('Goal name', {exact: true}).fill(name);
  await page.getByLabel('Target amount', {exact: true}).fill('1200');
  for (let i = 0; i < 3; i++) { const next = page.getByRole('button', {name: 'Continue →'}); if (await next.isVisible()) await next.click(); }
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(page).not.toHaveURL(/\/app\/goals\/new$/);
}
async function createHabit(page: Page, title: string) {
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}

test('Goals: two tabs each create a Goal; the older tab\'s save keeps the newer tab\'s Goal', async ({page, context}) => {
  await page.goto('/app/goals/new'); await hydrated(page);
  const other = await context.newPage();
  await other.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await other.goto('/app/goals/new'); await hydrated(other);
  await createGoal(page, 'Fictional tab A goal');
  await createGoal(other, 'Fictional tab B goal');
  const names = (await stored<{goals: {name: string}[]}>(page, PLATFORM_KEY)).goals.map(g => g.name).sort();
  expect(names).toEqual(['Fictional tab A goal', 'Fictional tab B goal']);
  await page.goto('/app/goals');
  await expect(page.locator('main')).toContainText('Fictional tab B goal');
  await expect(page.locator('main')).toContainText('Fictional tab A goal');
});

test('Habits: two tabs each create a habit; neither replaces the other', async ({page, context}) => {
  await page.goto('/app/habits'); await hydrated(page);
  const other = await context.newPage();
  await other.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await other.goto('/app/habits'); await hydrated(other);
  await createHabit(page, 'Fictional tab A habit');
  await createHabit(other, 'Fictional tab B habit');
  const titles = (await stored<{habits: {title: string}[]}>(page, HABITS_KEY)).habits.map(h => h.title).sort();
  expect(titles).toEqual(['Fictional tab A habit', 'Fictional tab B habit']);
  // The first tab shows the other tab's habit without a reload.
  await expect(page.getByRole('article', {name: 'Fictional tab B habit', exact: true})).toBeVisible();
});

test('Habits: an edit form opened before another tab changed the habit refuses to save over it and says why', async ({page, context}) => {
  await page.goto('/app/habits'); await hydrated(page);
  await createHabit(page, 'Fictional shared habit');
  const other = await context.newPage();
  await other.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await other.goto('/app/habits'); await hydrated(other);
  // The older tab opens the editor first; then the first tab renames the habit.
  await other.getByRole('button', {name: 'Edit Fictional shared habit'}).click();
  await page.getByRole('button', {name: 'Edit Fictional shared habit'}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional renamed habit');
  await page.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional renamed habit', exact: true})).toBeVisible();
  await other.getByLabel('Habit title', {exact: true}).fill('Fictional stale title');
  await other.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(other.getByRole('alert').filter({hasText: 'This Habit changed while you were editing.'})).toBeVisible();
  expect((await stored<{habits: {title: string}[]}>(page, HABITS_KEY)).habits.map(h => h.title)).toEqual(['Fictional renamed habit']);
});
