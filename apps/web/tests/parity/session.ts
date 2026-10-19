import {expect, type Page} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.13): the theme specs' shared steps. The device's theme lives in zigoals:ui-prefs:v1 (the
 * Showcase keeps its own copy of that record in this tab's session storage, so a theme is written to both). Motion Off
 * makes every page a still, the same in each theme.
 */
export type Theme = 'nebula' | 'light' | 'dark';
export const THEMES: readonly Theme[] = ['nebula', 'light', 'dark'];
const KEY = 'zigoals:ui-prefs:v1';

/** A new device with Motion Off and the first-visit notice dismissed; with `showcase`, the Showcase loaded. Every page
 *  sees one fixed clock and no server answers (every /api read is "unavailable"), so each theme shows the same page and
 *  nothing reaches a third party. */
export async function openDevice(page: Page, {showcase = true}: {showcase?: boolean} = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, contentType: 'application/json', body: '{}'}));
  await page.clock.setFixedTime(new Date('2026-10-16T09:30:00Z'));
  await page.goto('/app/settings');
  await page.evaluate(k => { localStorage.setItem(k, JSON.stringify({version: 1, dismissed: {alphaNotice: true}})); localStorage.setItem('zigoals:motion:v1', 'off'); }, KEY);
  if (showcase) {
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    await page.waitForLoadState('networkidle');
  }
}

/** Writes the theme into the device's record (and the Showcase's copy of it). */
export const writeTheme = (page: Page, theme: Theme) => page.evaluate(([k, t]) => {
  const write = (store: Storage, key: string) => { const v = JSON.parse(store.getItem(key) ?? '{"version":1}') as Record<string, unknown>; if (t === 'nebula') delete v.theme; else v.theme = t; store.setItem(key, JSON.stringify(v)); };
  write(localStorage, k!);
  for (let i = 0; i < sessionStorage.length; i++) { const key = sessionStorage.key(i)!; if (key.endsWith(k!)) write(sessionStorage, key); }
}, [KEY, theme] as const);

/** Opens a route in a theme and waits until it is settled: hydrated, its theme sheet in, the network quiet, every lazy
 *  section brought in once (scrolled through), back at the top, fonts ready. */
export async function openIn(page: Page, route: string, theme: Theme) {
  await writeTheme(page, theme);
  await page.goto(route);
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
  if (theme === 'nebula') await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  else await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-loading', /.*/);
  await page.waitForLoadState('networkidle');
  for (let y = 0; y < 40_000; y += 700) { const max = await page.evaluate(top => { scrollTo(0, top); return document.documentElement.scrollHeight - innerHeight; }, y); await page.waitForTimeout(40); if (y > max) break; }
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { scrollTo(0, 0); await document.fonts.ready; });
  await page.waitForTimeout(500);
}
