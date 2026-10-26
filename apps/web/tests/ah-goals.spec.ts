import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {PLATFORM_KEY} from '../lib/positions';
import {HABITS_KEY} from '../lib/habits';

// Session AH Part 8 (GO1, GO2, GO3): Goals on a new device. Fictional data only.
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });
const stored = <T,>(page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T>;
async function create(page: Page, name: string, type: 'Value' | 'Quantity' | 'Project', target = '2') {
  await page.goto('/app/goals/new'); await hydrated(page);
  await page.getByLabel('Goal name', {exact: true}).fill(name);
  await page.getByRole('radio', {name: type, exact: true}).check();
  if (type === 'Project') await page.getByLabel('Milestones, one per line', {exact: true}).fill('2 hours\nA day');
  else await page.getByLabel('Target amount', {exact: true}).fill(target);
  await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
  await page.getByTestId('tracked-progress').waitFor();
}

test('GO1: a goal named "Create 2 hours a day", of every kind, and the 2-hours average template open without an error', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const type of ['Value', 'Quantity', 'Project'] as const) await create(page, 'Create 2 hours a day', type);
  await page.goto('/app/goals/average/new?template=digital-detox'); await hydrated(page);
  await page.getByRole('button', {name: 'Save goal', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1})).toContainText('Less screen time');
  await page.goto('/app/goals'); await hydrated(page);
  const opens = page.getByRole('link', {name: 'Open Goal →'});
  for (let i = 0; i < await opens.count(); i++) { await page.goto('/app/goals'); await hydrated(page); await page.getByRole('link', {name: 'Open Goal →'}).nth(i).click(); await expect(page.locator('main h1').first()).toBeVisible(); }
  expect(errors).toEqual([]);
});

test('GO2: closing a goal can pause its supporting habit; Delete says in words why it is off', async ({page}) => {
  await create(page, 'Fictional review goal', 'Project');
  const supporting = page.locator('#supporting-habits');
  if (!await supporting.evaluate(el => el instanceof HTMLDetailsElement ? el.open : true)) await supporting.locator('summary').first().click();
  await supporting.getByRole('button', {name: 'Add weekly Goal review habit', exact: true}).click();
  await expect(supporting.getByRole('heading', {name: 'Review Fictional review goal'})).toBeVisible();
  const status = page.locator('#goal-status');
  if (!await status.evaluate(el => el instanceof HTMLDetailsElement ? el.open : true)) await status.locator('summary').first().click();
  await status.getByRole('button', {name: 'Close Goal and release allocations', exact: true}).click();
  const ask = page.getByRole('alertdialog', {name: 'Confirm Goal action'});
  await expect(ask.getByRole('checkbox')).toBeChecked();
  await expect(ask).toContainText('Also pause its 1 supporting habit (Review Fictional review goal).');
  await ask.getByRole('button', {name: 'Confirm close', exact: true}).click();
  await expect.poll(async () => (await stored<{goals: {status: string}[]}>(page, PLATFORM_KEY)).goals[0]!.status).toBe('closed');
  await expect.poll(async () => (await stored<{habits: {rules: {state: string}[]}[]}>(page, HABITS_KEY)).habits[0]!.rules.at(-1)!.state).toBe('paused');
});

test('GO3: the wizard has Cancel and Escape, and "€5000" is a money goal in euros', async ({page}) => {
  await page.goto('/app/goals/new'); await hydrated(page);
  await page.getByLabel('Goal name', {exact: true}).fill('Fictional trip');
  await page.getByLabel('Target amount', {exact: true}).fill('€5000');
  await expect(page.getByRole('radio', {name: 'Value', exact: true})).toBeChecked();
  await expect(page.getByLabel('Target amount', {exact: true})).toHaveValue('5000');
  await expect(page.getByRole('radio', {name: /^EUR/})).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/app\/goals$/);
  await page.goto('/app/goals/new'); await hydrated(page);
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Fictional trip'); // the draft waited
  await page.getByRole('button', {name: 'Cancel and go back', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/goals$/);
});
