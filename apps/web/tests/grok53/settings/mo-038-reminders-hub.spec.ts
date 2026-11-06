import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL third pass (lane L6 for L2, P-MO-80): Moscow MO-038 / MO-103 / M-061. Settings → Reminders ended on an
// engineer's sentence ("The water reminder's id in the existing device key is “water”"); Sleep's wind-down (22:00) and
// the meditation time were not in the hub; nothing said that a 22:00 time sits inside the 22:00–08:00 quiet hours.
// Fresh profile with a wind-down time set as Sleep sets it, desktop 1280. Fails on main, passes on the branch.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(() => localStorage.setItem('zigoals:w-reminders:v1', JSON.stringify({version: 1, windDown: {time: '22:00'}, chained: {}, contributions: {}, dismissed: {}})));
});

test('MO-038/MO-103: one list, plain words, and a time inside the quiet hours says it waits', async ({page}) => {
  await page.goto('/app/settings/reminders'); await hydrated(page);
  await expect(page.locator('main')).not.toContainText('existing device key');
  await expect(page.getByText('it is the same reminder. These times stay on this device; they are not synced or backed up.', {exact: false})).toBeVisible();
  const own = page.getByRole('region', {name: 'Sleep and meditation'});
  const wind = own.getByRole('listitem').filter({hasText: 'Wind-down (Sleep)'});
  await expect(wind).toContainText('At 10:00 PM on this device.');
  await expect(wind).toContainText('Inside your quiet hours: it waits until 8:00 AM.');
  await expect(wind.getByRole('link', {name: 'Change in Health → Sleep'})).toHaveAttribute('href', '/app/health?view=sleep');
  await expect(own.getByRole('listitem').filter({hasText: 'Meditation'})).toContainText('Off.');
  // A water time outside the quiet hours says nothing extra; inside them, it says it waits.
  const water = page.getByLabel('Water reminder time');
  await water.fill('15:00');
  const row = page.getByRole('listitem').filter({has: water});
  await expect(row).not.toContainText('Inside your quiet hours');
  await water.fill('23:00');
  await expect(row).toContainText('Inside your quiet hours: it waits until 8:00 AM.');
});
