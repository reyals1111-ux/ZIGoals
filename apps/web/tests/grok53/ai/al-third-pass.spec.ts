import {expect, test, type Page} from '@playwright/test';
import {openZigi, sendToZigi, zigiBox, zigiPanel} from '../../zigi-open';
import {UI_PREFS_KEY} from '../../../lib/ab-design-keys';
import {AI_USAGE_KEY} from '../../../lib/ai/store/keys';
import {seed} from './helpers';

/**
 * Session AL third pass (lane L7): what a person sees for the rows closed in this pass. No model (every answer is made on
 * the device); the bots' widths; a fresh profile unless the finding was in the Showcase.
 */
const offline = (page: Page) => page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
const lastTurn = (page: Page) => zigiPanel(page).locator('.ai-turn-local').last();

test.describe('desktop (Berlin, Professor: 1920)', () => {
  test.use({viewport: {width: 1920, height: 1080}, timezoneId: 'UTC'});

  test('BN-070/P-BN-24: a 5,000-character message shows the counter and the limit', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app');
    await openZigi(page);
    await zigiBox(page).fill('Tell me about staking. '.repeat(218).slice(0, 5000));
    await expect(zigiPanel(page).locator('.ai-length')).toHaveText('5,000 of 15,000 characters');
    await zigiBox(page).fill('Short question');
    await expect(zigiPanel(page).locator('.ai-length')).toHaveCount(0);
  });

  test('BN-017/P-BN-38: the six page-data switches are one group named "What each page may share"', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app/settings#zigi-privacy-title');
    const group = page.getByRole('group', {name: 'What each page may share'});
    await expect(group.getByRole('switch')).toHaveCount(6);
    await expect(group.getByRole('switch', {name: 'Health page data'})).toHaveAttribute('aria-checked', 'false');
  });

  test('DV-072b/P-DV-98: a page switch is a switch with its label, a visible state word and a track', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app/settings#zigi-privacy-title');
    const today = page.getByRole('switch', {name: 'Today page data'});
    await expect(today).toHaveAttribute('aria-checked', 'true');
    await expect(today).toHaveText('On');
    await expect(today.locator('.ai-switch-track')).toBeVisible();
    const box = await today.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await today.click();
    await expect(today).toHaveAttribute('aria-checked', 'false');
    await expect(today).toHaveText('Off');
  });

  test('PR-035/P-PR-31 and N-MO-03/P-DVR-22: the cap starts in the person\'s currency, its currency is chosen before the amount, and the copy names the real place', async ({page}) => {
    await offline(page);
    await seed(page, {showcase: true, extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, baseCurrency: 'EUR'})}});
    await page.goto('/app/nova#nova-cost');
    const panels = page.getByRole('dialog', {name: 'NOVA’s panels'});
    const currency = panels.getByRole('combobox', {name: 'Currency'});
    await expect(currency).toBeEnabled({timeout: 20_000});
    await expect(currency).toHaveValue('EUR');
    await currency.selectOption('GBP');
    await expect(panels.getByText('The cap will be in GBP once you enter an amount.')).toBeVisible();
    await panels.getByRole('textbox', {name: 'Amount'}).fill('1.5');
    await panels.getByRole('textbox', {name: 'Amount'}).blur();
    await expect(panels.getByText('Daily cap saved: counting per day starts now.')).toBeVisible();
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), AI_USAGE_KEY);
    expect(stored.dailyCap).toMatchObject({amount: '1.5', currency: 'GBP'});
    const link = panels.getByRole('link', {name: 'Settings → ZIGi → Advanced → Usage on this device'});
    await expect(link).toHaveAttribute('href', '/app/settings#zigi-usage');
    await expect(panels).not.toContainText('Settings → ZIGi → Usage.');
  });

  test('P14-B: with no model, "How was my week?" is the weekly review\'s figures with the Life review card, never the examples list', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'How was my week?');
    const turn = lastTurn(page);
    await expect(turn).toContainText('Your week,', {timeout: 15_000});
    await expect(turn).toContainText('check-ins');
    await expect(turn).not.toContainText('Until you give me a brain');
    await expect(zigiPanel(page).locator('.ai-card').last()).toContainText('Open the Life review: this week');
    await sendToZigi(page, 'Hoe was mijn week?');
    await expect(lastTurn(page)).toContainText('Je week,', {timeout: 15_000});
  });

  test('P14-B: "How many calories in my plate of pasta?" offers the food search with "pasta", never today\'s total', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'How many calories in my plate of pasta?');
    const turn = lastTurn(page);
    await expect(turn).toContainText('not about today', {timeout: 15_000});
    await expect(turn).not.toContainText('Energy today');
    await expect(zigiPanel(page).locator('.ai-card').last()).toContainText('Search: pasta');
    await sendToZigi(page, 'How many calories did I eat today?');
    await expect(lastTurn(page)).toContainText('kcal', {timeout: 15_000});
  });

  test('LA-008/P-LA-11: "Move Stretch to the morning" gets the Checklist\'s own steps, not a task named after the sentence', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'Move Stretch to the morning');
    await expect(lastTurn(page)).toContainText('Move to another orbit', {timeout: 15_000});
    await expect(zigiPanel(page).locator('.ai-card').last()).not.toContainText('Move Stretch to the morning');
  });
});
