import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';

// Session AJ (Part 6): Guided journeys (A7: reached from search, Goals, Habits and My Universe; no sidebar entry), the
// Life Score (opt-in, D10) and Focus Sessions (D13). Fictional records; every request to the server answered offline.
async function fresh(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(([k, v]) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k!, v!); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('seeded', '1'); } } catch { /* storage denied */ } }, [DASHBOARD_SETTINGS_KEY, JSON.stringify({...presetSettings('balanced'), onboarded: true})]);
}

test('Guided journeys: no sidebar entry; start one, today\'s step opens, Done and Undo, the next unlocks tomorrow, end it', async ({page}) => {
  await fresh(page);
  await page.clock.install({time: new Date('2026-10-29T09:00:00Z')});
  await page.goto('/app/journey');
  await expect(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: /Guided/})).toHaveCount(0);
  await page.getByRole('link', {name: 'Guided journeys →'}).click();
  await expect(page).toHaveURL(/\/app\/guided$/);
  const programs = page.getByRole('region', {name: 'Choose a journey'});
  await programs.getByRole('button', {name: 'Start: Start walking'}).click();
  const mine = page.getByRole('region', {name: 'Your journeys'});
  const first = mine.getByRole('button', {name: /^Done: /}).first();
  await expect(first).toBeVisible();
  await expect(mine).toContainText('Unlocks tomorrow');
  await expect(mine).toContainText('Not medical advice');
  await first.click();
  await expect(mine.getByRole('button', {name: /^Undo: /}).first()).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:guided-journeys:v1') ?? 'null'));
  expect(stored.journeys).toHaveLength(1);
  expect(stored.journeys[0]).toMatchObject({programId: 'walking-start', startedOn: '2026-10-29'});
  expect(stored.journeys[0].done).toHaveLength(1);
  // Tomorrow the second step is open.
  await page.clock.setFixedTime(new Date('2026-10-30T09:00:00Z'));
  await page.reload();
  await expect(page.getByRole('region', {name: 'Your journeys'}).getByRole('button', {name: /^Done: /})).toHaveCount(1);
  const journeys = page.getByRole('region', {name: 'Your journeys'});
  await journeys.getByRole('button', {name: 'End this journey', exact: true}).click();
  await expect(journeys).toContainText('End this journey?');
  await journeys.getByRole('button', {name: 'End this journey', exact: true}).click();
  await expect.poll(async () => (await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:guided-journeys:v1') ?? 'null'))).journeys[0].endedOn).toBe('2026-10-30');
});

test('search finds Guided journeys', async ({page}) => {
  await fresh(page);
  await page.goto('/app');
  await page.keyboard.press('/');
  const box = page.getByRole('combobox').or(page.getByRole('searchbox')).first();
  await box.fill('guided');
  await expect(page.getByRole('option', {name: /Guided journeys/}).or(page.getByRole('link', {name: /Guided journeys/})).first()).toBeVisible();
});

test('the Life Score is off until turned on; then a number with a Why? per pillar, missing pillars left out', async ({page}) => {
  await fresh(page);
  await page.goto('/app/journey');
  const offer = page.getByRole('group', {name: 'Life Score'});
  await expect(offer).toContainText('Off until you turn it on.');
  await offer.getByRole('button', {name: 'Turn on Life Score'}).click();
  // A new person: nothing recorded yet, so no number.
  await expect(page.getByRole('group', {name: 'Not yet'})).toContainText('It starts once you have a habit');
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:ui-prefs:v1') ?? 'null'));
  expect(prefs.lifeScore).toBe(true);
});

test('Focus Sessions: a session ended early withers and is kept; the honest note says the web cannot block apps', async ({page}) => {
  await fresh(page);
  await page.clock.install({time: new Date('2026-10-29T09:00:00Z')});
  await page.goto('/app/journey#focus');
  const garden = page.getByRole('region', {name: 'Grow something while you focus'});
  await expect(garden).toContainText('a web page cannot block other apps or sites');
  await garden.getByRole('button', {name: '15 min'}).click();
  await garden.getByRole('button', {name: 'Start 15 minutes'}).click();
  await page.clock.fastForward('05:00');
  await garden.getByRole('button', {name: 'End early'}).click();
  await expect(garden.getByRole('status')).toContainText('It withered, and it is kept in your garden.');
  await expect(garden).toContainText('Your garden: 0 grown, 1 withered (kept).');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:focus-sessions:v1') ?? 'null'));
  expect(stored.sessions[0]).toMatchObject({plannedMinutes: 15, outcome: 'withered'});
});
