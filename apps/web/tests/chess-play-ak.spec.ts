import {createHash} from 'node:crypto';
import {expect, test, type Page, type Request, type Route} from '@playwright/test';
import {createHabit, emptyHabitData} from '../lib/habits';
import {presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {DAILY_PUZZLE_FIXTURE, GAME_FULL_FIXTURE} from '../lib/chess/fixtures';

// Session AK (ADR-036 Q8, lane C): Play on Lichess inside ZIGoals. Every lichess.org address is MOCKED with answers shaped
// like Lichess's documented ones (OpenAPI v2.0.178): the OAuth page (the redirect back is simulated by visiting the
// callback with a code), the token endpoint, the account, the ongoing games, and the ndjson streams (fulfilled with
// fixture bodies; the page reconnects as it would after a drop). Fictional names; no request reaches Lichess. Desktop
// only: phones list the games with "Continue on Lichess" (checked here with a narrow window).
test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'the board is desktop first; one browser is enough'); });
const SETTINGS = 'zigoals:settings:v1', HABITS = 'zigoals:habits:v1', TOKEN = 'lio_FixtureToken01';
const NOW = '2026-10-31T15:00:00.000Z', HABIT = '59a35604-3696-4a78-b455-000000000041';
const settings = (extra: object = {}) => ({...presetSettings('balanced'), onboarded: true, schemaVersion: 3, pages: {version: 1, items: {chess: {v: 'shown', at: NOW}}}, ...extra});
type Lichess = {moves: string; replies: string[]; refuseNext: boolean; status: string; winner?: string; initialFen?: string; seen: Request[]; posted: string[]};
async function mockLichess(page: Page, game: Partial<Lichess> = {}) {
  const state: Lichess = {moves: 'e2e4 e7e5', replies: ['b8c6', 'g8f6'], refuseNext: false, status: 'started', seen: [], posted: [], ...game};
  const ndjson = (route: Route, lines: unknown[]) => route.fulfill({status: 200, contentType: 'application/x-ndjson', headers: {'access-control-allow-origin': '*'}, body: lines.map(l => typeof l === 'string' ? l : JSON.stringify(l)).join('\n') + '\n'});
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({status, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(body)});
  await page.route('https://lichess.org/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname, method = request.method();
    if (method === 'OPTIONS') return route.fulfill({status: 204, headers: {'access-control-allow-origin': '*', 'access-control-allow-headers': 'Origin, Authorization, If-Modified-Since, Cache-Control, Content-Type', 'access-control-allow-methods': 'OPTIONS, GET, POST, PUT, DELETE'}});
    state.seen.push(request);
    if (path === '/oauth') return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture Lichess</title><p>Fixture authorize page</p>'});
    if (path === '/api/token' && method === 'POST') return json(route, {token_type: 'Bearer', access_token: TOKEN, expires_in: 31536000});
    if (path === '/api/token' && method === 'DELETE') return route.fulfill({status: 204, headers: {'access-control-allow-origin': '*'}});
    if (path === '/api/account') return json(route, {id: 'fictional-me', username: 'Fictional-Me'});
    if (path === '/api/account/playing') return json(route, {nowPlaying: state.status === 'started' ? [{gameId: 'GaMe0001', fullId: 'GaMe0001abcd', color: 'white', isMyTurn: true, opponent: {id: 'fictional-rival', username: 'Fictional-Rival', rating: 1510}, speed: 'rapid', rated: false, variant: {key: 'standard', name: 'Standard'}}] : []});
    if (path === '/api/stream/event') return ndjson(route, ['']);
    if (path === '/api/board/game/stream/GaMe0001') return ndjson(route, [GAME_FULL_FIXTURE(state.moves, {...(state.initialFen ? {initialFen: state.initialFen} : {}), state: {type: 'gameState', moves: state.moves, wtime: 590000, btime: 600000, winc: 0, binc: 0, status: state.status, ...(state.winner ? {winner: state.winner} : {})}})]);
    const move = /^\/api\/board\/game\/GaMe0001\/move\/([a-h][1-8][a-h][1-8][qrbn]?)$/.exec(path);
    if (move) {
      state.posted.push(move[1]!);
      if (state.refuseNext) { state.refuseNext = false; return json(route, {error: 'Not your turn, or game already over'}, 400); }
      state.moves = `${state.moves} ${move[1]} ${state.replies.shift() ?? ''}`.trim();
      return json(route, {ok: true});
    }
    if (path === '/api/board/game/GaMe0001/resign') { state.posted.push('resign'); state.status = 'resign'; state.winner = 'black'; return json(route, {ok: true}); }
    if (path === '/api/puzzle/daily') return json(route, DAILY_PUZZLE_FIXTURE);
    return json(route, {error: 'Not found'}, 404);
  });
  return state;
}
async function seed(page: Page, records: Record<string, unknown> = {}) {
  await page.clock.setFixedTime(new Date(NOW));
  await page.route('**/api/**', route => route.request().url().startsWith('http://127.0.0.1') ? route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}) : route.fallback());
  await page.addInitScript(values => {
    if (sessionStorage.getItem('chess-play-fixture')) return;
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:motion:v1', 'off');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('chess-play-fixture', '1');
  }, {[WHATS_NEW_KEY]: {version: 1, dismissed: [WHATS_NEW_RELEASE]}, [SETTINGS]: settings(), ...records});
}
/** Every request leaving the app goes to lichess.org; the token only in Lichess's Authorization header, never in an address or to ZIGoals. */
function watchEgress(page: Page) {
  const outside: string[] = [], leaks: string[] = [];
  page.on('request', r => {
    const u = new URL(r.url()), headers = r.headers(), body = r.postData() ?? '';
    if (u.protocol.startsWith('http') && u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') outside.push(u.origin);
    if (r.url().includes(TOKEN) || (u.hostname !== 'lichess.org' && (JSON.stringify(headers).includes(TOKEN) || body.includes(TOKEN)))) leaks.push(r.url());
    if (u.hostname === 'lichess.org' && (headers.cookie !== undefined || headers.referer !== undefined)) leaks.push(`cookie or referrer: ${r.url()}`);
  });
  return {outside, leaks};
}
async function connect(page: Page, lichess: Lichess) {
  await page.goto('/app/chess');
  const base = new URL(page.url()).origin;
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Connect Lichess'}).click();
  await page.waitForURL(u => u.hostname === 'lichess.org' && u.pathname === '/oauth');
  const authorize = new URL(page.url()), q = Object.fromEntries(authorize.searchParams);
  expect(q).toMatchObject({response_type: 'code', client_id: 'zigoals.app', redirect_uri: `${base}/app/chess?lichess=callback`, code_challenge_method: 'S256', scope: 'board:play'});
  // Lichess sends the person back with a code and the state.
  await page.goto(`/app/chess?lichess=callback&code=fixture-code&state=${encodeURIComponent(q.state!)}`);
  await expect(page.getByRole('heading', {name: 'Lichess · Fictional-Me'})).toBeVisible();
  await expect(page).toHaveURL(/\/app\/chess$/); // the code is gone from the address
  const exchange = lichess.seen.find(r => r.url() === 'https://lichess.org/api/token' && r.method() === 'POST')!;
  const form = Object.fromEntries(new URLSearchParams(exchange.postData() ?? ''));
  expect(form).toMatchObject({grant_type: 'authorization_code', code: 'fixture-code', redirect_uri: `${base}/app/chess?lichess=callback`, client_id: 'zigoals.app'});
  expect(createHash('sha256').update(form.code_verifier!).digest('base64url')).toBe(q.code_challenge);
  expect(await page.evaluate(() => sessionStorage.getItem('zigoals:lichess-pending:v1'))).toBeNull();
  const databases = await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name));
  expect(databases).toContain('zigoals-lichess-v1');
}

test('connect by PKCE, play by click, keyboard and text, a refused move is restored from the stream, resign, disconnect', async ({page}) => {
  const lichess = await mockLichess(page), egress = watchEgress(page);
  await seed(page);
  await connect(page, lichess);
  const games = page.getByRole('list', {name: 'Your ongoing Lichess games'});
  await expect(games).toContainText('Fictional-Rival (1510)');
  await expect(games.getByRole('link', {name: 'Continue the game against Fictional-Rival on Lichess'})).toHaveAttribute('href', 'https://lichess.org/GaMe0001');
  await expect(page.getByText('not bullet or blitz')).toBeVisible();
  await games.getByRole('button', {name: 'Open the game against Fictional-Rival'}).click();

  const status = page.locator('.chess-status[role=status]');
  await expect(status).toHaveText('Your move.');
  const board = page.getByRole('grid', {name: /Chess board, white at the bottom/});
  await expect(board.getByRole('gridcell')).toHaveCount(64);
  // Click: the knight, then its square.
  await board.locator('[data-square="g1"]').click();
  await expect(board.locator('[data-square="g1"]')).toHaveAttribute('aria-selected', 'true');
  await expect(board.locator('[data-square="f3"]')).toHaveAttribute('aria-label', /can move here/);
  await board.locator('[data-square="f3"]').click();
  await expect.poll(() => lichess.posted).toEqual(['g1f3']);
  await expect(status).toHaveText('Your move.', {timeout: 10_000}); // the reply came on the stream
  await expect(page.getByRole('list', {name: 'Moves'})).toContainText('Nf3');
  await expect(page.getByRole('list', {name: 'Moves'})).toContainText('Nc6');

  // A move Lichess refuses: said, and the board is drawn again from the stream.
  lichess.refuseNext = true;
  await page.getByLabel('Type a move (e2e4 or Nf3)').fill('Bc4');
  await page.getByRole('button', {name: 'Play move'}).click();
  await expect(status).toHaveText('Lichess refused that move. Lichess said: Not your turn, or game already over. The board shows the game as Lichess has it.');
  await expect(board.locator('[data-square="f1"]')).toHaveAttribute('aria-label', /^f1, white bishop/);

  // Keyboard: the cursor starts on the king (e1); Right to f1, Enter, Up ×3 and Left ×3 to c4, Enter.
  await board.locator('[data-square="e1"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(board.locator('[data-square="f1"]')).toBeFocused();
  await page.keyboard.press('Enter');
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft']) await page.keyboard.press(key);
  await expect(board.locator('[data-square="c4"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => lichess.posted).toEqual(['g1f3', 'f1c4', 'f1c4']);
  await expect(page.getByRole('list', {name: 'Moves'})).toContainText('Bc4', {timeout: 10_000});

  // Resign asks once more; the result comes from the stream.
  await page.getByRole('button', {name: 'Resign'}).click();
  await page.getByRole('button', {name: 'Yes, resign'}).click();
  await expect(status).toHaveText('You resigned.', {timeout: 10_000});

  await page.getByRole('button', {name: 'Back to your games'}).click();
  await page.getByRole('button', {name: 'Disconnect Lichess'}).click();
  await expect(page.getByText('Disconnected. This device forgot the connection and Lichess revoked it.')).toBeVisible();
  expect(lichess.seen.some(r => r.url() === 'https://lichess.org/api/token' && r.method() === 'DELETE' && r.headers().authorization === `Bearer ${TOKEN}`)).toBe(true);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name))).not.toContain('zigoals-lichess-v1');
  await expect(page.getByRole('button', {name: 'Connect Lichess'})).toBeVisible();
  for (const r of lichess.seen.filter(r => new URL(r.url()).pathname.startsWith('/api/') && !r.url().endsWith('/api/token') && !r.url().endsWith('/api/puzzle/daily'))) expect(r.headers().authorization, r.url()).toBe(`Bearer ${TOKEN}`);
  expect([...new Set(egress.outside)]).toEqual(['https://lichess.org']);
  expect(egress.leaks).toEqual([]);
});

test('a promotion asks which piece', async ({page}) => {
  const lichess = await mockLichess(page, {moves: '', initialFen: '8/P7/8/8/8/8/8/k6K w - - 0 1', replies: []});
  await seed(page);
  await connect(page, lichess);
  await page.getByRole('button', {name: 'Open the game against Fictional-Rival'}).click();
  const board = page.getByRole('grid', {name: /Chess board/});
  await board.locator('[data-square="a7"]').click();
  await board.locator('[data-square="a8"]').click();
  const dialog = page.getByRole('dialog', {name: 'Promote the pawn to'});
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', {name: 'Knight'}).click();
  await expect.poll(() => lichess.posted).toEqual(['a7a8n']);
});

test('a narrow window lists the games with "Continue on Lichess" and no board', async ({page}) => {
  await page.setViewportSize({width: 700, height: 900});
  const lichess = await mockLichess(page);
  await seed(page);
  await connect(page, lichess);
  const games = page.getByRole('list', {name: 'Your ongoing Lichess games'});
  await expect(games.getByRole('link', {name: /Continue the game against Fictional-Rival/})).toBeVisible();
  await expect(games.getByRole('button', {name: /Open the game/})).toHaveCount(0);
  await expect(page.getByRole('form', {name: 'Find an opponent'})).toHaveCount(0);
  await expect(page.getByText('The board is made for a computer.')).toBeVisible();
});

test('Lichess\'s daily puzzle: checked move by move on the board, no token sent, and solving it ticks off the chess habit', async ({page}) => {
  const lichess = await mockLichess(page), egress = watchEgress(page);
  const habits = createHabit({...emptyHabitData(), timeZone: 'UTC'}, {title: 'Play chess', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1}, new Date('2026-10-01T08:00:00.000Z'), HABIT);
  await seed(page, {[SETTINGS]: settings({chess: {version: 1, goals: [], applied: [], habit: {id: HABIT, at: NOW}}}), [HABITS]: habits});
  await page.goto('/app/chess');
  expect(lichess.seen).toEqual([]); // nothing is asked before Play opens
  await page.getByRole('button', {name: 'Open Play'}).click();
  await page.getByRole('button', {name: 'Load today’s puzzle'}).click();
  const status = page.locator('#chess-puzzle-title ~ .chess-game-area .chess-status');
  await expect(status).toHaveText('Find the best move for Black.');
  await expect(page.getByRole('grid', {name: /Puzzle board, black at the bottom/})).toBeVisible();
  const input = page.getByLabel('Type a move (e2e4 or Nf3)'), play = page.getByRole('form', {name: 'Type a move'}).getByRole('button', {name: 'Play move'});
  await input.fill('Rd7'); await play.click();
  await expect(status).toHaveText('Not the move. Try again.');
  for (const move of ['d4c5', 'Rxd3+', 'e6c4']) { await input.fill(move); await play.click(); await expect(status).toHaveText('Right. Find the next move.'); }
  await input.fill('Bxf1'); await play.click();
  await expect(status).toHaveText('Solved.');
  await expect(page.getByText('Your chess habit is ticked off for today.')).toBeVisible();
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HABITS);
  expect(saved.habits[0].entries).toEqual([expect.objectContaining({date: '2026-10-31', count: 1, note: 'Ticked off by Chess: the daily puzzle solved.'})]);
  const daily = lichess.seen.find(r => r.url() === 'https://lichess.org/api/puzzle/daily')!;
  expect(daily.headers().authorization).toBeUndefined();
  expect(lichess.seen.map(r => new URL(r.url()).pathname)).toEqual(['/api/puzzle/daily']); // no connection asked for the puzzle
  expect([...new Set(egress.outside)]).toEqual(['https://lichess.org']);
});
