import {expect, test} from '@playwright/test';

// Session I, Part 7: Staking keeps its native watch-only tracker and names Valdora liquid staking as not tracked yet.
test('Valdora liquid staking is named, honestly not tracked, and leads to its research record', async ({page}) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/staking');
  await expect(page.getByRole('heading', {level: 1, name: 'Staking'})).toBeVisible();
  // The native tracker is unchanged.
  await expect(page.getByText('Track Wallet', {exact: true})).toBeVisible();
  const card = page.getByRole('region', {name: 'Valdora liquid staking (stZIG)'});
  await expect(card).toBeVisible();
  await expect(card.getByText('Not tracked yet', {exact: true})).toBeVisible();
  await expect(card).toContainText('ZIGoals does not track stZIG yet.');
  await expect(card).toContainText('More ways to stake may appear here once they can be verified.');
  // No balance, rate, estimate or promise, and nothing about other networks' products.
  const text = await card.innerText();
  expect(text).not.toMatch(/\d|%|\bAPR\b|\bAPY\b|\bearn|\breward|\byield|Noble/i);
  // Nothing is read for it: no request names Valdora.
  expect(requests.filter(url => /valdora/i.test(url))).toEqual([]);
  const link = card.getByRole('link', {name: 'Research Valdora in Ecosystem →'});
  await expect(link).toHaveAttribute('href', '/app/ecosystem#project-valdora');
  await link.click();
  await expect(page).toHaveURL(/\/app\/ecosystem#project-valdora$/);
  await expect(page.locator('#project-valdora .ecosystem-toggle')).toHaveAttribute('aria-expanded', 'true');
});
