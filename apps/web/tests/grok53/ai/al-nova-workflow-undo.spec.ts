import {expect, test, type Page} from '@playwright/test';
import {JOURNAL_KEY} from '../../../lib/journal/schema';
import {NOVA_SETUP_KEY} from '../../../lib/nova/setup';
import {DAY, seed} from './helpers';

/**
 * Session AL (lane L7; Denver DV-071, DV-072, DV-073, N-033…N-036): NOVA → Workflows → "Turn this journal entry into a
 * goal and habits" on a fresh profile with Journal shared with NOVA. Add creates the goal; the Undo (the app's toast,
 * inside NOVA's sheet) takes it back out of the stored record and NOVA's panels stay open; a run again after an Add
 * offers no second copy; "300 dollars … for a new bike" is a savings goal of 300 USD named "New bike". Denver's desktop.
 */
test.use({viewport: {width: 1440, height: 900}});
const goals = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:platform:v1') ?? 'null') as {goals: {name: string; type: string; asset: string; target: string}[]} | null)?.goals ?? []);
async function start(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {extra: {
    [JOURNAL_KEY]: JSON.stringify({version: 1, entries: [{id: 'j1', date: DAY, text: 'I want to save 300 dollars for a new bike. I want to cycle every morning.', createdAt: `${DAY}T08:00:00.000Z`}], shareWithAi: false, followUps: true}),
    [NOVA_SETUP_KEY]: JSON.stringify({version: 1, scopes: {journal: true}}),
  }});
  await page.goto('/app/nova#nova-workflows');
  await page.getByRole('region', {name: 'Workflows'}).getByRole('button', {name: 'Run Turn this journal entry into a goal and habits'}).click();
  return page.getByRole('region', {name: 'Turn this journal entry into a goal and habits'});
}

test('DV-071/N-036: Undo after Add removes the created goal from the store, and NOVA stays open', async ({page}) => {
  const run = await start(page);
  const cards = run.getByLabel('Cards from Turn this journal entry into a goal and habits');
  // DV-073: the amount makes a savings goal; the cadence a habit card.
  const goalCard = cards.locator('.ai-card').filter({hasText: 'Create the goal "New bike"'});
  await expect(goalCard).toContainText('target 300 USD');
  await expect(cards.locator('.ai-card').filter({hasText: 'Create the habit "Cycle"'})).toBeVisible();
  expect(await goals(page)).toEqual([]);
  await goalCard.getByRole('button', {name: /^(Add|Apply)$/}).click();
  await expect.poll(async () => (await goals(page)).map(g => g.name)).toEqual(['New bike']);
  expect((await goals(page))[0]).toMatchObject({type: 'VALUE', asset: 'USD', target: '30000'});
  const toast = page.locator('.aa-toast').filter({hasText: 'Added: Create the goal "New bike".'});
  await expect(toast).toBeVisible();
  await page.clock.runFor(3000);
  await toast.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => goals(page)).toEqual([]);
  await expect(page.locator('.aa-toast')).toContainText('Taken back: Create the goal "New bike".');
  // The panels did not close.
  await expect(run).toBeVisible();
  await expect(page.getByRole('region', {name: 'Workflows'})).toBeVisible();
});

test('DV-072: a run again after the goal was added offers no second copy', async ({page}) => {
  const run = await start(page);
  const cards = run.getByLabel('Cards from Turn this journal entry into a goal and habits');
  await cards.locator('.ai-card').filter({hasText: 'Create the goal "New bike"'}).getByRole('button', {name: /^(Add|Apply)$/}).click();
  await expect.poll(async () => (await goals(page)).length).toBe(1);
  await run.getByRole('button', {name: 'Run again'}).click();
  await expect(run).toContainText('Already in Goals: "New bike". Open Goals to work on it; no second copy is proposed.');
  await expect(run.locator('.ai-card').filter({hasText: 'Create the goal "New bike"'})).toHaveCount(0);
  expect((await goals(page)).length).toBe(1);
});

test('N-033: with the journal not shared, the steps say "Not shared", and nothing is worded as done', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {extra: {[JOURNAL_KEY]: JSON.stringify({version: 1, entries: [{id: 'j1', date: DAY, text: 'I want to save 300 dollars for a new bike.', createdAt: `${DAY}T08:00:00.000Z`}], shareWithAi: false, followUps: true})}});
  await page.goto('/app/nova#nova-workflows');
  await page.getByRole('region', {name: 'Workflows'}).getByRole('button', {name: 'Run Turn this journal entry into a goal and habits'}).click();
  const run = page.getByRole('region', {name: 'Turn this journal entry into a goal and habits'});
  await expect(run.locator('.nova-wf-step').first()).toContainText('Not shared');
  await expect(run.locator('.nova-wf-step').nth(1)).toHaveAttribute('data-state', 'skipped');
  await expect(run.locator('.nova-wf-step').nth(1)).toContainText('Nothing to put into words');
});
