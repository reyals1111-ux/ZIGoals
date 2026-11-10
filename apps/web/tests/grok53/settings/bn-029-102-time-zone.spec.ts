import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6): Settings → Your time zone, Berlin BN-029 (no visible message for "UTC+13", normalisation not
// seen) and BN-102 (the field's role flipped textbox ↔ combobox). Desktop 1280; fresh profile; device zone fixed.
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('BN-029/BN-102: an offset is explained right under the field; a lower-case name is saved as written in the list; empty follows the device', async ({page}) => {
  await page.goto('/app/settings#time-zone'); await hydrated(page);
  const section = page.getByRole('region', {name: 'Your time zone', exact: true});
  const field = section.getByRole('combobox', {name: 'Your time zone', exact: true});
  await expect(field).toBeVisible(); // a combobox before any focus (BN-102)
  await field.fill('UTC+13');
  await section.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const error = section.locator('.zone-field .field-error');
  await expect(error).toContainText('UTC+13 is a fixed offset');
  await expect(field).toBeFocused();
  await field.fill('europe/paris');
  await section.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(section).toContainText('Your days follow Europe/Paris.');
  await expect(error).toHaveCount(0);
  await field.fill('');
  await section.getByRole('button', {name: 'Save my time zone', exact: true}).click();
  await expect(section).toContainText('your days follow this device (Europe/Brussels)');
  await expect(section).toContainText('clock times shown elsewhere stay in this device’s own time');
});
