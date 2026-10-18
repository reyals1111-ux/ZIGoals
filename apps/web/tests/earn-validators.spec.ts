import {expect, test} from '@playwright/test';
import {earnRoutes, seedShowcase, validatorsFixture} from './earn-fixtures';

/**
 * Session AF (L1): the Earn hub's validators, from GET /api/chain/validators (lane L2a's wire shape; here the recorded
 * mainnet read). Filters and sorts work on facts only; the guidance's share for the "Foundation" validators is computed
 * from the same answer; a validator's website is text, never a link.
 */
const all = validatorsFixture.answer.validators;
const bonded = all.filter(v => v.status === 'bonded');
const foundation = bonded.filter(v => /foundation/i.test(v.moniker)).reduce((n, v) => n + Number(v.votingPowerShare), 0);
const fmt = (n: number, d: number) => new Intl.NumberFormat('en-US', {maximumFractionDigits: d}).format(n);

test.beforeEach(async ({page}) => { await seedShowcase(page); await earnRoutes(page); await page.goto('/app/earn#validators'); });

test('the list, its guidance and its filters and sorts, from facts only', async ({page}) => {
  const section = page.locator('#validators');
  const rows = section.locator('tbody tr');
  await expect(section.getByText(`${bonded.filter(v => !v.jailed).length} of ${all.length} validators shown`)).toBeVisible();
  await expect(rows).toHaveCount(bonded.filter(v => !v.jailed).length);
  await expect(section).toContainText(`Validators named “Foundation” hold ${fmt(foundation * 100, 1)} % of all stake right now.`);
  // Largest first by default; the first row is the validator with the most voting power.
  const largest = [...bonded].sort((a, b) => Number(b.votingPowerShare) - Number(a.votingPowerShare))[0]!;
  await expect(rows.first().locator('th .earn-moniker')).toHaveText(largest.moniker);
  // Every validator, active or not.
  await section.getByLabel('Active only').uncheck();
  await expect(rows).toHaveCount(all.filter(v => !v.jailed).length);
  await section.getByLabel('Active only').check();
  // Commission at most the lowest rate charged now.
  const lowest = Math.min(...bonded.map(v => Number(v.commission.rate)));
  await section.getByLabel('Commission at most').selectOption(String(lowest));
  await expect(rows).toHaveCount(bonded.filter(v => !v.jailed && Number(v.commission.rate) <= lowest).length);
  for (const cell of await rows.locator('td[data-label="Commission"]').all()) await expect(cell).toContainText(`${fmt(lowest * 100, 2)} %`);
  await section.getByLabel('Commission at most').selectOption('');
  // Sort by commission, lowest first.
  await section.getByLabel('Sort by').selectOption('commission');
  const shown = await rows.locator('td[data-label="Commission"]').allTextContents();
  const rates = shown.map(t => Number(t.split('%')[0]!.trim()));
  expect(rates).toEqual([...rates].sort((a, b) => a - b));
  // A website is the validator's own words: text, never a link.
  await expect(section.locator('tbody a')).toHaveCount(0);
  await expect(section.locator('.earn-website').first()).toBeVisible();
  // The one way out is ZIGScan's list, a verified link.
  await expect(section.getByRole('link', {name: /See every validator on ZIGScan/})).toHaveAttribute('href', 'https://zigscan.org/validators');
  await expect(section).toContainText(/updated just now|updated \d+ min ago/);
});

test('an unavailable validator list says so with the reason; the native rate falls back to before commission', async ({page}) => {
  await page.unrouteAll({behavior: 'ignoreErrors'});
  await earnRoutes(page, {unavailable: {validators: 'TIMEOUT'}});
  await page.goto('/app/earn#validators');
  await expect(page.locator('#validators [data-live-figure="validators"]')).toHaveAttribute('data-reason', 'TIMEOUT');
  await expect(page.locator('#validators')).toContainText('unavailable (the source took too long to answer)');
  await expect(page.locator('[data-live-figure="native-commission"]')).toHaveAttribute('data-state', 'unavailable');
});
