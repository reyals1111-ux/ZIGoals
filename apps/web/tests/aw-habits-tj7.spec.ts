import {expect, test, type Locator, type Page} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {hydrated} from './ah-helpers';
import {axe, applyTheme, offline, THEMES} from './p6-helpers';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue} from '../lib/habits';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AW (habits-tj7; owner decision 1e, FR-TJ-7, approved inside the Habits baseline): today's habits and their
 * Complete buttons come first, on a phone and on a computer. Empty Morning / Afternoon / Evening groups fold into one
 * "Add a habit" line after the groups; a consistency card with nothing to show yet ("Your last 30 days" without a
 * check-in, "Your week in motion" at all 0, "Trend per habit" while every habit reads "Not enough days yet") stays hidden,
 * one teaching line in its place. The hero, the cards and the navigation are as they were.
 * At 390 × 844 (the mobile project) and 1440 × 900 (the desktop project); an empty profile with one habit and the
 * Showcase; Nebula, Light and Dark; axe-clean. Fictional data; every /api call answers 503. Nothing here moves, so there
 * is no Motion Off case.
 *
 * "The first screen": the first card's Complete starts no more than one viewport height below the app's top bar (the
 * phone's `.phone-topbar`; a computer has none, so its page top), read at the top of the page. Before: y 1,680–2,004 on a phone
 * and 2,570 at 1440 with one habit; 2,004 and 2,461 in the Showcase (FRIEND_READINESS FR-TJ-7).
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const size = (isMobile: boolean) => isMobile ? {width: 390, height: 844} : {width: 1440, height: 900};
const firstComplete = (page: Page) => page.locator('.habits-workspace .habit-grid > .habit-card .habit-check-actions button[aria-pressed]').first();
const before = (page: Page, first: string, second: string) => page.evaluate(([a, b]) => { const x = document.querySelector(a!), y = document.querySelector(b!); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); }, [first, second]);

/** The first card's Complete, read at the top of the page: its top, the top bar's bottom and the viewport's height. */
async function onFirstScreen(page: Page, complete: Locator) {
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(complete).toBeVisible();
  const m = await complete.evaluate(button => {
    const bar = ['.phone-topbar', '.app-topbar'].map(s => document.querySelector(s)?.getBoundingClientRect()).find(r => r && r.width > 0 && r.height > 0);
    return {top: button.getBoundingClientRect().top + scrollY, header: bar ? bar.bottom + scrollY : 0, height: innerHeight};
  });
  test.info().annotations.push({type: 'first Complete', description: JSON.stringify(m)});
  // A phone has its top bar; a computer's layout has none (the sidebar), so there the header is the page top (0).
  if (test.info().project.name === 'mobile') expect(m.header, JSON.stringify(m)).toBeGreaterThan(0);
  expect(m.top - m.header, `the first Complete starts within one screen of the top bar: ${JSON.stringify(m)}`).toBeLessThanOrEqual(m.height);
}
/** Today's habits come before Today's rhythm, Routines and the consistency block; the tools that stood above them follow. */
async function habitsFirst(page: Page, isMobile: boolean) {
  for (const after of ['[data-layout-item="habits:routines"]', '[data-layout-item="habits:overview"]', '[data-layout-item="habits:consistency"]'])
    expect(await before(page, '.habits-workspace .habit-grid > .habit-card', after), after).toBe(true);
  expect(await before(page, '.habits-workspace .habit-grid > .habit-card', '.habit-list-tools'), 'Reorder / Cards / Compact').toBe(true);
  if (isMobile) expect(await before(page, '.habits-workspace .habit-grid > .habit-card', '.habit-phone-ideas'), 'Habit ideas').toBe(true);
  // Session AW (integration, CI 2032): the filters and area chips follow today's cards (decision 1e), so the cards come first.
  expect(await before(page, '.habits-workspace .habit-grid > .habit-card', '.habit-filter-bar')).toBe(true);
}
/** No zero-state card: no empty time-of-day group, and a consistency card only with data in it. */
async function noZeroCards(page: Page) {
  await expect(page.locator('.habit-section > .habit-section-empty')).toHaveCount(0);
  for (const id of ['morning', 'afternoon', 'evening', 'anytime']) {
    const group = page.locator(`details.habit-section-${id}`);
    if (await group.count()) await expect(group.locator('.habit-card').first()).toBeAttached();
  }
  const week = page.locator('.habit-week-momentum');
  if (await week.count()) await expect(week.locator('.habit-week-bars')).toHaveAttribute('aria-label', /: [1-9]\d* check-in/);
  const month = page.locator('.habit-consistency-month');
  if (await month.count()) await expect(month.locator('.habit-month-grid')).toHaveAttribute('aria-label', /heatmap: [1-9]\d* days? with check-ins/);
  const trend = page.locator('.habit-trend-list');
  if (await trend.count()) await expect(trend.getByRole('heading', {level: 3, name: /^(More often|About the same|Less often)/})).not.toHaveCount(0);
}
async function axeClean(page: Page) {
  for (const part of [page.locator('[data-layout-item="habits:list"]'), page.locator('[data-layout-item="habits:consistency"]')]) {
    if (!await part.count()) continue;
    const findings = await axe(page, part);
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  }
}

for (const theme of THEMES) {
  test(`${theme}: one habit on an empty profile — its Complete on the first screen, one "Add a habit" line, teaching lines for the history`, async ({page, isMobile}) => {
    const {width} = size(isMobile);
    await start(page, {theme, width, showcase: false});
    await go(page, '/app/habits');
    await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
    await page.getByLabel('Habit title', {exact: true}).fill('Fictional stretch');
    await page.getByRole('button', {name: 'Create habit', exact: true}).click();
    await expect(page.getByRole('article', {name: 'Fictional stretch', exact: true})).toBeVisible();
    await go(page, '/app/habits');
    const card = page.getByRole('article', {name: 'Fictional stretch', exact: true});
    await expect(card).toBeVisible();
    await expect(firstComplete(page)).toHaveAccessibleName('Complete Fictional stretch');
    await onFirstScreen(page, firstComplete(page));
    await habitsFirst(page, isMobile);

    // The three empty groups are one line after the Anytime group, with its Add a habit.
    await expect(page.locator('details.habit-section')).toHaveCount(1);
    const room = page.locator('.habit-sections-room');
    await expect(room).toHaveCount(1);
    await expect(room).toHaveText('Room for a morning, afternoon or evening habit. Add a habit');
    expect(await before(page, '.habits-workspace .habit-grid > .habit-card', '.habit-sections-room')).toBe(true);
    // No card without data: the history waits, one teaching line each.
    await expect(page.locator('.habit-consistency, .habit-consistency-month, .habit-week-momentum, .habit-trend-list')).toHaveCount(0);
    const teach = page.getByRole('group', {name: 'Habit history to come'});
    await teach.scrollIntoViewIfNeeded();
    await expect(teach.locator('[data-teach="month"]')).toContainText('Your last 30 days · No check-ins in the last 30 days yet.');
    await expect(teach.locator('[data-teach="week"]')).toContainText('Your week in motion · No check-ins in the last seven days yet.');
    await expect(teach.locator('[data-teach="trend"]')).toContainText('Trend per habit · Not enough days yet.');
    for (const line of await teach.locator('.habit-teach-line').all()) expect(await line.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
    await noZeroCards(page);
    await axeClean(page);

    // The line's Add a habit opens the new habit's editor (a sheet on a phone).
    const add = room.getByRole('button', {name: 'Add a habit', exact: true});
    expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await add.click();
    await expect(page.getByLabel('Habit title', {exact: true})).toBeVisible();

    // A check-in (after a fresh load, the editor closed) brings the 30 days and the week; the trend still waits, as its line.
    await go(page, '/app/habits');
    await firstComplete(page).click();
    await expect(page.getByRole('button', {name: 'Undo completion for Fictional stretch'})).toBeVisible();
    const week = page.locator('.habit-week-momentum');
    await week.scrollIntoViewIfNeeded();
    await expect(week).toBeVisible();
    await expect(page.locator('.habit-consistency-month')).toBeVisible();
    await expect(page.locator('[data-teach="week"], [data-teach="month"]')).toHaveCount(0);
    await expect(page.locator('.habit-trend-list')).toHaveCount(0);
    await expect(page.locator('[data-teach="trend"]')).toBeVisible();
    await noZeroCards(page);
  });

  // Session AW (FR-TJ-7, deliberate): the Showcase check was one test (load, order, axe, a 320 px pass, back to 1440) and
  // ran past the 45 s budget at 1440 on a loaded machine. Split three ways, each with the same setup; every assertion kept.
  const showcaseHabits = async (page: Page, isMobile: boolean) => {
    await start(page, {theme, width: size(isMobile).width});
    await go(page, '/app/habits');
    await expect(page.locator('.habits-workspace .habit-grid > .habit-card').first()).toBeVisible({timeout: 15_000});
  };
  test(`${theme}: the Showcase — the first Complete on the first screen, the cards first, no zero-state card`, async ({page, isMobile}) => {
    await showcaseHabits(page, isMobile);
    await onFirstScreen(page, firstComplete(page));
    await habitsFirst(page, isMobile);
    await noZeroCards(page);
  });

  test(`${theme}: the Showcase — the history with data shows its cards, not their lines; axe-clean`, async ({page, isMobile}) => {
    await showcaseHabits(page, isMobile);
    // The history has data in the Showcase: the 30 days and the week show, their lines do not.
    const consistency = page.locator('[data-layout-item="habits:consistency"]');
    await consistency.scrollIntoViewIfNeeded();
    await expect(consistency.locator('.habit-consistency-month')).toBeVisible();
    await expect(consistency.locator('.habit-week-momentum')).toBeAttached();
    await expect(consistency.locator('[data-teach="month"], [data-teach="week"]')).toHaveCount(0);
    // The trend: its card with a word in it, or its one line, never both.
    expect(await consistency.locator('.habit-trend-list').count() + await consistency.locator('[data-teach="trend"]').count()).toBe(1);
    await axeClean(page);
  });

  test(`${theme}: the Showcase — no sideways scroll at 320 px`, async ({page, isMobile}) => {
    await showcaseHabits(page, isMobile);
    await noSideways(page);
  });
}

test('the week at all 0: the 30 days take the row, "Your week in motion" and "Trend per habit" are one line each', async ({page, isMobile}) => {
  const NOW = new Date('2026-11-23T19:00:00+01:00'), TODAY = '2026-11-23', WALK = 'aaaaaaaa-0000-4000-8000-0000000000b1';
  await applyTheme(page, 'nebula');
  await offline(page);
  await page.setViewportSize(size(isMobile));
  await page.clock.install({time: NOW});
  // Made 25 days ago (under 5 scheduled days before the last 30, so no trend yet), done 10 to 20 days ago.
  let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date(`${addLocalDays(TODAY, -25)}T08:00:00Z`), WALK);
  for (let i = 10; i <= 20; i++) d = logHabitValue(d, WALK, addLocalDays(TODAY, -i), 1, {}, NOW);
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HABITS_KEY, JSON.stringify(d)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  await onFirstScreen(page, firstComplete(page));
  const consistency = page.locator('[data-layout-item="habits:consistency"]');
  await consistency.scrollIntoViewIfNeeded();
  const month = consistency.locator('.habit-consistency-month');
  await expect(month).toBeVisible();
  await expect(consistency.locator('.habit-week-momentum, .habit-trend-list')).toHaveCount(0);
  await expect(consistency.locator('[data-teach="week"]')).toContainText('Your week in motion · No check-ins in the last seven days yet.');
  await expect(consistency.locator('[data-teach="trend"]')).toContainText('Trend per habit · Not enough days yet.');
  await expect(consistency.locator('[data-teach="month"]')).toHaveCount(0);
  // Alone in its row, the 30 days take it whole (no empty cell beside them on a computer, no gap in a phone's swipe row).
  const fill = await month.evaluate(card => { const row = card.parentElement!.getBoundingClientRect(), box = card.getBoundingClientRect(); return {row: row.width, card: box.width}; });
  expect(fill.card, JSON.stringify(fill)).toBeGreaterThanOrEqual(fill.row - 2);
  await noZeroCards(page);
  await axeClean(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
