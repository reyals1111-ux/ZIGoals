import {expect, test} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.12): Today's rail keeps its 64 px lane clear of the floating buttons, and in the narrow rail
 * (1001–1279 px) "ZIG reward reserve" stays on one line, whole, inside its card's text column.
 */
test.describe('the rail lane and the reward-reserve heading', () => {
  test.beforeEach(async ({browserName}, info) => { test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'Widths are set per test'); });
  for (const width of [1024, 1100, 1200, 1279]) {
    test(`${width} px: "ZIG reward reserve" on one line, and the lane kept`, async ({page}) => {
      await page.setViewportSize({width, height: 800});
      await page.goto('/app/settings');
      await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
      await page.waitForURL('**/app');
      const heading = page.locator('.staking-card h2');
      await expect(heading).toContainText('ZIG reward reserve');
      const read = await heading.evaluate(h => {
        const range = document.createRange(), text = [...h.childNodes].find(n => n.nodeType === 3 && (n.textContent ?? '').trim())!;
        range.selectNodeContents(text);
        const lines = [...range.getClientRects()].filter(r => r.width > 1), card = h.closest('.staking-card')!, cs = getComputedStyle(card), box = card.getBoundingClientRect();
        return {lines: lines.length, right: Math.max(...lines.map(r => r.right)), column: box.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth), fontSize: parseFloat(getComputedStyle(h).fontSize), height: h.getBoundingClientRect().height, lane: cs.paddingRight};
      });
      expect(read.lines).toBe(1);
      expect(read.height).toBeLessThanOrEqual(read.fontSize * 1.5);
      expect(read.right).toBeLessThanOrEqual(read.column + 0.5); // whole: not under the lane, not clipped
      expect(read.fontSize).toBeGreaterThanOrEqual(15);
      expect(read.lane).toBe('64px'); // the lane stays (text never under the floating buttons)
    });
  }
});
