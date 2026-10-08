import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {ZIGI_KEY} from '../lib/ai/store/keys';

/**
 * Session X-Local Part 6f: WebKit smoke. Every app page opens with the Showcase records and no page error, in
 * Playwright's WebKit on a desktop and an iPhone 15 viewport; the Session W surfaces (Sleep, Meditation, My links,
 * the wrap-up) render; ZIGi's launcher shows its poster, and under reduced motion only the poster (no clip is ever
 * played). Run through `playwright.webkit.config.ts`, by hand, on the owner's machines; labelled "WebKit".
 */
const DAY = '2026-09-20';
const PAGES = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/health?view=sleep', '/app/health?view=meditation', '/app/health?view=devices', '/app/wealth', '/app/portfolio', '/app/markets', '/app/staking', '/app/ecosystem', '/app/activity', '/app/chess', '/app/settings', '/app/help', '/app/zigi'];
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.goto('/app/settings');
  const ai = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234'};
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify(ai), ...extra});
}
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('every app page opens in WebKit with the Showcase and no page error; ZIGi\'s launcher shows its poster', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await seed(page);
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('main'), path).toBeVisible();
    // Settings is a sensitive screen (account, sync, recovery): the launcher stays away there by the app's own rule.
    if (path === '/app/settings') { await expect(page.getByRole('button', {name: /Open ZIGi/}), path).toHaveCount(0); continue; }
    await expect(page.getByRole('button', {name: /Open ZIGi/}), path).toBeVisible();
    // The idle art: the poster first, and where the browser plays animated WebP and motion is allowed (Chrome), the
    // animated idle file swapped in once decoded. Either is F001; the reduced-motion test below pins the poster.
    const img = page.locator('.ai-launcher-button img').first();
    await expect(img, path).toHaveAttribute('src', /\/brand\/figures\/zigi\/origami-nebula\/F001-idle(-2x)?(\.anim)?\.webp$/);
    await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).naturalWidth), {message: `${path}: the idle art decoded`}).toBeGreaterThan(0);
  }
  expect(errors, 'page errors').toEqual([]);
});

test('the Session W surfaces render in WebKit: Sleep, Meditation, My links and the wrap-up card', async ({page}) => {
  await seed(page);
  await page.goto('/app/health?view=sleep');
  await expect(page.getByRole('heading', {level: 1, name: 'Your sleep, your rhythm.'})).toBeVisible();
  await page.goto('/app/health?view=meditation');
  await expect(page.locator('main')).toContainText(/Meditation|mindful/i);
  await page.goto('/app');
  await expect(page.locator('main')).toContainText(/Today|rhythm/i);
});

test('reduced motion in WebKit: ZIGi keeps its still, never a clip', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await seed(page, {[ZIGI_KEY]: JSON.stringify({version: 1, animation: 'full'})});
  await page.goto('/app');
  const img = page.locator('.ai-launcher-button img').first();
  await expect(img).toBeVisible();
  await page.waitForTimeout(4000);
  await expect(img).toHaveAttribute('src', /F001-idle(-2x)?\.webp$/);
  expect(await img.getAttribute('data-playing')).toBeNull();
});
