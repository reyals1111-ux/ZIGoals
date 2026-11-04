import {expect, test} from '@playwright/test';
import {openZigi, sendToZigi, zigiBox, zigiPanel} from '../../zigi-open';
import {nova, seed, sendInNova} from './helpers';

/**
 * Session AL second pass (lane L7): what a person sees for the rows closed in this pass. Fresh profiles unless the finding
 * was in the Showcase; the bot's widths; no model (every answer here is made on the device).
 */
const offline = (page: import('@playwright/test').Page) => page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));

test.describe('desktop', () => {
  test.use({viewport: {width: 1440, height: 900}, timezoneId: 'UTC'});
  test('Z-068/LA-027/N-MO-04: "Remember that I get paid on the 25th" is a note card with a category, never a 25 EUR expense', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'Remember that I get paid on the 25th');
    const card = zigiPanel(page).locator('.ai-card').last();
    await expect(card).toBeVisible({timeout: 15_000});
    await expect(card).not.toContainText('25 EUR');
    await expect(card).toContainText('I get paid on the 25th');
    await expect(card.getByRole('button', {name: 'Remember'})).toBeVisible();
  });
  test('DV-063b/P-DV-94: a card that opens a page names the page on its button', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'Create a food called protein shake');
    const card = zigiPanel(page).locator('.ai-card').last();
    await expect(card.getByRole('button', {name: 'Open Health'})).toBeVisible({timeout: 15_000});
    await expect(card.getByRole('button', {name: 'Open the form'})).toHaveCount(0);
  });
  test('PR-033/P-PR-34 and BN-058/P-BN-15: debts are listed; a governance deposit question is never a contributions answer', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'What debts do I owe?');
    await expect(zigiPanel(page).locator('.ai-turn-local').last()).toContainText('owed', {timeout: 15_000});
    await sendToZigi(page, 'How much ZIG is the deposit for a proposal?');
    const last = zigiPanel(page).locator('.ai-turn-local').last();
    await expect(last).toContainText('Governance', {timeout: 15_000});
    await expect(last).not.toContainText('contributions');
  });
  test('LA-001/P-LA-01: a threat to hurt someone gets the fixed reply with the emergency number', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app');
    await openZigi(page);
    await sendToZigi(page, 'I want to hurt someone');
    await expect(zigiPanel(page).locator('.ai-turn-local').last()).toContainText('112', {timeout: 15_000});
    await expect(zigiPanel(page).locator('.ai-card')).toHaveCount(0);
  });
  test('NB-120/P-NB-64: "Ask ZIGi about this" leaves the caret at the end of the prefilled question', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app');
    await openZigi(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('zigoals:ai-ask', {detail: {text: 'How far am I on my Japan adventure goal?'}})));
    const box = zigiBox(page);
    await expect(box).toHaveValue('How far am I on my Japan adventure goal?');
    await expect(box).toBeFocused();
    expect(await box.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd, el.value.length])).toEqual([40, 40, 40]);
  });
  test('NP-06/P-MO-06: NOVA\'s on-device answer offers the same Quick add line as ZIGi for a log line', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app');
    await sendInNova(page, 'drank 2 glasses of water');
    await expect(nova(page).locator('.ai-quick-add')).toBeVisible({timeout: 20_000});
    await sendInNova(page, 'How much water did I drink today?');
    await expect(nova(page).locator('.nova-turn-assistant').last().locator('.ai-quick-add')).toHaveCount(0);
  });
  test('LS-006/LS-043/P-LS-50: opening ZIGi on Tasks and on Today keeps the page alive', async ({page}) => {
    let crashed = false; page.on('crash', () => { crashed = true; });
    await offline(page); await seed(page);
    for (const path of ['/app/tasks', '/app']) {
      await page.goto(path);
      await openZigi(page);
      await expect(zigiPanel(page)).toBeVisible();
      await page.keyboard.press('Escape');
    }
    expect(crashed).toBe(false);
  });
});
test.describe('768 px (D-067, D-131; P-DVR-52)', () => {
  test.use({viewport: {width: 768, height: 1024}});
  test('the conversation keeps most of the panel\'s height', async ({page}) => {
    await offline(page); await seed(page, {showcase: true}); await page.goto('/app/goals');
    await openZigi(page);
    await sendToZigi(page, 'How far am I on my goals?');
    const log = zigiPanel(page).locator('.ai-chat-log'), panel = zigiPanel(page);
    await expect(log).toBeVisible();
    const [l, p] = [await log.boundingBox(), await panel.boundingBox()];
    expect(l!.height).toBeGreaterThan(p!.height * 0.4);
  });
});
test.describe('375 px (LA-016; P-LA-26)', () => {
  test.use({viewport: {width: 375, height: 812}});
  test('NOVA\'s chat on a phone has one Close button', async ({page}) => {
    await offline(page); await seed(page); await page.goto('/app');
    await sendInNova(page, 'What is due today?');
    const sheet = page.locator('dialog.nova-sheet[open]');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', {name: /^Close /})).toHaveCount(1);
  });
});
