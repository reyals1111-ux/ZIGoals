import {expect, test, type Page} from '@playwright/test';
import {axe, loadShowcase, note, offline, settle, THEMES, applyTheme, type Findings} from './p6-helpers';
// CI runs this sweep as its own suite of shards (ADR-036 C3); each test stands alone, so they may split across shards.
test.describe.configure({mode: 'parallel'});

/**
 * Session AK, owner follow-up 4 (P6): axe (WCAG 2.0/2.1/2.2 A and AA, tests/p6-helpers.ts) on every app route
 * (app/app/**\/page.tsx) in Nebula, Light and Dark, on a fresh start and in the Showcase; the desktop project at 1440 px
 * and the phone project at 390 px. /app/today and /app/goals/positions are redirects (to /app and /app/staking, both
 * checked); a missing address shows the app's own "not found". The pages with an id take one from the Showcase's own
 * links (on a fresh start the same address shows its honest "not found"). Each test gathers every finding and reports
 * them together; the expectation is none.
 */
const ROUTES = [
  '/app', '/app/goals', '/app/goals/new', '/app/goals/templates', '/app/goals/tracked', '/app/goals/average/new', '/app/habits',
  '/app/health', '/app/journal', '/app/journey', '/app/wealth', '/app/wealth/calculator', '/app/wealth/add-money', '/app/wealth/add-money/back',
  '/app/portfolio', '/app/markets', '/app/staking', '/app/earn', '/app/governance', '/app/ecosystem', '/app/activity', '/app/agenda',
  '/app/checklist', '/app/chess', '/app/guided', '/app/stories', '/app/timeline', '/app/review', '/app/notes', '/app/tasks', '/app/music',
  '/app/music/spotify', '/app/nova', '/app/nova/setup', '/app/nova/hermes', '/app/zigi', '/app/zigi/memory', '/app/settings',
  '/app/settings/data', '/app/settings/reminders', '/app/help', '/app/welcome', '/app/plans', '/app/share?text=A%20shared%20note', '/app/no-such-page',
  // The views a page opens in place: Health's full views and its hash views, Habits' year and routines.
  '/app/health?view=sleep', '/app/health?view=meditation', '/app/health?view=workouts', '/app/health?view=devices', '/app/health#weight',
  '/app/health#planner', '/app/health#insights', '/app/health#targets', '/app/health#measurements', '/app/health#import', '/app/habits#year',
  '/app/habits#routines',
];
/** The routes with an id: the first matching link the Showcase shows on the page named, or a fictional id. */
const WITH_ID: [page: string, pattern: RegExp, fallback: string][] = [
  ['/app/goals', /^\/app\/goals\/tracked\/[^/?#]+$/, '/app/goals/tracked/p6-fictional'],
  ['/app/goals', /^\/app\/goals\/average\/(?!new)[^/?#]+$/, '/app/goals/average/p6-fictional'],
  ['/app/goals', /^\/app\/goals\/(?!tracked|average|new|templates|positions)[^/?#]+$/, '/app/goals/p6-fictional'],
  ['/app/portfolio', /^\/app\/portfolio\/coin\/[^/?#]+$/, '/app/portfolio/coin/p6-fictional'],
  ['/app/wealth', /^\/app\/wealth\/asset\/[^/?#]+$/, '/app/wealth/asset/p6-fictional'],
];
async function idRoutes(page: Page): Promise<string[]> {
  const out: string[] = [];
  for (const [from, pattern, fallback] of WITH_ID) {
    await page.goto(from); await settle(page);
    const hrefs = await page.locator('main a[href]').evaluateAll(links => links.map(a => a.getAttribute('href') ?? ''));
    out.push(hrefs.find(h => pattern.test(h)) ?? fallback);
  }
  return out;
}

for (const theme of THEMES) for (const state of ['fresh', 'showcase'] as const) {
  test(`axe: every route, ${theme}, ${state}`, async ({page, isMobile}) => {
    test.setTimeout(600_000);
    if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
    await offline(page);
    await applyTheme(page, theme);
    if (state === 'showcase') await loadShowcase(page);
    const routes = [...ROUTES, ...await idRoutes(page)];
    const findings: Findings = {};
    for (const path of routes) {
      await page.goto(path);
      try { await settle(page); } catch { note(findings, path, ['the page did not settle']); continue; }
      // The theme is on, its sheet loaded (a page from the error shell gets it back after hydration: components/theme-restore.tsx).
      if (theme !== 'nebula') await expect.poll(() => page.evaluate(() => `${document.documentElement.dataset.theme}${(document.getElementById('zigoals-theme-sheet') as HTMLLinkElement | null)?.sheet ? '' : ' (sheet loading)'}`), {message: path}).toBe(theme).catch(() => note(findings, path, [`the ${theme} theme is not on`]));
      note(findings, path, await axe(page));
    }
    expect(findings).toEqual({});
  });
}
