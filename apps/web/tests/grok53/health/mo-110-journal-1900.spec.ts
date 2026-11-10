import {expect, test} from '@playwright/test';
import {freshHealth, healthView, openHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-54): Moscow MO-110. 1900-01-01, the Journal date field's own minimum, crashed Health ("This
// page could not be shown") on the Diary and Weight views. The journal now opens from 1990-01-01. Desktop, fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('MO-110: a 1900 journal date never crashes Health; the field\'s minimum is 1990', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?date=1900-01-01');
  const date = page.getByLabel('Journal date');
  await expect(date).toHaveAttribute('min', '1990-01-01');
  await expect(date).toHaveValue('2026-11-04');
  await date.fill('1900-01-01');
  for (const name of ['Weight', 'Diary', 'Insights']) {
    await healthView(page, name).click();
    await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  }
  await date.fill('1990-01-01');
  await expect(date).toHaveValue('1990-01-01');
  await healthView(page, 'Weight').click();
  await expect(page.getByText('This page could not be shown')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Your weight journal.'})).toBeVisible();
});
