import {expect, test} from '@playwright/test';
import {freshHealth, openHealth, storedHealth} from './al-health-helpers';
import {createEmptyHealth, saveWeight} from '../../../lib/health';

// Session AL lane L2 (P-MO-43): Moscow MO-017 (a 95 kg typo, +13 kg in a day, saved silently and bent the trend). An
// unlikely jump now asks once under the field; Save again keeps it as typed. Desktop, fresh profile with one reading.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('MO-017: +13 kg in a day asks once; the second Save keeps it', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page, saveWeight(createEmptyHealth(), {id: 'health_00000000-0000-4000-8000-000000000017', date: '2026-11-03', grams: 82_000}, '2026-11-03T08:00:00.000Z'));
  await openHealth(page, '?view=weight');
  const form = page.getByRole('form', {name: 'Weight entry'}), field = form.getByLabel('Weight (kg)');
  await field.fill('95');
  await form.getByRole('button', {name: 'Save weight'}).click();
  await expect(page.locator('#health-weight-check')).toHaveText('That is +13 kg from your reading a day away. If it is right, press Save weight again to keep it.');
  await expect(field).toBeFocused();
  expect((await storedHealth(page))!.weights).toHaveLength(1);
  await form.getByRole('button', {name: 'Save weight'}).click();
  await expect.poll(async () => (await storedHealth(page))!.weights.length).toBe(2);
});
