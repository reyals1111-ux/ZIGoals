import {expect, test, type Page} from '@playwright/test';
import {CONTROL_SELECTOR} from '../components/ai/launcher-rest';

/**
 * Session X-Local Part 9, the owner's H7 (ADR-017 S81): on a phone the launcher's resting place covers no first-screen
 * control on any app page. X-Cloud measured its corner over Help's chips (45 %), Markets' refresh (25 %), Portfolio's
 * "+ New portfolio" (15 %), Today's "See how it works" (12 %) and Health's "Log food or water" (11 %); at the top of a
 * page the launcher now lifts to the nearest band that is free of `main`'s controls and returns to its corner on
 * scroll. A new device, every /api answered 503, two phone sizes; the launcher stays fully on screen (reachable) and the
 * edge tab (hide, then show again) keeps working.
 */
const PAGES = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/markets', '/app/portfolio', '/app/staking', '/app/ecosystem', '/app/activity', '/app/chess', '/app/help'];
const SIZES = [[390, 844], [360, 800]] as const;

test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

type Hit = {text: string; covered: number};
async function overlaps(page: Page): Promise<{launcher: {l: number; t: number; r: number; b: number} | null; hits: Hit[]; vw: number; vh: number}> {
  return page.evaluate(selector => {
    const vw = window.innerWidth, vh = window.innerHeight, el = document.querySelector('.ai-launcher');
    if (!el) return {launcher: null, hits: [], vw, vh};
    const L = el.getBoundingClientRect(), hits: Hit[] = [];
    for (const c of document.querySelectorAll(selector)) {
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.top >= vh) continue;
      const ix = Math.max(0, Math.min(r.right, L.right) - Math.max(r.left, L.left)), iy = Math.max(0, Math.min(r.bottom, L.bottom) - Math.max(r.top, L.top));
      if (ix * iy > 0) hits.push({text: (c.getAttribute('aria-label') || c.textContent || '').trim().slice(0, 40), covered: Math.round(100 * ix * iy / (r.width * r.height))});
    }
    return {launcher: {l: Math.round(L.left), t: Math.round(L.top), r: Math.round(L.right), b: Math.round(L.bottom)}, hits, vw, vh};
  }, CONTROL_SELECTOR);
}

for (const [width, height] of SIZES) {
  test(`${width}x${height}: on every app page the launcher rests clear of the first screen's controls and stays on screen`, async ({page}) => {
    test.setTimeout(150_000);
    await page.setViewportSize({width, height});
    await page.goto('/app/settings');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    const report: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('.ai-launcher')).toBeVisible();
      await page.waitForTimeout(1600); // the page's own first-screen parts settle, then the launcher places itself (300 ms and 1.2 s after mount)
      const r = await overlaps(page);
      expect(r.launcher, path).not.toBeNull();
      const L = r.launcher!;
      expect(L.l, `${path}: on screen`).toBeGreaterThanOrEqual(0); expect(L.t, `${path}: on screen`).toBeGreaterThanOrEqual(0);
      expect(L.r, `${path}: on screen`).toBeLessThanOrEqual(r.vw); expect(L.b, `${path}: on screen`).toBeLessThanOrEqual(r.vh);
      report.push(`${path} ${L.l},${L.t}–${L.r},${L.b}${r.hits.length ? ' HITS ' + r.hits.map(h => `${h.text} ${h.covered}%`).join('; ') : ''}`);
      expect(r.hits, `${path}: a first-screen control under the launcher`).toEqual([]);
    }
    console.log(`phone-rest ${width}x${height}:\n  ${report.join('\n  ')}`);
  });
}

test('390x844: scrolled past the top the launcher is back in its corner; hidden, the edge tab shows it again', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/help');
  await expect(page.locator('.ai-launcher')).toBeVisible();
  await page.waitForTimeout(1600);
  const lifted = (await overlaps(page)).launcher!;
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(async () => (await overlaps(page)).launcher!.b, {timeout: 5_000}).toBeGreaterThanOrEqual(lifted.b);
  const corner = (await overlaps(page)).launcher!;
  expect(corner.b).toBeGreaterThan(lifted.b - 1);
  // The corner is just above the tab bar.
  const tabs = await page.locator('.phone-tabbar').boundingBox();
  expect(tabs).not.toBeNull(); expect(corner.b).toBeLessThanOrEqual(tabs!.y + 1);
  // Hide, then the edge tab brings it back.
  await page.getByRole('button', {name: 'Hide ZIGi'}).click();
  await expect(page.locator('.ai-launcher')).toHaveCount(0);
  const tab = page.getByRole('button', {name: 'Show ZIGi'});
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page.locator('.ai-launcher')).toBeVisible();
});

// Session Y (ADR-018 Y44): a tap on a control that lies where the corner launcher would sit is the control's, from the
// press to the release. Before, the press's focus sent the launcher to its corner at once, onto that very control, so
// the release landed on the launcher and the tap was lost (run10-source-pinning:31's "Options for Bitcoin" in CI).
// Keyboard focus still sends it to the corner (a11y-wcag-x's 2.4.11 walk covers that path).
test('390x844: a press on a control under the corner keeps that control under the pointer until the release', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/help');
  await expect(page.locator('.ai-launcher')).toBeVisible();
  await page.waitForTimeout(1600);
  // Where the corner is: the resting box moved down by its lift. A control there is what a person may tap.
  const target = await page.evaluate(selector => {
    const box = document.querySelector('.ai-launcher')!, lift = parseFloat(getComputedStyle(box).getPropertyValue('--zigi-rest-lift')) || 0;
    const L = box.getBoundingClientRect(), C = {left: L.left, right: L.right, top: L.top + lift, bottom: L.bottom + lift};
    for (const c of document.querySelectorAll<HTMLElement>(`main :is(${selector})`)) {
      const r = c.getBoundingClientRect(), left = Math.max(r.left, C.left), right = Math.min(r.right, C.right), top = Math.max(r.top, C.top), bottom = Math.min(r.bottom, C.bottom);
      if (r.width === 0 || right - left < 4 || bottom - top < 4) continue;
      const x = (left + right) / 2, y = (top + bottom) / 2;
      if (x >= L.left && x <= L.right && y >= L.top && y <= L.bottom) continue; // under the resting launcher already
      if (document.elementFromPoint(x, y) !== c && !c.contains(document.elementFromPoint(x, y))) continue;
      c.setAttribute('data-y44-target', '');
      return {x, y, lift};
    }
    return null;
  }, CONTROL_SELECTOR);
  expect(target, 'Help has a first-screen control where the corner launcher would sit (why it rests lifted)').not.toBeNull();
  expect(target!.lift).toBeGreaterThan(0);
  await page.mouse.move(target!.x, target!.y);
  await page.mouse.down();
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const under = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-y44-target]'), [target!.x, target!.y]);
  await page.mouse.up();
  expect(under, 'the pressed control is still under the pointer, not the launcher').toBe(true);
});
