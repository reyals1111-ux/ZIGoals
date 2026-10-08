import {expect, test, type Page} from '@playwright/test';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';

/**
 * Session X-Local Phase 2 (P2.8, X-Cloud's H9): a part of ZIGi whose code loads on demand fails as that part alone. The
 * chunk is refused at the network (known by a literal only that part renders, so the check is the same on a dev server
 * and a production build); the part says it could not be opened, the rest of ZIGi and the page keep working, and no page
 * error reaches the route's boundary.
 */
async function blockChunk(page: Page, literal: string) {
  await page.route('**/_next/static/chunks/**', async route => {
    const response = await route.fetch(); const text = await response.text();
    if (text.includes(literal)) return route.abort('failed');
    const headers = Object.fromEntries(Object.entries(response.headers()).filter(([k]) => !['content-encoding', 'content-length'].includes(k.toLowerCase())));
    await route.fulfill({status: response.status(), headers, body: text});
  });
}
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the Customize panel cannot load: the panel says so, the rest of the ZIGi section and the page keep working', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await blockChunk(page, 'Edge tab while ZIGi is hidden');
  await page.goto('/app/settings');
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(v.key, v.value); }, {key: AI_SETTINGS_KEY, value: JSON.stringify({...defaultAiSettings(), enabled: true})});
  await page.goto('/app/settings#zigi-look');
  const section = page.locator('section#your-ai');
  await expect(section).toBeVisible();
  // The look card is a <details>; the address opens it, and its summary does when it is closed.
  const card = section.locator('details#zigi-look');
  await expect(card).toBeVisible();
  if (!(await card.evaluate(el => (el as HTMLDetailsElement).open))) await card.locator('summary').click();
  const failed = card.locator('.zigi-part-failed');
  await expect(failed).toContainText('Customize could not be opened. Reload the page to try again.');
  await expect(failed.getByRole('button', {name: 'Reload'})).toBeEnabled();
  // The section around it is whole: its heading, and another panel still opens.
  await expect(section.getByRole('heading', {name: 'Your own AI, page by page.'})).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  expect(errors.filter(e => !/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/.test(e))).toEqual([]);
});

test("the chat cannot load: ZIGi's button stays, a note says the chat could not be opened, the page keeps working", async ({page}) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await blockChunk(page, 'Message to your AI');
  await page.goto('/app/settings');
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(v.key, v.value); }, {key: AI_SETTINGS_KEY, value: JSON.stringify({...defaultAiSettings(), enabled: true})});
  // Gate B in WebKit (ADR-017 S77): the settings page's own probes (music config, push, the private account's status) were
  // still in flight when the next page was opened, and WebKit reports a fetch cancelled by a navigation as a page error
  // ("… due to access control checks", S64's class). The page settles first, so nothing is in flight at the move.
  await page.waitForLoadState('networkidle');
  await page.goto('/app/habits');
  const launcher = page.locator('.ai-launcher-button');
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.locator('.ai-launcher-toast')).toContainText("ZIGi's chat could not be opened. Reload the page to try again.");
  await expect(launcher).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('dialog.ai-chat[open]')).toHaveCount(0);
  expect(errors.filter(e => !/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/.test(e))).toEqual([]);
});
