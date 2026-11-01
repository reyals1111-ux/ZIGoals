import {expect, test, type Page} from '@playwright/test';

/**
 * Session AK G2 (RELEASE_REVIEW R20): from 1280 px the right-edge launcher column (ZIGi, the Checklist, music) floated over
 * the end of the content's lines. The main column keeps a gutter as wide as the launchers' lane (components/ui/ui.css),
 * Today's full-width parts too, so no line of text runs under them when it scrolls past; the launchers keep their place.
 * Showcase data (the fullest pages), at 1440 and 1280 px.
 */
const underLauncher = (page: Page) => page.evaluate(() => {
  const lane = [...document.querySelectorAll('.ai-launcher, .checklist-launcher-stack, .music-launcher-stack')].map(e => e.getBoundingClientRect()).filter(b => b.width > 0);
  if (!lane.length) return {lane: false, hits: [] as string[]};
  const left = Math.min(...lane.map(b => b.left)), hits: string[] = [];
  const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode, el = text.parentElement!;
    if (!text.textContent?.trim() || el.closest('.sr-only, [hidden]') || getComputedStyle(el).visibility === 'hidden' || el.getBoundingClientRect().width < 2) continue;
    const range = document.createRange(); range.selectNodeContents(text);
    for (const box of range.getClientRects()) {
      if (box.width === 0 || box.right <= left + 2) continue;
      // A line inside a sideways scroller (a chip row) past the scroller's own edge is clipped there, not under the lane.
      let a: HTMLElement | null = el, clipped = false;
      while (a && a !== document.body) { if (getComputedStyle(a).overflowX !== 'visible' && a.getBoundingClientRect().right < box.right - 1) { clipped = true; break; } a = a.parentElement; }
      if (!clipped) { hits.push(`"${text.textContent.trim().slice(0, 40)}" ends at ${Math.round(box.right)} (lane from ${Math.round(left)})`); break; }
    }
  }
  return {lane: true, hits};
});

for (const width of [1440, 1280]) test(`at ${width} px no line of text runs under the launchers (Today, Goals, Wealth, Health, Earn)`, async ({page, isMobile}) => {
  test.skip(isMobile, 'Phones keep the lane through scroll padding (phone-shell.css).');
  test.setTimeout(120_000);
  await page.setViewportSize({width, height: 900});
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  for (const path of ['/app', '/app/goals', '/app/wealth', '/app/health', '/app/earn']) {
    await page.goto(path);
    await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
    await expect(page.locator('.ai-launcher').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.dashboard-widget-reserve')).toHaveCount(0); // Today's widget area has mounted (R11)
    const result = await underLauncher(page);
    expect(result.lane, path).toBe(true);
    expect(result.hits, path).toEqual([]);
  }
});
