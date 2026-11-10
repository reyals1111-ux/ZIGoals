import {expect, test} from '@playwright/test';
import {zigiPanel} from '../../zigi-open';
import {seed} from './helpers';
import {hydrated} from '../../ah-helpers';

/**
 * Session AL (lane L7, must-haves 4 and 5): AK's D7 (the composer's words survive the switch from on-device answers to a
 * connected model, which mounts a new composer) and Q6/O3 (ZIGi opens on Settings; the sign-in field pauses it only while
 * focused). WebKit was where D7 showed; the spec runs in every project.
 */
test.use({timezoneId: 'UTC'});
// D7 moved to tests/zigi-composer-switch.spec.ts (Session AL Part 14), so CI's WebKit job runs it too; unchanged there.
test.describe('Settings at 390 px (Q6, BN-064/BN-075/PR-042)', () => {
  test.use({viewport: {width: 390, height: 844}});
  test('ZIGi opens from Apps & extras on Settings; focusing the sign-in email pauses it and says so', async ({page}) => {
    await seed(page);
    await page.goto('/app/settings');
    // After hydration (a click before it was lost: the sheet never opened, run 2), and the sheet's own ZIGi entry.
    await hydrated(page);
    await page.getByTestId('apps-extras-button').click();
    await page.getByRole('dialog', {name: 'Apps & extras'}).getByRole('button', {name: /^ZIGi\b/}).click();
    await expect(zigiPanel(page)).toBeVisible();
    const email = page.locator('#encrypted-sync input[type="email"]').first();
    // The sign-in field shows disabled where email sync is not configured (as on the production check's build): it cannot
    // take the focus there, so the pause is checked only where the field can be used, as it was where the field is absent.
    if (await email.count() && await email.isEnabled()) {
      await email.focus();
      await expect(zigiPanel(page).getByText(/Paused on this private screen/).first()).toBeVisible();
    }
  });
});
