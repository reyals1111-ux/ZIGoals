import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../ah-helpers';

/**
 * Session AP (friends Alpha, ADR-040): Send feedback's optional device details now name the build, the theme and the
 * screen, are shown in full first, and can be copied; still no account, device or wallet id and no record. Nothing is sent.
 */
test('Help → Send feedback: the previewed details name the build, theme and screen, and can be copied', async ({page, context, browserName}) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are a Chromium grant here');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await offlineApi(page); await freshDevice(page);
  const requests: string[] = [];
  page.on('request', r => { if (r.method() !== 'GET') requests.push(r.url()); });
  await page.goto('/app/help#feedback'); await hydrated(page);
  const block = page.locator('.send-feedback');
  await block.getByLabel('Add details about this device to the email').check();
  const details = block.getByLabel('Device details: edit or delete anything before you send');
  await expect(details).toHaveValue(/^Browser: .+\nSystem: .+\nWindow: .+\nMotion: .+\nInstalled app: .+\nTime zone: .+\nApp: .+\nTheme: Nebula\nScreen: \d+ × \d+ px$/);
  await block.getByRole('button', {name: 'Copy these details'}).click();
  await expect(block.getByRole('status').filter({hasText: 'Copied.'})).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await details.inputValue());
  // The mail link carries what the box shows; nothing was sent by the page.
  expect(decodeURIComponent((await block.getByRole('link', {name: /^Email feedback to/}).getAttribute('href'))!)).toContain('Theme: Nebula');
  expect(requests).toEqual([]);
});
