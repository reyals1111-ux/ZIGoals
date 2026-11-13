import {expect, test, type Page} from '@playwright/test';

/**
 * Session AK G2 (RELEASE_REVIEW R11, SESSION_AK_F8 proposal 1): Settings' groups after Data & privacy lay out only when
 * near the screen (content-visibility: auto), and every jump renders them all first, so it lands exactly where it did.
 */
const visibility = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.settings-page > .settings-group')].map(g => [g.id, getComputedStyle(g).contentVisibility])));
const settled = async (page: Page, id: string) => {
  const top = () => page.evaluate(i => Math.round(document.getElementById(i)!.getBoundingClientRect().top), id);
  await expect.poll(async () => { const a = await top(); await page.waitForTimeout(400); return Math.abs((await top()) - a); }, {timeout: 15_000}).toBeLessThanOrEqual(1);
  return top();
};

test('without a fragment the lower groups wait; the first group, the head and the indexes always render', async ({page}) => {
  await page.goto('/app/settings');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  const groups = await visibility(page);
  // Session AO (owner decision 13 Nov, deliberate): Appearance is now the first group and renders with Data & privacy.
  expect(groups['settings-look']).toBe('visible');
  expect(groups['settings-data']).toBe('visible');
  for (const id of ['settings-app', 'settings-areas', 'settings-account', 'settings-zigi', 'settings-help']) expect(groups[id], id).toBe('auto');
  await expect(page.locator('.settings-page')).not.toHaveAttribute('data-jump', '');
});

test('opened on a fragment, every group renders first and the target lands under the top and stays there', async ({page}) => {
  await page.goto('/app/settings#send-feedback');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  await expect(page.locator('.settings-page')).toHaveAttribute('data-jump', '');
  expect(Object.values(await visibility(page)).every(v => v === 'visible')).toBe(true);
  const top = await settled(page, 'send-feedback');
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(260);
});

test('following a fragment link renders every group before the jump', async ({page, isMobile}) => {
  await page.goto('/app/settings');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  const link = isMobile ? page.locator('a[href="#send-feedback"]').first() : page.getByRole('navigation', {name: 'Settings sections'}).getByRole('link', {name: 'Help & diagnostics', exact: true});
  const id = isMobile ? 'send-feedback' : 'settings-help';
  await link.click();
  await expect(page).toHaveURL(new RegExp(`#${id}$`));
  await expect(page.locator('.settings-page')).toHaveAttribute('data-jump', '');
  const top = await settled(page, id);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(260);
});
