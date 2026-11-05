import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../../ah-helpers';

/**
 * Session AL (owner decision O3, lane L10a): below 901 px nothing floats over the page. ZIGi, the Earn dock, Music and the
 * Checklist button move into one "Apps & extras" button (the phone's top bar; the tablet rail) that opens a sheet on every
 * page, Settings included. Closes the overlap family BUG-005 / BUG-034 / BUG-081 / N-051 / B-027 / D-066 / BN-071 /
 * TK-056 / MO-069 / MO-086 / NB-123 at the bots' widths, and BN-064 / BN-075 / PR-042 ("no ZIGi on Settings").
 * The Showcase shows every launcher (Music and Earn included); a fresh profile shows the defaults. Fictional data only;
 * every /api request answers 503.
 */
const WIDTHS = [335, 375, 480, 500, 545, 610, 767, 768] as const;
const PAGES = ['/app', '/app/health', '/app/wealth', '/app/goals', '/app/habits', '/app/settings'] as const;
const LAUNCHERS = '[data-testid="ai-launcher"], .ai-edge-tab, .music-launcher-stack, .music-edge-tab, .checklist-launcher-stack, .checklist-edge-tab, .earn-dock-stack, .earn-dock-edge';
const button = (page: Page) => page.getByTestId('apps-extras-button');
const sheet = (page: Page) => page.getByRole('dialog', {name: 'Apps & extras'});
test.beforeEach(async ({page}) => { await offlineApi(page); });

/** The Earn dock is off until chosen (also in the Showcase): switched on in the Showcase tab's own copy of Earn's prefs. */
async function showEarnDock(page: Page) {
  await page.evaluate(() => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); sessionStorage.setItem(`zigoals:showcase:v1:${marker.generation}:zigoals:earn-prefs:v1`, JSON.stringify({version: 1, dockShown: true})); });
}
async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main').first()).toBeVisible();
  await expect(button(page)).toBeVisible();
  // The launchers mount after hydration and after their records are read: give them that time to (wrongly) appear.
  await page.waitForTimeout(600);
}
/** Fixed or sticky boxes that are not the navigation chrome and that cover any visible word of `main` on the first screen. */
function coveredText(page: Page) {
  return page.evaluate(() => {
    const chrome = '.phone-topbar, .phone-tabbar, .app-sidebar, .aa-toast-region, .skip, dialog:not([open])';
    const boxes: {name: string; r: DOMRect}[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'sticky') continue;
      if (el.closest(chrome) || el.closest('main') || el.closest('[aria-hidden="true"]')) continue;
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0 || s.pointerEvents === 'none') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.width * r.height > innerWidth * innerHeight * .9) continue; // a backdrop or a page layer
      boxes.push({name: `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/).join('.')}`, r});
    }
    const hits: string[] = [];
    const walker = document.createTreeWalker(document.querySelector('main') ?? document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const t of range.getClientRects()) {
        if (t.bottom <= 0 || t.top >= innerHeight || t.width < 1) continue;
        for (const b of boxes) if (t.left < b.r.right && t.right > b.r.left && t.top < b.r.bottom && t.bottom > b.r.top) hits.push(`${b.name} over "${node.textContent.trim().slice(0, 30)}"`);
      }
    }
    return [...new Set(hits)];
  });
}

for (const width of WIDTHS) {
  test(`${width} px: no floating launcher and no fixed box over the page's words, on every page (Showcase)`, async ({page}) => {
    test.setTimeout(120_000);
    await page.setViewportSize({width, height: 800});
    await loadShowcase(page); await showEarnDock(page);
    for (const path of PAGES) {
      await ready(page, path);
      await expect(page.locator(LAUNCHERS).filter({visible: true}), `${width} ${path}`).toHaveCount(0);
      expect(await coveredText(page), `${width} ${path}`).toEqual([]);
      // One button, in the top bar on a phone and in the rail on a tablet; never sideways scroll.
      await expect(button(page)).toHaveCount(1);
      await expect(button(page)).toHaveAccessibleName('Apps & extras');
      const b = (await button(page).boundingBox())!;
      expect(b.width, `${width} ${path}`).toBeGreaterThanOrEqual(44); expect(b.height, `${width} ${path}`).toBeGreaterThanOrEqual(44);
      expect(b.x + b.width, `${width} ${path}`).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width} ${path}`).toBeLessThanOrEqual(0);
    }
  });
}

test('the sheet: every switched-on entry, focus kept inside, Escape and focus back, 44 px targets (375, Showcase)', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await loadShowcase(page);
  await ready(page, '/app/settings');
  await button(page).click();
  await expect(sheet(page)).toBeVisible();
  await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
  const entries = sheet(page).locator('.apps-extras-item strong');
  // Session AL third pass (L3's request, deliberate): the Showcase has the game layer on, and phones (no rocket in their
  // top rows) list it last; the order and every other entry are unchanged.
  await expect(entries).toHaveText(['ZIGi', 'NOVA', 'Checklist', 'Tasks', 'Notes', 'Journal', 'Agenda', 'Earn', 'Music', 'Game layer']);
  for (const box of await sheet(page).locator('.apps-extras-item, .apps-extras-close').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
  // The keyboard stays in the sheet.
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog.apps-extras-sheet') || document.activeElement === document.body)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  // Each page entry navigates (and the sheet is there on the new page too).
  for (const [name, path] of [['NOVA', '/app/nova'], ['Checklist', '/app/checklist'], ['Tasks', '/app/tasks'], ['Notes', '/app/notes'], ['Journal', '/app/journal'], ['Agenda', '/app/agenda'], ['Earn', '/app/earn']] as const) {
    await ready(page, '/app/habits');
    await button(page).click();
    await sheet(page).getByRole('link', {name: new RegExp(`^${name}\\b`)}).click();
    await page.waitForURL(url => url.pathname === path);
    await expect(sheet(page)).toBeHidden();
  }
  // ZIGi opens its panel; closing it gives the focus back to the button.
  await ready(page, '/app/health');
  await button(page).click();
  await sheet(page).getByRole('button', {name: /^ZIGi\b/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible({timeout: 15_000});
  await panel.getByRole('button', {name: /^Close ZIGi/}).click();
  await expect(panel).toHaveCount(0);
  await expect(button(page)).toBeFocused();
  // Music opens its player.
  await button(page).click();
  await sheet(page).getByRole('button', {name: /^Music\b/}).click();
  await expect(page.locator('.music-panel[role="dialog"]')).toBeVisible({timeout: 15_000});
});

test('switched-off entries are absent; fresh defaults hide Earn and Music; the Apps switches remove pages (500, fresh profile)', async ({page}) => {
  await page.setViewportSize({width: 500, height: 900});
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await ready(page, '/app/settings');
  await button(page).click();
  await expect(sheet(page).locator('.apps-extras-item strong')).toHaveText(['ZIGi', 'NOVA', 'Checklist', 'Tasks', 'Notes', 'Journal', 'Agenda']);
  await page.keyboard.press('Escape');
  // Settings → Your pages & buttons: Tasks and the ZIGi button off.
  const pages = page.locator('#your-pages');
  await pages.getByRole('group', {name: 'Apps'}).getByRole('switch', {name: 'Tasks'}).uncheck();
  await pages.getByRole('switch', {name: 'ZIGi button'}).uncheck();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:apps:v1') ?? '{}').hidden)).toEqual(['tasks']);
  await button(page).click();
  await expect(sheet(page).locator('.apps-extras-item strong')).toHaveText(['NOVA', 'Checklist', 'Notes', 'Journal', 'Agenda']);
  await page.keyboard.press('Escape');
  // A reload keeps the choice (device-only record).
  await ready(page, '/app');
  await button(page).click();
  await expect(sheet(page).getByText('Tasks', {exact: true})).toHaveCount(0);
});

test('the tablet rail carries the button (820), one in the page; phones carry it in the top bar', async ({page}) => {
  await page.setViewportSize({width: 820, height: 1000});
  await ready(page, '/app/goals');
  await expect(page.locator('.app-sidebar').getByTestId('apps-extras-button')).toBeVisible();
  await expect(button(page)).toHaveCount(1);
  await page.setViewportSize({width: 600, height: 900});
  await expect(page.locator('.phone-topbar').getByTestId('apps-extras-button')).toBeVisible();
  await expect(button(page)).toHaveCount(1);
});

test('1440: the floating launchers are unchanged, no "Apps & extras" button, the sidebar has its Apps group (Showcase)', async ({page, isMobile}) => {
  test.skip(isMobile, 'A computer window');
  await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page); await showEarnDock(page);
  await page.goto('/app'); await hydrated(page);
  await expect(page.getByTestId('ai-launcher')).toBeVisible();
  for (const selector of ['.music-launcher-stack', '.checklist-launcher-stack', '.earn-dock-stack']) await expect(page.locator(selector)).toBeVisible();
  await expect(button(page)).toHaveCount(0);
  await expect(page.getByTestId('sidebar-apps-group')).toBeVisible();
});
