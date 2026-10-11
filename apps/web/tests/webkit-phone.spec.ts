import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {mainNav} from './phone-nav';

/**
 * Session Y Part 6 (ADR-018): the curated phone set for CI's WebKit job. Today, Habits, Health, Wealth, Portfolio,
 * Settings, Help and Markets at 390 × 844 with the Showcase's records: each opens with its heading and no page error
 * (WebKit's cancelled router prefetches excepted by shape and moment, ADR-017 S64), nothing scrolls sideways, and the
 * tab bar's targets are at least 44 px. It runs in WebKit only (`playwright.webkit.config.ts`); the Chrome suite covers
 * these pages on phones in its own specs (phone-pages, phone-nav, the per-page phone specs). Evidence label: WebKit.
 */
const DAY = '2026-09-20';
const PAGES = ['/app', '/app/habits', '/app/health', '/app/wealth', '/app/portfolio', '/app/settings', '/app/help', '/app/markets'];
const settled = (page: Page) => page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
test.use({viewport: {width: 390, height: 844}});
test.beforeEach(async ({page, browserName}, info) => {
  test.skip(browserName !== 'webkit', 'The WebKit job\'s phone set; Chrome covers these pages in its own phone specs.');
  test.skip(info.project.name !== 'mobile', 'A phone set: the iPhone project only.');
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})});
});

test('the phone set opens in WebKit at 390 px: a heading, no page error, no sideways scroll, 44 px tabs', async ({page}) => {
  const errors: {at: number; message: string}[] = [], navigations: number[] = [];
  page.on('pageerror', e => errors.push({at: Date.now(), message: e.message}));
  page.on('request', r => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) navigations.push(Date.now()); });
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('main h1').first(), path).toBeVisible();
    await settled(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${path}: nothing scrolls sideways`).toBeLessThanOrEqual(0);
    const tabs = await mainNav(page).locator('a:visible, button:visible').all();
    expect(tabs.length, `${path}: the tab bar shows its five tabs`).toBeGreaterThanOrEqual(5);
    for (const tab of tabs) {
      const box = await tab.boundingBox();
      expect(box, `${path}: a tab is laid out`).not.toBeNull();
      expect(Math.round(Math.min(box!.width, box!.height)), `${path}: "${(await tab.textContent())?.trim()}" is at least 44 px`).toBeGreaterThanOrEqual(44);
    }
  }
  const prefetchCancel = (e: {at: number; message: string}) => /^(?:https?:\/\/)?\/?127\.0\.0\.1:\d+\/app(?:\/[a-z-]+)?\?_rsc=[\w-]+ due to access control checks\.?$/.test(e.message) && navigations.some(t => Math.abs(e.at - t) <= 1500);
  expect(errors.filter(e => !prefetchCancel(e)).map(e => e.message), "page errors (WebKit's rejected router prefetches excluded by shape and moment, S64)").toEqual([]);
});
