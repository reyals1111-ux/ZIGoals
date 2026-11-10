import {expect, test} from '@playwright/test';
import {freshHealth, openHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-31): Moscow MO-153. On a past journal day the meal's ⋯ menu was named "Options for Breakfast
// today". Its name now follows the day shown; the Today widget it adds still shows today. Desktop, fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('MO-153: a past day\'s meal menu names that day, today\'s says today', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page);
  const breakfast = page.getByRole('region', {name: 'Breakfast diary'});
  await expect(breakfast.getByRole('button', {name: 'Options for Breakfast today'})).toBeVisible();
  await page.getByLabel('Journal date', {exact: true}).fill('2026-11-02');
  await expect(breakfast.getByRole('button', {name: 'Options for Breakfast on Nov 2, 2026'})).toBeVisible();
  await expect(breakfast.getByRole('button', {name: /today/})).toHaveCount(0);
});
