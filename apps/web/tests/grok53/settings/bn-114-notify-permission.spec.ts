import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6, second pass): Berlin BN-114. The card said "Notifications are being switched on." with no word on
// the browser's own permission; it now says that too, as two separate facts. Desktop 1280, fresh profile.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('BN-114: the browser permission is shown beside the service state (not asked yet)', async ({page}) => {
  await page.goto('/app/settings#notifications'); await hydrated(page);
  const card = page.locator('#notifications');
  await expect(card.locator('.notify-state')).not.toHaveText('Checking…');
  await expect(card.locator('.notify-permission')).toHaveText('This browser: not asked yet. It asks when you press Turn on notifications.');
});

test('BN-114: a blocked permission says where to allow it', async ({page, context}) => {
  await context.addInitScript(() => { Object.defineProperty(Notification, 'permission', {get: () => 'denied'}); });
  await page.goto('/app/settings#notifications'); await hydrated(page);
  await expect(page.locator('#notifications .notify-permission')).toContainText('blocked for ZIGoals');
});
