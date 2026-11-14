import {expect, type Page} from '@playwright/test';

/**
 * Session AP (D-088/N-BN-10 completed, ADR-040): on a computer or a tablet Settings now starts with every group folded
 * (components/settings/settings-fold.tsx), so a spec that works inside Settings opens it the way a person does: it goes
 * to the page and presses "Open all" in the sections bar, then finds every control where it always was. A phone keeps its
 * own list and has nothing to open. A deep link (`/app/settings#…`) needs none of this: it opens its own group.
 */
export async function openSettings(page: Page, path = '/app/settings', options?: Parameters<Page['goto']>[1]) {
  const response = await page.goto(path, options);
  await openAllSettingsGroups(page);
  return response;
}

/** Presses "Open all" when any Settings group is folded, and waits until none is. */
export async function openAllSettingsGroups(page: Page) {
  // Without scripts (a no-JavaScript check) the server's page has every group open and never hydrates: nothing to do. With
  // scripts, Next's inline bootstrap has run (self.__next_f) by the time the page is loaded.
  const scripts = await page.evaluate(() => typeof (self as unknown as {__next_f?: unknown}).__next_f !== 'undefined').catch(() => false);
  if (!scripts) return;
  const hydrated = await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000}).then(() => true, () => false);
  if (!hydrated) throw new Error('Settings did not finish loading (no data-app-hydrated in 20 s).');
  // Session AP (CI 1726): reached by an in-app link, the page was already live, so Settings' own groups are waited for, and
  // "none folded" must hold for a moment (the groups fold as Settings mounts).
  if (/^\/app\/settings\/?$/.test(new URL(page.url()).pathname)) await page.locator('.settings-page .settings-group').first().waitFor({state: 'attached', timeout: 20_000}).catch(() => undefined);
  const folded = page.locator('.settings-page .settings-group[data-folded]');
  await expect(async () => {
    if (await folded.count() > 0) {
      const all = page.locator('.settings-page .settings-fold-all');
      if ((await all.textContent())?.trim() === 'Open all') await all.click();
      await expect(folded).toHaveCount(0, {timeout: 2_000});
    }
    await page.waitForTimeout(250);
    expect(await folded.count()).toBe(0);
  }).toPass({timeout: 15_000});
}

/** True for Settings' own address with no fragment (a fragment opens its own group). */
export const isPlainSettings = (path: string) => /^\/app\/settings\/?(\?[^#]*)?$/.test(path);
/** For a spec's own helper that went to `path`: opens every group when that was Settings (see openSettings). */
export async function afterGoto(page: Page, path: string) { if (isPlainSettings(path)) await openAllSettingsGroups(page); }
