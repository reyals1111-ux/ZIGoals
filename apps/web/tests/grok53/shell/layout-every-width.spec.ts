import {expect, test, type Page} from '@playwright/test';
import {hydrated, offlineApi} from '../../ah-helpers';
import {applyTheme, THEMES} from '../../p6-helpers';
import {afterGoto} from '../../settings-open';

/**
 * Session AL (3c, lane L10a): the shell at every width in all three themes, fresh profile. Nairobi's NB-245 (a small
 * desktop window: the sidebar or rail beside the page squeezed Habits' header lede into one or two words a line next to
 * "+ New habit", and floating launchers covered the page) and the layout audit at 320 / 375 / 390 / 480 / 600 / 768 /
 * 1024 / 1440 / 1920: no sideways scroll, every shell control inside the window with a 44 px target, the page header's
 * lede readable, the search trigger reachable. Fictional data only; /api answers 503.
 */
const WIDTHS = [320, 375, 390, 480, 600, 610, 768, 1024, 1440, 1920] as const;
const PAGES = ['/app', '/app/habits', '/app/health', '/app/settings'] as const;
test.beforeEach(async ({page}) => { await offlineApi(page); });

async function ready(page: Page, path: string) {
  await page.goto(path); await afterGoto(page, path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}
/** Visible shell controls (the bars, the rail, the sidebar's search) that are cut by the window or smaller than 44 px. */
const shellProblems = (page: Page) => page.evaluate(() => {
  const out: string[] = [];
  const controls = document.querySelectorAll<HTMLElement>('.phone-topbar :is(a, button), .phone-tabbar > .phone-tabs a, .app-sidebar .app-nav a, .app-sidebar :is(.sidebar-actions, .sidebar-search, .apps-extras-rail) :is(a, button), .sidebar-apps :is(a, button)');
  for (const el of controls) {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden') continue;
    const name = `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}"`;
    if (r.left < -0.5 || r.right > innerWidth + 0.5) out.push(`${name} cut at the side (${Math.round(r.left)}–${Math.round(r.right)})`);
    if (r.width < 43.5 || r.height < 43.5) out.push(`${name} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return out;
});

for (const theme of THEMES) for (const width of WIDTHS) {
  test(`${theme} ${width} px: no sideways scroll, shell controls whole and 44 px, search reachable, header lede readable`, async ({page}) => {
    test.setTimeout(90_000);
    await applyTheme(page, theme);
    await page.setViewportSize({width, height: width < 768 ? 820 : 900});
    for (const path of PAGES) {
      await ready(page, path);
      const where = `${theme} ${width} ${path}`;
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), where).toBeLessThanOrEqual(0);
      expect(await shellProblems(page), where).toEqual([]);
      // Exactly one search trigger is shown, whatever the width.
      await expect(page.getByRole('button', {name: /^Search\b/}).filter({visible: true}), where).toHaveCount(1);
      // NB-245: a header's lede never shares its row with the actions so narrowly that it reads a word or two a line.
      const hero = page.locator('main .pillar-hero').first();
      if (await hero.count()) {
        const [h, l] = await Promise.all([hero.boundingBox(), hero.locator('.pillar-hero-lede').first().boundingBox()]);
        if (h && l) expect(l.width, `${where}: lede ${Math.round(l.width)} of ${Math.round(h.width)} px`).toBeGreaterThanOrEqual(Math.min(260, h.width * .6));
      }
    }
  });
}

test('NB-245: a ~610 px desktop window shows the rail, not the desktop sidebar, and Habits reads normally (Nairobi’s steps)', async ({page, isMobile}) => {
  test.skip(isMobile, 'A desktop browser window');
  await page.setViewportSize({width: 610, height: 760});
  await ready(page, '/app/habits');
  const rail = (await page.locator('.app-sidebar').boundingBox())!;
  expect(rail.width).toBeLessThanOrEqual(96);
  const lede = page.locator('main .pillar-hero-lede').first();
  const lines = await lede.evaluate(el => { const s = getComputedStyle(el), lh = parseFloat(s.lineHeight); return Math.round(el.getBoundingClientRect().height / (Number.isFinite(lh) ? lh : parseFloat(s.fontSize) * 1.4)); });
  expect(lines).toBeLessThanOrEqual(3);
  await expect(page.locator('[data-testid="ai-launcher"], .checklist-launcher-stack').filter({visible: true})).toHaveCount(0);
});
