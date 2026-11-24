import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {TEST_HELLO_KEY, ZIGI_HELLO_DAY_KEY} from '../lib/zigi-hello-day';

/**
 * Session AV lane 2 (roadmap, PK-6; owner decision, follow-up 3): ZIGi's delivered "Hello, in place" (X001) plays once,
 * on the first open of a new day, over the resting launcher figure; a second open that day, Motion Off and reduced
 * motion never play it. Only the manifest's own clip shows; the look is unchanged. The launcher's floating figure is a
 * computer's (901 px and up), so this runs at 1440. An automated browser gets the hello only with the test's session key.
 */
const DAY = '2026-11-22', MORNING = '2026-11-22T08:30:00.000Z';
async function seed(page: Page, extra: Record<string, string> = {}) {
  await page.clock.install({time: MORNING});
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [ZIGI_HELLO_DAY_KEY]: '2026-11-21', ...extra};
  // Session AV lane 2 (fixb1; the seed page's own ZIGi starts its alive chunk on idle, up to 2 s after the page, so with
  // the test's session key set here it could say the day's hello on Settings, after the seed, and keep the day there: the
  // first-open test then saw no hello on Today and Motion Off found the day already moved on. The key now arrives with the
  // next page, so the seed page never says hello; every assertion below is unchanged; deliberate.)
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [key, x] of Object.entries(v)) localStorage.setItem(key, x); }, values);
  await page.waitForLoadState('networkidle');
  await page.addInitScript(k => { try { sessionStorage.setItem(k, '1'); } catch { /* the spec then fails on the hello it expects */ } }, TEST_HELLO_KEY);
}
// Every file the launcher's figure shows, as it shows it (poster or clip), from the first paint.
async function watchFigure(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = []; (window as unknown as {__zigiFiles: string[]}).__zigiFiles = seen;
    const note = (img: Element | null) => { const src = img?.getAttribute('src'); if (src && !seen.includes(src.split('/').pop()!)) seen.push(src.split('/').pop()!); };
    new MutationObserver(records => { for (const r of records) { const t = r.target as Element; if (t instanceof HTMLImageElement && t.closest('.ai-launcher-button')) note(t); else if (t instanceof Element) t.querySelectorAll?.('.ai-launcher-button .zigi img').forEach(note); } })
      .observe(document, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});
  });
}
const files = (page: Page) => page.evaluate(() => (window as unknown as {__zigiFiles?: string[]}).__zigiFiles ?? []);
const hello = (list: string[]) => list.some(f => f.startsWith('X001-greeting-in-place'));
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the first open of a new day: ZIGi says hello in place once, then rests; a second open that day does not', async ({page, isMobile}) => {
  test.skip(isMobile, 'the floating figure is a computer’s (901 px and up)');
  await watchFigure(page);
  await seed(page);
  await page.goto('/app');
  await expect(page.getByTestId('ai-launcher')).toBeVisible();
  await expect.poll(async () => hello(await files(page)), {timeout: 15_000}).toBe(true);
  await expect.poll(() => page.evaluate(k => localStorage.getItem(k), ZIGI_HELLO_DAY_KEY)).toBe(DAY);
  // It plays for its own 2.5 s, then the resting clip is back.
  await page.clock.runFor(3000);
  await expect.poll(() => page.locator('.ai-launcher-button .zigi img').evaluate(el => (el as HTMLImageElement).getAttribute('src')?.split('/').pop() ?? ''), {timeout: 10_000}).toMatch(/^F001-idle/);
  // A second open the same day: no hello.
  await page.reload();
  await expect(page.getByTestId('ai-launcher')).toBeVisible();
  await expect.poll(async () => (await files(page)).some(f => f.startsWith('F001-idle.anim')), {timeout: 15_000}).toBe(true);
  await page.clock.runFor(5000);
  expect(hello(await files(page))).toBe(false);
});

for (const how of ['Motion Off', 'reduced motion'] as const) test(`never with ${how}`, async ({page, isMobile}) => {
  test.skip(isMobile, 'the floating figure is a computer’s (901 px and up)');
  await watchFigure(page);
  if (how === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
  await seed(page, how === 'Motion Off' ? {'zigoals:motion:v1': 'off'} : {});
  await page.goto('/app');
  await expect(page.getByTestId('ai-launcher')).toBeVisible();
  if (how === 'Motion Off') await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  await expect.poll(async () => (await files(page)).length, {timeout: 15_000}).toBeGreaterThan(0);
  await page.clock.runFor(8000);
  expect(hello(await files(page))).toBe(false);
  expect(await page.evaluate(k => localStorage.getItem(k), ZIGI_HELLO_DAY_KEY)).toBe('2026-11-21');
});
