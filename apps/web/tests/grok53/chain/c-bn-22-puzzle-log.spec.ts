import {expect, test, type Page} from '@playwright/test';
import {presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {DAILY_PUZZLE_FIXTURE} from '../../../lib/chess/fixtures';

// Session AL third pass (Part 15, lane L6): Berlin C-BN-22 / GAP-152, a dated log of the daily puzzle results. Desktop
// 1280; a fresh profile with a fictional Lichess username; lichess.org is mocked (the fixture puzzle); fixed clock and
// time zone; Motion Off so replies are played at once. Fails on main (no log), passes on the branch.
test.use({viewport: {width: 1280, height: 900}, timezoneId: 'UTC'});
const NOW = '2026-11-04T09:00:00.000Z';
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

test('C-BN-22: a solved daily puzzle is noted with its date; playing it again keeps the first result; it survives a reload', async ({page}) => {
  await seed(page);
  await page.goto('/app/chess');
  await page.getByRole('button', {name: 'Open Play'}).click();
  const days = page.locator('.chess-puzzle-days');
  await expect(days).toContainText('None yet.');
  await page.getByRole('button', {name: 'Load today’s puzzle'}).click();
  const input = page.getByLabel('Type a move (e2e4 or Nf3)'), play = page.getByRole('form', {name: 'Type a move'}).getByRole('button', {name: 'Play move'});
  const status = page.locator('#chess-puzzle-title ~ .chess-game-area .chess-status');
  const solution = DAILY_PUZZLE_FIXTURE.puzzle.solution;
  for (let i = 0; i < solution.length; i += 2) { await input.fill(solution[i]!); await play.click(); }
  await expect(status).toContainText('Solved at the first try.');
  await expect(days).toContainText('Last 30 days: solved on 1 day.');
  await expect(days.getByRole('listitem')).toHaveText([/Nov 4.* · solved at the first try · rated 2150/]);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:chess-puzzle-log:v1') ?? 'null'));
  expect(stored).toMatchObject({version: 1, entries: [{day: '2026-11-04', id: DAILY_PUZZLE_FIXTURE.puzzle.id, result: 'solved', mistakes: 0}]});
  // Again, this time with the answer shown: the first result stays.
  await page.getByRole('button', {name: 'Start again'}).click();
  await page.getByRole('button', {name: 'Show the next move'}).click();
  await expect(days.getByRole('listitem')).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', {name: 'Open Play'}).click();
  await expect(page.locator('.chess-puzzle-days')).toContainText('Last 30 days: solved on 1 day.');
});
