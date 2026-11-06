import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6, second pass): Berlin BN-114. The card said "Notifications are being switched on." with no word on
// the browser's own permission; it now says that too, as two separate facts. Desktop 1280, fresh profile.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

// P14-A (run 2): the mobile project is an iPhone (Safari's user agent). There a browser tab cannot get notifications until
// ZIGoals is on the Home Screen, so the card says that instead of a permission line (components/notify/notifications-card,
// lib/push/support "needs-install"). That path is asserted on the mobile project; the permission lines on the desktop one.
async function iphonePath(page: import('@playwright/test').Page) {
  const card = page.locator('#notifications');
  await expect(card).toContainText('saved to your Home Screen');
  await expect(card.locator('.notify-permission')).toHaveCount(0);
}
test('BN-114: the browser permission is shown beside the service state (not asked yet)', async ({page, isMobile}) => {
  await page.goto('/app/settings#notifications'); await hydrated(page);
  if (isMobile) return iphonePath(page);
  const card = page.locator('#notifications');
  await expect(card.locator('.notify-state')).not.toHaveText('Checking…');
  await expect(card.locator('.notify-permission')).toHaveText('This browser: not asked yet. It asks when you press Turn on notifications.');
});

test('BN-114: a blocked permission says where to allow it', async ({page, isMobile}) => {
  // P14-A (run 2): freshDevice already opened /app/settings, so going to "#notifications" was only a hash change: no new
  // document, so the init script that set the permission never ran and the card read "not asked yet". The browser's
  // own "denied" cannot be set per Playwright context (grantPermissions only grants; Chrome's Browser.setPermission
  // without a context id lands on the default context), so the page's view of it is set before its scripts run, and the
  // page is loaded as a new document.
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', {configurable: true, get: () => 'denied'});
    const query = navigator.permissions?.query?.bind(navigator.permissions);
    if (query) navigator.permissions.query = (d: PermissionDescriptor) => d.name === 'notifications' ? Promise.resolve({state: 'denied', name: 'notifications', onchange: null, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} as unknown as PermissionStatus) : query(d);
  });
  await page.goto('/app/settings#notifications'); await page.reload(); await hydrated(page);
  if (isMobile) return iphonePath(page);
  await expect(page.locator('#notifications .notify-permission')).toContainText('blocked for ZIGoals');
});
