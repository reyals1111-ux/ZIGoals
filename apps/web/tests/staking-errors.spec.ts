import {expect, test, type Page} from '@playwright/test';
import {ME, fakeChain, fakeKeplr, openStaking, relay, type ChainScript} from './staking-chain';

/**
 * Session AF (L2 design §3; `TIER 3 (wallet/signing)`): the five ways a signed staking action stops, each in plain words
 * with the verified explorer link whenever a hash exists, nothing retried and never a second broadcast: rejected in the
 * wallet, insufficient fees and a sequence mismatch (refused by the node's own check), out of gas (included, failed),
 * and a confirmation that takes longer than a minute. Doubles only (tests/staking-chain.ts).
 */
async function delegateAndSign(page: Page, script: ChainScript, before?: () => Promise<void>) {
  const calls = await fakeKeplr(page), chain = await fakeChain(page, 'practice', script);
  await relay(page, 'practice');
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('25');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true})).toBeEnabled();
  await before?.();
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  return {calls, chain, panel};
}
const journalState = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:staking-journal:v1') ?? 'null') as {entries: {state: string; code?: number}[]}).entries.map(e => [e.state, e.code ?? null]));

test('rejected in the wallet: stopped, nothing sent, no transaction to check', async ({page}) => {
  const {chain} = await delegateAndSign(page, {}, () => page.evaluate(() => { (Reflect.get(window, '__stakingKeplr') as {reject: boolean}).reject = true; }));
  const progress = page.getByRole('region', {name: 'Stopped in your wallet.'});
  await expect(progress).toBeVisible({timeout: 20_000});
  await expect(progress.getByRole('alert')).toHaveText('You stopped this in your wallet. Nothing was sent.');
  await expect(progress.getByRole('link')).toHaveCount(0);
  expect(chain.broadcasts).toEqual([]);
  expect(await journalState(page)).toEqual([['REJECTED', null]]);
});
test('insufficient fees (refused by the node, code 13): nothing moved, review again; the explorer link for the hash', async ({page}) => {
  const {chain} = await delegateAndSign(page, {broadcast: () => ({code: 13, log: 'insufficient fees; got: 1azig required: 610030000000000azig'})});
  const progress = page.getByRole('region', {name: 'This did not go through.'});
  await expect(progress).toBeVisible({timeout: 20_000});
  await expect(progress.getByRole('alert')).toHaveText('The network fee was too low for the chain right now. Nothing moved. Review again: the fee is estimated fresh each time.');
  await expect(progress.getByRole('link', {name: 'Check it on ZIGScan ↗'})).toHaveAttribute('href', `https://testnet.zigscan.org/tx/${chain.broadcasts[0]!.hash}`);
  await expect(progress).not.toContainText('It may still be confirmed');
  expect(chain.broadcasts).toHaveLength(1);
  expect(await journalState(page)).toEqual([['FAILED', 13]]);
});
test('sequence mismatch (code 32): wait for the other transaction, then review again', async ({page}) => {
  const {chain} = await delegateAndSign(page, {broadcast: () => ({code: 32, log: 'account sequence mismatch, expected 4, got 3: incorrect account sequence'})});
  const progress = page.getByRole('region', {name: 'This did not go through.'});
  await expect(progress.getByRole('alert')).toHaveText('Your wallet sent another transaction a moment ago. Wait for it to confirm, then review again.', {timeout: 20_000});
  await expect(progress.getByRole('link', {name: 'Check it on ZIGScan ↗'})).toBeVisible();
  expect(chain.broadcasts).toHaveLength(1);
  expect(await journalState(page)).toEqual([['FAILED', 32]]);
});
test('out of gas (included with code 11): nothing moved but the fee was charged', async ({page}) => {
  const {chain} = await delegateAndSign(page, {receipt: () => ({code: 11, log: 'out of gas in location: WriteFlat; gasWanted: 244012, gasUsed: 250001: out of gas'})});
  const progress = page.getByRole('region', {name: 'This did not go through.'});
  await expect(progress.getByRole('alert')).toHaveText('This needed more gas than estimated. Nothing moved, but the network fee was charged. Review again (ZIGoals adds 30 % on top of the simulation).', {timeout: 20_000});
  await expect(progress.getByRole('link', {name: 'Check it on ZIGScan ↗'})).toHaveAttribute('href', `https://testnet.zigscan.org/tx/${chain.broadcasts[0]!.hash}`);
  expect(chain.broadcasts).toHaveLength(1);
  expect(await journalState(page)).toEqual([['FAILED', 11]]);
});
test('no receipt within a minute: still confirming, check the explorer; never sent again', async ({page}) => {
  await page.clock.install();
  const {chain} = await delegateAndSign(page, {receipt: () => 'never'});
  await expect(page.getByRole('heading', {name: 'Sent. Waiting for the network to confirm it…'})).toBeVisible({timeout: 20_000});
  await page.clock.fastForward('01:05');
  const progress = page.getByRole('region', {name: 'This did not go through.'});
  await expect(progress.getByRole('alert')).toHaveText('Still confirming. Check the transaction on the explorer before trying again.', {timeout: 20_000});
  await expect(progress).toContainText('It may still be confirmed. Check the transaction below before trying again; ZIGoals never sends it twice.');
  await expect(progress.getByRole('link', {name: 'Check it on ZIGScan ↗'})).toHaveAttribute('href', `https://testnet.zigscan.org/tx/${chain.broadcasts[0]!.hash}`);
  expect(chain.broadcasts).toHaveLength(1);
  expect(chain.methods.filter(m => m === 'broadcast_tx_sync')).toHaveLength(1);
  expect((await journalState(page))[0]![0]).toBe('UNKNOWN_AFTER_BROADCAST');
});
