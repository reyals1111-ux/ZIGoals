import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../../ah-helpers';

// Session AL Part 14 (lane P14-A): earlier row ST3 (AH; B-065, T-129, N-198): "the Staking calculator is dead in the
// Showcase". The Showcase holds no tracked ZIGChain wallet, so Staking offers the reward scenario (AH ST3,
// components/platform/staking-try-scenario.tsx): an amount and a rate the person types, nothing saved. Desktop 1280, the
// Showcase (the bots' condition), every API offline (the chain's rate unavailable: the person writes one).
test.use({viewport: {width: 1280, height: 900}});

test('ST3 (B-065/T-129): in the Showcase the staking scenario takes an amount and a rate and shows the rewards', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/staking'); await hydrated(page);
  await page.locator('.positions-scenario > summary').click();
  const scenario = page.locator('.staking-try');
  await expect(scenario).toBeVisible();
  await scenario.getByLabel('Amount to stake (ZIG)').fill('2000');
  await scenario.getByLabel(/Yearly rate %/).fill('10');
  // 2000 ZIG at 10 % a year: 200 ZIG over 365 days (an illustration, labelled so).
  await expect(scenario.locator('.summary-strip > div').nth(2)).toContainText('365-day rewards, illustration');
  await expect(scenario.locator('.summary-strip > div').nth(2)).toContainText('200 ZIG');
  await expect(page.getByLabel('Net APR assumption %')).toHaveCount(0);
});
