import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../ah-helpers';

/**
 * Session AO (DV-258c/D-013, owner decision 13 Nov; with D-194, DV-257c, D-070, DV-223, DV-247): one consistent page header on
 * every page, at 1280 and 388 px on a fresh device.
 * - The status row is the same on every page: on a computer the shared set (Game layer) and the lock where it belongs; on a
 *   phone only the lock, where it belongs (the rocket is a row in Apps & extras there, AL owner decision O3), so Journal and
 *   Notes are like Earn, Help or Tasks.
 * - Its right-hand cluster names the same controls in the same order everywhere: the page's own extras first (Habits'
 *   Vacation, on computers), then the shared set (Game layer), then the layout lock, only on a page that can be rearranged.
 * - No page leads "Back to Today" (Notes and Tasks did on phones); the logo link "ZIGoals home" is there instead.
 * - Nothing scrolls sideways; every cluster control is at least 44 x 44 px, and its visible word (where shown) at least 14 px.
 * - The icons carry visible words where they fit (D-070, DV-247): on a fresh device both widths have room for them.
 */
const SHARED = ['Game layer'];
const LOCK = 'Unlock layout to rearrange';
/** The pages a person can rearrange (they render LayoutLockButton). */
const REARRANGEABLE = new Set(['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth']);
/** A page's own extras, which come first; on phones Habits keeps Vacation in its page, not in the row. */
const EXTRAS: Readonly<Record<string, readonly string[]>> = {'/app/habits': ['Vacation']};
const PAGES = [['Today', '/app'], ['Goals', '/app/goals'], ['Habits', '/app/habits'], ['Health', '/app/health'], ['Wealth', '/app/wealth'], ['Earn', '/app/earn'], ['Portfolio', '/app/portfolio'], ['Help', '/app/help'], ['Governance', '/app/governance'], ['Notes', '/app/notes'], ['Journal', '/app/journal'], ['Tasks', '/app/tasks']] as const;

const expected = (path: string, phone: boolean) => [...(phone ? [] : EXTRAS[path] ?? []), ...(phone ? [] : SHARED), ...(REARRANGEABLE.has(path) ? [LOCK] : [])];

/** The cluster's controls in DOM order, with their names ("Game layer: on/off" counts as "Game layer") and boxes. */
const cluster = (page: Page) => page.evaluate(() => {
  const row = document.querySelector<HTMLElement>('.workspace > .status-row');
  if (!row) return [];
  const controls = [...row.querySelectorAll<HTMLElement>(':scope > .page-tools-slot button, :scope > .gamify > .gamify-trigger, :scope > .layout-lock-slot > .layout-lock')];
  return controls.filter(el => el.getClientRects().length).map(el => {
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().replace(/^Game layer: (on|off)$/, 'Game layer');
    const r = el.getBoundingClientRect(), word = el.querySelector<HTMLElement>('.gamify-word, .layout-lock-word');
    const wordBox = word?.getBoundingClientRect();
    return {name, width: r.width, height: r.height, top: r.top, right: r.right, word: word ? {text: word.textContent, shown: !!wordBox && wordBox.width > 1 && getComputedStyle(word).opacity !== '0', size: parseFloat(getComputedStyle(word).fontSize)} : null};
  });
});

for (const width of [1280, 388] as const) {
  test.describe(`${width} px, fresh device`, () => {
    test.beforeEach(async ({page, isMobile}) => {
      test.skip(isMobile && width === 1280, 'the computer width runs in the desktop project');
      await offlineApi(page);
      await page.setViewportSize({width, height: width === 1280 ? 900 : 844});
      await freshDevice(page);
    });

    test('every page has the same header: status row, cluster order, logo, no "Back to Today", no sideways scroll, 44 px targets', async ({page}) => {
      test.setTimeout(180_000);
      const phone = width < 768;
      for (const [label, path] of PAGES) {
        await page.goto(path);
        await hydrated(page);
        await expect(page.locator('main h1').first(), label).toBeVisible();
        await expect(page.locator('.workspace'), label).not.toHaveAttribute('aria-busy', 'true');
        // The same set, in the same order (the lock portals in after hydration, so this waits for it).
        const want = expected(path, phone);
        // A row with controls shows, at least one 44 px control tall.
        const row = page.locator('.workspace > .status-row');
        if (want.length) { await expect(row, label).toBeVisible(); expect((await row.boundingBox())!.height, label).toBeGreaterThanOrEqual(44); }
        await expect.poll(async () => (await cluster(page)).map(c => c.name), {message: `${label}: cluster order`, timeout: 10_000}).toEqual(want);
        const controls = await cluster(page);
        for (const c of controls) {
          expect(c.width, `${label}: ${c.name} width`).toBeGreaterThanOrEqual(44);
          expect(c.height, `${label}: ${c.name} height`).toBeGreaterThanOrEqual(44);
          expect(c.right, `${label}: ${c.name} inside the window`).toBeLessThanOrEqual(width);
          // D-070, DV-247: the icons say what they are; the word is part of the name, never below 14 px.
          if (c.word) {
            expect(c.word.shown, `${label}: ${c.name} shows its word`).toBe(true);
            expect(c.name.startsWith(c.word.text ?? '#'), `${label}: "${c.word.text}" is inside the name "${c.name}"`).toBe(true);
            expect(c.word.size, `${label}: ${c.name} word size`).toBeGreaterThanOrEqual(14);
          }
        }
        // One line: the cluster never wraps.
        expect(new Set(controls.map(c => Math.round(c.top / 4))).size, `${label}: one line`).toBeLessThanOrEqual(1);
        // The lock is always the cluster's last control, at the row's right end.
        if (REARRANGEABLE.has(path)) expect(controls.at(-1)!.name, label).toBe(LOCK);
        else await expect(page.locator('.layout-lock'), label).toHaveCount(0);
        // The logo, never "Back to Today".
        await expect(page.getByRole('link', {name: 'Back to Today', exact: true}), label).toHaveCount(0);
        await expect(page.getByRole('link', {name: 'ZIGoals home', exact: true}).filter({visible: true}), label).toHaveCount(1);
        // The phone's wallet shortcut says "Wealth" under its icon where the bar has room (it has at 388 px, fresh).
        if (phone) {
          const wealth = page.locator('.phone-topbar .phone-wealth');
          await expect(wealth, label).toBeVisible();
          await expect(wealth.locator('.phone-wealth-word'), label).toBeVisible();
          await expect(wealth.locator('.phone-wealth-word'), label).toHaveText('Wealth');
          const w = await wealth.evaluate(el => { const r = el.getBoundingClientRect(), word = el.querySelector<HTMLElement>('.phone-wealth-word')!; return {width: r.width, height: r.height, right: r.right, size: parseFloat(getComputedStyle(word).fontSize)}; });
          expect(w.width, label).toBeGreaterThanOrEqual(44);
          expect(w.height, label).toBeGreaterThanOrEqual(44);
          expect(w.size, label).toBeGreaterThanOrEqual(14);
          expect(w.right, label).toBeLessThanOrEqual(width);
        }
        // Nothing scrolls sideways.
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), label).toBeLessThanOrEqual(0);
      }
    });
  });
}
