import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL Part 14 (lane P14-A): earlier row SE2 (AH; B-126, N-093): "two weekly review days" — Settings' review day and
// the Reminders page disagreed. Since AH there is one day, Settings' (components/reminders/reminders-plan.tsx reads the
// weekly review's own weekday). Desktop 1280, a fresh empty profile.
test.use({viewport: {width: 1280, height: 900}});

test('SE2 (B-126): the review day chosen in Settings is the one the Reminders page names', async ({page}) => {
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/settings#habits-settings'); await hydrated(page);
  const day = page.getByLabel(/^Weekly review day/);
  await day.selectOption({label: 'Wednesday'});
  await expect(page.locator('#weekly-review-day').getByRole('status')).toContainText('Wednesday');
  await page.goto('/app/settings/reminders'); await hydrated(page);
  await expect(page.locator('.reminders-review-day')).toContainText('On your review day, Wednesday.');
});
