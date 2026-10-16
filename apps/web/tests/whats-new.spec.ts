import {expect, test} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {EARLIER_LINKS, WHATS_NEW_LINKS} from '../components/for-you/whats-new-card';

// The one-time "What's new" card (Session P, owner addition 4): once per device, never during onboarding, links to Help.
// Session AC: the seeded records are the Showcase's for 2026-09-20, so the page's clock is that day too; with the real
// date the seeded quit habit reached a 30-day badge on 2026-10-16 and its celebration covered Today.
test.beforeEach(async ({page}) => { await page.clock.setFixedTime(new Date('2026-09-20T09:30:00.000Z')); await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
const seed = async (page: import('@playwright/test').Page) => {
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true})});
};

/**
 * Session AA-Cloud Part 1: the card sits in Today's "Updates and summaries" at the end of the page; on a phone that
 * area's cards wait behind its one row, so open it first (nothing else about the card changes).
 */
const revealUpdates = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const fold = page.getByRole('region', {name: 'Updates and summaries', exact: true}).getByRole('button', {name: /^Show more/});
  if (await fold.count()) await fold.click();
};

test('a brand-new device sees the welcome and no "What\'s new" card', async ({page}) => {
  await page.goto('/app');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'A few new things.'})).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBeNull();
});

test('after onboarding the card lists the Help entries, is dismissed once per device and writes nothing on view', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await revealUpdates(page);
  const card = page.getByRole('region', {name: 'A few new things.'});
  await expect(card).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBeNull();
  const links = card.getByRole('link');
  await expect(links).toHaveCount(WHATS_NEW_LINKS.length);
  for (const [index, link] of WHATS_NEW_LINKS.entries()) { await expect(links.nth(index)).toHaveText(link.label); await expect(links.nth(index)).toHaveAttribute('href', link.href); }
  const got = card.getByRole('button', {name: 'Got it', exact: true});
  expect((await got.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await got.click();
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), WHATS_NEW_KEY)).toBe(JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}));
  await page.reload();
  await revealUpdates(page);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'A few new things.'})).toHaveCount(0);
});

test('a link opens its Help answer; the earlier release\'s links wait under "Earlier updates"', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await revealUpdates(page);
  const card = page.getByRole('region', {name: 'A few new things.'});
  // Session W Part 24: no promise that everything stays on this device (Spotify and chess reach their own sites).
  await expect(card).toContainText('Each one is optional, and nothing changes until you use it.');
  await expect(card).not.toContainText('stays on this device');
  // Session AB-Design (ADR-024, deliberate; the second merger): this release's links are the card's own; AB-Cloud's,
  // AA-Local's, AA-Cloud's, Z-Local's, Z-Cloud's, Y's, X-Local's, W's and V's wait under "Earlier updates", AB-Cloud's first.
  // Session AC (ADR-025, deliberate): this release's links are the card's own; AB-Design's eight lead "Earlier updates".
  await card.getByRole('link', {name: 'The page ends at the footer links; the Alpha’s facts live in Settings and Help'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-ac-footer$/);
  await expect(page.locator('#help-ac-footer')).toHaveAttribute('open', '');
  await expect(page.locator('#help-ac-footer')).toContainText('Every page now ends after the footer’s links');
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'The footer banner: Goals, Habits & Health = Wealth'})).toHaveCount(0);
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'Restore from a backup: see what it holds, merge or replace, Undo'})).toHaveCount(0);
  await page.goto('/app');
  await revealUpdates(page);
  await expect(card.getByRole('link', {name: 'Habits by time of day, a one-tap timer finish, days since for a quit habit, skip with a reason, routines'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'A compound interest calculator'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'ZIGi can do every ordinary task in the app'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Delete an archived habit for good'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'End a vacation early'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'ZIGi comes alive: the real art, idle, emotions'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Sleep and sleep debt'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Habits that tick themselves off from Health'})).toHaveCount(0);
  await card.getByText('Earlier updates', {exact: true}).click();
  const earlier = card.locator('.whats-new-earlier').getByRole('link');
  await expect(earlier).toHaveCount(EARLIER_LINKS.length);
  // Session AB-Design (ADR-024, deliberate): AB-Cloud's six links now lead, so every pinned position moves by six.
  // Session AC (ADR-025, deliberate): AB-Design's eight links now lead, so every pinned position moves by eight more.
  await expect(earlier.first()).toHaveText('One calm look across Goals, Habits, Health and Wealth, and a Life overview on Today');
  await expect(earlier.nth(8)).toHaveText('Your goal plans, habit extras, routines and more now sync, encrypted');
  await expect(earlier.nth(14)).toHaveText('Habits by time of day, a one-tap timer finish, days since for a quit habit, skip with a reason, routines');
  await expect(earlier.nth(21)).toHaveText('Every page starts with what matters most');
  await expect(earlier.nth(29)).toHaveText('Say it the way you say it: numbers, times, “no wait, three”');
  await expect(earlier.nth(33)).toHaveText('ZIGi’s cleaner panel and your own suggestions');
  await expect(earlier.nth(40)).toHaveText('End a vacation early');
  await expect(earlier.nth(44)).toHaveText('ZIGi comes alive: the real art, idle, emotions');
  // AA-Local's release follows AB-Cloud's (its own assertions, kept): the habits answer.
  await earlier.nth(14).click();
  await expect(page).toHaveURL(/\/app\/help#help-aa-habits$/);
  await expect(page.locator('#help-aa-habits')).toHaveAttribute('open', '');
  await expect(page.locator('#help-aa-habits')).toContainText('the section the clock is in opens first');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  // AA-Cloud's release follows it (its own assertions, kept): the calculator answer, then Z-Local's ZIGi answer.
  await card.getByRole('link', {name: 'A compound interest calculator'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-aa-calculator$/);
  await expect(page.locator('#help-aa-calculator')).toHaveAttribute('open', '');
  await expect(page.locator('#help-aa-calculator')).toContainText('Every result is an estimate: returns are not guaranteed.');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'ZIGi can do every ordinary task in the app'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-your-ai-act$/);
  await expect(page.locator('#help-your-ai-act')).toHaveAttribute('open', '');
  await expect(page.locator('#help-your-ai-act')).toContainText('Every ordinary task in the app is a card now');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'End a vacation early'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-y-vacation$/);
  await expect(page.locator('#help-y-vacation')).toHaveAttribute('open', '');
  await expect(page.locator('#help-y-vacation')).toContainText('it removes those planned skips from today on');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Sleep and sleep debt'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-w-sleep$/);
  await expect(page.locator('#help-w-sleep')).toHaveAttribute('open', '');
  await page.goto('/app');
  await revealUpdates(page);
  await card.getByText('Earlier updates', {exact: true}).click();
  await card.getByRole('link', {name: 'Habits that tick themselves off from Health'}).click();
  await expect(page).toHaveURL(/\/app\/help#help-auto-checkins$/);
  await expect(page.locator('#help-auto-checkins')).toHaveAttribute('open', '');
  await expect(page.locator('#help-auto-checkins')).toContainText('Tapping the habit yourself always wins');
});
