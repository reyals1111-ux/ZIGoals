import {expect, test} from '@playwright/test';
import {freshNova} from './hud-helpers';

// Session AL sweep 4 (NOVA_HUD_REVIEW_2 m7, L8f note 1): the HUD → page morph lands in the page's hero. While the morph
// runs (data-hud-morph on the root, Full motion), the Goals page's hero carries the panel's view-transition name; NOVA's
// own page never does (two elements of one name would cancel the transition), and the name leaves with the morph.
test.use({viewport: {width: 1440, height: 900}, reducedMotion: 'no-preference', timezoneId: 'Europe/Brussels', locale: 'en-GB'});

test('m7: Goals\' hero takes the morph\'s name only while it runs; never two at once', async ({page}) => {
  await freshNova(page, {widgets: [{id: 'goals-hud', size: 'L'}], look: 'holo'});
  const named = () => page.evaluate(() => [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).viewTransitionName === 'zg-hud-morph').map(el => el.className.toString()));
  expect(await named()).toEqual([]);
  await page.locator('.nova-widget[data-widget="goals-hud"] .nova-widget-open').click();
  await expect(page).toHaveURL(/\/app\/goals$/);
  await expect.poll(async () => (await named()).length).toBeLessThanOrEqual(1);
  await expect(page.locator('html')).toHaveAttribute('data-hud-morph', 'zoom');
  expect(await named()).toEqual([expect.stringContaining('pillar-hero')]);
  // Gone with the morph (morph.ts clears it after 1.5 s): never a permanent name on the page.
  await expect(page.locator('html')).not.toHaveAttribute('data-hud-morph', /.+/, {timeout: 4000});
  expect(await named()).toEqual([]);
});
