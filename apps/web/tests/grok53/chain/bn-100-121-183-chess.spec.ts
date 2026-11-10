import {expect, test, type Page} from '@playwright/test';
import {presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {DAILY_PUZZLE_FIXTURE} from '../../../lib/chess/fixtures';

// Session AL (lane L6): Chess, Berlin BN-100 (rating goal errors far from the field, past date and duplicates accepted),
// BN-121/BN-181 (a stale "not a legal move" note), BN-183 (puzzle progress lost on reload) and D-012/D-126 (a run-on
// status line). Desktop 1280; a fresh profile with a fictional Lichess username; lichess.org is mocked; fixed clock.
test.use({viewport: {width: 1280, height: 900}});
const NOW = '2026-11-04T03:00:00.000Z';
async function seed(page: Page) {
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/**', route => route.request().url().startsWith('http://127.0.0.1') ? route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}) : route.fallback());
  await page.route('https://lichess.org/**', route => {
    const path = new URL(route.request().url()).pathname, headers = {'access-control-allow-origin': '*'};
    if (path === '/api/puzzle/daily') return route.fulfill({status: 200, contentType: 'application/json', headers, body: JSON.stringify(DAILY_PUZZLE_FIXTURE)});
    return route.fulfill({status: 404, contentType: 'application/json', headers, body: '{"error":"Not found"}'});
  });
  await page.route('https://api.chess.com/**', route => route.fulfill({status: 404, body: '{}'}));
  await page.addInitScript(values => {
    if (sessionStorage.getItem('al-chess-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('al-chess-fixture', '1');
  }, {[WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}, 'zigoals:settings:v1': {...presetSettings('balanced'), onboarded: true, schemaVersion: 3, pages: {version: 1, items: {chess: {v: 'shown', at: NOW}}}, chess: {version: 1, goals: [], applied: [], lichess: {username: 'Fictional-Me', at: NOW}}}});
}

test('BN-100: rating goal problems are said under their field; a past date and the same goal twice are refused', async ({page}) => {
  await seed(page);
  await page.goto('/app/chess');
  const form = page.getByRole('form', {name: 'Add a rating goal'}), target = form.getByLabel('Target rating'), by = form.getByLabel('By (optional)');
  await form.getByRole('button', {name: 'Add goal'}).click();
  await expect(target).toHaveAttribute('aria-invalid', 'true');
  await expect(target).toBeFocused();
  await expect(form.locator('.field-error')).toContainText('Type a target rating');
  await target.fill('1800'); await by.fill('2020-01-01');
  await form.getByRole('button', {name: 'Add goal'}).click();
  await expect(by).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('.field-error')).toContainText('Choose today or a later date');
  await by.fill('');
  await form.getByRole('button', {name: 'Add goal'}).click();
  await expect(page.locator('.chess-goals [role="status"]')).toContainText('Goal added');
  await target.fill('1800');
  await form.getByRole('button', {name: 'Add goal'}).click();
  await expect(form.locator('.field-error')).toContainText('You already have this goal');
  await expect(page.locator('.chess-goal-list li')).toHaveCount(1);
});

test('D-012/D-126: the ratings status is two short lines, not one run-on sentence', async ({page}) => {
  await seed(page);
  await page.goto('/app/chess');
  const ratings = page.locator('.chess-ratings');
  await expect(ratings.locator('.chess-updated')).toBeVisible();
  await expect(ratings).toContainText('These are the sites\' own numbers.');
  await expect(page.locator('details.chess-settings summary')).toHaveText('Change your usernames');
});

test('BN-121/BN-183: a "not a legal move" note goes once the position changes; the puzzle\'s moves come back after a reload', async ({page}) => {
  await seed(page);
  await page.goto('/app/chess');
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Load today’s puzzle'}).click();
  const input = page.getByLabel('Type a move (e2e4 or Nf3)'), play = page.getByRole('form', {name: 'Type a move'}).getByRole('button', {name: 'Play move'});
  const status = page.locator('#chess-puzzle-title ~ .chess-game-area .chess-status');
  await input.fill('a1a8'); await play.click();
  const note = page.getByRole('form', {name: 'Type a move'}).getByRole('alert');
  await expect(note).toContainText('not a legal move');
  await input.fill('d4c5'); await play.click();
  await expect(status).toHaveText('Right. Find the next move.');
  await expect(note).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Load today’s puzzle'}).click();
  await expect(status).toHaveText('Your moves so far are back. Find the next move.');
  await expect(page.locator('.chess-moves')).toBeVisible();
});
