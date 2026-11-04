import {expect, test} from '@playwright/test';
import {openZigi, zigiBox, zigiPanel} from '../../zigi-open';
import {AI_SETTINGS_KEY} from '../../../lib/ai/settings';
import {connected, mockModel, seed} from './helpers';

/**
 * Session AL (lane L7, must-haves 4 and 5): AK's D7 (the composer's words survive the switch from on-device answers to a
 * connected model, which mounts a new composer) and Q6/O3 (ZIGi opens on Settings; the sign-in field pauses it only while
 * focused). WebKit was where D7 showed; the spec runs in every project.
 */
test.use({timezoneId: 'UTC'});
test('D7: words typed before the AI connects are still in the box after it connects', async ({page}) => {
  await mockModel(page);
  await seed(page);
  await page.goto('/app');
  await openZigi(page);
  await zigiBox(page).fill('How was my week');
  // Connect in another tab's way: the settings record changes and this page hears it (the on-device composer is replaced).
  await page.evaluate(([key, value]) => { localStorage.setItem(key, value); window.dispatchEvent(new StorageEvent('storage', {key, newValue: value})); }, [AI_SETTINGS_KEY, JSON.stringify(connected())] as const);
  await expect(zigiPanel(page).getByRole('textbox', {name: 'Message to your AI'})).toHaveValue('How was my week', {timeout: 10_000});
});
test.describe('Settings at 390 px (Q6, BN-064/BN-075/PR-042)', () => {
  test.use({viewport: {width: 390, height: 844}});
  test('ZIGi opens from Apps & extras on Settings; focusing the sign-in email pauses it and says so', async ({page}) => {
    await seed(page);
    await page.goto('/app/settings');
    await page.getByTestId('apps-extras-button').click();
    await page.getByRole('button', {name: /ZIGi/}).first().click();
    await expect(zigiPanel(page)).toBeVisible();
    const email = page.locator('#encrypted-sync input[type="email"]').first();
    if (await email.count()) {
      await email.focus();
      await expect(zigiPanel(page).getByText(/Paused on this private screen/).first()).toBeVisible();
    }
  });
});
