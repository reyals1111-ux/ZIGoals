import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';

// Session AL, lane L1 (Tokyo pass 2, desktop, fresh profile with the bot's own portfolio).
test.use({viewport: {width: 1280, height: 800}, colorScheme: 'dark'});
test.beforeEach(async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

test('TK-024 (P-TK-18; P6, P8): an oversell is refused under Quantity, which is marked and focused, in view; Save does not move', async ({page}) => {
  await page.goto('/app/portfolio');
  const create = page.getByRole('form', {name: 'New portfolio'});
  await create.getByLabel('Portfolio name').fill('Fictional coins');
  await create.getByRole('button', {name: 'Create portfolio'}).click();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Quantity').fill('0,5');
  await form.getByLabel('Price per coin (USD)').fill('60000');
  await form.getByLabel('Date').fill('2026-09-01');
  await form.getByRole('button', {name: 'Save transaction'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Buy of BTC recorded.'})).toBeVisible();
  const save = form.getByRole('button', {name: 'Save transaction'}), before = await save.boundingBox();
  await form.getByRole('button', {name: /Bitcoin/}).click();
  await form.getByLabel('Type').selectOption('sell');
  await form.getByLabel('Quantity').fill('2');
  await form.getByLabel('Price per coin (USD)').fill('61000');
  await save.click();
  const quantity = form.getByLabel('Quantity');
  await expect(quantity).toHaveAttribute('aria-invalid', 'true');
  await expect(quantity).toBeFocused();
  const message = form.locator('.field-error').filter({hasText: 'below zero'});
  await expect(message).toBeVisible(); await expect(message).toBeInViewport();
  // Nothing at the page's top.
  await expect(page.locator('.notice[role=alert]')).toHaveCount(0);
  const after = await save.boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
});

test('P5 / N-TK-04 (P-TK-17): a staking reward, an airdrop or income is in the Type list', async ({page}) => {
  await page.goto('/app/portfolio');
  const create = page.getByRole('form', {name: 'New portfolio'});
  await create.getByLabel('Portfolio name').fill('Fictional coins');
  await create.getByRole('button', {name: 'Create portfolio'}).click();
  const form = page.getByRole('form', {name: 'Record a transaction'});
  await expect(form.getByLabel('Type').locator('option')).toContainText(['Buy', 'Sell', 'Transfer in', 'Transfer out', 'Staking reward', 'Income', 'Airdrop']);
  await form.getByLabel('Type').selectOption({label: 'Airdrop'});
  await expect(form.getByLabel('Received as')).toHaveValue('airdrop');
});
