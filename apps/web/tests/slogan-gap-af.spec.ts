import {expect, test} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.9, ADR-028 H14): the hero slogan's two lines no longer touch. At 768 and 1920 px their letters'
 * boxes (the same text boxes the layout audit measures) stand at least 8 px apart; the change is one margin on the second
 * line only (the first line, the lede and the actions keep their own places; today-scene.spec covers the rest of the hero).
 */
for (const [width, height] of [[768, 1024], [1920, 1080]] as const) {
  test(`${width} px: the slogan's two lines stand at least 8 px apart`, async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'Widths are set per test (one project is enough)');
    await page.setViewportSize({width, height});
    await page.addInitScript(() => localStorage.setItem('zigoals:motion:v1', 'off'));
    await page.goto('/app');
    await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
    const lines = page.locator('.today-hero .orbit-slogan .slogan-line');
    await expect(lines).toHaveCount(2);
    await page.evaluate(() => document.fonts.ready);
    const read = await lines.evaluateAll(els => els.map(line => {
      const range = document.createRange(), boxes: DOMRect[] = [];
      for (const span of line.querySelectorAll('span')) for (const node of span.childNodes) if (node.nodeType === 3) { range.selectNodeContents(node); boxes.push(...range.getClientRects()); }
      return {top: Math.min(...boxes.map(b => b.top)), bottom: Math.max(...boxes.map(b => b.bottom)), margin: getComputedStyle(line).marginTop, box: line.getBoundingClientRect().toJSON() as DOMRect};
    }));
    const [first, second] = read;
    expect(second!.top - first!.bottom, `gap at ${width} px`).toBeGreaterThanOrEqual(8);
    expect(first!.margin).toBe('0px');
    expect(parseFloat(second!.margin)).toBeGreaterThanOrEqual(13);
    // The lines keep their left edge and width (only the second moved down).
    expect(second!.box.left).toBe(first!.box.left);
  });
}
