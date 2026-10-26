import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';

// Session AH Part 18 (owner addition 2, pre-approved; ADR-033 M53): the Checklist's top bar (owner exception to the
// protected Checklist, for the top bar only), the phone's top bar without the page's name, and Health's quick counters
// as one fixed − / number / + group whose number is typed in place. Fictional data.
test.beforeEach(async ({page}) => { await offlineApi(page); });
const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
const setTheme = (page: Page, theme: string) => page.evaluate(t => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: t})), theme);

for (const width of [360, 390]) test(`${width} px: the Checklist bar has Path / List next to X, no visible count, and "⋯" lists nothing twice`, async ({page}) => {
  await page.setViewportSize({width, height: 800});
  await loadShowcase(page);
  await page.goto('/app/checklist'); await hydrated(page);
  const bar = page.locator('.checklist-topbar-row');
  await expect(bar.getByRole('button', {name: 'Path', exact: true})).toBeVisible();
  // The count is said, not shown, and still updates (it is in the reading order).
  const count = bar.locator('.checklist-progress');
  await expect(count).toContainText(/\d+ of \d+ planets? today|No planets counted today/);
  expect(await count.evaluate(e => { const r = e.getBoundingClientRect(); return r.width <= 1 && r.height <= 1; })).toBe(true);
  const close = await box(page, '.checklist-close'), path = await box(page, '.checklist-view-switch'), streak = await box(page, '.checklist-streak');
  expect(path.x).toBeGreaterThan(close.x + close.width - 1); expect(path.x + path.width).toBeLessThanOrEqual(streak.x + 1);
  for (const name of ['Path', 'List']) { const b = (await bar.getByRole('button', {name, exact: true}).boundingBox())!; expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await page.getByRole('button', {name: 'Checklist menu', exact: true}).click();
  const menu = page.getByRole('group', {name: 'Checklist menu'});
  await expect(menu.getByRole('button', {name: 'How it works'})).toBeVisible();
  // On a phone Edit path and Options do not fit beside the switch at 44 px, so they stay here, once.
  await expect(menu.getByRole('button', {name: 'Edit path'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Options'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Path', exact: true})).toHaveCount(0);
  await expect(page.locator('.checklist-bar-tools')).toBeHidden();
});

test('computer: the Checklist bar has Path / List, Edit path and Options next to X; "Your orbit" stays; "⋯" keeps How it works', async ({page, isMobile}) => {
  test.skip(isMobile, 'The computer bar.');
  await loadShowcase(page);
  await page.goto('/app/checklist'); await hydrated(page);
  const bar = page.locator('.checklist-topbar-row');
  await expect(bar.getByRole('heading', {name: 'Your orbit'})).toBeVisible();
  const close = await box(page, '.checklist-close'), view = await box(page, '.checklist-view-switch'), tools = await box(page, '.checklist-bar-tools'), title = await box(page, '.checklist-title');
  expect(view.x).toBeGreaterThan(close.x + close.width - 1); expect(tools.x).toBeGreaterThan(view.x + view.width - 1); expect(title.x).toBeGreaterThan(tools.x + tools.width - 1);
  await bar.getByRole('button', {name: 'Edit path'}).click();
  await expect(bar.getByRole('button', {name: 'Edit path'})).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name: 'Checklist menu', exact: true}).click();
  const menu = page.getByRole('group', {name: 'Checklist menu'});
  await expect(menu.getByRole('button', {name: 'How it works'})).toBeVisible();
  await expect(menu.getByRole('button', {name: 'Edit path'})).toBeHidden();
  await expect(menu.getByRole('button', {name: 'Options'})).toBeHidden();
});

test('phone: the top bar shows no page name; it stays for screen readers and in the tab\'s title', async ({page, isMobile}) => {
  test.skip(!isMobile, 'The phone top bar.');
  await freshDevice(page);
  for (const [path, name] of [['/app/habits', 'Habits'], ['/app/settings', 'Settings']] as const) {
    await page.goto(path); await hydrated(page);
    const title = page.locator('.phone-topbar .phone-title');
    await expect(title).toHaveText(name);
    expect(await title.evaluate(e => { const r = e.getBoundingClientRect(); return r.width <= 1 && r.height <= 1; })).toBe(true);
    await expect(page).toHaveTitle(new RegExp(`^${name} · ZIGoals Alpha$`));
    const actions = await box(page, '.phone-actions'), bar = await box(page, '.phone-topbar-row');
    expect(actions.x + actions.width).toBeGreaterThan(bar.x + bar.width - 20);
  }
});

for (const width of [360, 390]) for (const theme of ['nebula', 'light', 'dark']) test(`${width} px, ${theme}: a counter's number is typed in place; limits, Undo and the − / + group hold`, async ({browser}) => {
  const context = await browser.newContext({viewport: {width, height: 820}, reducedMotion: 'reduce', isMobile: true, hasTouch: true});
  const page = await context.newPage();
  await offlineApi(page);
  await freshDevice(page);
  await setTheme(page, theme);
  await page.goto('/app/health'); await hydrated(page);
  const row = page.getByRole('article', {name: 'Push-ups', exact: true}), count = row.getByRole('button', {name: 'Push-ups count, edit'});
  await expect(count).toBeVisible();
  const plus = row.getByRole('button', {name: 'Increase Push-ups'}), before = (await plus.boundingBox())!;
  // Typed: Enter saves; a labelled Undo puts it back.
  await count.click();
  const field = row.getByRole('textbox', {name: /^Push-ups count today$/});
  await field.fill('1234'); await field.press('Enter');
  await expect(row.getByRole('button', {name: 'Push-ups count, edit'})).toHaveText('1234');
  const after = (await plus.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(0.5); // the group never moves with the number's width
  const rowBox = (await row.boundingBox())!;
  expect(after.x + after.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 0.5);
  expect(after.x + after.width).toBeGreaterThan(rowBox.x + rowBox.width - 20); // right-aligned in its row
  for (const control of [plus, row.getByRole('button', {name: 'Decrease Push-ups'}), row.getByRole('button', {name: 'Push-ups count, edit'})]) { const b = (await control.boundingBox())!; expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44); }
  await page.getByRole('button', {name: 'Undo the Push-ups count'}).click();
  await expect(row.locator('.exercise-count-live')).toHaveText('No entry today');
  // Over the limit: the reason beside the field, nothing saved; Escape keeps the count.
  await row.getByRole('button', {name: 'Push-ups count, edit'}).click();
  await field.fill('10000'); await field.press('Enter');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(row.getByRole('alert')).toHaveText('Enter a whole number from 0 to 9,999.');
  await field.press('Escape');
  await expect(row.getByRole('button', {name: 'Push-ups count, edit'})).toBeFocused();
  await expect(row.getByRole('alert')).toHaveCount(0);
  // Leaving the field saves.
  await row.getByRole('button', {name: 'Push-ups count, edit'}).click();
  await field.fill('12'); await field.blur();
  await expect(row.getByRole('button', {name: 'Push-ups count, edit'})).toHaveText('12');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  await context.close();
});

test('a typed count goes to the chosen Health day', async ({page}) => {
  await freshDevice(page);
  await page.goto('/app/health'); await hydrated(page);
  await page.getByRole('button', {name: 'Previous day', exact: true}).click();
  const row = page.getByRole('article', {name: 'Push-ups', exact: true});
  await row.getByRole('button', {name: 'Push-ups count, edit'}).click();
  const field = row.getByRole('textbox', {name: /^Push-ups count on /});
  await field.fill('7'); await field.press('Enter');
  await expect(row.getByRole('button', {name: 'Push-ups count, edit'})).toHaveText('7');
  await page.getByRole('group', {name: 'Journal day'}).getByRole('button', {name: 'Today', exact: true}).click();
  await expect(row.locator('.exercise-count-live')).toHaveText('No entry today');
});
