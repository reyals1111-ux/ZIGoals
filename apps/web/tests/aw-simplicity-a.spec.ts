import {expect, test, type Locator, type Page} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {hydrated, loadShowcase} from './ah-helpers';
import {axe, THEMES} from './p6-helpers';
import {createHabit, emptyHabitData, HABITS_KEY} from '../lib/habits';
import {showQuickCounters, withinOneScreen} from './aw-simplicity-helpers';

/**
 * Session AW (simplicity-a; owner brief Part 3 and amendment 8): calm first screens for Today, Goals, Health and Wealth, at
 * 390 × 844 (the mobile project) and 1440 × 900 (the desktop project), on an empty profile and on the Showcase, in Nebula,
 * Light and Dark. One test per pillar:
 * - the pillar's main action is on the first screen, or whole in view after scrolling at most one screen
 *   (`withinOneScreen`: between the phone's top bar and its tab bar, or the window on a computer);
 * - a card that would show nothing, 0 or "not enough data" waits for data, one teaching line in its place;
 * - each tool moved behind the section's "More" (its ⋯) or "Customise" is still reached from there.
 * Fictional data; every /api call answers 503; axe-clean (no serious or critical finding) on each part that changed.
 * Nothing here moves (a fold opens in place, without animation), so there is no Motion Off case.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
test.setTimeout(120_000);
const size = (isMobile: boolean) => isMobile ? {width: 390, height: 844} : {width: 1440, height: 900};
/** True when `first` comes before `second` in the page. */
const before = (page: Page, first: string, second: string) => page.evaluate(([a, b]) => { const x = document.querySelector(a!), y = document.querySelector(b!); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); }, [first, second]);
/** Whole on the first screen, read at the top of the page: in the window and above a phone's tab bar. */
async function onFirstScreen(page: Page, target: Locator, what: string) {
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(target, what).toBeInViewport({ratio: 1});
  const box = (await target.boundingBox())!, tabs = page.locator('.phone-tabbar').filter({visible: true});
  const floor = await tabs.count() ? (await tabs.first().boundingBox())!.y : page.viewportSize()!.height;
  expect(box.y + box.height, `${what} above the tab bar`).toBeLessThanOrEqual(floor);
}
async function axeClean(page: Page, ...parts: Locator[]) {
  for (const part of parts) {
    if (!await part.count()) continue;
    const findings = await axe(page, part.first());
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  }
}
/** The box's top in the page, read at the top of the page. */
async function docTop(page: Page, target: Locator) {
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  return target.evaluate(el => el.getBoundingClientRect().top + scrollY);
}
async function teachLine(line: Locator) {
  await expect(line).toBeVisible();
  expect(await line.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
}
/** One fictional daily habit, made by Habits' own createHabit (a valid record), on this device. */
async function oneHabit(page: Page, title: string) {
  const data = createHabit(emptyHabitData(), {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date(), 'aaaaaaaa-0000-4000-8000-0000000000c1');
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [HABITS_KEY, JSON.stringify(data)] as const);
}
/** Today's day habits, shown right after the Checklist (outside the widget grid), and the first habit's completion button. */
const liftedHabits = (page: Page) => page.locator('.today-primary > .placed-module').filter({has: page.locator('.habits-today')});
const firstCompletion = (page: Page) => liftedHabits(page).locator('.habit-completion button[aria-pressed]').first();
async function todayOrder(page: Page) {
  expect(await before(page, '#today-checklist', '.today-primary > .placed-module .habits-today'), 'Checklist, then the habits').toBe(true);
  expect(await before(page, '.today-primary > .placed-module .habits-today', '.today-focus'), 'the habits, then What is due now').toBe(true);
  expect(await before(page, '.today-focus', '#today-widgets'), 'What is due now, then the widgets').toBe(true);
  // Each thing once: the lifted card is not also in the grid.
  await expect(page.locator('.dashboard-layout-grid .habits-today')).toHaveCount(0);
}

for (const theme of THEMES) {
  test(`${theme}: Today — the Checklist and the first habit's Complete within one screen; one setup prompt on an empty computer screen`, async ({page, isMobile}) => {
    const {width, height} = size(isMobile);
    await start(page, {theme, width, showcase: false});
    await go(page, '/app');
    const checklist = page.locator('#today-checklist');
    await expect(checklist.locator('#today-checklist-title')).toBeVisible();
    // Empty: the setup entry, then the Checklist (it was 1.39–1.62 screens down, under "What is due now").
    expect(await before(page, '#today-checklist', '.today-focus'), 'the Checklist before What is due now').toBe(true);
    test.info().annotations.push({type: 'Checklist (empty)', description: JSON.stringify(await withinOneScreen(page, checklist, 'the Checklist card'))});
    await expect(page.locator('.onboarding-entry').getByRole('link', {name: 'Start setup', exact: true})).toBeVisible();
    if (!isMobile) {
      // Two setup prompts stood side by side ("Your first minute" and "Start with what matters"): the setup entry stays, the
      // invitation waits for a first record, and one teaching line with its link stands in for it.
      await expect(page.locator('.destination-panel')).toHaveCount(0);
      const teach = page.locator('.today-rail [data-teach="destination"]');
      await teachLine(teach);
      await expect(teach.getByRole('link', {name: 'Plan my first goal →', exact: true})).toHaveAttribute('href', '/app/goals/new');
      await axeClean(page, teach);
    }

    // One habit: the Checklist, the day's habits with their Complete, then What is due now.
    await oneHabit(page, 'Fictional stretch');
    await go(page, '/app');
    await expect(liftedHabits(page)).toHaveCount(1);
    await expect(firstCompletion(page)).toHaveAccessibleName('Complete Fictional stretch');
    await todayOrder(page);
    expect(await docTop(page, checklist), 'the Checklist starts on the first screen').toBeLessThan(height);
    await withinOneScreen(page, checklist, 'the Checklist card');
    test.info().annotations.push({type: 'first Complete (one habit)', description: JSON.stringify(await withinOneScreen(page, firstCompletion(page), 'the first habit’s Complete'))});
    await axeClean(page, checklist, liftedHabits(page));
    // Its Complete works where it is.
    await firstCompletion(page).click();
    await expect(liftedHabits(page).getByRole('button', {name: 'Undo completion for Fictional stretch', exact: true})).toBeVisible();
    if (theme === 'nebula') {
      // Customise Today: the habits card is arranged with the others, in the grid, first; finishing puts it back after the Checklist.
      await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
      await expect(liftedHabits(page)).toHaveCount(0);
      await expect(page.locator('.dashboard-layout-grid > .placed-module').filter({has: page.locator('.habits-today')})).toHaveCount(1);
      await page.getByRole('button', {name: 'Finish customizing', exact: true}).click();
      await expect(liftedHabits(page)).toHaveCount(1);
    }

    // The Showcase: the same order; the Checklist starts on the first screen and the first habit's check-in is one screen away.
    await loadShowcase(page);
    await go(page, '/app');
    await expect(firstCompletion(page)).toBeVisible({timeout: 15_000});
    await todayOrder(page);
    expect(await docTop(page, checklist), 'the Checklist starts on the first screen').toBeLessThan(height);
    await withinOneScreen(page, checklist, 'the Checklist card');
    test.info().annotations.push({type: 'first Complete (Showcase)', description: JSON.stringify(await withinOneScreen(page, firstCompletion(page), 'the first habit’s Complete'))});
    // What is due now is still all there, after the habits: its heading and its tiles.
    await expect(page.getByRole('heading', {name: 'Today’s focus'})).toBeAttached();
    await expect(page.locator('.today-focus .focus-tile')).not.toHaveCount(0);
    await axeClean(page, checklist, liftedHabits(page));
    await noSideways(page);
  });

  test(`${theme}: Goals — "+ Create a goal" on the first screen, the first goal (its contribution) within one screen; Search and Sort behind ⋯ on a phone`, async ({page, isMobile}) => {
    const {width} = size(isMobile);
    await start(page, {theme, width, showcase: false});
    await go(page, '/app/goals');
    const create = page.getByRole('link', {name: '+ Create a goal', exact: true});
    await onFirstScreen(page, create, '+ Create a goal');
    await expect(create).toHaveAttribute('href', '/app/goals/new');

    await loadShowcase(page);
    await go(page, '/app/goals');
    await expect(page.locator('.goal-grid .unified-goal-card').first()).toBeVisible({timeout: 15_000});
    await onFirstScreen(page, create, '+ Create a goal');
    // The way to a contribution: the first goal's title link and its "Open goal →" (it was 1.21 screens down on a phone).
    const first = page.locator('.goal-grid .unified-goal-card').first();
    await withinOneScreen(page, first.locator('h2 a'), 'the first goal');
    test.info().annotations.push({type: 'first Open goal →', description: JSON.stringify(await withinOneScreen(page, first.getByRole('link', {name: 'Open goal →', exact: true}), 'the first goal’s Open goal →'))});
    const browse = page.getByRole('region', {name: 'Browse Goals', exact: true}), search = page.getByLabel('Search Goals', {exact: true});
    if (isMobile) await expect(browse).toBeHidden(); else await expect(browse).toBeVisible();
    // Search and Sort are reached from the page's ⋯, at every width.
    await page.getByRole('button', {name: 'Options for Goals', exact: true}).click();
    await page.getByRole('menu', {name: 'Goals options', exact: true}).getByRole('menuitem', {name: 'Search and sort goals', exact: true}).click();
    await expect(browse).toBeVisible();
    await expect(search).toBeFocused();
    await expect(page.getByLabel('Sort Goals', {exact: true})).toBeVisible();
    const name = (await first.locator('h2 a').innerText()).trim();
    await search.fill(name);
    await expect(page.locator('.goal-grid .unified-goal-card').first()).toContainText(name);
    // In use, the row stays open.
    await expect(browse).toBeVisible();
    await axeClean(page, browse, page.locator('.goals-toolbar'));
    await noSideways(page);
  });

  test(`${theme}: Health — Log food on the first screen; empty counters and highlights wait behind one teaching line`, async ({page, isMobile}) => {
    const {width} = size(isMobile);
    await start(page, {theme, width, showcase: false});
    await go(page, '/app/health');
    await onFirstScreen(page, page.getByRole('button', {name: 'Log food', exact: true}).first(), 'Log food');
    // Nothing to show yet: no example counters at 0, no "No trend yet" or "0 of 10 weigh-ins"; one line in their place.
    const teach = page.locator('[data-teach="health-start"]');
    await teachLine(teach);
    await expect(teach).toContainText('Weight trend · Your trend and maintenance estimate start with a first weigh-in');
    await expect(teach).toContainText('Quick counters · Count push-ups, squats or anything else in one tap.');
    await expect(page.locator('.exercise-counters')).toHaveCount(0);
    await expect(page.locator('.health-highlights')).toHaveCount(0);
    await expect(page.locator('[data-teach="health-start"]')).toHaveCount(1);
    const show = teach.getByRole('button', {name: 'Show quick counters', exact: true});
    expect((await show.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await axeClean(page, teach);
    // The line brings the counters back in place; the first tap keeps them.
    await showQuickCounters(page);
    await expect(teach).not.toContainText('Quick counters');
    const plus = page.getByRole('button', {name: 'Increase Push-ups', exact: true});
    await plus.click();
    await expect(page.locator('.exercise-count-live').first()).toContainText('Push-ups today: 1');
    await go(page, '/app/health');
    await expect(page.locator('.exercise-counters')).toBeVisible();
    await expect(page.getByRole('button', {name: 'Show quick counters', exact: true})).toHaveCount(0);
    await expect(teach).toContainText('Weight trend');
    await axeClean(page, page.locator('.exercise-counters'));

    // The Showcase has counts and weigh-ins: the counters and the highlight tiles show, and no teaching line.
    await loadShowcase(page);
    await go(page, '/app/health');
    await onFirstScreen(page, page.getByRole('button', {name: 'Log food', exact: true}).first(), 'Log food');
    await expect(page.locator('.health-highlights')).toBeVisible({timeout: 15_000});
    await expect(page.locator('.exercise-counters')).toBeVisible();
    await expect(page.locator('[data-teach="health-start"]')).toHaveCount(0);
    await axeClean(page, page.locator('.health-highlights'));
    await noSideways(page);
  });

  test(`${theme}: Wealth — + Add asset and Log spending on the first screen; no row of zero chips before a first record`, async ({page, isMobile}) => {
    const {width} = size(isMobile);
    await start(page, {theme, width, showcase: false});
    await go(page, '/app/wealth');
    await onFirstScreen(page, page.locator('.wealth-heading').getByRole('button', {name: '+ Add asset', exact: true}), '+ Add asset');
    await onFirstScreen(page, page.getByRole('button', {name: 'Log spending', exact: true}), 'Log spending');
    const have = page.getByRole('region', {name: 'What you have', exact: true});
    await have.scrollIntoViewIfNeeded();
    // All 0 · Accounts 0 · Debts 0 · Assets 0 · Needs attention 0 waited for nothing: the empty state is the one line that teaches.
    await expect(have.getByRole('group', {name: 'Show', exact: true})).toHaveCount(0);
    await expect(have.getByRole('heading', {name: 'Build your wealth picture'})).toBeVisible();
    await expect(have.getByRole('button', {name: 'Add your first asset', exact: true})).toBeVisible();
    await expect(have.getByRole('button', {name: '+ Add asset', exact: true})).toBeVisible();
    await axeClean(page, have);

    await loadShowcase(page);
    await go(page, '/app/wealth');
    await onFirstScreen(page, page.locator('.wealth-heading').getByRole('button', {name: '+ Add asset', exact: true}), '+ Add asset');
    await onFirstScreen(page, page.getByRole('button', {name: 'Log spending', exact: true}), 'Log spending');
    const chips = have.getByRole('group', {name: 'Show', exact: true});
    await expect(chips.getByRole('button').first()).toHaveText(/^All [1-9]\d*$/, {timeout: 15_000});
    await expect(chips.getByRole('button').last()).toHaveText(/^Needs attention \d+$/);
    await noSideways(page);
  });
}
