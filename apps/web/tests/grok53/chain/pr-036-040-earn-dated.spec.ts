import {expect, test} from '@playwright/test';
import {earnRoutes, seedShowcase} from '../../earn-fixtures';
import {chooseChain} from '../../chain-choice';

// Session AL (lane L6): Professor PR-036…PR-040 and Berlin BN-027/BN-161 on Earn and Ecosystem, read on 4 Nov 2026
// (fixed clock), in the Showcase as Professor was; desktop 1280. Every answer is the recorded fixture.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await chooseChain(page); await seedShowcase(page); await page.clock.setFixedTime(new Date('2026-11-04T02:30:00Z')); });

test('PR-036/BN-161: on 4 Nov the 1 Nov Private Credit deadline is past, never a step to take', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  const zignaly = page.locator('#zignaly');
  await expect(page.locator('[data-notice="zignaly"] [data-date="2026-11-01"]')).toContainText('(passed)');
  await expect(zignaly).not.toContainText('request its withdrawal by 1 November 2026');
  await expect(zignaly).toContainText('has passed');
  await expect(page.locator('[data-notice="nawa"]')).toContainText('was 1 November 2026 (passed)');
});

test('PR-038/BN-161: a notice\'s read date is labelled as a dated notice, not a live figure; Circle\'s 31 Oct reads as past', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  const vaults = page.locator('[data-notice="valdora-vaults"]');
  await expect(vaults).toContainText('(Circle, read Oct 18, 2026)');
  await expect(vaults).toContainText('a dated notice, its dates worded from today; not a live figure');
  await expect(vaults).toContainText('fell to zero on 31 October 2026');
});

test('PR-037: Valdora\'s value locked says it is not stZIG × rate, with ZIGoals\' own figure beside it', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('#valdora')).toContainText('need not match stZIG in circulation × the rate');
});

test('PR-040: with the validator list unavailable, the commission line uses the measured validator\'s own rate', async ({page}) => {
  await earnRoutes(page, {unavailable: {validators: 'UPSTREAM_DOWN'}});
  await page.goto('/app/earn');
  const commission = page.locator('[data-live-figure="native-commission"]');
  await expect(commission).toContainText('the validator measured above');
  await expect(commission).toHaveAttribute('data-state', 'ok');
});

test('PR-039: every external link on Earn has a name a screen reader can say', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('#zignaly')).toBeVisible();
  const names = await page.locator('.earn-page a[target="_blank"]').evaluateAll(els => els.map(a => (a.getAttribute('aria-label') ?? a.textContent ?? '').replace('↗', '').trim()));
  expect(names.length).toBeGreaterThan(0);
  expect(names.filter(n => !n)).toEqual([]);
});

test('BN-027: the Ecosystem header gives the newest source read, and Zignaly\'s card says its 1 Nov date passed', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/ecosystem');
  // Session AO (CI 1688, strict mode: two .ecosystem-review): React keeps a streamed part in a hidden holder until it swaps
  // it in, so the header is read once no holder is left (as a11y-wcag-x does); the same assertions follow.
  await expect(page.locator('div[hidden][id^="S:"]')).toHaveCount(0);
  const review = page.locator('.ecosystem-review');
  await expect(review).toHaveCount(1);
  await expect(review).toContainText('Sources last read');
  await expect(review).not.toContainText('Sep 23');
  await expect(page.locator('.ecosystem-not-live')).not.toContainText('being voted on until 2 November');
});
