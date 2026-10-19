import {expect, test} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.11): Wealth's chip row ("What you have": All · Accounts · Debts · Assets · each kind · Needs
 * attention) never wraps on a computer: one row at every width, "Needs attention" whole on it; at 1440 px the Showcase's
 * twelve chips fit without scrolling; where they do not fit the row scrolls sideways and every chip can be reached; chips
 * stay 44 px tall.
 */
test.describe('Wealth’s chip row', () => {
  test.beforeEach(async ({browserName}, info) => { test.skip(info.project.name !== 'desktop' || browserName !== 'chromium', 'Widths are set per test (phones keep their own scrolling row)'); });
  for (const width of [1024, 1280, 1440, 1920]) {
    test(`${width} px: one row, "Needs attention" whole, every chip reachable`, async ({page}) => {
      await page.setViewportSize({width, height: 900});
      await page.goto('/app/settings');
      await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
      await page.waitForURL('**/app');
      await page.goto('/app/wealth');
      const row = page.getByRole('region', {name: 'What you have', exact: true}).getByRole('group', {name: 'Show'});
      await expect(row.getByRole('button').last()).toHaveText(/^Needs attention \d+$/);
      const read = await row.evaluate(r => ({client: r.clientWidth, scroll: r.scrollWidth, chips: [...r.querySelectorAll('button')].map(b => { const box = b.getBoundingClientRect(); return {text: (b.textContent ?? '').trim(), top: Math.round(box.top), height: box.height, lines: Math.round(box.height / parseFloat(getComputedStyle(b).lineHeight || '20'))}; })}));
      expect(read.chips.length).toBeGreaterThanOrEqual(10);
      expect(new Set(read.chips.map(c => c.top)).size, JSON.stringify(read.chips)).toBe(1);
      for (const c of read.chips) expect(c.height, c.text).toBeGreaterThanOrEqual(44);
      const attention = read.chips.at(-1)!;
      expect(attention.height).toBeLessThan(50); // one line
      if (width >= 1440) expect(read.scroll).toBeLessThanOrEqual(read.client);
      // The last chip can always be brought into the row's view (the row scrolls; nothing is hidden).
      const last = row.getByRole('button').last();
      await last.scrollIntoViewIfNeeded();
      const [chip, box] = await Promise.all([last.boundingBox(), row.boundingBox()]);
      expect(chip!.x + chip!.width).toBeLessThanOrEqual(box!.x + box!.width + 0.5);
    });
  }
});
