import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';

/**
 * Session AL Part 15, lane P15-A (chain): GAP-134 (C-BN-03) — the reward history chart on Earn. Built in Session AL's fourth
 * pass (components/zigchain-eco/staking-clarity.tsx RewardsChart); this proves it in the browser. Fresh profile, desktop,
 * every /api request answered 503 and every public node refused. A fictional linked address and three confirmed claims in
 * this device's staking journal (complete entries: UUID operation ids, hex hashes) stand in for claims signed through ZIGoals (a test double: nothing is signed here).
 */
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'UTC'});
const ZIG = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';

test('GAP-134: Earn draws the rewards claimed through ZIGoals by month; a claim without its amount counts beside its month, never as 0', async ({page}) => {
  await chooseChain(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(/publicnode\.com|mempool\.space/, route => route.abort('connectionrefused'));
  await page.clock.install({time: new Date('2026-11-08T10:00:00Z')});
  await page.addInitScript(({address}) => {
    try {
      localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
      localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'fictional-1', kind: 'cosmos', wallet: 'address-lookup', label: 'Fictional wallet', address, addedAt: '2026-09-01T08:00:00.000Z', via: 'typed'}]}));
      const entry = (id: string, action: string, amount: string, at: string) => ({operationId: id, chainId: 'zigchain-1', wallet: address, action, amount, state: 'CONFIRMED', at, updatedAt: at, validators: ['zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl'], hash: id.replace(/-/g, '').toUpperCase().padEnd(64, '0')});
      localStorage.setItem('zigoals:staking-journal:v1', JSON.stringify({version: 1, entries: [
        entry('11111111-1111-4111-8111-111111111111', 'sweep', '12500000000000000000', '2026-09-14T09:00:00.000Z'),
        entry('22222222-2222-4222-8222-222222222222', 'sweep', '4000000000000000000', '2026-11-03T09:00:00.000Z'),
        entry('33333333-3333-4333-8333-333333333333', 'claim', '0', '2026-11-05T09:00:00.000Z'),
      ]}));
    } catch { /* storage refused */ }
  }, {address: ZIG});
  await page.goto('/app/earn');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  const chart = page.locator('figure.zeco-chart');
  await chart.scrollIntoViewIfNeeded();
  await expect(chart.locator('figcaption')).toHaveText('Claimed through ZIGoals, by month (real network)');
  const bars = chart.locator('ol.zeco-bars > li');
  await expect(bars).toHaveCount(6);
  await expect(bars.nth(3)).toContainText('12.5 ZIG');
  await expect(bars.nth(5)).toContainText('4 ZIG · 1 in the transaction');
  await expect(bars.nth(4)).toContainText('0');
  await expect(chart).toContainText('counts beside its month instead of as 0');
});
