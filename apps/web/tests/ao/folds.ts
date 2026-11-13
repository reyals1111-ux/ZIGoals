import {expect, type Page} from '@playwright/test';
import {hydrated} from '../ah-helpers';

/**
 * Session AO (DV-045e): opens a section folded to a labelled row with PhoneFold's `desk` mode (Journey's longer sections),
 * which folds on a computer and a tablet as well as on a phone. `label` is the row's name (its detail line may follow it).
 * On a computer an opened row is remembered on this device (lib/wealth-folds.ts), so after a reload it may already be open;
 * on a phone it starts folded on every visit. Each tap is seen to take before the next, never toggling it shut again.
 */
export async function openDeskFold(page: Page, label: string) {
  await hydrated(page);
  const row = page.locator('.phone-fold-toggle').filter({hasText: label}).first();
  await row.waitFor({state: 'attached', timeout: 15_000});
  await expect(async () => {
    if (await row.getAttribute('aria-expanded') !== 'true') await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true', {timeout: 1500});
  }).toPass({timeout: 15_000});
}
