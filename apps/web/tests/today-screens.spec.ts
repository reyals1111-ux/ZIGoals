import {expect, test} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Today stays short on phones (Session P, owner addition 2): the screen count of Today at 390×844, measured as
 * scrollHeight / 844 with every network call answered 503 and motion off. Measured on the build before PR 3 (`main`
 * `8bcf0b7` with PR 1, 2026-10-04): Showcase 10.13 screens, a seeded Local Demo (the Showcase records, onboarded)
 * 4.33. With PR 3 (one "For you" card open on a phone): Showcase 11.02, seeded Local Demo 5.04 with the one-time
 * "What's new" card and 4.74 once it is dismissed. The ceilings below hold those numbers with a small margin, so a
 * later change that makes Today meaningfully longer on a phone fails here instead of going unnoticed.
 * Session U Part 8 (a tighter phone rhythm, nothing removed): Showcase 11.07 → 10.92, seeded Local Demo 5.09 → 4.93,
 * and 4.74 → 4.58 once What's new is dismissed (local production builds before and after, 2026-10-05). The ceilings
 * stay as they were.
 * Session U follow-up F3 (each widget card folds to a row named by it on a phone; the overview keeps every value in
 * view; nothing removed): Showcase 10.92 → 9.46, seeded Local Demo 4.93 → 3.95, and 4.58 → 3.59 once What's new is
 * dismissed (local production builds before and after, 2026-10-05). The ceilings come down to those numbers with a
 * small margin.
 */
const CEILING = {showcase: 9.7, local: 4.2, localAfterWhatsNew: 3.85};
test.use({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
test('Today at 390×844 stays within its screen-count ceilings', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const screens = async () => { await expect(page.getByRole('heading', {level: 1})).toBeVisible(); await page.waitForTimeout(800); return (await page.evaluate(() => document.documentElement.scrollHeight)) / 844; };
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  const showcase = await screens();
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { sessionStorage.clear(); localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true})});
  await page.goto('/app');
  const local = await screens();
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [WHATS_NEW_KEY, JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})]);
  await page.goto('/app');
  const localAfterWhatsNew = await screens();
  console.log(`TODAY_SCREENS showcase=${showcase.toFixed(2)} local=${local.toFixed(2)} localAfterWhatsNew=${localAfterWhatsNew.toFixed(2)}`);
  expect(showcase, 'Showcase').toBeLessThanOrEqual(CEILING.showcase);
  expect(local, 'seeded Local Demo with the What\'s new card').toBeLessThanOrEqual(CEILING.local);
  expect(localAfterWhatsNew, 'seeded Local Demo once What\'s new was dismissed').toBeLessThanOrEqual(CEILING.localAfterWhatsNew);
  // One "For you" card is open on a phone; the rest wait behind one row.
  expect(await page.locator('.for-you > .for-you-slot').count()).toBeLessThanOrEqual(1);
});
