import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';

/**
 * Session AL fifth pass (lane L3, GROK53_REPLAY_L3_2 "CHANGED" 7, N-NB-01): leaving a step reads "Skip …" everywhere, inside
 * the tour and on Today's welcome too. W = a first visit, 1280×800, Brussels before 07:00.
 */
test.use({viewport: {width: 1280, height: 800}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T03:20:00Z')}); await emptyDevice(page, {welcomeSeen: false}); });
const flow = (page: Page) => page.locator('main');

test('N-NB-01: inside the tour the way out is "Skip the tour" (no "End the tour"); it goes on to the next step', async ({page}) => {
  await open(page, '/app/welcome');
  await flow(page).getByRole('button', {name: 'Let’s begin', exact: true}).click();
  // The steps before the tour: nothing picked, each is skipped or continued.
  const show = flow(page).getByRole('button', {name: 'Show me', exact: true});
  for (let step = 0; step < 4; step++) {
    const next = flow(page).getByRole('button', {name: /^(Continue|Skip this step)$/}).first();
    await expect(show.or(next).first()).toBeVisible();
    if (await show.isVisible()) break;
    await next.click();
  }
  await show.click();
  await expect(flow(page).getByRole('button', {name: 'End the tour'})).toHaveCount(0);
  await flow(page).getByRole('button', {name: 'Next', exact: true}).click();
  await flow(page).getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await expect(flow(page).locator('.onboarding-tour-card')).toHaveCount(0);
  await expect(flow(page).getByRole('button', {name: 'Continue', exact: true})).toBeVisible(); // the install step
});

test('N-NB-01: Today\'s welcome offers "Skip setup", never "Not now"; it goes and the setup entry stays', async ({page}) => {
  await open(page, '/app');
  const welcome = page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'});
  await expect(welcome.getByRole('button', {name: 'Not now'})).toHaveCount(0);
  await welcome.getByRole('button', {name: 'Skip setup', exact: true}).click();
  await expect(welcome).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'Set up ZIGoals in about a minute.'})).toBeVisible();
});
