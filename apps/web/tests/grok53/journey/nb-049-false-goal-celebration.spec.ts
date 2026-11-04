import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice} from '../l3-helpers';

/**
 * NB-049/NB-168/NB-197/NB-050 (P-NB-02): the first habit tick celebrates "First step" on ONE card; it never says "A goal
 * finished" when no goal finished. Bot: ~340 px, Light, Incognito(2), game layer and badges on.
 */
test.use({viewport: {width: 340, height: 740}});
test('NB-049/NB-168: a first habit tick shows one card, "First step", and never "A goal finished"', async ({page}) => {
  await emptyDevice(page, {theme: 'light'});
  await page.evaluate(() => localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true, badges: true, levelSeen: 1})));
  const card = await createHabit(page, 'Floss');
  await card.getByRole('button', {name: 'Complete Floss'}).click();
  const dialog = page.getByRole('dialog', {name: /New badge · First step/});
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByText(/A goal finished|Achievement unlocked/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForTimeout(1500); // a second card used to follow the first
  await expect(page.getByText(/A goal finished|Achievement unlocked/)).toHaveCount(0);
});
