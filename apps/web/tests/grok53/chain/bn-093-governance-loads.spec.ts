import {expect, test} from '@playwright/test';
import {governanceRelay, openGovernance, proposalsWire} from '../../governance-chain';
import {chooseChain} from '../../chain-choice';

// Session AL (lane L6, Part 2): Berlin BN-093 / BN-073 — Governance said "Proposals are unavailable" with no list and
// no retry of its own. Governance stays hidden by default (protected); opened, it must load or say why, keep the last
// good list, and try again by itself once. Berlin's desktop width; the relay is the test double (no chain host).
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await chooseChain(page); });
const DOWN = (network: string) => ({version: 1, status: 'unavailable', reason: 'The chain did not answer just now, so proposals are unavailable. Try again in a minute.', network, source: 'https://testnet-api.zigchain.com', proposals: []});

test('BN-093: a failed first read says why, then tries once more by itself and shows the list', async ({page}) => {
  await page.clock.install();
  let down = true;
  await governanceRelay(page, 'practice', {proposals: network => down ? DOWN(network) : proposalsWire('practice')});
  const view = await openGovernance(page);
  await expect(view).toContainText('Proposals are unavailable: The chain did not answer just now');
  await expect(view).toContainText('ZIGoals tries once more by itself in a moment.');
  await expect(view.getByRole('button', {name: 'Read again'})).toBeVisible();
  down = false;
  await page.clock.fastForward(21_000);
  await expect(view.locator('article.governance-proposal').first()).toBeVisible();
  await expect(view).not.toContainText('Proposals are unavailable');
});

test('BN-073: a later failed read keeps the last good list, with the reason beside it', async ({page}) => {
  let down = false;
  await governanceRelay(page, 'practice', {proposals: network => down ? DOWN(network) : proposalsWire('practice')});
  const view = await openGovernance(page);
  const cards = view.locator('article.governance-proposal');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  down = true;
  await view.getByRole('button', {name: 'Read again'}).click();
  await expect(view).toContainText('The newest read did not work: The chain did not answer just now');
  await expect(view).toContainText('The list below is the one read earlier, at block 8290599.');
  await expect(cards).toHaveCount(count);
});
