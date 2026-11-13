import {expect, test, type Page} from '@playwright/test';
import {earnRoutes, openEarnFolds, seedShowcase} from '../../earn-fixtures';
import {openFold} from '../../phone-nav';
import {chooseChain} from '../../chain-choice';

// Session AL fifth pass (lane L6): C-BN-07 (Earn had no side-by-side table of its options with their risk labels) and
// N-BN-05 (Earn at 375 px was 16,531 px: each option's fees, lockups and minimums, and its steps, now fold to one row on a
// phone). Showcase, chain chosen, the bots' widths, the app's own routes answered by the Earn fixtures.
async function openEarn(page: Page, width: number, height: number) {
  await page.setViewportSize({width, height});
  await chooseChain(page);
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
}
const IDS = ['native-staking', 'valdora', 'valdora-vaults', 'oroswap', 'nawa', 'defa', 'permapod', 'zignaly'];

test('C-BN-07: one table puts the ways to earn side by side, in the page’s order, with each section’s own labels and its sources', async ({page}) => {
  test.skip(test.info().project.name === 'mobile', 'The table at 1280; the phone has its own cards (next test).');
  await openEarn(page, 1280, 900);
  const table = page.getByRole('region', {name: 'The ways to earn side by side', exact: true}).getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText(['Way to earn', 'At a glance', 'Risks read from']);
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(IDS.length);
  expect(await rows.evaluateAll(rs => rs.map(r => r.getAttribute('data-compare')))).toEqual(IDS);
  for (const id of IDS) {
    // The labels are the section's own, word for word.
    const own = await page.locator(`#${id} .earn-option-head .earn-tags li`).allTextContents();
    await expect(table.locator(`tr[data-compare="${id}"] .earn-tags li`), id).toHaveText(own);
    await expect(table.locator(`tr[data-compare="${id}"] td`).nth(1), id).toContainText(/\S.+\. Every risk$/);
    await expect(table.locator(`tr[data-compare="${id}"] th a`), id).toHaveAttribute('href', `#${id}`);
  }
  // Information, never advice: no rate and no ranking words in the table.
  await expect(table).not.toContainText(/%|best|recommend/i);
  await table.locator('tr[data-compare="valdora"] th a').click();
  await expect(page).toHaveURL(/#valdora$/);
});

test('N-BN-05: at 375 px each option’s fees, lockups and minimums, and its steps, are one row each; the risks stay open; the page is shorter', async ({page}) => {
  await openEarn(page, 375, 812);
  const native = page.locator('#native-staking');
  await expect(native.locator('details.earn-more[data-earn-more="columns"] > summary')).toHaveText('Fees, lockups and minimums');
  await expect(native.locator('details.earn-more[data-earn-more="steps"] > summary')).toHaveText('What you’ll do there · 6 steps');
  // Session AO (N-BN-05, deliberate): native staking is itself a folded row on a phone now; opened, as a person would, its
  // risks are open and its columns and steps are one row each, as before.
  await openFold(page, 'Stake ZIG with a validator');
  await expect(native.locator('.earn-risks')).toBeVisible();
  await expect(native.locator('.earn-steps ol')).toBeHidden();
  // Zignaly's "How to withdraw" (a deadline) stays open.
  await expect(page.locator('#zignaly details.earn-more[data-earn-more="steps"]')).toHaveCount(0);
  // The comparison is one folded row on a phone; open, it is one card per way to earn, inside the page's width.
  const row = page.getByRole('button', {name: /^The ways to earn, compared/});
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(page.locator('#compare tbody tr').first()).toBeVisible();
  await expect(page.locator('#compare tbody tr')).toHaveCount(IDS.length);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  // Every section laid out (content-visibility off) so the height is the page's real one.
  const height = await page.evaluate(async () => {
    const style = document.createElement('style'); style.textContent = '.earn-sections > * { content-visibility: visible !important; }'; document.head.append(style);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.documentElement.scrollHeight;
  });
  test.info().annotations.push({type: 'height at 375', description: String(height)});
  // Measured with every section laid out (the replay's 16,531 px counted unpainted sections at a 1,100 px placeholder):
  // 35,725 px on 37d2370c, about 29,000 px here with the comparison row folded again.
  await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'false');
  const folded = await page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return document.documentElement.scrollHeight; });
  test.info().annotations.push({type: 'height at 375, comparison folded', description: String(folded)});
  expect(folded, 'at least a tenth shorter than 37d2370c (35,725 px)').toBeLessThan(32_150);
  // A person opens a row: the steps are there, every one.
  await native.locator('details.earn-more[data-earn-more="steps"] > summary').click();
  await expect(native.locator('.earn-steps li')).toHaveCount(6);
  await expect(native.locator('.earn-steps li').nth(1).getByRole('link', {name: 'the list on this page'})).toBeVisible();
  await openEarnFolds(page);
  await expect(page.locator('details.earn-more:not([open])')).toHaveCount(0);
});
