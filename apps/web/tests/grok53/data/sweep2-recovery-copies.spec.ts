import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

/**
 * Session AL sweep 2 (INT third pass: "Data catalog: recovery copies", request for the view). Settings → Your data lists
 * the copies a restore keeps (`<key>:recovery:<uuid>`) under "Kept on this device", each named after its record and with
 * its size; without any it says "None on this device". Fresh profile, fictional records, every /api request answers 503.
 */
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await offlineApi(page); });
const UUID = '0f6b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d';

test('no copies: the section says so, never a bare empty list', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/settings/data'); await hydrated(page);
  const device = page.getByRole('region', {name: 'Kept on this device'});
  await expect(device.getByRole('heading', {name: 'Recovery copies'})).toBeVisible();
  await expect(device).toContainText('None on this device.');
  await expect(device).toContainText('never exported or synced, and Erase removes them');
});

test('a Tasks and a Checklist recovery copy are listed by name, with a size', async ({page}) => {
  await freshDevice(page);
  await page.evaluate(id => {
    localStorage.setItem(`zigoals:tasks:v1:recovery:${id}`, JSON.stringify({version: 1, fictional: 'replaced tasks'}));
    localStorage.setItem(`zigoals:checklist-days:v1:recovery:${id}`, JSON.stringify({version: 1, days: {}}));
    localStorage.setItem('zigoals:tasks:v1:recovery:not-a-uuid', 'x'); // not a copy this app made: left out
  }, UUID);
  await page.goto('/app/settings/data'); await hydrated(page);
  const list = page.getByRole('list', {name: 'Recovery copies'});
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list).toContainText('Recovery copy: Tasks');
  await expect(list).toContainText('Recovery copy: Checklist day history');
  for (const item of await list.getByRole('listitem').all()) await expect(item.locator('.dh-size')).toHaveText(/^\d[\d,.]* (B|kB)$/);
  await expect(page.getByRole('region', {name: 'Kept on this device'})).not.toContainText('None on this device.');
});
