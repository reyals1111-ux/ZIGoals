import {expect, type Page} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.13): the theme specs' shared steps. The device's theme lives in zigoals:ui-prefs:v1 (the
 * Showcase keeps its own copy of that record in this tab's session storage, so a theme is written to both). Motion Off
 * makes every page a still, the same in each theme.
 */
export type Theme = 'nebula' | 'light' | 'dark';
export const THEMES: readonly Theme[] = ['nebula', 'light', 'dark'];
const KEY = 'zigoals:ui-prefs:v1';

/** A new device with Motion Off and the first-visit notice dismissed; with `showcase`, the Showcase loaded. The page's
 *  clock stands still at the test's start (the server's day, so a server-rendered date never disagrees with the page's),
 *  and no server answers (every /api read is "unavailable"), so each theme shows the same page and nothing reaches a
 *  third party. */
export async function openDevice(page: Page, {showcase = true}: {showcase?: boolean} = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, contentType: 'application/json', body: '{}'}));
  await page.clock.setFixedTime(new Date());
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
  // Session AH Part 2: each step answers within 15 s or the sweep stops there (CI once saw one step's evaluate never
  // answer on a loaded shard until the 240 s test timeout). The sweep only brings lazy sections in; every comparison
  // after it still runs, and a page that stays stuck fails them.
  const step = (top: number) => Promise.race([page.evaluate(t => { scrollTo(0, t); return document.documentElement.scrollHeight - innerHeight; }, top), new Promise<null>(done => setTimeout(() => done(null), 15_000))]);
  for (let y = 0; y < 40_000; y += 700) { const max = await step(y); if (max === null) break; await page.waitForTimeout(40); if (y > max) break; }
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => { scrollTo({top: 0, left: 0, behavior: 'instant'}); await document.fonts.ready; });
  // Session AF (CI's WebKit job on bf72baa0): the phone bar's title, ZIGi's resting spot and Earn's chip rail follow the
  // page's scroll a few frames late (the rail by a smooth scroll of its own), and WebKit took longer than the wait above, so
  // one theme was collected mid-way. Every theme is now collected in the same resting state: the page at the top, and every
  // scroll position and the launcher unchanged over 300 ms (up to 10 s; past that the comparison reports what it finds).
  // CI on c224bbe1 (WebKit, /app/wealth and /app/earn): the scroll-driven UI is also told once, at rest, that the page
  // scrolled (the phone bar's title follows the next frame), and a path's line is waited for until it matches its stage's
  // size (the path measures again up to 2.5 s after it mounts; a line still being measured is not a theme's difference).
  const rest = () => page.evaluate(() => JSON.stringify([scrollX, scrollY, document.querySelector('.ai-launcher')?.getBoundingClientRect().top ?? null,
    [...document.querySelectorAll('body *')].filter(e => e.scrollLeft || e.scrollTop).map(e => [e.scrollLeft, e.scrollTop]),
    [...document.querySelectorAll('.path-stage')].map(s => (s as HTMLElement).offsetHeight)]));
  const linesFit = () => page.evaluate(() => [...document.querySelectorAll('svg.path-line')].every(l => { const stage = l.parentElement as HTMLElement | null; return !stage || Math.abs(l.getBoundingClientRect().height - stage.offsetHeight) <= 1; }));
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  for (let i = 0, last = await rest(); i < 30; i++) { await page.waitForTimeout(300); const now = await rest(); if (now === last && await linesFit()) break; last = now; }
  await page.waitForTimeout(500);
}
