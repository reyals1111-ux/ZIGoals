import {expect, test, type Page} from '@playwright/test';
import {CONTROL_SELECTOR} from '../components/ai/launcher-rest';
import {pressZigi} from './zigi-open';
import {afterGoto, openSettings} from './settings-open';

/**
 * Session X-Local Part 9, the owner's H7 (ADR-017 S81): on a phone the launcher's resting place covers no first-screen
 * control on any app page. X-Cloud measured its corner over Help's chips (45 %), Markets' refresh (25 %), Portfolio's
 * "+ New portfolio" (15 %), Today's "See how it works" (12 %) and Health's "Log food or water" (11 %); at the top of a
 * page the launcher now lifts to the nearest band that is free of `main`'s controls and returns to its corner on
 * scroll. A new device, every /api answered 503, two phone sizes; the launcher stays fully on screen (reachable) and the
 * edge tab (hide, then show again) keeps working.
 *
 * Session AL (owner decision O3, deliberate): below 901 px nothing floats; ZIGi has no launcher, resting place or edge tab on a
 * phone and opens from the top bar's "Apps & extras". Each test below now asserts that on the same pages and sizes (was: the
 * launcher's lifted rest, its corner, its edge tab and the press under the corner). The computer's launcher is unchanged and
 * tested elsewhere.
 */
const appsButton = (page: Page) => page.getByTestId('apps-extras-button');
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

/**
 * Session AK CI-3 (WebKit, 390x844 /app/health): the launcher places itself when it appears, 300 ms, 1.2 s and 3 s later,
 * and on every change to `main`; one sample at 1.6 s could read a placement the 3 s one corrects. Its final place is
 * read once that last timed placement has passed (counted from when the launcher was seen) and two samples in a row agree.
 */
async function settled(page: Page) {
  const since = Date.now();
  let r = await overlaps(page), last = '';
  await expect.poll(async () => { r = await overlaps(page); const key = JSON.stringify(r), same = key === last; last = key; return same && Date.now() - since > 3_300; }, {intervals: [250], timeout: 10_000}).toBe(true);
  return r;
}

for (const [width, height] of SIZES) {
  test(`${width}x${height}: on every app page the launcher rests clear of the first screen's controls and stays on screen`, async ({page}) => {
    test.setTimeout(150_000);
    await page.setViewportSize({width, height});
    await openSettings(page);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    const report: string[] = [];
    for (const path of PAGES) {
      await page.goto(path); await afterGoto(page, path);
      // Session AL (O3, deliberate): no floating launcher (was: visible, resting clear of the controls); "Apps & extras" is
      // in the top bar, fully on screen, a 44 px target.
      await expect(appsButton(page)).toBeVisible();
      const r = await settled(page); // the page's own first-screen parts settle
      expect(r.launcher, `${path}: no floating launcher`).toBeNull();
      expect(r.hits, `${path}: a first-screen control under the launcher`).toEqual([]);
      const A = (await appsButton(page).boundingBox())!;
      expect(A.x, `${path}: on screen`).toBeGreaterThanOrEqual(0); expect(A.y, `${path}: on screen`).toBeGreaterThanOrEqual(0);
      expect(A.x + A.width, `${path}: on screen`).toBeLessThanOrEqual(r.vw); expect(A.y + A.height, `${path}: on screen`).toBeLessThanOrEqual(r.vh);
      expect(Math.min(A.width, A.height), `${path}: a 44 px target`).toBeGreaterThanOrEqual(44);
      report.push(`${path} apps ${Math.round(A.x)},${Math.round(A.y)}–${Math.round(A.x + A.width)},${Math.round(A.y + A.height)}`);
    }
    console.log(`phone-rest ${width}x${height}:\n  ${report.join('\n  ')}`);
  });
}

test('390x844: scrolled past the top the launcher is back in its corner; hidden, the edge tab shows it again', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openSettings(page);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/help');
  // Session AL (O3, deliberate): no launcher at the top or scrolled (was: lifted, then back in its corner above the tab bar),
  // no chevron and no edge tab (was: hidden, then shown again from the tab); "Apps & extras" opens ZIGi.
  await expect(appsButton(page)).toBeVisible();
  await page.waitForTimeout(1600);
  expect((await overlaps(page)).launcher).toBeNull();
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);
  expect((await overlaps(page)).launcher).toBeNull();
  await expect(page.getByRole('button', {name: 'Hide ZIGi'})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Show ZIGi'})).toHaveCount(0);
  await pressZigi(page);
  await expect(page.locator('dialog.ai-chat[open]')).toBeVisible();
  await expect(page.locator('.ai-launcher')).toHaveCount(0);
});

// Session Y (ADR-018 Y44): a tap on a control that lies where the corner launcher would sit is the control's, from the
// press to the release. Before, the press's focus sent the launcher to its corner at once, onto that very control, so
// the release landed on the launcher and the tap was lost (run10-source-pinning:31's "Options for Bitcoin" in CI).
// Keyboard focus still sends it to the corner (a11y-wcag-x's 2.4.11 walk covers that path).
test('390x844: a press on a control under the corner keeps that control under the pointer until the release', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openSettings(page);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  // Session Z-Cloud Gate B (mechanics): a page whose first screen has a control where the corner is. Session AB-Design moved every game card to its page's bottom and the Goals cards below the first screen, so Help (its topic chips) is that page now; before that it was Activity's game card, and originally
  // Activity's game card to the page's bottom (owner request 9), so Goals is that page now: its first card's Details summary
  // sits under the corner at 390 px.
  // Session AF Gate C (moved at equal strength): Help on a phone now shows six topics and "All topics" (design review 2), so no
  // control sits under the corner there; the test takes the first of these pages whose first screen has one, and the
  // press check below is unchanged.
  // Session AL (O3, deliberate): there is no corner launcher on a phone any more, so nothing can take a press from a control
  // (was: a page with a control where the corner launcher would sit, pressed and released there). On each of those pages no
  // launcher is there, and a press on Goals' first first-screen control stays that control's until the release.
  for (const path of ['/app/help', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/markets', '/app/settings', '/app/earn']) {
    await page.goto(path); await afterGoto(page, path);
    await expect(appsButton(page)).toBeVisible();
    await page.waitForTimeout(1600);
    expect((await overlaps(page)).launcher, `${path}: no floating launcher`).toBeNull();
  }
  await page.goto('/app/goals');
  await expect(appsButton(page)).toBeVisible();
  // Session AL (CI12, CI 1561, every project): read 80 ms after the load, before the shell hydrated, every control's centre
  // hit `.app-content` (a local run at 6x CPU throttling showed it), and the page then moved 44 px. A person presses once the
  // page is ready: the control is chosen after the shell's hydration mark and the same settle as the loop above.
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  await page.waitForTimeout(1600);
  const target = await page.evaluate(selector => {
    for (const c of document.querySelectorAll<HTMLElement>(`main :is(${selector})`)) {
      const r = c.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.bottom > innerHeight || r.top < 0) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (document.elementFromPoint(x, y) !== c && !c.contains(document.elementFromPoint(x, y))) continue;
      c.setAttribute('data-y44-target', '');
      return {x, y};
    }
    return null;
  }, CONTROL_SELECTOR);
  expect(target, 'a first-screen control to press').not.toBeNull();
  await page.mouse.move(target!.x, target!.y);
  await page.mouse.down();
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const under = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[data-y44-target]'), [target!.x, target!.y]);
  await page.mouse.up();
  expect(under, 'the pressed control is still under the pointer, not the launcher').toBe(true);
});
