import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6): Help matching the app (Berlin BN-024, BN-025, BN-109, BN-163, BN-165, BN-166). Desktop 1280,
// a fresh profile on an installation without accounts (the API answers 503, as Berlin's build did).
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('BN-025: the topic index has Earn, Staking, Ecosystem and Chess, and the section answers each', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const topic = page.getByRole('navigation', {name: 'Help topics'}).getByRole('link', {name: 'Earn, Staking, Ecosystem and Chess', exact: true});
  await expect(topic).toHaveAttribute('href', '#more-pages');
  const section = page.getByRole('region', {name: 'Earn, Staking, Governance, Ecosystem and Chess'});
  for (const q of ['Where are Earn, Staking, Governance and Ecosystem?', 'Can I rename or remove a wallet I track?', 'What is the Ecosystem page?', 'What does the Chess page do?']) await expect(section.getByText(q, {exact: true})).toBeVisible();
});

test('BN-109/BN-163: one accented letter does not match every answer; a long search says it was cut', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const box = page.getByRole('searchbox', {name: 'Search Help'}), line = page.locator('.help-search [role="status"]');
  await box.fill('ö');
  await expect(line).toHaveText('Type at least two letters to search.');
  await expect(page.locator('.help-page details[id^="help-"][hidden]')).toHaveCount(0);
  await box.fill('x'.repeat(300));
  await expect(box).toHaveValue('x'.repeat(80));
  await expect(line).toContainText('Help search reads the first 80 characters');
  await box.fill('staking');
  await expect(line).toContainText(/answers? match/);
});

test('BN-024/BN-165/BN-166: account controls are named as account-only; release notes do not claim everything works today', async ({page}) => {
  await page.goto('/app/help'); await hydrated(page);
  const data = page.getByRole('region', {name: 'Where your data lives'});
  await expect(data).toContainText('Only where accounts are switched on.');
  await expect(data).toContainText('do not show');
  await expect(page.locator('.help-page')).not.toContainText('Everything here works today');
});
