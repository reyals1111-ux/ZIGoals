import {expect, test} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF (L1, ADR-028 H17): the Earn calculator link. From the Earn page, the compound interest calculator opens with
 * the live native staking rate as its yearly return, under an "illustration, not a promise" banner; the first field the
 * person touches clears the banner; nothing is remembered on this device until they touch a field; an address with a
 * rate the calculator would not accept is ignored.
 */
const rateBox = (page: import('@playwright/test').Page) => page.getByRole('textbox', {name: 'Yearly return', exact: true});
const remembered = (page: import('@playwright/test').Page) => page.evaluate(() => { const raw = localStorage.getItem('zigoals:calculator:v1'); return raw ? (JSON.parse(raw) as {last?: {ratePercent?: number}}).last?.ratePercent ?? null : null; });

test.beforeEach(async ({page}) => { await seedShowcase(page); await earnRoutes(page); });

test('the Earn page opens the calculator at the live rate, labelled an illustration, until a field is touched', async ({page}) => {
  await page.goto('/app/earn#calculator');
  const link = page.locator('#calculator').getByRole('link', {name: /^Open the calculator at \d+\.\d{2}\s%$/});
  const rate = await link.getAttribute('data-rate');
  expect(rate).toMatch(/^\d+\.\d{2}$/);
  expect(await link.getAttribute('href')).toBe(`/app/wealth/calculator?from=earn&rate=${rate}&label=illustration`);
  const before = await remembered(page);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/app/wealth/calculator\\?from=earn&rate=${rate!.replace('.', '\\.')}&label=illustration$`));
  await expect(rateBox(page)).toHaveValue(String(Number(rate)));
  const banner = page.getByRole('status').filter({hasText: 'Illustration, not a promise.'});
  await expect(banner).toContainText(`${Number(rate)} %`);
  await expect(banner).toContainText('nothing here is guaranteed');
  await page.waitForTimeout(1000);
  expect(await remembered(page)).toBe(before);
  await page.getByLabel('Starting amount').fill('2500');
  await expect(banner).toHaveCount(0);
  await expect(rateBox(page)).toHaveValue(String(Number(rate)));
});

test.describe('an address the calculator would not accept is ignored', () => {
  for (const query of ['?from=earn&rate=250&label=illustration', '?from=earn&rate=-3&label=illustration', '?from=earn&rate=5e1&label=illustration', '?from=other&rate=5.06&label=illustration', '?from=earn&rate=5.06', '?from=earn&rate=5.06&rate=7&label=illustration', '?from=earn&rate=<b>5</b>&label=illustration']) {
    test(query, async ({page}) => {
      await page.goto('/app/wealth/calculator');
      await expect(rateBox(page)).toBeVisible();
      await page.waitForTimeout(300);
      const own = await rateBox(page).inputValue();
      await page.goto(`/app/wealth/calculator${query}`);
      await expect(page.locator('main h1').first()).toHaveText('Compound interest calculator');
      await expect(rateBox(page)).toBeVisible();
      await expect(page.getByText('Illustration, not a promise.')).toHaveCount(0);
      await expect(rateBox(page)).toHaveValue(own);
    });
  }
});
