import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../../ah-helpers';

// Session AL Part 14 (lane P14-A): earlier row DS8 (AH; L-006, N-049): "restore and the encrypted backup give no feedback
// in the demo". In the Showcase, Settings → Your data says at once why a backup cannot be restored there, and offers no
// backup test of the Showcase's examples. Desktop 1280, the Showcase.
test.use({viewport: {width: 1280, height: 900}});

test('DS8 (L-006): in the Showcase, Restore says why it is not offered, in words', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/settings/data#restore'); await hydrated(page);
  const restore = page.locator('#restore');
  await expect(restore).toContainText('You are in the Showcase. Return to your own data to restore a backup.');
  await expect(restore.locator('input[type="file"]')).toHaveCount(0);
});
