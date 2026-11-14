import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../ah-helpers';

/**
 * Session AP (owner decision 14 Nov, 4a; ADR-040): on a computer the launchers fold into the edge while they would cover
 * content (Today's right column at 1440 as the page scrolls) and come back when nothing is under them; the
 * keyboard focus brings them back (never the pointer, which they would move away from); the change waits 150 ms (no flicker), never moves the focus; Motion Off and reduced
 * motion slide nothing; phones have no floating launchers to fold.
 */
const tucked = (page: Page) => page.evaluate(() => document.documentElement.hasAttribute('data-launchers-tucked'));
const zigi = (page: Page) => page.locator('.ai-launcher');
const slide = (page: Page) => zigi(page).evaluate(el => parseFloat(getComputedStyle(el).translate) || 0);

test.describe('on a computer', () => {
  test.use({viewport: {width: 1440, height: 900}});
  test.beforeEach(async ({page}, info) => { test.skip(info.project.name !== 'desktop', 'computers only: phones keep their launchers in Apps & extras'); await offlineApi(page); await loadShowcase(page); await page.goto('/app'); await hydrated(page); await expect(zigi(page)).toBeVisible(); });

  test('scrolling Today folds the column while it covers the right column, steadily, and every button stays in the window', async ({page}) => {
    const states: boolean[] = [];
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 300) { await page.evaluate(top => window.scrollTo(0, top), y); await page.waitForTimeout(260); states.push(await tucked(page)); }
    expect(states, 'folded somewhere over Today').toContain(true);
    // Folded: slid by 40 px, the centre still inside the window, nothing else moved.
    await page.evaluate(top => window.scrollTo(0, top), states.indexOf(true) * 300); await page.waitForTimeout(400);
    await expect.poll(() => tucked(page)).toBe(true);
    await expect.poll(() => slide(page)).toBe(40);
    const box = (await zigi(page).locator('.ai-launcher-button').boundingBox())!;
    expect(box.x + box.width / 2).toBeLessThan(1440);
    // Pointing leaves it where it is (it never moves from under the pointer; ADR-040 D24e); the keyboard focus brings it back.
    await zigi(page).locator('.ai-launcher-button').hover();
    await page.waitForTimeout(200);
    expect(await slide(page)).toBe(40);
    await zigi(page).locator('.ai-launcher-button').focus();
    await expect.poll(() => slide(page)).toBe(0);
  });

  test('no flicker: a quick scroll changes the state at most once per direction; a change waits 150 ms', async ({page}) => {
    await page.evaluate(() => {
      const w = window as unknown as {flips: number[]};
      w.flips = [];
      new MutationObserver(() => w.flips.push(performance.now())).observe(document.documentElement, {attributes: true, attributeFilter: ['data-launchers-tucked']});
    });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    // Small steps every frame, as a wheel does: the state may change, but never back and forth within 150 ms.
    await page.evaluate(async h => { for (let y = 0; y < Math.min(h, 2400); y += 24) { window.scrollTo(0, y); await new Promise(r => requestAnimationFrame(r)); } }, height);
    await page.waitForTimeout(400);
    const flips = await page.evaluate(() => (window as unknown as {flips: number[]}).flips);
    for (let i = 1; i < flips.length; i++) expect(flips[i]! - flips[i - 1]!, 'two changes closer than 150 ms').toBeGreaterThanOrEqual(150);
  });

  test('the keyboard focus brings it back and is never moved; reduced motion slides nothing', async ({page}) => {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height && !(await tucked(page)); y += 300) { await page.evaluate(top => window.scrollTo(0, top), y); await page.waitForTimeout(260); }
    await expect.poll(() => tucked(page)).toBe(true);
    const button = zigi(page).locator('.ai-launcher-button');
    await button.focus();
    await expect.poll(() => slide(page)).toBe(0);
    await page.evaluate(() => window.scrollBy(0, 120)); await page.waitForTimeout(400);
    await expect(button).toBeFocused();
    await page.emulateMedia({reducedMotion: 'reduce'});
    expect(await zigi(page).evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
  });
});

test('on a phone: no floating launchers, so nothing folds', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone check');
  await offlineApi(page); await loadShowcase(page); await page.goto('/app'); await hydrated(page);
  await page.evaluate(() => window.scrollTo(0, 1200)); await page.waitForTimeout(500);
  expect(await tucked(page)).toBe(false);
});
