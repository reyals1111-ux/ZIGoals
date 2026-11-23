import {expect, test, type Locator, type Page} from '@playwright/test';
import {go, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';
import {moreViews} from './fr-layout-helpers';
import {at, DAY1, freshWeek, hydrated, setup} from './au/au-helpers';

/**
 * Session AV lane 2 (fr-layout): the main actions the friends' walks found below the first screen (FR-L-5, FR-MAX-2,
 * FR-S-7, FR-TJ-8 Tasks; FR-L-6, FR-MAX-3, FR-S-8, FR-TJ-9 Journal; FR-TJ-7 Habits), in Nebula, Light and Dark, at 390
 * (the mobile project) and 1440 (the desktop project). Fictional data; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const top = async (l: Locator) => (await l.boundingBox())!.y;
const size = (isMobile: boolean) => isMobile ? {width: 390, height: 844} : {width: 1440, height: 900};
const before = (page: Page, first: string, second: string) => page.evaluate(([a, b]) => { const x = document.querySelector(a!), y = document.querySelector(b!); return !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING); }, [first, second]);

for (const theme of THEMES) {
  test(`${theme}: Tasks — "New task" on the first screen; on a phone the other views fold behind More views`, async ({page, isMobile}) => {
    const {width} = size(isMobile);
    await start(page, {theme, width, showcase: false});
    await go(page, '/app/tasks');
    const nav = page.getByRole('navigation', {name: 'Task views'}), add = page.getByLabel('New task').first();
    await expect(add).toBeVisible();
    // It was at y 966–1,084 on a phone, under Plan and views, Projects and Priority: now whole on the first screen, above
    // the phone's tab bar (about y 700 at 390 × 844; 597 at 1440).
    await expect(add).toBeInViewport({ratio: 1});
    const bar = page.getByRole('navigation', {name: 'Main navigation'}).filter({visible: true});
    const floor = isMobile && await bar.count() ? (await bar.first().boundingBox())!.y : 900;
    const box = (await add.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(floor);
    expect(box.y).toBeLessThan(isMobile ? 720 : 700);
    const chip = nav.locator('.tasks-nav-more-toggle');
    if (isMobile) {
      await expect(chip).toHaveAttribute('aria-expanded', 'false');
      await expect(nav.getByRole('heading', {name: 'Plan and views'})).toBeHidden();
      expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await moreViews(page);
      for (const name of ['Projects', 'Priority']) await expect(nav.getByRole('heading', {name, exact: true})).toBeVisible();
      await nav.getByRole('button', {name: /^This week/}).click();
      await expect(page.locator('#tasks-view-title')).toContainText('This week');
      await expect(chip).toHaveAttribute('aria-expanded', 'true');
    } else {
      await expect(chip).toBeHidden();
      for (const name of ['Plan and views', 'Projects', 'Priority']) await expect(nav.getByRole('heading', {name, exact: true})).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`${theme}: Journal with memories — Write and "Today's entry" first, On this day after Write, Three good things folded`, async ({page, isMobile}) => {
    const {width, height} = size(isMobile);
    await start(page, {theme, width});
    await go(page, '/app/journal');
    const write = page.locator('#journal-write'), entry = page.getByRole('form', {name: 'Write in your journal'}).getByLabel('Today’s entry');
    await expect(entry).toBeVisible();
    await expect(page.locator('details.on-this-day')).toBeVisible();
    // Write began at y 1,056 on a phone (965 at 1440) under "On this day"; the entry box at 2,118 (1,792) under Three good things.
    expect(await top(write)).toBeLessThan(height * 0.6);
    expect(await top(entry)).toBeLessThan(height - 80);
    expect(await before(page, '#journal-write', 'details.on-this-day')).toBe(true);
    expect(await before(page, 'details.on-this-day', '#journal-entries')).toBe(true);
    await expect(page.locator('details.good-things-fold')).not.toHaveAttribute('open');
    // Today's question follows the entry box now.
    if (await page.locator('.journal-today-question').count()) expect(await before(page, 'form[aria-label="Write in your journal"] textarea', '.journal-today-question')).toBe(true);
  });
}

test('Habits with one habit: its Complete about 600 px (phone) and 1,500 px (1440) higher, no empty time-of-day groups above it', async ({page, isMobile}) => {
  const {width, height} = size(isMobile);
  await start(page, {width, showcase: false});
  await go(page, '/app/habits');
  await page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional stretch');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Fictional stretch', exact: true});
  await expect(card).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  await go(page, '/app/habits');
  await expect(card).toBeVisible();
  await expect(page.locator('.habit-section > .habit-section-empty')).toHaveCount(0);
  await expect(page.locator('.habit-consistency')).toHaveCount(0);
  // Its Complete button stood at y 1,680–2,004 on a phone and 2,570 at 1440 (measured now: 1,320 and 1,096). At 1440 the
  // card starts on the first screen; on a phone the hero, Today's rhythm and the filters still come first (Carried).
  if (!isMobile) expect(await top(card)).toBeLessThan(height);
  expect(await top(card.getByRole('button', {name: 'Complete Fictional stretch'}))).toBeLessThan(isMobile ? 1400 : 1150);
});

test('Settings → Your data → Restore from a backup is one tap on a phone and one jump on the page', async ({page, isMobile}) => {
  const {width} = size(isMobile);
  await start(page, {width, showcase: false});
  await go(page, '/app/settings');
  const region = () => page.getByRole('region', {name: 'Restore from a backup'});
  if (isMobile) {
    const row = page.getByRole('navigation', {name: 'Settings sections'}).getByRole('link', {name: 'Restore a backup', exact: true});
    await expect(row).toBeInViewport();
    await row.click();
    await page.waitForURL(/\/app\/settings\/data#restore$/);
  } else {
    // On a computer Settings starts folded; the jump to the encrypted backup opens its group.
    await go(page, '/app/settings#private-vault');
    const link = page.locator('#private-vault').getByRole('link', {name: 'Restore from a backup', exact: true});
    await expect(link).toBeVisible(); await link.click();
    await page.waitForURL(/\/app\/settings\/data#restore$/);
  }
  await expect(region()).toBeVisible();
  await expect(region()).toBeInViewport();
  // Still there once every section above it has drawn.
  await page.waitForTimeout(2500);
  await expect(page.getByRole('heading', {name: 'Restore from a backup'})).toBeInViewport();
  // The page's own jump, from its top.
  await go(page, '/app/settings/data');
  await page.getByRole('link', {name: 'Restore from a backup ↓'}).click();
  await expect(page.getByRole('heading', {name: 'Restore from a backup'})).toBeInViewport();
});

test('Settings: the way to the Showcase Demo is on the first screen and lands on Load Showcase Demo', async ({page, isMobile}) => {
  const {width} = size(isMobile);
  await start(page, {width, showcase: false});
  await go(page, '/app/settings');
  const door = page.getByRole('link', {name: 'Try the Showcase Demo ↓', exact: true});
  await expect(door).toBeInViewport();
  expect((await door.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await door.click();
  await expect(page.getByRole('button', {name: 'Load Showcase Demo', exact: true})).toBeInViewport();
});

test('Deep links land on their form: Spending, the night form, the Watch an address form and Workouts', async ({page, isMobile}) => {
  test.setTimeout(90_000);
  const {width} = size(isMobile);
  await start(page, {width, showcase: false});
  // The first five's "Log an expense or income".
  await go(page, '/app/wealth#log-spending');
  const spend = page.getByRole('form', {name: 'Log spending or income'});
  await expect(spend).toBeVisible({timeout: 15_000});
  await page.waitForTimeout(2500);
  await expect(page.locator('#spending-title, #spending .phone-fold-toggle').filter({visible: true}).first()).toBeInViewport();
  // Today's sleep card's "Enter the times →".
  await go(page, '/app/health?view=sleep#log-night');
  await expect(page.locator('#log-night')).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.locator('#sleep-log-title')).toBeInViewport();
  expect(await page.evaluate(() => !!document.activeElement?.closest('#log-night'))).toBe(true);
  // Health's Workouts, from the hero.
  await go(page, '/app/health');
  const workouts = page.locator('.health-heading').getByRole('link', {name: 'Workouts →', exact: true});
  await expect(workouts).toBeInViewport();
  await workouts.click();
  await expect(page.getByRole('heading', {level: 1, name: 'Train with a plan.'})).toBeVisible();
});

test('NOVA → Permissions: Allow Health is the first thing there', async ({page, isMobile}) => {
  test.setTimeout(120_000);
  await page.setViewportSize(size(isMobile));
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await setup(page, [/^Habits/, /^Health/]);
  await page.goto('/app/nova#nova-permissions'); await hydrated(page);
  const allow = page.getByRole('button', {name: 'Allow Health', exact: true});
  await expect(allow).toBeVisible({timeout: 20_000});
  // It sat after the eight scope switches: y 1,333 at 390 and 925 at 1440.
  expect(await page.evaluate(() => { const a = document.querySelector('.nova-allow-health'), s = document.querySelector('.nova-permissions .ai-switch-list'); return !!a && !!s && !!(a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
  await expect(allow).toBeInViewport();
  await allow.click();
  await expect(page.locator('.nova-status-line')).toHaveText('Health is open to NOVA now.');
});
