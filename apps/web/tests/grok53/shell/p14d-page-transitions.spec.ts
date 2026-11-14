import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase} from '../../ah-helpers';
import {afterGoto} from '../../settings-open';

/**
 * Session AL Part 14 (lane P14-D), ADR-036 "Page transitions": page fades only played when the page left was under the
 * 8 M device-pixel capture budget, so leaving Today, Wealth, Earn, Settings or Help with the Showcase changed at once.
 * Now a page over the budget is not captured whole: the window-sized root picture crossfades instead
 * (lib/motion/view-transition-gate.ts, components/motion/motion-2026.css). Fails on main (no transition is started),
 * passes on the branch. Motion Off and reduced motion still start none (also tests/motion-m.spec.ts).
 */
type Entry = {mode: string | null; namedDevicePx: number; finished?: boolean; error?: string};
const record = (page: Page) => page.addInitScript(() => {
  const log: Entry[] = [];
  (window as unknown as {__p14d: Entry[]}).__p14d = log;
  const proto = Document.prototype as unknown as {startViewTransition?: (...a: unknown[]) => {finished: Promise<unknown>}};
  const original = proto.startViewTransition;
  if (typeof original !== 'function') return;
  proto.startViewTransition = function (this: Document, ...args: unknown[]) {
    let area = 0;
    for (const el of document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]')) {
      if (!el.style.viewTransitionName || el.style.viewTransitionName === 'none') continue;
      // Session AL (fix-up, spec): the root's picture is the window (the snapshot containing block), not <html>'s full
      // document height; the gate names the root for a tall leaving page's crossfade (lib/motion/view-transition-gate.ts).
      if (el === document.documentElement) { area += innerWidth * innerHeight; continue; }
      const r = el.getBoundingClientRect(); area += r.width * r.height;
    }
    const entry: Entry = {mode: document.documentElement.getAttribute('data-zg-vt-page'), namedDevicePx: Math.round(area * devicePixelRatio ** 2)};
    log.push(entry);
    const t = original.apply(this, args);
    t.finished.then(() => { entry.finished = true; }, (e: unknown) => { entry.error = String((e as Error)?.message ?? e); });
    return t;
  };
});
const log = (page: Page) => page.evaluate(() => (window as unknown as {__p14d: Entry[]}).__p14d);
const PAGES = ['/app', '/app/wealth', '/app/earn', '/app/settings', '/app/help'];

async function leave(page: Page, path: string) {
  await page.goto(path); await afterGoto(page, path);
  await hydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-zg-vt', 'on');
  await page.mouse.wheel(0, 900); // somewhere down the page, as a person leaves it
  const before = (await log(page)).length;
  await page.locator('a[href="/app/habits"]:visible').first().click();
  await page.waitForURL('**/app/habits');
  await hydrated(page);
  await expect.poll(async () => (await log(page)).length, {message: `a page transition leaving ${path}`}).toBeGreaterThan(before);
  const entry = (await log(page)).at(-1)!;
  // What the browser is asked to capture stays within the budget, and the transition runs to its end.
  expect(entry.namedDevicePx).toBeLessThanOrEqual(8_000_000);
  await expect.poll(async () => (await log(page)).at(-1)!.finished ?? (await log(page)).at(-1)!.error).toBe(true);
  // Once over, nothing is left marked: the root has no inline name and the crossfade mode is gone.
  await expect.poll(() => page.evaluate(() => [document.documentElement.getAttribute('data-zg-vt-page'), document.documentElement.style.viewTransitionName])).toEqual([null, '']);
}

for (const screen of [{name: 'computer 1280×720 at 1×', width: 1280, height: 720, scale: 1}, {name: 'phone 390×844 at 3×', width: 390, height: 844, scale: 3}]) {
  test.describe(`Page transitions on every page (${screen.name})`, () => {
    test.use({viewport: {width: screen.width, height: screen.height}, deviceScaleFactor: screen.scale});
    for (const path of PAGES) {
      test(`ADR-036 page transitions (P14-D): leaving ${path} with the Showcase in Full motion fades, within the capture budget`, async ({page}) => {
        await record(page);
        await page.emulateMedia({reducedMotion: 'no-preference'});
        await loadShowcase(page);
        await leave(page, path);
      });
    }
  });
}

test('ADR-036 page transitions (P14-D): Motion Off still starts no transition leaving a tall page', async ({page}) => {
  await record(page);
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:motion:v1', 'off'); } catch { /* storage denied */ } });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await loadShowcase(page);
  await page.goto('/app');
  await hydrated(page);
  await page.locator('a[href="/app/habits"]:visible').first().click();
  await page.waitForURL('**/app/habits');
  await hydrated(page);
  await page.waitForTimeout(1500);
  expect(await log(page)).toEqual([]);
});
