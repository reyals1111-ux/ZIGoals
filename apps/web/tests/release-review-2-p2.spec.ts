import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from './chain-choice';
import {ALPHA_LABEL, ALPHA_LABEL_CHOSEN, ALPHA_LINE_PLAIN, ALPHA_MORE_HREF, ALPHA_SENTENCE, aboutAlpha, alphaNotice} from './ab-shell';
import {hydrated} from './ah-helpers';

/**
 * Session AK P2 (owner follow-up 4: RELEASE_REVIEW_2 to zero; ADR-036 Q31). Desktop only: the phone already folds the
 * notice to "PUBLIC ALPHA · More" and lists Tasks, Notes and the Journal in More (tests/phone-shell, tests/brand-nav-polish).
 * - R2-7: a device that never chose the chain reads the consumer line in the Alpha notice; the staking sentence is behind
 *   its More (Help → About this Alpha, word for word) and in Settings' facts block. Once the chain is chosen the notice
 *   carries the sentence, as before. The owner's hosted check reads it there too (scripts/lib/hosted-alpha-stages.mjs).
 * - R2-10 (desktop): Tasks, Notes and the Journal join the desktop sidebar where the window has room for them (at least
 *   TALL px tall), before Settings, each a 44 px target, and Help still ends inside the window in the Showcase's fullest
 *   list; in a 900 px window they stay out, so the PROTECTED fit check (tests/brand-nav-polish.spec.ts) stands unchanged.
 * - R2-24 (re-checked, not reproduced): the Health and Wealth header actions sit with the title and subtitle at 1440.
 * - R2-14: the energy tile names the input still missing.
 * Fictional data only; every /api request answers 503.
 */
const TALL = 1380;
test.beforeEach(async ({page, isMobile}) => {
  test.skip(isMobile, 'Desktop notice and sidebar; the phone has its own specs');
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}
async function showcase(page: Page) {
  await page.goto('/app/settings'); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app');
}

test('R2-7: a device that never chose the chain reads the consumer line; the staking sentence is behind More, word for word', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page, '/app');
  const notice = alphaNotice(page), line = notice.locator('p').first();
  await expect(notice.locator('strong')).toHaveText(ALPHA_LABEL);
  await expect(line).toContainText(ALPHA_LINE_PLAIN);
  await expect(line).not.toContainText(ALPHA_SENTENCE);
  await expect(line).not.toContainText(/stak|wallet|sign/i);
  await expect(line).toBeInViewport();
  const more = notice.getByRole('link', {name: 'More', exact: true});
  await expect(more).toHaveAttribute('href', ALPHA_MORE_HREF);
  await more.click(); await page.waitForURL(url => url.pathname === '/app/help');
  const about = page.locator('#help-z-about');
  await expect(about).toHaveAttribute('open', '');
  await expect(about).toContainText(ALPHA_SENTENCE);
  await expect(about.getByText(ALPHA_SENTENCE, {exact: false})).toBeVisible();
  // Settings' facts block carries it as before (the label a device that never chose reads).
  await ready(page, '/app/settings');
  await expect(aboutAlpha(page).locator('.network-banner strong')).toHaveText(ALPHA_LABEL);
  await expect(aboutAlpha(page).locator('.network-banner')).toContainText(ALPHA_SENTENCE);
});

test('R2-7: once the chain is chosen, the notice carries the sentence again', async ({page}) => {
  await chooseChain(page);
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page, '/app');
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL_CHOSEN);
  await expect(alphaNotice(page).locator('p').first()).toContainText(ALPHA_SENTENCE);
  await expect(alphaNotice(page).locator('.alpha-notice-sentence')).toHaveCount(0);
});

test('R2-10: in a tall window Tasks, Notes and the Journal are in the desktop sidebar, before Settings; at 900 px they wait', async ({page}) => {
  // The Showcase with the chain chosen: the fullest list (sixteen destinations), the one the protected fit check measures.
  await chooseChain(page);
  await page.route('**/api/market-**', route => route.fulfill({status: 503, contentType: 'application/json', body: '{"error":"fixture offline"}'}));
  await showcase(page);
  const nav = page.getByRole('navigation', {name: 'Main navigation'}), sidebar = page.locator('.app-sidebar');
  const base = ['Today', 'Goals', 'Habits', 'Health', 'Wealth', 'Earn', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Chess', 'Activity', 'NOVA', 'Checklist'];
  await page.setViewportSize({width: 1440, height: 900});
  await expect.poll(() => nav.getByRole('link').allTextContents()).toEqual([...base, 'Settings', 'Help']);
  for (const height of [TALL, 1600]) {
    await page.setViewportSize({width: 1440, height});
    await expect.poll(() => nav.getByRole('link').allTextContents(), `${height}`).toEqual([...base, 'Tasks', 'Notes', 'Journal', 'Settings', 'Help']);
    await sidebar.evaluate(s => { s.scrollTop = 0; });
    // Room for them: Help's whole row ends inside the window with the same 24 px to spare as the 900 px check.
    const help = (await nav.getByRole('link', {name: 'Help', exact: true}).boundingBox())!;
    expect(help.y + help.height, `${height}`).toBeLessThanOrEqual(height - 24);
    for (const name of ['Tasks', 'Notes', 'Journal']) {
      const box = (await nav.getByRole('link', {name, exact: true}).boundingBox())!;
      expect(box.height, `${name} at ${height}`).toBeGreaterThanOrEqual(44);
    }
    // In the last group, spaced like it (no new group, no divider).
    const gaps = await nav.getByRole('link').evaluateAll(items => items.map((item, i) => i ? item.getBoundingClientRect().top - items[i - 1]!.getBoundingClientRect().bottom : 0));
    for (let i = 13; i < 18; i++) expect(Math.abs(gaps[i]! - gaps[1]!), `row ${i} at ${height}`).toBeLessThan(1);
    expect(await sidebar.evaluate(s => s.scrollWidth - s.clientWidth)).toBe(0);
  }
  // A real destination: the highlight and aria-current follow it, and the keyboard reaches it in the order seen.
  await nav.getByRole('link', {name: 'Notes', exact: true}).click(); await page.waitForURL('**/app/notes');
  await expect(nav.getByRole('link', {name: 'Notes', exact: true})).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', {name: 'ZIGoals home', exact: true}).focus();
  const order: string[] = [];
  for (let i = 0; i < 19; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')); }
  expect(order).toEqual([...base, 'Tasks', 'Notes', 'Journal', 'Settings', 'Help']);
  // Back to a 900 px window: they leave the sidebar again (they stay in search, the tablet rail and the phone's More).
  await page.setViewportSize({width: 1440, height: 900});
  await expect(nav.getByRole('link', {name: 'Tasks', exact: true})).toBeHidden();
});

test('R2-24: at 1440 the Health and Wealth header actions sit with the title and subtitle, as on Goals and Habits', async ({page}) => {
  // Re-checked by lane P2 on the build of 50b71ba2 (fresh and Showcase, 1280/1440/1920): Goals, Habits and Health share one
  // header grid (the actions beside the subtitle, flush with the title's right edge); Wealth's longer title stacks them on
  // the line under its subtitle, flush with its left edge. Neither floats apart; this pins both, and that Health matches.
  await page.setViewportSize({width: 1440, height: 900});
  const modes: Record<string, string> = {};
  for (const path of ['/app/goals', '/app/habits', '/app/health', '/app/wealth']) {
    await ready(page, path);
    const hero = page.locator('.pillar-hero').first();
    const box = async (selector: string) => (await hero.locator(selector).first().boundingBox())!;
    const title = await box('h1'), lede = await box('.pillar-hero-lede'), actions = await box('.pillar-hero-actions'), art = await box('.pillar-hero-art');
    expect(actions.y, path).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(actions.x + actions.width, path).toBeLessThanOrEqual(art.x + 1);
    const beside = actions.y < lede.y + lede.height && actions.y + actions.height > lede.y;
    if (beside) expect(Math.abs(actions.x + actions.width - (title.x + title.width)), path).toBeLessThanOrEqual(2);
    else { expect(Math.abs(actions.x - lede.x), path).toBeLessThanOrEqual(2); expect(actions.y - (lede.y + lede.height), path).toBeGreaterThanOrEqual(-1); expect(actions.y - (lede.y + lede.height), path).toBeLessThanOrEqual(32); }
    modes[path] = beside ? 'beside' : 'below';
  }
  expect(modes['/app/health']).toBe(modes['/app/goals']);
  expect(modes['/app/habits']).toBe(modes['/app/goals']);
});

test('R2-14: the Showcase energy tile names the input still missing, never a met count such as "28 of 14 days"', async ({page}) => {
  await showcase(page); await ready(page, '/app/health');
  const tile = page.locator('.health-hl-tile[data-tone="energy"]');
  await expect(tile).toBeVisible();
  const figure = (await tile.locator('.health-hl-figure').textContent()) ?? '';
  const count = /(\d+) of (\d+)/.exec(figure);
  if (count) {
    // Still gathering: the figure is a count that is not yet met, and the note names what is missing.
    expect(Number(count[1]), figure).toBeLessThan(Number(count[2]));
    await expect(tile.locator('.health-hl-note')).toHaveText(/^\d+ more (weigh-ins?|logged days?)( and \d+ more logged days?)? to go$/);
  } else await expect(tile.locator('.health-hl-figure')).toContainText('kcal a day');
});
