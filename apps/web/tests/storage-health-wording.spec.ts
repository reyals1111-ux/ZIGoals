import {expect, test} from '@playwright/test';

// Browser storage health (owner follow-up to Session L): a backup is an optional extra; with an account, encrypted sync
// is the main protection. No message asks for a separate backup any more.
test('storage health presents a backup as optional and asks for none', async ({page}) => {
  // A browser without the Storage API shows the "cannot report" status.
  await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'storage', {configurable: true, get: () => undefined}); });
  await page.goto('/app/settings');
  const panel = page.locator('#private-vault');
  await panel.getByText('Browser storage health', {exact: true}).click();
  await expect(panel.getByText('Persistence is not cloud sync: with an account, encrypted sync is the main protection, and a backup is an optional extra.')).toBeVisible();
  await panel.getByRole('button', {name: 'Check storage', exact: true}).click();
  await expect(panel.getByText('This browser cannot report storage capacity.', {exact: true})).toBeVisible();
  await expect(panel).not.toContainText('separate backup');
});
