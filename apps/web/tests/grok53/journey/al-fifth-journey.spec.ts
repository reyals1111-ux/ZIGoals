import {expect, test, type Page} from '@playwright/test';
import {GAME_KEY} from '../../../lib/aa-device-keys';
import {emptyDevice, open} from '../l3-helpers';
import {openDeskFold} from '../../ao/folds';

/**
 * Session AL fifth pass (lane L3, GROK53_REPLAY_L3_2 "STILL OPEN" 2 and "CHANGED" 9): NB-052 (W 340L, a setup with Habits,
 * Health & food and Chess) and DV-045e (the Showcase Journey at 375 px). Brussels before 07:00; fictional data only.
 */
test.use({locale: 'en-GB', timezoneId: 'Europe/Brussels'});
const flow = (page: Page) => page.locator('main');

test('NB-052: a person who picked Chess reads on Journey why it has no planet, beside the four planets', async ({page}) => {
  await page.setViewportSize({width: 340, height: 740});
  await page.clock.install({time: new Date('2026-11-04T03:20:00Z')});
  await emptyDevice(page, {theme: 'light', welcomeSeen: false});
  await open(page, '/app/welcome');
  await flow(page).getByRole('button', {name: 'Let’s begin', exact: true}).click();
  for (const name of [/^Habits/, /^Health & food/, /^Chess/]) await flow(page).getByRole('checkbox', {name}).check();
  for (let step = 0; step < 10; step++) {
    const finish = flow(page).getByRole('button', {name: 'Finish setup', exact: true});
    const next = flow(page).getByRole('button', {name: /^(Continue|Skip this step|Skip the tour)$/}).first();
    await expect(finish.or(next).first()).toBeVisible();
    if (await finish.isVisible()) { await finish.click(); break; }
    await next.click();
  }
  await page.waitForURL(/\/app$/);
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({version: 1, enabled: true, badges: false, levelSeen: 1})), GAME_KEY);
  await open(page, '/app/journey');
  await openDeskFold(page, 'My universe'); // Session AO (DV-045e, deliberate): a folded row on Journey now; opened first
  const planets = page.getByRole('list', {name: 'Your four planets'}).first();
  await expect(planets.locator(':scope > li')).toHaveCount(4);
  await expect(page.locator('.universe-extras-note')).toHaveText('Chess has no planet of its own: the four planets are the four parts of ZIGoals. A game or the daily puzzle that ticks off the habit chosen in Chess lights Habits.');
});
