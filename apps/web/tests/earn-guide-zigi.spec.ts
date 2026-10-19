import {expect, test} from '@playwright/test';
import {AI_SETTINGS_KEY} from '../lib/ai/settings';
import {earnRoutes} from './earn-fixtures';
import {BASE, MORNING, panel, seed, server} from './zigi-af';

/**
 * Session AF (L1c, ledger P1.19; ADR-028 H5, H34): guide mode's ZIGi helper. "Ask ZIGi about this" in the guide panel
 * opens ZIGi's chat on that way to earn, the way the app's other "Ask ZIGi" affordances do: the guide named in the
 * composer and the Earn coach's figures for that option as a removable chip. Nothing is sent — not to the person's own
 * AI (a MOCK local server that records every request), not anywhere but the app itself — until Send; no amount is filled
 * in; the guide panel stays. Without the ZIGi launcher the control is not offered. The guide's new tab is a stub.
 */
const QUESTION = 'Explain this guide, “Stake ZIG on Valdora for stZIG” on Valdora, in plain words: what each step does and what the risks are.';
test('Ask ZIGi about this opens ZIGi on the guide’s option; nothing reaches any AI or anywhere else by itself', async ({page, context, baseURL}) => {
  const origin = new URL(baseURL!).origin;
  await context.route(url => url.origin !== origin && !url.href.startsWith(BASE), route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}));
  const bodies = await server(page);
  await seed(page, {time: MORNING});
  const requests = await earnRoutes(page);
  await page.goto('/app/earn#valdora');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.zigiLauncher ?? '')).toBe('shown');
  const open = page.locator('#valdora').getByRole('link', {name: /^Open Valdora/});
  const [tab] = await Promise.all([context.waitForEvent('page'), open.click()]);
  await tab.close();
  const guide = page.getByRole('region', {name: 'Guide: Stake ZIG on Valdora for stZIG'});
  await expect(guide).toBeVisible();
  const ask = guide.getByRole('button', {name: 'Ask ZIGi about this', exact: true});
  expect((await ask.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const before = requests.length;
  await ask.click();
  // The chat opens on that option: the question names the guide; the chip is the Earn coach's figures for it.
  await expect(panel(page)).toBeVisible();
  const composer = page.getByLabel('Message to your AI');
  await expect(composer).toHaveValue(QUESTION);
  await expect(panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'})).toContainText('Earn figures · Stake ZIG on Valdora for stZIG');
  // No amount is filled in, and nothing is sent by itself: no request to the person's AI, none off the app's own origin.
  expect(await composer.inputValue()).not.toMatch(/\d/);
  await page.waitForTimeout(2_000);
  expect(bodies).toEqual([]);
  expect(requests.filter(u => u.startsWith(BASE))).toEqual([]);
  expect(requests.slice(before).filter(u => !u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
  // Escape closes the chat and leaves the guide where it was.
  await composer.focus();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(guide).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('every guide asks about its own way to earn; with the ZIGi launcher hidden the control is not offered', async ({page, context, baseURL}) => {
  const origin = new URL(baseURL!).origin;
  await context.route(url => url.origin !== origin && !url.href.startsWith(BASE), route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>'}));
  const bodies = await server(page);
  await seed(page, {time: MORNING});
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.zigiLauncher ?? '')).toBe('shown');
  for (const [name, title, chip] of [
    ['Open Keplr staking', 'Stake ZIG in Keplr', 'Earn figures · Stake ZIG in Keplr'],
    ['Open OroSwap pools', 'Add liquidity on OroSwap', 'Earn figures · Add liquidity on OroSwap'],
    ['Open Private Credit', 'Supply USDC: Private Credit', 'Earn figures · Supply USDC: Private Credit'],
  ] as const) {
    const link = page.getByRole('link', {name: new RegExp(`^${name}`)}).first();
    await link.scrollIntoViewIfNeeded();
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.close();
    const guide = page.getByRole('region', {name: `Guide: ${title}`});
    await guide.getByRole('button', {name: 'Ask ZIGi about this', exact: true}).click();
    await expect(page.getByLabel('Message to your AI'), title).toHaveValue(new RegExp(`^Explain this guide, “${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}”`));
    await expect(panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'}), title).toContainText(chip);
    await page.getByLabel('Message to your AI').focus();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toHaveCount(0);
    await guide.getByRole('button', {name: 'Close the guide'}).click();
  }
  expect(bodies).toEqual([]);
  // ZIGi's launcher hidden: the guide offers no "Ask ZIGi".
  await page.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)!); localStorage.setItem(key, JSON.stringify({...s, launcherHidden: true})); }, AI_SETTINGS_KEY);
  await page.reload();
  await expect(page.getByTestId('ai-launcher')).toHaveCount(0);
  const link = page.locator('#valdora').getByRole('link', {name: /^Open Valdora/});
  await link.scrollIntoViewIfNeeded();
  const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
  await tab.close();
  const guide = page.getByRole('region', {name: 'Guide: Stake ZIG on Valdora for stZIG'});
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('button', {name: 'Ask ZIGi about this'})).toHaveCount(0);
});
