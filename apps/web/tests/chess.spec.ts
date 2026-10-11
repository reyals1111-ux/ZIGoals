import {expect, test, type Page, type Route} from '@playwright/test';
import {createHabit, emptyHabitData} from '../lib/habits';
import {presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

// Session W Part 14: Chess, the first skill. chess.com and Lichess are MOCKED with answers shaped like their documented
// ones (docs/product/CHESS.md); fictional usernames; no request reaches either site. The clock is fixed.
test.use({timezoneId: 'Europe/Brussels'});
const SETTINGS = 'zigoals:settings:v1', HABITS = 'zigoals:habits:v1', CACHE = 'zigoals:chess-cache:v1';
const AT = '2026-10-07T06:00:00.000Z', NOW = '2026-10-07T16:00:00.000Z';
const HABIT = '59a35604-3696-4a78-b455-000000000021';
const shown = {version: 1, items: {chess: {v: 'shown', at: AT}}};
const chess = (extra: object = {}) => ({version: 1, chesscom: {username: 'Fictional_Player', at: AT}, lichess: {username: 'fictional-li', at: AT}, goals: [], applied: [], ...extra});
const settings = (extra: object = {}) => ({...presetSettings('balanced'), onboarded: true, schemaVersion: 3, pages: shown, ...extra});
const endedToday = Math.floor(Date.parse('2026-10-07T12:00:00.000Z') / 1000);
const MOCK = {
  stats: {chess_rapid: {last: {rating: 1512, date: endedToday, rd: 45}, best: {rating: 1580}, record: {win: 30, loss: 20, draw: 4}}, chess_blitz: {last: {rating: 1433, date: endedToday - 86400, rd: 60}}},
  archives: {archives: ['https://api.chess.com/pub/player/fictional_player/games/2026/09', 'https://api.chess.com/pub/player/fictional_player/games/2026/10']},
  month: {games: [
    {url: 'https://www.chess.com/game/live/9001', uuid: 'f-1', end_time: endedToday, rated: true, time_class: 'rapid', rules: 'chess', time_control: '600', eco: 'https://www.chess.com/openings/Italian-Game', white: {username: 'Fictional_Player', rating: 1512, result: 'win'}, black: {username: 'rival', rating: 1498, result: 'resigned'}},
    {url: 'https://www.chess.com/game/live/9000', uuid: 'f-0', end_time: endedToday - 90000, rated: true, time_class: 'blitz', rules: 'chess', time_control: '180+2', eco: 'https://www.chess.com/openings/Caro-Kann-Defense', white: {username: 'other', rating: 1440, result: 'agreed'}, black: {username: 'fictional_player', rating: 1433, result: 'agreed'}},
  ]},
  liUser: {id: 'fictional-li', username: 'fictional-li', perfs: {blitz: {games: 40, rating: 1620, rd: 55, prog: 8}, rapid: {games: 0, rating: 1500, rd: 500, prog: 0}}},
  liHistory: [{name: 'Blitz', points: [[2026, 9, 1, 1590], [2026, 9, 4, 1604], [2026, 9, 6, 1612]]}],
  liGames: [JSON.stringify({id: 'AbCdEf12', rated: true, variant: 'standard', speed: 'blitz', perf: 'blitz', createdAt: Date.parse('2026-10-06T18:00:00Z'), lastMoveAt: Date.parse('2026-10-06T18:10:00Z'), status: 'mate', winner: 'black', players: {white: {user: {name: 'fictional-li', id: 'fictional-li'}, rating: 1612}, black: {user: {name: 'Other', id: 'other'}, rating: 1650}}, opening: {eco: 'B20', name: 'Sicilian Defense', ply: 2}, clock: {initial: 180, increment: 2, totalTime: 260}})].join('\n') + '\n',
};
type Seen = {url: string; started: number; ended: number; headers: Record<string, string>};
async function mockSites(page: Page, seen: Seen[], options: {lichessBusy?: boolean} = {}) {
  const answer = async (route: Route, body: unknown, type = 'application/json', status = 200) => {
    const item: Seen = {url: route.request().url(), started: Date.now(), ended: 0, headers: route.request().headers()};
    seen.push(item);
    await new Promise(r => setTimeout(r, 40));
    item.ended = Date.now();
    await route.fulfill({status, contentType: type, headers: {'access-control-allow-origin': '*'}, body: typeof body === 'string' ? body : JSON.stringify(body)});
  };
  await page.route('https://api.chess.com/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stats')) return answer(route, MOCK.stats);
    if (path.endsWith('/games/archives')) return answer(route, MOCK.archives);
    if (path.endsWith('/games/2026/10')) return answer(route, MOCK.month);
    return answer(route, {}, 'application/json', 404);
  });
  await page.route('https://lichess.org/**', route => {
    const url = new URL(route.request().url());
    if (options.lichessBusy) return answer(route, {error: 'Too many requests'}, 'application/json', 429);
    if (url.pathname === '/api/user/fictional-li') return answer(route, MOCK.liUser);
    if (url.pathname === '/api/user/fictional-li/rating-history') return answer(route, MOCK.liHistory);
    if (url.pathname === '/api/games/user/fictional-li') return answer(route, MOCK.liGames, 'application/x-ndjson');
    if (url.pathname.startsWith('/training/frame') || url.pathname.startsWith('/tv/frame')) return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture frame</title><p>Fixture frame</p>'});
    return answer(route, {}, 'application/json', 404);
  });
  await page.route('https://www.chess.com/**', route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture puzzle</title><p>Fixture puzzle</p>'}));
}
async function seed(page: Page, records: Record<string, unknown>, time = NOW) {
  await page.clock.install({time: new Date(time)});
  await page.route('**/api/**', route => route.request().url().startsWith('http://127.0.0.1') ? route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}) : route.fallback());
  await page.addInitScript(values => {
    if (sessionStorage.getItem('chess-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('chess-fixture', '1');
  }, {[WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}, ...records});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);

test('Settings → Chess saves the usernames; the page asks each site one request at a time, with the username only, and shows their numbers', async ({page}) => {
  const seen: Seen[] = [];
  await mockSites(page, seen);
  await seed(page, {[SETTINGS]: settings()});
  await page.goto('/app/settings');
  const card = page.getByRole('region', {name: 'Chess', exact: true});
  await card.getByLabel('chess.com username (optional)').fill('Fictional_Player');
  await card.getByLabel('Lichess username (optional)').fill('fictional-li');
  await card.getByRole('button', {name: 'Save usernames', exact: true}).click();
  await expect(card.getByRole('status')).toHaveText('Saved. Only these usernames are sent, each to its own site.');
  expect((await stored(page, SETTINGS)).chess).toMatchObject({chesscom: {username: 'Fictional_Player'}, lichess: {username: 'fictional-li'}});
  expect(seen).toEqual([]);
  await page.goto('/app/chess');
  await expect(page.getByRole('article', {name: 'chess.com Rapid rating'})).toContainText('1,512');
  await expect(page.getByRole('article', {name: 'Lichess Blitz rating'})).toContainText('1,620');
  await expect(page.getByRole('article', {name: 'Lichess Rapid rating'})).toHaveCount(0);
  expect(seen.map(s => s.url)).toEqual([
    'https://api.chess.com/pub/player/fictional_player/stats', 'https://api.chess.com/pub/player/fictional_player/games/archives', 'https://api.chess.com/pub/player/fictional_player/games/2026/10',
    'https://lichess.org/api/user/fictional-li', 'https://lichess.org/api/user/fictional-li/rating-history', 'https://lichess.org/api/games/user/fictional-li?max=50&moves=false&tags=false&opening=true',
  ]);
  for (let i = 1; i < seen.length; i++) expect(seen[i]!.started, seen[i]!.url).toBeGreaterThanOrEqual(seen[i - 1]!.ended);
  for (const s of seen) { expect(s.headers.cookie, s.url).toBeUndefined(); expect(s.headers.referer, s.url).toBeUndefined(); }
  const games = page.getByRole('region', {name: 'Recent games'});
  await expect(games).toContainText('Won');
  await expect(games).toContainText('Opponent 1498 · Italian Game');
  await expect(games).toContainText('All recent games1 won · 1 drawn · 1 lost');
  await expect(games.getByRole('link', {name: 'Open on chess.com'}).first()).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByRole('region', {name: 'Ratings over time'})).toContainText('Lichess · Blitz');
  const cache = await stored(page, CACHE);
  expect(cache.games).toHaveLength(3);
  expect(Object.keys(cache.fetchedAt).sort()).toEqual(['chesscom', 'lichess']);
  // Opening again within the hour asks nothing; Refresh asks again.
  await page.reload();
  await expect(page.getByRole('article', {name: 'chess.com Rapid rating'})).toBeVisible();
  expect(seen).toHaveLength(6);
  await page.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect.poll(() => seen.length).toBe(12);
});

test('a 429 pauses that site for a minute with nothing retried; the other site\'s numbers still show', async ({page}) => {
  const seen: Seen[] = [];
  await mockSites(page, seen, {lichessBusy: true});
  await seed(page, {[SETTINGS]: settings({chess: chess()})});
  await page.goto('/app/chess');
  await expect(page.getByRole('region', {name: 'Ratings'}).getByRole('alert')).toHaveText('Lichess asked to wait. Try again in a minute.');
  await expect(page.getByRole('button', {name: 'Refresh', exact: true})).toBeDisabled();
  expect(seen.filter(s => s.url.startsWith('https://lichess.org')).length).toBe(1);
  await expect(page.getByRole('article', {name: 'chess.com Rapid rating'})).toContainText('1,512');
});

// Session X Part 14 (J187): the page draws again when the pause runs out, so Refresh comes back by itself.
test('after the minute, Refresh comes back by itself, and nothing was retried meanwhile', async ({page}) => {
  const seen: Seen[] = [];
  await mockSites(page, seen, {lichessBusy: true});
  await seed(page, {[SETTINGS]: settings({chess: chess()})});
  await page.goto('/app/chess');
  const refresh = page.getByRole('button', {name: 'Refresh', exact: true});
  await expect(refresh).toBeDisabled();
  await page.clock.fastForward(30_000);
  await expect(refresh).toBeDisabled();
  expect(seen.filter(s => s.url.startsWith('https://lichess.org')).length).toBe(1);
  await page.clock.fastForward(31_000);
  await expect(refresh).toBeEnabled();
  expect(seen.filter(s => s.url.startsWith('https://lichess.org')).length).toBe(1);
});

test('puzzles and TV load only on a tap, sandboxed with no referrer; the CSP names exactly these frames; Play opens a window of its own', async ({page}) => {
  const seen: Seen[] = [], opened: string[] = [];
  await mockSites(page, seen);
  await seed(page, {[SETTINGS]: settings({chess: chess()})});
  await page.exposeFunction('recordOpen', (url: string, features: string) => { opened.push(`${url} ${features}`); });
  await page.addInitScript(() => { window.open = ((url: string, _t: string, features: string) => { void (window as unknown as {recordOpen: (u: string, f: string) => void}).recordOpen(String(url), String(features)); return null; }) as typeof window.open; });
  const response = await page.goto('/app/chess');
  const csp = response!.headers()['content-security-policy']!;
  expect(csp).toContain("frame-src https://www.chess.com/daily_puzzle https://lichess.org/training/frame https://lichess.org/tv/ https://lichess.org/embed/game/;");
  expect(csp).toMatch(/connect-src [^;]*https:\/\/api\.chess\.com https:\/\/lichess\.org/);
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', {name: 'Daily puzzle', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Daily puzzle'}), frame = dialog.locator('iframe');
  await expect(frame).toHaveAttribute('src', 'https://www.chess.com/daily_puzzle');
  await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  await expect(frame).toHaveAttribute('allow', '');
  await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
  await expect(frame).toHaveAttribute('title', 'Daily puzzle from chess.com');
  await expect(dialog.getByRole('link', {name: 'Daily puzzle by chess.com', exact: true})).toHaveAttribute('href', 'https://www.chess.com/daily_puzzle');
  await dialog.getByRole('button', {name: 'Close', exact: true}).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', {name: 'Play on chess.com', exact: true}).click();
  await expect.poll(() => opened).toEqual(['https://www.chess.com/play/online popup,width=1100,height=820,noopener,noreferrer']);
});

test('the habit chess ticks off: once on a day a game ended, kept after an undo', async ({page}) => {
  const seen: Seen[] = [];
  await mockSites(page, seen);
  const habits = createHabit(emptyHabitData(), {title: 'Play chess', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1}, new Date('2026-10-01T08:00:00.000Z'), HABIT);
  await seed(page, {[SETTINGS]: settings({chess: chess({habit: {id: HABIT, at: AT}})}), [HABITS]: habits});
  await page.goto('/app/chess');
  await expect.poll(async () => (await stored(page, SETTINGS)).chess.applied).toEqual([{date: '2026-10-07', appliedAt: expect.any(String)}]);
  const saved = await stored(page, HABITS);
  expect(saved.habits[0].entries).toEqual([expect.objectContaining({date: '2026-10-07', count: 1, note: 'Ticked off by Chess: a game ended today.'})]);
  await expect(page.getByLabel('On a day you finish a game, tick off')).toHaveValue(HABIT);
});

test('Showcase: fictional ratings and games, and no request to either site', async ({page}) => {
  const outside: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1' && u.protocol.startsWith('http')) outside.push(u.origin); });
  await page.clock.install({time: new Date(NOW)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/chess');
  await expect(page.locator('.page-lede')).toContainText('SHOWCASE DATA · fictional ratings and games.');
  await expect(page.getByRole('article', {name: 'chess.com Rapid rating'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Refresh', exact: true})).toHaveCount(0);
  await expect(page.getByRole('region', {name: 'Recent games'})).toContainText('Won');
  expect(outside).toEqual([]);
});
