import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';

/**
 * Session AL sweep 3 (lane SW3): BUG-039 (Settings links 19 px tall at 375 px) and TK-146 (a Help line on Reward goals),
 * both from L4. Phone 375 × 812 and desktop, a fresh profile. Written, not run here.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});

test('BUG-039: at 375 px the Settings module links are 44 px tall targets', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/settings');
  for (const name of ['Manage habits →', 'Open Health →', 'Explore market references →']) {
    const link = page.getByRole('link', {name, exact: true});
    if (!(await link.count())) continue; // a page switched off leaves its link out
    const box = (await link.first().boundingBox())!;
    expect(box.height, name).toBeGreaterThanOrEqual(44);
  }
});

test('TK-146: Help answers "Where are Reward goals?" among the goal questions', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 800});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/help');
  const question = page.locator('details#help-al-reward-goals');
  await question.locator('summary').click();
  await expect(question).toContainText('Reward goals count your unclaimed staking rewards.');
  await expect(question).toContainText('+ Create a goal');
});
