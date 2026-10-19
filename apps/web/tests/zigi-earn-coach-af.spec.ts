import {expect, test} from '@playwright/test';
import {STAKING_PREFILL_KEY} from '../lib/af-signing-keys';
import {earnRoutes} from './earn-fixtures';
import {SIGNER_CALLS, fakeKeplr, relay} from './staking-chain';
import {block, lastLocal, MORNING, openChat, panel, say, seed, server, stored} from './zigi-af';

/**
 * Session AF (L4, P8.5; ADR-028 D7, H47, H69): the Earn coach through the real app on a production build. A figure is
 * stated only from what the Earn page read in this visit (the recorded Earn answers), with its source and "as of";
 * without one the answer says where the figure is and carries no digit. Every signing request is refused in plain words
 * with no card. A MOCK reply's staking card only fills in the Staking page's review: the Keplr double sees no call.
 */
test('glossary on the device: no figure before the Earn page read one; then the figure with its source and "as of"', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {time: MORNING});
  await earnRoutes(page);
  await page.goto('/app');
  await openChat(page);
  await say(page, 'What is unbonding?');
  await expect(lastLocal(page)).toContainText('The current figure is on the Earn page, with its source; ZIGi has not read it in this visit.');
  await expect(lastLocal(page)).toContainText('Explained by ZIGoals · not advice');
  expect(await lastLocal(page).locator('.ai-local-answer').textContent()).not.toMatch(/\d/);
  // On Earn the live figures are read (the recorded answers); the coach quotes them as the page states them.
  await page.goto('/app/earn');
  await expect(page.locator('#native-staking')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await openChat(page);
  await say(page, 'What is unbonding?');
  await expect(lastLocal(page)).toContainText(/Unbonding time on ZIGChain \(how long unstaked ZIG stays locked\): 21 days \(source: ZIGChain mainnet LCD \(official\), as of 2026-10-18 23:55 UTC\)\./);
  await say(page, 'wat is APR');
  await expect(lastLocal(page)).toContainText(/\(bron: ZIGChain mainnet LCD \(official\), stand 2026-10-18 23:55 UTC\)/);
  await expect(lastLocal(page)).toContainText('Uitgelegd door ZIGoals · geen advies');
  await say(page, 'What are the ways to earn?');
  await expect(lastLocal(page)).toContainText('never ranked by rate');
  expect(bodies).toEqual([]);
});

test('every signing request is refused in plain words, with no card and no request to the AI', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {time: MORNING});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app');
  await openChat(page);
  for (const ask of ['Sign this transaction for me', 'Onderteken de transactie']) {
    await say(page, ask);
    await expect(lastLocal(page)).toContainText(/ZIGi never signs, sends or broadcasts anything|ZIGi tekent, verstuurt of verzendt nooit iets/);
    await expect(lastLocal(page).locator('.ai-card')).toHaveCount(0);
  }
  expect(bodies).toEqual([]);
});

test('a staking card fills in the review on Staking, read once; nothing is signed, and the wallet is never asked', async ({page}) => {
  const calls = await fakeKeplr(page);
  const bodies = await server(page, () => `I can’t stake for you; here is the staking review, filled in. You review it there and sign it in your own wallet.\n\n${block({kind: 'prefill-staking', action: 'delegate', network: 'practice', amount: '100'})}`);
  await seed(page, {time: MORNING});
  await relay(page);
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Stake 100 ZIG on the practice network');
  await expect.poll(() => bodies.length).toBe(1);
  const card = panel(page).locator('.ai-card').filter({hasText: 'Fill in the staking review'});
  await expect(card).toContainText('Stake 100 ZIG · practice network (no real value)');
  await expect(card).toContainText('nothing is signed or sent until you review it there and sign in your own wallet');
  await card.getByRole('button', {name: 'Open the review'}).click();
  await expect(page).toHaveURL(/\/app\/staking/);
  await expect(page.getByText('ZIGi filled this in. Check every field; nothing is signed until you review and sign.')).toBeVisible();
  expect(await stored(page, STAKING_PREFILL_KEY, 'session')).toBeNull(); // read once by the staking form, then gone
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  expect(calls).toEqual([]);
});
test('on Staking already, the card fills in the open form without a reload, read once; the wallet is never asked', async ({page}) => {
  const calls = await fakeKeplr(page);
  const bodies = await server(page, () => `Here is the staking review, filled in. You review it there and sign it in your own wallet.\n\n${block({kind: 'prefill-staking', action: 'delegate', network: 'practice', amount: '100'})}`);
  await seed(page, {time: MORNING});
  await relay(page);
  await page.goto('/app/staking');
  await expect(page.locator('#staking-actions-title')).toBeVisible();
  await page.evaluate(() => { (window as unknown as {afNoReload?: number}).afNoReload = 1; });
  await expect(page.getByText('ZIGi filled this in. Check every field; nothing is signed until you review and sign.')).toHaveCount(0);
  await openChat(page);
  await say(page, 'Stake 100 ZIG on the practice network');
  await expect.poll(() => bodies.length).toBe(1);
  const card = panel(page).locator('.ai-card').filter({hasText: 'Fill in the staking review'});
  await card.getByRole('button', {name: 'Open the review'}).click();
  await expect(page.getByText('ZIGi filled this in. Check every field; nothing is signed until you review and sign.')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as {afNoReload?: number}).afNoReload)).toBe(1); // the same page: no reload
  expect(await stored(page, STAKING_PREFILL_KEY, 'session')).toBeNull();
  expect(calls).toEqual([]);
});
