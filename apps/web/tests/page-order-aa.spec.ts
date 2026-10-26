import {expect, test, type Page} from '@playwright/test';

/**
 * Session AA-Cloud Part 1 (docs/product/PAGE_ORDER_AA.md): every page in order. Each test checks the new default order
 * of a page's sections and that every section the page had before (`32cb9c5`, Alpha #37) is still there, by name and
 * count. The "before" lists were read from 32cb9c5's own production build with the Showcase loaded (desktop and phone).
 */
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 600;

async function showcase(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
}
/** The page's movable items (LayoutRegion) in document order. */
const items = (page: Page) => page.locator('main [data-layout-item]').evaluateAll(els => els.map(e => e.getAttribute('data-layout-item')!));
/** True when every element appears in the document in the given order. */
async function inOrder(page: Page, selectors: string[]) {
  return page.evaluate(sels => {
    const els = sels.map(s => document.querySelector(s));
    if (els.some(e => !e)) return `missing: ${sels.filter((_, i) => !els[i]).join(', ')}`;
    for (let i = 1; i < els.length; i++) if (!(els[i - 1]!.compareDocumentPosition(els[i]!) & Node.DOCUMENT_POSITION_FOLLOWING)) return `${sels[i - 1]} is not before ${sels[i]}`;
    return 'ok';
  }, selectors);
}
const only = (list: string[], prefix: string) => list.filter(id => id.startsWith(prefix));

test('Today: hero, Today’s focus, grouped widgets, For you, then updates and summaries; every module kept', async ({page}) => {
  await showcase(page);
  const today = page.locator('main');
  await expect(today.getByRole('heading', {name: 'Today’s focus'})).toBeVisible();
  await expect(today.locator('.today-group-heading')).toHaveText(['Your whole life', 'Your day', 'Goals', 'Money', 'Your widgets']);
  // Each heading opens its group's first card (it is never a movable item of its own).
  await expect(today.locator('[data-module="whole-life"] > .today-group-heading')).toHaveText('Your whole life');
  // Session AC (deliberate, the owner's "each thing once"): Daily Habits stands down for its widget twin (the same list),
  // which opens "Your day" in its place; the Next Goal action stands down for the focus tile's "Next step".
  await expect(today.locator('[data-module="preset-balanced-1"] > .today-group-heading')).toHaveText('Your day');
  await expect(today.locator('[data-layout-item^="group:"]')).toHaveCount(0);
  expect(await inOrder(page, ['#dashboard-title', '.today-focus', '[data-module="whole-life"]', '[data-module="preset-balanced-1"]', '[data-module="health"]', '[data-module="attention"]', '[data-module="goals"]', '[data-module="needs-attention"]', '[data-module="summary"]', 'section.for-you[aria-label="For you"]', 'section.for-you[aria-label="Updates and summaries"]', '[data-layout-item="today:week"]'])).toBe('ok');
  // Three focus tiles: the next goal step, water, and sleep or fasting; the habits tile stands down beside the habits widget, which lists the due habits itself (Session AB-Design, owner request 12).
  await expect(today.locator('.today-focus .focus-tile')).toHaveCount(3);
  await expect(today.locator('.today-focus .focus-tile[data-tone="habits"]')).toHaveCount(0);
  await expect(today.locator('.habits-today').first()).toBeVisible();
  // Every module 32cb9c5's Today showed with the Showcase is still there, once each (the rail's four included).
  const modules = (await today.locator('[data-module]').evaluateAll(els => els.map(e => e.getAttribute('data-module')!))).sort();
  // Session AC: the two twins are kept, hidden by default; arranging lists each with "Show card" (asserted below).
  expect(modules).toEqual(['activity', 'attention', 'destination', 'funding', 'goals', 'health', 'needs-attention', 'preset-balanced-0', 'preset-balanced-1', 'preset-balanced-2', 'preset-balanced-3', 'progress', 'staking', 'summary', 'wallet', 'watchlist', 'whole-life'].sort());
  await expect(today.locator('.habits-today[aria-labelledby]')).toHaveCount(1);
  // What's new and the weekly review sit with the summaries now, still as For you cards behind the same fold rules.
  const end = page.getByRole('region', {name: 'Updates and summaries', exact: true});
  // On a phone the area's cards wait behind its one row.
  const fold = end.getByRole('button', {name: /^Show more/});
  if (isPhone(page)) { await expect(end.locator('.for-you-slot')).toHaveCount(0); await fold.click(); }
  await expect(end.locator('[data-card="whats-new"]')).toHaveCount(1);
  const links = only(await items(page), 'today:');
  expect(links).toEqual(['today:week', 'today:game', 'today:links']); // Session AB-Design (owner request 11): week, the game card (Gamify is on in the Showcase), My links last
});

test('Today: a person’s own arrangement shows as saved, without group headings', async ({page}) => {
  await showcase(page);
  // Session AC: arranging also lists the built-ins hidden by default (as "… is hidden from Today."); the order compared is
  // the shown modules', as before.
  const modules = () => page.locator('.dashboard-layout-grid > .placed-module[data-module]:not([data-hidden="true"])').evaluateAll(list => list.map(e => e.getAttribute('data-module')));
  await expect(page.locator('.today-group-heading').first()).toBeVisible();
  const before = await modules();
  expect(before.length).toBeGreaterThan(2);
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  // Arranging shows no group headings; every module stays movable.
  await expect(page.locator('.today-group-heading')).toHaveCount(0);
  // Gate C audit: arrange for real: the second module moves first, is saved, and survives a reload, without headings.
  const second = page.locator(`.dashboard-layout-grid > .placed-module[data-module="${before[1]}"]`);
  // Session AC: by default the second shown module is the habits widget (Daily Habits' twin), whose own ⋯ moves it. While
  // arranging, the hidden Daily Habits is listed right before it, so each "Move earlier" is one step in that full list
  // (asserted per step) and the twin passes the hidden card, then the first module.
  const arranged = () => page.locator('.dashboard-layout-grid > .placed-module[data-module]').evaluateAll(list => list.map(e => e.getAttribute('data-module')));
  const start = await arranged(), from = start.indexOf(before[1]!), to = start.indexOf(before[0]!);
  expect(to).toBeGreaterThanOrEqual(0); expect(from).toBeGreaterThan(to);
  for (let step = 0; step < from - to; step++) {
    const now = await arranged(), at = now.indexOf(before[1]!);
    if (await second.locator('.dashboard-builtin-options').count()) { await second.locator('.dashboard-builtin-options .card-options-trigger').click(); await second.getByRole('button', {name: 'Move earlier'}).click(); }
    else { await second.locator('.card-options-trigger').first().click(); await second.getByRole('button', {name: /^Move .+ up$/}).filter({hasText: 'Move earlier'}).click(); }
    await expect.poll(arranged).toEqual([...now.slice(0, at - 1), now[at], now[at - 1], ...now.slice(at + 1)]);
  }
  await expect.poll(modules).toEqual([before[1], before[0], ...before.slice(2)]);
  await page.getByRole('button', {name: 'Finish customizing', exact: true}).click();
  await page.reload();
  await expect.poll(modules).toEqual([before[1], before[0], ...before.slice(2)]);
  await expect(page.locator('.today-group-heading')).toHaveCount(0);
});

test('Wealth: the tracker row, then holdings and accounts, then the tools, then history and evidence', async ({page}) => {
  await showcase(page);
  await page.goto('/app/wealth');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.locator('[data-layout-item="wealth:holdings"]')).toBeVisible();
  const order = only(await items(page), 'wealth:');
  expect(order).toEqual(isPhone(page)
    // Session AB-Design (owner request 26): the calculator is the last section on every width.
    // Session AC (the owner's decision of 2026-10-15): the three holdings lists are one item, wealth:holdings.
    ? ['wealth:pulse', 'wealth:holdings', 'wealth:composition', 'wealth:mix', 'wealth:watchlist', 'wealth:history', 'wealth:changes', 'wealth:evidence', 'wealth:allocation', 'wealth:calculator']
    : ['wealth:pulse', 'wealth:holdings', 'wealth:composition', 'wealth:mix', 'wealth:watchlist', 'wealth:history', 'wealth:changes', 'wealth:evidence', 'wealth:allocation', 'wealth:calculator']);
});

test('Goals: the cards first, Health goals with them, the timeline after', async ({page}) => {
  await showcase(page);
  await page.goto('/app/goals');
  await expect(page.getByRole('heading', {name: 'Your Goals', level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Hall of achievements'})).toBeVisible();
  // Every section is a layout item (it can be moved), in the default order: items, tools, the Hall, then the timeline.
  // Session AB-Design (owner request 14): the summary figures are their own movable block right after the cards.
  expect(only(await items(page), 'goals:')).toEqual(['goals:collection', 'goals:summary', 'goals:health', 'goals:balance', 'goals:templates', 'goals:hall', 'goals:milestones']);
  await expect(page.locator('article.average-goal-card[data-layout-item]')).toHaveCount(2);
});

test('Staking: tracked positions first; on a phone the wallet and scenario tools follow them', async ({page}) => {
  await showcase(page);
  await page.goto('/app/staking');
  await expect(page.locator('#observed-positions-title')).toBeVisible();
  expect(only(await items(page), 'positions:')).toEqual(['positions:observed', 'positions:manual', 'positions:showcase', 'positions:providers', 'positions:sources']);
  await expect(page.locator('.positions-rail')).toHaveCount(1);
  if (isPhone(page)) {
    expect(await inOrder(page, ['.page-heading h1', '.position-metrics', '#observed-positions-title', '.positions-rail'])).toBe('ok');
    // Visually too: the tools sit below the positions' heading.
    const heading = await page.locator('#observed-positions-title').boundingBox(), rail = await page.locator('.positions-rail').boundingBox();
    expect(rail!.y).toBeGreaterThan(heading!.y);
  } else {
    expect(await inOrder(page, ['.positions-top .positions-rail', '#observed-positions-title'])).toBe('ok');
  }
});

test('Activity: the feed comes before the favourites card', async ({page}) => {
  await showcase(page);
  await page.goto('/app/activity');
  await expect(page.getByRole('region', {name: 'Unified private activity'})).toBeVisible();
  expect(only(await items(page), 'activity:')).toEqual(['activity:sources', 'activity:timeline', 'activity:favourites']);
});

test('Portfolio: each portfolio’s holdings come right after its figures', async ({page}) => {
  await showcase(page);
  await page.goto('/app/portfolio');
  const panel = page.locator('.portfolio-panel').first();
  await expect(panel).toBeVisible();
  expect(await panel.evaluate(p => {
    const table = p.querySelector('table'), chart = p.querySelector('.portfolio-overview');
    return !!table && !!chart && !!(table.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
});

test('Markets, Health and Help keep their sections; Settings keeps its six groups', async ({page}) => {
  await showcase(page);
  await page.goto('/app/markets');
  await expect(page.locator('[data-layout-item="markets:explorer"]')).toBeVisible();
  expect(only(await items(page), 'markets:')).toEqual(['markets:explorer', 'markets:sources']);
  await page.goto('/app/health');
  await expect(page.locator('[data-layout-item="health:summary"]')).toBeAttached();
  // Session AH Part 6 (DE8): the Workouts card joins after Meditation (deliberate; the order is otherwise unchanged).
  expect(only(await items(page), 'health:')).toEqual(['health:summary', 'health:nutrition', 'health:journal', 'health:sleep', 'health:meditation', 'health:workouts', 'health:roadmap', 'health:fasting', 'health:trends']);
  await page.goto('/app/settings');
  await expect(page.locator('.settings-group-title')).toHaveText(['Data & privacy', 'Your app', 'Your areas', 'Account & devices', 'ZIGi', 'Help & diagnostics']);
});

test('Settings: the in-page index stays in view while the page scrolls (computers and tablets)', async ({page}) => {
  test.skip(isPhone(page), 'A phone has its own list of rows instead of the index.');
  await page.goto('/app/settings');
  const index = page.getByRole('navigation', {name: 'Settings sections'});
  await expect(index).toBeVisible();
  await page.locator('#settings-help').scrollIntoViewIfNeeded();
  await expect(index).toBeInViewport();
  const box = await index.boundingBox();
  expect(box!.y).toBeLessThan(2);
});

test('Help: the topic index is two columns on a phone and ZIGi’s section eyebrow keeps one line', async ({page}) => {
  test.skip(!isPhone(page), 'Phone layout.');
  await page.goto('/app/help');
  const links = page.locator('nav.help-topics a');
  await expect(links.first()).toBeVisible();
  // Session AF Gate C (design critique; deliberate, as strict): a phone shows six topics with "All topics" under them;
  // with every topic shown, all eighteen still sit in the same two columns.
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  await page.getByRole('button', {name: 'All topics', exact: true}).click();
  await expect(links).toHaveCount(18);
  for (const link of await links.all()) await expect(link).toBeVisible();
  const lefts = new Set((await links.evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().left)))));
  expect(lefts.size).toBe(2);
  const eyebrow = page.locator('#your-ai > .eyebrow');
  const lines = await eyebrow.evaluate(e => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)));
  expect(lines).toBe(1);
  expect(parseFloat(await eyebrow.evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
});
