import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';
import {continueToGoalReview} from '../../goal-name';

/**
 * Session AL sweep 3 (lane SW3): DV-147 (L4) — a count goal's own tally is not wealth — and DV-057b (L4) — Today's
 * "Next step" for that goal asks for a plan of books, not a contribution plan. Desktop 1920 × 1113 Nebula, fresh profile
 * (the replay's DL condition), Europe/Brussels, a fixed clock. Written, not run here.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1920, height: 1113}});

test('DV-057b/DV-147: a books goal is planned in books on Today, and its tally is no asset on Wealth or Today', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-05T09:00:00Z')});
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/goals/new?template=read-12');
  // Session AO (T-014, deliberate): three steps; Continue to the review, which is checked to be the last step.
  await continueToGoalReview(page);
  await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
  await page.waitForURL('**/app/goals/tracked/**');
  await open(page, '/app');
  const step = page.getByRole('article', {name: 'Focus: next goal step'});
  await expect(step).toContainText('Next: plan how many books to add, and when');
  await expect(step).not.toContainText('contribution plan');
  // Fund it once: its tally is made.
  await page.goBack();
  await page.waitForURL('**/app/goals/tracked/**');
  await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('How many books did you add?').fill('3');
  await sheet.getByRole('button', {name: 'Preview contribution'}).click();
  await sheet.getByRole('button', {name: 'Confirm & fund Goal'}).click();
  // Fix-up (CI 1539): the sheet closes once the funding is saved; leaving before that met its unsaved-changes guard and
  // stayed on the goal page (the check below then read the goal page, not Wealth).
  await expect(sheet).toHaveCount(0);
  await open(page, '/app/wealth');
  await expect(page.locator('main')).not.toContainText(/Read 12 books.*Needs valuation/);
  await open(page, '/app');
  await expect(page.locator('main')).not.toContainText(/1 asset · 1 need attention/);
});
