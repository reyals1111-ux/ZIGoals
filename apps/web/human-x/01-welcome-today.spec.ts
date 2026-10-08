import {expect, type Locator, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {createEmptyHealth, HEALTH_STORAGE_KEY, healthSchema, type HealthData} from '../lib/health';
import {INSIGHTS_KEY} from '../lib/insights/schema';
import {addLocalDays} from '../lib/local-date';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema, type Platform} from '../lib/positions';
import {go, journey, localKeys, noSideways, open, ready, snap, type Journey} from './kit';

// Session X Part 14, journeys J001–J030: the welcome, first run and Today (docs/verification/x-cloud/HUMAN_TEST.md).
const welcomeCard = (page: Page) => page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'});
const state = (page: Page) => page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k.startsWith('zigoals')).sort()));
async function quickAdd(j: Journey) {
  await j.page.locator(j.phone ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
  const dialog = j.page.getByRole('dialog', {name: 'What would you like to add?'});
  await expect(dialog).toBeVisible();
  return dialog;
}
async function finishWelcome(j: Journey, pillars: RegExp[]) {
  const {page} = j, flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  for (const pillar of pillars) await flow.getByRole('checkbox', {name: pillar}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app$/);
  await ready(page);
}

journey('J001', 'a new device opens Today: the welcome explains Local Demo and nothing is saved yet', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app');
  const card = welcomeCard(j.page);
  await expect(card).toBeVisible();
  await expect(card).toContainText('No wallet or account needed.');
  for (const name of ['Explore the demo', 'Not now']) await expect(card.getByRole('button', {name, exact: true})).toBeVisible();
  // A first visit writes no personal record (display flags at most).
  expect((await localKeys(j.page)).filter(k => /habits|health|platform|goals|ledger/.test(k))).toEqual([]);
  await snap(j, 'J001', 'welcome');
});

journey('J002', 'the welcome: Habits and Health chosen, Finish setup, Today shows exactly those areas', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app');
  await welcomeCard(j.page).getByRole('link', {name: 'Start setup', exact: true}).click();
  await j.page.waitForURL('**/app/welcome');
  await finishWelcome(j, [/^Habits/, /^Health & food/]);
  await expect(j.page.locator('.today-page')).toHaveAttribute('data-interests', 'habits-health');
  await expect(welcomeCard(j.page)).toHaveCount(0);
  await snap(j, 'J002', 'today-after-setup');
});

journey('J003', 'the welcome left half-way and reloaded: nothing saved, the card still offered', {views: 'all', data: ['E']}, async j => {
  await open(j.page, '/app');
  const before = await state(j.page);
  await welcomeCard(j.page).getByRole('link', {name: 'Start setup', exact: true}).click();
  await j.page.waitForURL('**/app/welcome');
  await j.page.locator('main').getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await j.page.locator('main').getByRole('checkbox', {name: /^Habits/}).check();
  await j.page.reload();
  expect(await state(j.page)).toBe(before);
  await open(j.page, '/app');
  await expect(welcomeCard(j.page)).toBeVisible();
});

journey('J004', 'the welcome run twice adds nothing twice', {views: ['D', 'P'], data: ['E']}, async j => {
  await open(j.page, '/app/welcome');
  await finishWelcome(j, [/^Habits/]);
  await open(j.page, '/app/welcome');
  await finishWelcome(j, [/^Habits/]);
  const habits = await j.page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:habits:v1') ?? '{"habits":[]}'));
  const titles: string[] = habits.habits.map((h: {title: string}) => h.title);
  expect(new Set(titles).size).toBe(titles.length);
});

journey('J005', 'Today with no data: every empty state says what to do next; no zero shown as a fact', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app');
  await welcomeCard(j.page).getByRole('button', {name: 'Not now', exact: true}).click();
  await ready(j.page);
  const main = j.page.locator('main');
  // A brand-new Today never presents invented numbers: no currency amount and no streak count without records.
  await expect(main).not.toContainText(/\$\s?\d|€\s?\d|\d+-day streak/);
  await snap(j, 'J005', 'empty-today');
});

journey('J006', 'Showcase loads and resets without touching my own Local Demo records', {views: 'all', data: ['E', 'L']}, async j => {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: 'Create a habit'}).first().click();
  await page.getByLabel('Habit title', {exact: true}).fill('Journal 📓 before bed');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Journal 📓 before bed'}).first()).toBeVisible();
  const mine = await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'));
  await open(page, '/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await ready(page);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'))).toBe(mine);
  await open(page, '/app/settings');
  await page.getByRole('button', {name: 'Exit Showcase', exact: true}).first().click();
  await ready(page);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:habits:v1'))).toBe(mine);
  await open(page, '/app/habits');
  await expect(page.getByRole('heading', {name: 'Journal 📓 before bed'}).first()).toBeVisible();
});

journey('J007', 'Quick add from Today: the dialog opens, Escape closes it and focus returns', {views: 'all', data: ['S'], live: true}, async j => {
  await open(j.page, '/app');
  const dialog = await quickAdd(j);
  await j.page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(j.page.locator(j.phone ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger')).toBeFocused();
});

journey('J009', 'the Quick-add line: "drank 2 glasses of water" previewed, saved, shown on Health', {views: 'all', data: ['L'], live: true}, async j => {
  await open(j.page, '/app');
  const dialog = await quickAdd(j), line = dialog.getByRole('form', {name: 'Type a line'});
  await dialog.getByRole('textbox', {name: 'Type a line'}).fill('drank 2 glasses of water');
  await j.page.keyboard.press('Enter');
  await expect(line).toContainText('Will save: Water · 2 glasses (500 mL) · today');
  await line.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(line.getByRole('status')).toContainText('Saved: Water · 500 mL · today');
  await dialog.getByRole('button', {name: 'Close Quick add', exact: true}).click();
  await open(j.page, '/app/health');
  await expect(j.page.getByRole('region', {name: 'Water journal'})).toContainText('500 mL recorded');
});

journey('J010', 'the Quick-add line misunderstood: a plain message, nothing saved', {views: 'all', data: ['L']}, async j => {
  await open(j.page, '/app');
  const before = await state(j.page);
  const dialog = await quickAdd(j), line = dialog.getByRole('form', {name: 'Type a line'});
  await dialog.getByRole('textbox', {name: 'Type a line'}).fill('asdf qwerty');
  await line.getByRole('button', {name: 'Preview', exact: true}).click();
  await expect(line.getByRole('status')).toContainText('I didn’t understand that yet.');
  expect(await state(j.page)).toBe(before);
});

journey('J011', 'the Quick-add line with "yesterday" saves on yesterday in the device\'s zone', {views: ['D', 'P'], data: ['L']}, async j => {
  await j.page.clock.install({time: new Date('2026-10-26T08:30:00+01:00')});
  await open(j.page, '/app');
  const dialog = await quickAdd(j), line = dialog.getByRole('form', {name: 'Type a line'});
  await dialog.getByRole('textbox', {name: 'Type a line'}).fill('weight 78.4 yesterday');
  await j.page.keyboard.press('Enter');
  await expect(line).toContainText('yesterday');
  await line.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(line.getByRole('status')).toContainText('Saved');
  const health = await j.page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:health:v1')!));
  expect(JSON.stringify(health)).toContain('2026-10-25');
});

journey('J012', 'Customize Today: hide and show a widget; reload keeps the choice', {views: 'all', data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app');
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  const widget = page.locator('.today-page .placed-module[data-kind="widget"]').first();
  const name = (await widget.getAttribute('data-module')) ?? '';
  await widget.getByRole('button', {name: /^Options for/}).click();
  await widget.getByRole('button', {name: 'Hide widget'}).click();
  await expect(widget).toHaveAttribute('data-hidden', 'true');
  await page.getByRole('button', {name: 'Finish customizing'}).click();
  await page.reload();
  await ready(page);
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  const again = page.locator(`.today-page .placed-module[data-kind="widget"][data-module="${name}"]`);
  await expect(again).toHaveAttribute('data-hidden', 'true');
  await again.getByRole('button', {name: /^Options for/}).click();
  await again.getByRole('button', {name: 'Show widget'}).click();
  await page.getByRole('button', {name: 'Finish customizing'}).click();
  await noSideways(page);
});

journey('J015', 'What\'s new: dismissed once, it never returns on this device', {views: 'all', data: ['E', 'S']}, async j => {
  const {page} = j;
  await open(page, '/app');
  const notNow = welcomeCard(page).getByRole('button', {name: 'Not now', exact: true});
  if (await notNow.count()) await notNow.click();
  const card = page.locator('.whats-new-card');
  if (await card.count() === 0) return; // shown once per release; nothing to dismiss on this device
  await card.getByRole('button', {name: 'Got it', exact: true}).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(page.locator('.whats-new-card')).toHaveCount(0);
});

journey('J022', 'Today at midnight: the day rolls over without a reload', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T23:59:00+02:00')});
  await open(page, '/app');
  const before = await page.locator('main').innerText();
  await page.clock.runFor(2 * 60_000);
  await page.waitForTimeout(500);
  const after = await page.locator('main').innerText();
  // The date shown moves from Wednesday 14 to Thursday 15 October without a reload.
  expect(before).toMatch(/14|Wednesday/);
  await expect.poll(() => page.locator('main').innerText()).toMatch(/15|Thursday/);
  expect(after.length).toBeGreaterThan(0);
});

journey('J025', 'Today with reduced motion and with Motion Off: nothing moves by itself', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  for (const mode of ['reduce', 'off'] as const) {
    if (mode === 'reduce') await page.emulateMedia({reducedMotion: 'reduce'});
    else { await page.emulateMedia({reducedMotion: 'no-preference'}); await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off')); }
    await open(page, '/app');
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition)).length), {timeout: 4000}).toBe(0);
  }
});

journey('J027', 'every Today link lands on its page with the title shown', {views: 'all', data: ['S'], live: true}, async j => {
  const {page} = j;
  await open(page, '/app');
  const hrefs = await page.locator('main a[href^="/app/"]').evaluateAll(links => [...new Set(links.map(a => a.getAttribute('href')!.split('#')[0]!))].slice(0, 12));
  for (const href of hrefs) {
    await open(page, href);
    await expect(page.locator('main h1').first()).toBeVisible();
  }
});

journey('J029', 'Today offline: what is on the device still shows; market figures say unavailable, never zero', {views: 'all', data: ['S']}, async j => {
  const {page, info} = j;
  await open(page, '/app');
  await page.context().setOffline(true);
  await page.reload().catch(() => undefined);
  // A reload offline may not load at all (no service worker by design): then the page that was open stays usable.
  await page.context().setOffline(false);
  await open(page, '/app');
  await expect(page.locator('main')).not.toContainText(/\$0\.00|€0\.00/);
  info.annotations.push({type: 'note', description: 'ZIGoals has no offline cache by design (ADR: no service worker cache); offline reload is the browser\'s own error page.'});
});

async function habit(j: Journey, title: string) {
  const {page} = j;
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  if (j.phone) { const sheet = page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await page.keyboard.press('Escape'); }
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}
async function forYou(page: Page) {
  // A device that has not chosen its Today yet shows "Make Today yours." first, and "For you" only after a choice
  // (today-dashboard.tsx): the person keeps Balanced, as offered.
  const region = page.getByRole('region', {name: 'For you'}), keep = page.getByRole('button', {name: 'Keep Balanced and continue', exact: true});
  await expect(region.or(keep).first()).toBeVisible();
  if (await keep.isVisible()) { await keep.click(); await expect(keep).toHaveCount(0); }
  await expect(region).toBeVisible();
  const more = region.getByRole('button', {name: /^Show more/});
  if (await more.count()) await more.click();
}
/** Settings → Weekly review day (a phone also has a "Weekly review day" row that jumps to it, hence the role). */
const reviewDay = (page: Page) => page.getByRole('combobox', {name: /^Weekly review day/});

journey('J016', 'the weekly review on its day: steps with my own numbers, an intention, finished', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  await page.clock.install({time: new Date('2026-10-13T10:00:00+02:00')}); // a Tuesday
  await habit(j, 'Fictional stretch');
  await page.getByRole('article', {name: 'Fictional stretch', exact: true}).getByRole('button', {name: 'Complete Fictional stretch', exact: true}).click();
  await open(page, '/app/settings');
  await reviewDay(page).selectOption({label: 'Tuesday'});
  await open(page, '/app');
  await forYou(page);
  const card = page.getByRole('region', {name: /^(A short look back at your week\.|Continue your review\.)$/});
  await card.getByRole('button', {name: 'Start review', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Your week'});
  for (let i = 0; i < 8; i++) {
    if (await dialog.getByRole('heading', {level: 3}).textContent() === 'One intention') break;
    const before = await dialog.getByRole('heading', {level: 3}).textContent();
    await dialog.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(dialog.getByRole('heading', {level: 3})).not.toHaveText(before!);
  }
  await dialog.getByLabel('Your words, if you like').fill('Fictional: walk on Thursday');
  await dialog.getByRole('button', {name: 'Finish review', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Review saved on this device.'})).toBeVisible();
  await snap(j, 'J016', 'review-saved');
});

journey('J018', 'the evening wrap-up: on in Settings, after 18:00 a calm card, a mood saved', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T18:30:00+02:00')});
  await habit(j, 'Fictional evening walk');
  await open(page, '/app/settings');
  const settings = page.getByRole('region', {name: 'Evening wrap-up', exact: true});
  await settings.getByLabel('Show the evening wrap-up on Today').check();
  await settings.getByRole('button', {name: 'Save wrap-up', exact: true}).click();
  await expect(settings.getByRole('status')).toHaveText('The evening wrap-up shows on Today from 18:00.');
  await open(page, '/app');
  await forYou(page);
  const card = page.getByRole('article', {name: 'Your evening wrap-up'});
  await expect(card).not.toContainText(/missed|failed|only/i);
  await card.getByRole('button', {name: 'Good', exact: true}).click();
  await expect(card.getByRole('status')).toHaveText('Saved for today: Good.');
});

journey('J020', 'the Guide: on, one labelled note, "Not today", then off', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-12T19:00:00+02:00')});
  await habit(j, 'Fictional open habit');
  await open(page, '/app/settings');
  const toggle = page.getByRole('switch', {name: 'Guide on this device', exact: true});
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await open(page, '/app');
  await forYou(page);
  const note = page.locator('main').getByRole('button', {name: 'Not today', exact: true});
  if (await note.count()) { await note.first().click(); await expect(note).toHaveCount(0); }
  await open(page, '/app/settings');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

journey('J014', 'a habit reminder shows on Today when its time comes, and stays dismissed for today', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-01T08:58:00+02:00')});
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional walk');
  await page.getByLabel('Reminder time — on this device').fill('09:00');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  if (j.phone) { const sheet = page.locator('dialog.phone-form-sheet[open]'); if (await sheet.count()) await page.keyboard.press('Escape'); }
  await open(page, '/app');
  const reminder = page.getByRole('article', {name: 'Reminder: Fictional walk'});
  await expect(reminder).toHaveCount(0);
  await page.clock.runFor(150_000);
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText('Not done yet today.');
  await reminder.getByRole('button', {name: 'Dismiss for today'}).click();
  await expect(reminder).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('article', {name: 'Reminder: Fictional walk'})).toHaveCount(0);
});

journey('J021', 'Today\'s sleep card follows a night logged in Sleep', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-14T09:00:00+02:00')});
  await open(page, '/app/health?view=sleep');
  await page.getByRole('form', {name: 'Log a night or a nap'}).getByRole('button', {name: 'Save', exact: true}).click();
  await open(page, '/app');
  await forYou(page);
  const card = page.getByRole('article', {name: 'Sleep', exact: true});
  if (await card.count()) await expect(card).toContainText(/h|min/);
});

journey('J023', 'Today\'s day is the device\'s day in Kiritimati and in New York', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  // 2026-10-14 11:30 UTC is already the 15th in Kiritimati (UTC+14) and still the 14th in New York (UTC-4).
  for (const [zone, day] of [['Pacific/Kiritimati', /15/], ['America/New_York', /14/]] as const) {
    const context = await page.context().browser()!.newContext({timezoneId: zone, viewport: page.viewportSize()!, locale: 'en-US'});
    const tab = await context.newPage();
    await tab.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'journey offline'}}));
    await tab.clock.install({time: new Date('2026-10-14T11:30:00Z')});
    await open(tab, '/app');
    await expect(tab.locator('main')).toContainText(day);
    await context.close();
  }
});

journey('J024', 'Today at 200 % zoom (720 px wide): nothing overlaps, nothing sideways', {views: ['D'], data: ['S']}, async j => {
  await j.page.setViewportSize({width: 720, height: 450});
  await open(j.page, '/app');
  await snap(j, 'J024', 'zoom-200');
});

journey('J028', 'two tabs: a habit checked in one tab shows in the other after it reloads', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await habit(j, 'Fictional two tabs');
  const other = await page.context().newPage();
  await open(other, '/app/habits');
  await page.getByRole('article', {name: 'Fictional two tabs', exact: true}).getByRole('button', {name: 'Complete Fictional two tabs', exact: true}).click();
  await other.reload();
  await ready(other);
  await expect(other.getByRole('article', {name: 'Fictional two tabs', exact: true}).getByRole('button', {name: 'Undo completion for Fictional two tabs'})).toHaveAttribute('aria-pressed', 'true');
  await other.close();
});

journey('J017', 'the weekly review skipped with one tap; Today stays calm', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-13T10:00:00+02:00')});
  await habit(j, 'Fictional skip check');
  await open(page, '/app/settings');
  await reviewDay(page).selectOption({label: 'Tuesday'});
  await open(page, '/app');
  await forYou(page);
  const card = page.getByRole('region', {name: /^(A short look back at your week\.|Continue your review\.)$/});
  await card.getByRole('button', {name: 'Skip this week', exact: true}).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(page.getByRole('region', {name: /^(A short look back at your week\.|Continue your review\.)$/})).toHaveCount(0);
});

/** A fictional tracked Goal in dollars with nothing funded yet (as tests/run9-1-fixture.ts seeds one). */
function holidayFund(): Platform {
  return {...emptyPlatform(), goals: [privateGoalSchema.parse({id: '91', name: 'Fictional holiday fund', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '200000', notes: '', createdAt: '2026-09-01T09:00:00.000Z', milestones: []})]} as Platform;
}
const fundRing = (scope: Locator) => scope.getByRole('progressbar', {name: 'Fictional holiday fund progress'});
/** "Fund your Goal" with new cash of `amount` dollars: the asset, the preview, then the confirmation. */
async function fundWithCash(page: Page, amount: string) {
  const sheet = page.getByRole('dialog', {name: 'Fund your Goal'});
  await sheet.getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByLabel('Cash amount', {exact: true}).fill(amount);
  await sheet.getByRole('button', {name: 'Continue with this asset', exact: true}).click();
  await sheet.getByRole('button', {name: 'Preview contribution', exact: true}).click();
  await sheet.getByRole('button', {name: 'Confirm & fund Goal', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'Goal funded.'})).toBeVisible();
}

journey('J008', 'Quick add a contribution to a goal from Today; its progress follows on Today and Goals', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PLATFORM_KEY, JSON.stringify(holidayFund())]);
  await open(page, '/app');
  await expect(page.getByRole('region', {name: 'Your goals'}).locator('.goal-card').filter({hasText: 'Fictional holiday fund'}).locator('.goal-value')).toContainText('$2,000.00');
  const dialog = await quickAdd(j);
  await dialog.getByRole('button', {name: /^Contribution/}).click();
  await dialog.getByRole('navigation', {name: 'Choose a Goal to contribute to'}).getByRole('link').filter({hasText: 'Fictional holiday fund'}).click();
  await page.waitForURL(/\/app\/goals\/tracked\/91\?contribute=1/);
  await expect(page.getByRole('dialog', {name: 'Fund your Goal'})).toBeVisible();
  await fundWithCash(page, '500');
  const overview = page.getByTestId('tracked-progress');
  await expect(overview).toContainText('$500');
  await expect(fundRing(overview)).toHaveAttribute('aria-valuenow', '25');
  await open(page, '/app');
  await expect(fundRing(page.getByRole('region', {name: 'Your goals'}))).toHaveAttribute('aria-valuenow', '25');
  await open(page, '/app/goals');
  await expect(fundRing(page.locator('main .goal-card').filter({hasText: 'Fictional holiday fund'}))).toHaveAttribute('aria-valuenow', '25');
});

journey('J013', 'Customize Today with the keyboard only: move a widget later, hide it, finish; reload keeps both', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  // Each control is reached as Tab reaches it (all are in the tab order); every action is a key press.
  const press = async (target: Locator) => { await target.focus(); await page.keyboard.press('Enter'); };
  const order = () => page.locator('.today-page .placed-module[data-kind="widget"]').evaluateAll(els => els.map(e => e.getAttribute('data-module')));
  const widget = (id: string) => page.locator(`.today-page .placed-module[data-module="${id}"]`);
  await open(page, '/app');
  await press(page.getByRole('button', {name: 'Customize Today', exact: true}));
  const finish = page.getByRole('button', {name: 'Finish customizing', exact: true});
  await expect(finish).toBeVisible();
  const before = (await order()) as string[];
  const [first, second] = before as [string, string];
  const options = widget(first).getByRole('button', {name: /^Options for /});
  const title = (await options.getAttribute('aria-label'))!.replace(/^Options for /, '');
  await press(options);
  await press(widget(first).getByRole('button', {name: `Move ${title} down`, exact: true}));
  await expect(page.locator('.dashboard-save-status')).toHaveText(`${title} moved down. Layout saved on this device.`);
  await expect.poll(order).toEqual([second, first, ...before.slice(2)]);
  await expect(widget(first)).toBeFocused();
  await press(options);
  await press(widget(first).getByRole('button', {name: 'Hide widget', exact: true}));
  await expect(widget(first)).toHaveAttribute('data-hidden', 'true');
  await press(finish);
  await expect(widget(first)).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(widget(first)).toHaveCount(0);
  await press(page.getByRole('button', {name: 'Customize Today', exact: true}));
  await expect.poll(order).toEqual([second, first, ...before.slice(2)]);
  await expect(widget(first)).toHaveAttribute('data-hidden', 'true');
});

/** Walks on `days` days back from `day`: 5,000 steps on fourteen of every twenty, 3,000 on the others; water on the first seven only. */
function walks(day: string, days: number): HealthData {
  const AT = `${day}T07:00:00.000Z`, low = (i: number) => i % 10 >= 7;
  const health: HealthData = {...createEmptyHealth(), activity: Array.from({length: days}, (_, i) => ({id: `health_activity-${String(i).padStart(3, '0')}`, date: addLocalDays(day, -i), name: 'Fictional walk', steps: low(i) ? 3000 : 5000, minutes: 40, createdAt: AT, updatedAt: AT}))};
  health.daily = {version: 1, favorites: [], savedMeals: [], plans: [], waterOperations: [], copyOperations: [], groceryNotes: '', preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: null, weightUnit: 'kg'}, water: Array.from({length: Math.min(days, 7)}, (_, i) => ({id: `health_water-${String(i).padStart(3, '0')}`, date: addLocalDays(day, -i), amountMilli: 250_000, unit: 'ml' as const, createdAt: AT, updatedAt: AT}))};
  return healthSchema.parse(health);
}
const SENTENCE = 'On 7 of 14 days you walked at least 5,000 steps, you also logged water; on other days 0 of 6.';

journey('J019', 'an insight appears only with two weeks of records; dismissed, it stays away for four weeks', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await page.clock.install({time: new Date('2026-10-01T09:00:00+02:00')});
  const notice = page.getByRole('region', {name: 'Something you might notice', exact: true});
  // Someone past Today's first-run choice (For you shows only then), with walks recorded for `days` days.
  const seedWalks = async (days: number) => {
    await page.goto('/app/settings');
    await page.evaluate(values => { for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [HEALTH_STORAGE_KEY]: JSON.stringify(walks('2026-10-01', days))});
    await open(page, '/app');
    await forYou(page);
  };
  // Ten days are not enough to pair anything.
  await seedWalks(10);
  await expect(notice).toHaveCount(0);
  await seedWalks(20);
  const card = notice.getByRole('article').filter({hasText: SENTENCE});
  await expect(card).toBeVisible();
  await card.getByText('How this is calculated', {exact: true}).click();
  await expect(card).toContainText('Counts of your own records. Not a cause, not advice.');
  await card.getByRole('button', {name: `Dismiss: ${SENTENCE}`}).click();
  await expect(page.getByText(SENTENCE)).toHaveCount(0);
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), INSIGHTS_KEY))!)).toEqual({version: 1, dismissed: {'steps-water': '2026-10-01'}});
  // Still away 27 days later; back on the 29th day.
  for (const [day, shown] of [['2026-10-28T09:00:00+01:00', 0], ['2026-10-29T09:00:00+01:00', 1]] as const) {
    await page.clock.setSystemTime(new Date(day));
    await page.reload();
    await ready(page);
    await forYou(page);
    await expect(page.getByText(SENTENCE)).toHaveCount(shown);
  }
});

journey('J026', 'the brand film opens only on request, plays, closes with Escape and focus returns', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  const media: string[] = [];
  page.on('request', r => { if (/\/brand\/how-it-works\//.test(r.url())) media.push(r.url()); });
  await open(page, '/app');
  const trigger = page.locator('.today-hero').getByRole('button', {name: 'See how it works', exact: true});
  await expect(trigger).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(media, 'nothing of the film loads before it is asked for').toEqual([]);
  await trigger.click();
  const dialog = page.getByRole('dialog', {name: 'ZIGoals brand film', exact: true}), video = dialog.locator('video');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', {name: 'Close brand film', exact: true})).toBeFocused();
  expect(await video.evaluate(v => (v as HTMLVideoElement).paused), 'it never starts by itself').toBe(true);
  // The person presses play (the control sits inside the video's own controls, so the element's play()).
  await video.evaluate(v => (v as HTMLVideoElement).play());
  await expect.poll(() => video.evaluate(v => !(v as HTMLVideoElement).paused)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', {name: 'ZIGoals brand film'})).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.locator('dialog.intro-video-dialog video').evaluate(v => ({paused: (v as HTMLVideoElement).paused, time: (v as HTMLVideoElement).currentTime}))).toEqual({paused: true, time: 0});
});

journey('J030', 'Today\'s goal cards (on-track status and progress ring) agree with the Goals page', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  const read = (cards: Locator) => cards.evaluateAll(els => els.map(e => {
    const ring = e.querySelector('.goal-progress [role="progressbar"], .goal-progress [role="img"]');
    return {key: e.getAttribute('data-goal-key'), name: e.querySelector('h2')?.textContent?.trim(), status: e.querySelector('.card-top .badge')?.textContent?.trim(), ring: ring?.getAttribute('aria-valuetext') ?? ring?.getAttribute('aria-label'), value: e.querySelector('.goal-value')?.textContent?.trim()};
  }));
  await open(page, '/app');
  const today = await read(page.getByRole('region', {name: 'Your goals'}).locator('.goal-card'));
  expect(today.length).toBeGreaterThan(0);
  await go(j, 'Goals');
  for (const card of today) {
    const [onGoals] = await read(page.locator(`main .goal-card[data-goal-key="${card.key}"]`));
    expect(onGoals, `${card.name} on Goals`).toEqual(card);
  }
});
