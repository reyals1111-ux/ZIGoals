import {expect, test} from '@playwright/test';
import {ME, SIGNER_CALLS, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF (ADR-028 H46; L2 design §4): the network in big plain words; practice drawn apart (dashed amber ring) from
 * real (solid gold); the first switch to the real network asks once, explicitly, and the answer stays on this device.
 * On the real network the staking page talks to rpc.zigchain.com only (answered by a double here) and ZIGoals' relay.
 */
test('practice by default; the first switch to REAL asks once; Not now keeps practice; the answer survives a reload', async ({page}) => {
  const calls = await fakeKeplr(page);
  await relay(page, 'real');
  const panel = await openStaking(page);
  const practice = panel.getByRole('button', {name: /Practice network \(no real value\)/}), real = panel.getByRole('button', {name: /Real network \(real ZIG\)/});
  await expect(practice).toHaveAttribute('aria-pressed', 'true');
  await expect(real).toHaveAttribute('aria-pressed', 'false');
  // Practice and real look different: a dashed ring for practice, a solid one for real.
  expect(await panel.evaluate(el => getComputedStyle(el).borderTopStyle)).toBe('dashed');
  await real.click();
  let dialog = page.getByRole('dialog', {name: 'This is real money'});
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Actions here move your own ZIG on ZIGChain mainnet. ZIGoals never holds keys and cannot undo a signed transaction.');
  await expect(dialog.getByRole('button', {name: 'Continue on the real network'})).toBeDisabled();
  await dialog.getByRole('button', {name: 'Not now', exact: true}).click();
  await expect(dialog).toBeHidden();
  await expect(practice).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:staking-prefs:v1'))).toBeNull();
  // Escape is Not now too.
  await real.click(); await expect(dialog).toBeVisible(); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  await expect(practice).toHaveAttribute('aria-pressed', 'true');
  // Confirmed: the real network, its words, its look; kept on this device.
  await real.click();
  await dialog.getByLabel('I understand').check();
  await dialog.getByRole('button', {name: 'Continue on the real network'}).click();
  await expect(dialog).toBeHidden();
  await expect(real).toHaveAttribute('aria-pressed', 'true');
  await expect(panel).toContainText('Real network (real ZIG) · ZIGChain mainnet (zigchain-1)');
  expect(await panel.evaluate(el => getComputedStyle(el).borderTopStyle)).toBe('solid');
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-prefs:v1') ?? 'null') as {network?: string; realConfirmedAt?: string});
  expect(prefs.network).toBe('real');
  expect(Date.parse(prefs.realConfirmedAt!)).toBeGreaterThan(Date.now() - 60_000);
  await page.reload();
  const again = page.getByRole('region', {name: 'Stake, unstake and claim'});
  await expect(again.getByRole('button', {name: /Real network \(real ZIG\)/})).toHaveAttribute('aria-pressed', 'true');
  // Back to practice and real again: no second question.
  await again.getByRole('button', {name: /Practice network/}).click();
  await again.getByRole('button', {name: /Real network/}).click();
  dialog = page.getByRole('dialog', {name: 'This is real money'});
  await expect(dialog).toHaveCount(0);
  await expect(again.getByRole('button', {name: 'Connect Keplr for REAL', exact: true})).toBeVisible();
  expect(calls).toEqual([]);
});

test('on the real network: connect and review talk to rpc.zigchain.com; every amount carries the REAL line', async ({page}) => {
  const calls = await fakeKeplr(page), chain = await fakeChain(page, 'real');
  await relay(page, 'real');
  const hosts = new Set<string>();
  page.on('request', request => { const url = new URL(request.url()); if (url.hostname.endsWith('zigchain.com')) hosts.add(url.origin); });
  await page.addInitScript(() => localStorage.setItem('zigoals:staking-prefs:v1', JSON.stringify({version: 1, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z'})));
  const panel = await openStaking(page);
  await expect(panel.getByRole('button', {name: /Real network \(real ZIG\)/})).toHaveAttribute('aria-pressed', 'true');
  await panel.getByRole('button', {name: 'Connect Keplr for REAL', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  expect(calls).toEqual(['keplr.enable', 'keplr.getKey']);
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('2');
  await expect(panel.locator('#staking-amount-network')).toHaveText('REAL · zigchain-1 · real ZIG');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('REAL · ZIGChain mainnet (zigchain-1) · real ZIG');
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('REAL · zigchain-1 · real ZIG');
  await expect(sheet).toContainText('recorded on ZIGChain mainnet for anyone to see, forever.');
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  await sheet.getByRole('button', {name: 'Back', exact: true}).click();
  // The browser reached only the mainnet RPC (never the mainnet REST host, which stays server-only).
  expect([...hosts]).toEqual(['https://rpc.zigchain.com']);
  expect(chain.methods).toContain('abci_query /cosmos.tx.v1beta1.Service/Simulate');
  expect(chain.broadcasts).toEqual([]);
});
